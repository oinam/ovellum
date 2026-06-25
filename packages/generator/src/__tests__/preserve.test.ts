import { describe, expect, it } from 'vitest';
import { type DocNode } from '@ovellum/core';
import { renderNode } from '../templates.js';

/**
 * `@preserve` auto-wrapping (ROADMAP A5): a preserved symbol's body is wrapped
 * in a `@manual` protected zone (keyed by the node's anchor id) only when
 * wrapping is enabled — so the hybrid merge engine keeps it across regen.
 */

const base = {
  filePath: 'src/thing.ts',
  line: 1,
  isExported: true,
  isInternal: false,
  tags: {},
} as const;

const preserved: DocNode = {
  ...base,
  id: 'src/thing.ts::add',
  kind: 'function',
  name: 'add',
  signature: 'function add(a: number): number',
  description: 'Add a number.',
  isPreserved: true,
};

describe('renderNode — @preserve wrapping', () => {
  it('wraps a preserved node body when wrapPreserved is on', () => {
    const md = renderNode(preserved, { wrapPreserved: true });
    expect(md).toContain('<!-- @manual:start id="src/thing.ts::add" -->');
    expect(md).toContain('<!-- @manual:end -->');
    // Anchor stays OUTSIDE the zone so the merger can still place the block.
    const anchorIdx = md.indexOf('ovellum:anchor');
    const startIdx = md.indexOf('@manual:start');
    expect(anchorIdx).toBeGreaterThanOrEqual(0);
    expect(anchorIdx).toBeLessThan(startIdx);
    // The body (signature/description) sits inside the zone.
    expect(md).toContain('Add a number.');
  });

  it('does not wrap without the option', () => {
    expect(renderNode(preserved)).not.toContain('@manual:start');
  });

  it('does not wrap a non-preserved node even when the option is on', () => {
    const plain: DocNode = { ...preserved, id: 'src/thing.ts::sub', name: 'sub', isPreserved: false };
    expect(renderNode(plain, { wrapPreserved: true })).not.toContain('@manual:start');
  });
});
