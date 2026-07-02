import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  OVELLUM_DOCS_HEADING,
  renderOvellumDocsSection,
  syncAgentsFiles,
  upsertOvellumDocsSection,
} from '../commands/agents.js';

const opts = { mode: 'hybrid' as const, input: 'src', output: 'docs' };

describe('renderOvellumDocsSection', () => {
  it('starts with the canonical heading in every mode', () => {
    for (const mode of ['manual', 'auto', 'hybrid'] as const) {
      expect(renderOvellumDocsSection({ ...opts, mode }).startsWith(OVELLUM_DOCS_HEADING + '\n')).toBe(
        true,
      );
    }
  });

  it('hybrid: leads with the protected-zone contract and names write_zone', () => {
    const md = renderOvellumDocsSection({ ...opts, mode: 'hybrid' });
    expect(md).toContain('<!-- @manual:start id="…" -->');
    expect(md).toContain('ovellum_write_zone');
    expect(md).toContain('.ovellum/orphans/');
  });

  it('hybrid: uses the configured orphan dir', () => {
    const md = renderOvellumDocsSection({ ...opts, mode: 'hybrid', orphanDir: '.quarantine' });
    expect(md).toContain('`.quarantine/`');
  });

  it('manual: points at the content dir and never mentions zones', () => {
    const md = renderOvellumDocsSection({ mode: 'manual', input: 'content', output: 'dist' });
    expect(md).toContain('`content/`');
    expect(md).toContain('`dist/`');
    expect(md).not.toContain('@manual');
  });

  it('auto: says the output is fully regenerated', () => {
    const md = renderOvellumDocsSection({ ...opts, mode: 'auto' });
    expect(md).toContain('never edit it by');
    expect(md).not.toContain('@manual:start');
  });
});

describe('upsertOvellumDocsSection', () => {
  const section = renderOvellumDocsSection(opts);

  it('appends when no section exists, preserving existing content', () => {
    const raw = '# My file\n\nSome instructions.\n';
    const { content, changed, found } = upsertOvellumDocsSection(raw, section);
    expect(changed).toBe(true);
    expect(found).toBe(false);
    expect(content.startsWith('# My file\n\nSome instructions.\n\n' + OVELLUM_DOCS_HEADING)).toBe(true);
  });

  it('produces just the section for an empty file', () => {
    const { content } = upsertOvellumDocsSection('', section);
    expect(content).toBe(section.trimEnd() + '\n');
  });

  it('replaces a stale section, preserving content before and after', () => {
    const raw = [
      '# AGENTS.md',
      '',
      'Keep this.',
      '',
      OVELLUM_DOCS_HEADING,
      '',
      'Old, stale text.',
      '',
      '## After section',
      '',
      'Also keep this.',
      '',
    ].join('\n');
    const { content, changed, found } = upsertOvellumDocsSection(raw, section);
    expect(changed).toBe(true);
    expect(found).toBe(true);
    expect(content).toContain('Keep this.');
    expect(content).toContain('Also keep this.');
    expect(content).not.toContain('Old, stale text.');
    // Exactly one occurrence of the heading.
    expect(content.split(OVELLUM_DOCS_HEADING).length).toBe(2);
    // The next section survives as a section boundary.
    expect(content.indexOf('## After section')).toBeGreaterThan(content.indexOf(OVELLUM_DOCS_HEADING));
  });

  it('replaces a stale section that runs to EOF', () => {
    const raw = `# AGENTS.md\n\n${OVELLUM_DOCS_HEADING}\n\nOld text at end.`;
    const { content } = upsertOvellumDocsSection(raw, section);
    expect(content).not.toContain('Old text at end.');
    expect(content.trimEnd().endsWith('automation/')).toBe(true);
  });

  it('is idempotent: a current section is returned untouched', () => {
    const first = upsertOvellumDocsSection('# Mine\n\nStuff.\n', section);
    const second = upsertOvellumDocsSection(first.content, section);
    expect(second.changed).toBe(false);
    expect(second.content).toBe(first.content);
  });
});

describe('syncAgentsFiles', () => {
  let dir: string;
  const section = renderOvellumDocsSection(opts);

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-agents-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates AGENTS.md when neither file exists', async () => {
    const results = await syncAgentsFiles(dir, section, false);
    expect(results).toEqual([{ file: 'AGENTS.md', action: 'created' }]);
    expect(readFileSync(path.join(dir, 'AGENTS.md'), 'utf8')).toContain(OVELLUM_DOCS_HEADING);
    expect(existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
  });

  it('updates both files when both exist, and is a no-op on the second run', async () => {
    writeFileSync(path.join(dir, 'AGENTS.md'), '# Agents\n\nHouse rules.\n');
    writeFileSync(path.join(dir, 'CLAUDE.md'), '# Claude\n\nMore rules.\n');

    const first = await syncAgentsFiles(dir, section, false);
    expect(first).toEqual([
      { file: 'AGENTS.md', action: 'updated' },
      { file: 'CLAUDE.md', action: 'updated' },
    ]);
    expect(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8')).toContain('More rules.');

    const second = await syncAgentsFiles(dir, section, false);
    expect(second).toEqual([
      { file: 'AGENTS.md', action: 'current' },
      { file: 'CLAUDE.md', action: 'current' },
    ]);
  });

  it('check mode reports without writing', async () => {
    writeFileSync(path.join(dir, 'CLAUDE.md'), '# Claude\n');
    const results = await syncAgentsFiles(dir, section, true);
    expect(results).toEqual([{ file: 'CLAUDE.md', action: 'missing' }]);
    expect(readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8')).toBe('# Claude\n');
  });

  it('check mode reports a stale section', async () => {
    const stale = upsertOvellumDocsSection(
      '# Claude\n',
      renderOvellumDocsSection({ ...opts, output: 'old-dir' }),
    ).content;
    writeFileSync(path.join(dir, 'CLAUDE.md'), stale);
    const results = await syncAgentsFiles(dir, section, true);
    expect(results).toEqual([{ file: 'CLAUDE.md', action: 'stale' }]);
  });

  it('check mode reports missing AGENTS.md when neither file exists', async () => {
    const results = await syncAgentsFiles(dir, section, true);
    expect(results).toEqual([{ file: 'AGENTS.md', action: 'missing' }]);
    expect(existsSync(path.join(dir, 'AGENTS.md'))).toBe(false);
  });
});
