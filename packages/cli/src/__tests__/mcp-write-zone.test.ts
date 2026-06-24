import { describe, expect, it } from 'vitest';
import { applyWriteZone } from '../dev/mcp/write-zone.js';

/**
 * The protected-zone writer behind MCP `ovellum_write_zone` (ROADMAP C2). Pure
 * text transform: insert a new @manual block under an anchor, or replace an
 * existing block with the same id.
 */

const DOC = [
  '# math',
  '',
  '<!-- ovellum:anchor id="src/math.ts::add" kind="function" -->',
  '',
  '## add',
  '',
  '`function add(a: number, b: number): number`',
  '',
].join('\n');

describe('applyWriteZone', () => {
  it('inserts a new block right after the anchor', () => {
    const r = applyWriteZone(DOC, {
      anchorId: 'src/math.ts::add',
      content: 'We keep add explicit on purpose.',
      blockId: 'why',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action).toBe('inserted');
    expect(r.text).toContain('<!-- @manual:start id="why" -->\nWe keep add explicit on purpose.\n<!-- @manual:end -->');
    // The block sits directly under the anchor comment.
    const anchorIdx = r.text.indexOf('ovellum:anchor');
    const blockIdx = r.text.indexOf('@manual:start');
    expect(blockIdx).toBeGreaterThan(anchorIdx);
  });

  it('replaces an existing block with the same id (idempotent)', () => {
    const once = applyWriteZone(DOC, { anchorId: 'src/math.ts::add', content: 'first', blockId: 'why' });
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    const twice = applyWriteZone(once.text, { anchorId: 'src/math.ts::add', content: 'second', blockId: 'why' });
    expect(twice.ok).toBe(true);
    if (!twice.ok) return;
    expect(twice.action).toBe('replaced');
    expect(twice.text).toContain('second');
    expect(twice.text).not.toContain('first');
    // Still exactly one block.
    expect(twice.text.match(/@manual:start/g)).toHaveLength(1);
  });

  it('fails when the anchor is not present', () => {
    const r = applyWriteZone(DOC, { anchorId: 'src/math.ts::missing', content: 'x', blockId: 'b' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('anchor-not-found');
  });

  it('honors a custom block tag', () => {
    const r = applyWriteZone(DOC, {
      anchorId: 'src/math.ts::add',
      content: 'note',
      blockId: 'b',
      blockTag: '@keep',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toContain('<!-- @keep:start id="b" -->');
  });
});
