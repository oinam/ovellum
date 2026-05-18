import { describe, expect, it } from 'vitest';
import { OvellumError } from '@ovellum/core';
import { parseManualDoc } from '../read.js';
import { extractProtectedZones } from '../zones.js';

describe('parseManualDoc', () => {
  it('parses frontmatter and body separately', () => {
    const raw = '---\ntitle: hi\nfoo: 1\n---\n\n# Body\n';
    const doc = parseManualDoc(raw, 'a.md');
    expect(doc.filePath).toBe('a.md');
    expect(doc.frontmatter).toEqual({ title: 'hi', foo: 1 });
    expect(doc.content.trim()).toBe('# Body');
    expect(doc.protectedBlocks).toEqual([]);
  });

  it('handles files without frontmatter', () => {
    const doc = parseManualDoc('just body', 'a.md');
    expect(doc.frontmatter).toEqual({});
    expect(doc.content).toBe('just body');
  });

  it('returns no warnings when every protected zone has an explicit id', () => {
    const raw = ['<!-- @manual:start id="intro" -->', 'kept', '<!-- @manual:end -->'].join('\n');
    const doc = parseManualDoc(raw, 'a.md');
    expect(doc.warnings).toEqual([]);
  });

  it('warns when a protected zone falls back to a positional id', () => {
    const raw = [
      '# heading',
      '',
      '<!-- @manual:start -->',
      'unkeyed block',
      '<!-- @manual:end -->',
      '<!-- @manual:start id="ok" -->',
      'keyed block',
      '<!-- @manual:end -->',
    ].join('\n');
    const doc = parseManualDoc(raw, 'a.md');
    expect(doc.warnings).toHaveLength(1);
    expect(doc.warnings[0]).toMatch(/positional fallback/);
    expect(doc.warnings[0]).toContain('a.md:3');
    expect(doc.warnings[0]).toContain('manual-block-1');
  });
});

describe('extractProtectedZones', () => {
  it('extracts a single block with explicit id', () => {
    const body = [
      'before',
      '<!-- @manual:start id="intro" -->',
      'human text',
      '<!-- @manual:end -->',
      'after',
    ].join('\n');
    const blocks = extractProtectedZones(body);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      id: 'intro',
      hasExplicitId: true,
      content: 'human text',
    });
  });

  it('generates positional ids when id is omitted', () => {
    const body = [
      '<!-- @manual:start -->',
      'first',
      '<!-- @manual:end -->',
      '<!-- @manual:start -->',
      'second',
      '<!-- @manual:end -->',
    ].join('\n');
    const blocks = extractProtectedZones(body);
    expect(blocks.map((b) => b.id)).toEqual(['manual-block-1', 'manual-block-2']);
    expect(blocks.every((b) => !b.hasExplicitId)).toBe(true);
  });

  it('associates blocks with the nearest preceding ovellum anchor', () => {
    const body = [
      '<!-- ovellum:anchor id="src/a.ts::foo" generated="2026-01-01" -->',
      '<!-- @manual:start id="note" -->',
      'preserved',
      '<!-- @manual:end -->',
    ].join('\n');
    const blocks = extractProtectedZones(body);
    expect(blocks[0]!.anchorId).toBe('src/a.ts::foo');
  });

  it('throws OvellumError on unclosed @manual:start', () => {
    const body = '<!-- @manual:start id="x" -->\nbody\n';
    expect(() => extractProtectedZones(body)).toThrow(OvellumError);
  });

  it('throws OvellumError on nested @manual:start', () => {
    const body = [
      '<!-- @manual:start id="outer" -->',
      'outer',
      '<!-- @manual:start id="inner" -->',
      'inner',
      '<!-- @manual:end -->',
      '<!-- @manual:end -->',
    ].join('\n');
    expect(() => extractProtectedZones(body)).toThrow(/Nested/);
  });

  it('throws OvellumError on stray @manual:end', () => {
    expect(() => extractProtectedZones('<!-- @manual:end -->')).toThrow(/Stray/);
  });

  it('keeps the most recent anchor for multiple blocks', () => {
    const body = [
      '<!-- ovellum:anchor id="A" generated="t" -->',
      '<!-- @manual:start -->',
      'one',
      '<!-- @manual:end -->',
      '<!-- ovellum:anchor id="B" generated="t" -->',
      '<!-- @manual:start -->',
      'two',
      '<!-- @manual:end -->',
    ].join('\n');
    const blocks = extractProtectedZones(body);
    expect(blocks.map((b) => b.anchorId)).toEqual(['A', 'B']);
  });
});
