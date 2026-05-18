import { describe, expect, it } from 'vitest';
import type { ManualDoc } from '@ovellum/core';
import { merge } from '../merge.js';
import { slugifyAnchor, renderOrphanFile, formatDateUTC } from '../orphans.js';

const NOW = '2026-05-13T12:00:00.000Z';

function makeManual(blocks: ManualDoc['protectedBlocks']): ManualDoc {
  return {
    filePath: 'docs/foo.md',
    frontmatter: {},
    content: '',
    protectedBlocks: blocks,
    warnings: [],
  };
}

describe('merge', () => {
  it('returns generated unchanged when there are no protected blocks', () => {
    const generated = '# hi\n';
    const result = merge(generated, makeManual([]), { now: NOW });
    expect(result.content).toBe(generated);
    expect(result.orphans).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('splices a protected block under its matching anchor', () => {
    const generated = [
      '## `foo`',
      '<!-- ovellum:anchor id="src/a.ts::foo" generated="t" -->',
      'auto-generated description',
      '',
      '## `bar`',
      '<!-- ovellum:anchor id="src/a.ts::bar" generated="t" -->',
      'bar auto',
    ].join('\n');

    const manual = makeManual([
      {
        id: 'note',
        hasExplicitId: true,
        content: 'hand-written prose',
        startLine: 0,
        endLine: 0,
        anchorId: 'src/a.ts::foo',
      },
    ]);

    const result = merge(generated, manual, { now: NOW });
    expect(result.orphans).toEqual([]);
    expect(result.content).toContain('auto-generated description');
    expect(result.content).toContain('<!-- @manual:start id="note" -->');
    expect(result.content).toContain('hand-written prose');
    // The block must be placed under `foo`, BEFORE the `bar` section.
    const fooIdx = result.content.indexOf('src/a.ts::foo');
    const blockIdx = result.content.indexOf('hand-written prose');
    const barIdx = result.content.indexOf('src/a.ts::bar');
    expect(fooIdx).toBeLessThan(blockIdx);
    expect(blockIdx).toBeLessThan(barIdx);
  });

  it('quarantines blocks whose anchor disappeared', () => {
    const generated = [
      '<!-- ovellum:anchor id="src/a.ts::stillHere" generated="t" -->',
      'still around',
    ].join('\n');

    const manual = makeManual([
      {
        id: 'note',
        hasExplicitId: true,
        content: 'goodbye',
        startLine: 0,
        endLine: 0,
        anchorId: 'src/a.ts::removed',
      },
    ]);

    const result = merge(generated, manual, { now: NOW, sourceFile: 'docs/a.md' });
    expect(result.orphans).toHaveLength(1);
    expect(result.orphans[0]).toMatchObject({
      anchorId: 'src/a.ts::removed',
      content: 'goodbye',
      manualBlockId: 'note',
      sourceFile: 'docs/a.md',
      orphanedAt: NOW,
    });
    // Generated content is preserved as-is.
    expect(result.content).toBe(generated);
  });

  it('emits a warning + orphan for blocks with no associated anchor', () => {
    const manual = makeManual([
      {
        id: 'lone',
        hasExplicitId: true,
        content: 'no home',
        startLine: 0,
        endLine: 0,
      },
    ]);
    const result = merge('# only generated\n', manual, { now: NOW });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/no associated anchor/);
    expect(result.orphans).toHaveLength(1);
  });

  it('handles multiple blocks attached to the same anchor', () => {
    const generated = '<!-- ovellum:anchor id="X" generated="t" -->\nbody\n';
    const manual = makeManual([
      {
        id: 'a',
        hasExplicitId: true,
        content: 'first',
        startLine: 0,
        endLine: 0,
        anchorId: 'X',
      },
      {
        id: 'b',
        hasExplicitId: true,
        content: 'second',
        startLine: 0,
        endLine: 0,
        anchorId: 'X',
      },
    ]);
    const result = merge(generated, manual, { now: NOW });
    expect(result.content.indexOf('first')).toBeLessThan(result.content.indexOf('second'));
    expect(result.orphans).toEqual([]);
  });
});

describe('orphans helpers', () => {
  it('slugifies anchor IDs', () => {
    expect(slugifyAnchor('src/utils/format.ts::formatDate')).toBe('src-utils-format.ts-formatDate');
    expect(slugifyAnchor('a::B.c')).toBe('a-B.c');
  });

  it('formats date as YYYY-MM-DD UTC', () => {
    expect(formatDateUTC(new Date('2026-05-13T22:00:00.000Z'))).toBe('2026-05-13');
  });

  it('renders an orphan file with frontmatter + body', () => {
    const body = renderOrphanFile({
      orphanedAt: '2026-05-13T12:00:00.000Z',
      sourceFile: 'docs/a.md',
      anchorId: 'src/a.ts::removed',
      manualBlockId: 'note',
      content: 'goodbye',
    });
    expect(body).toContain('orphaned:');
    expect(body).toContain('source_file: docs/a.md');
    expect(body).toContain('anchor_id: ');
    expect(body).toContain('manual_block_id: note');
    expect(body).toContain('\n\ngoodbye\n');
  });
});
