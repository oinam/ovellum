import { describe, expect, it } from 'vitest';
import type { DocNode } from '@ovellum/core';
import { detectRenames } from '../dev/rename.js';

/**
 * Suggest-only rename detection (ROADMAP A3). Pairs a disappeared anchor with a
 * similar new one (name + signature shape), so a refactor reads as a rename
 * instead of an unrelated remove + add.
 */

function node(file: string, name: string, opts: Partial<DocNode> = {}): DocNode {
  return {
    id: `${file}::${name}`,
    kind: 'function',
    name,
    filePath: file,
    line: 1,
    signature: `function ${name}(d: Date): string`,
    params: [{ name: 'd', type: 'Date', optional: false }],
    returns: { type: 'string' },
    tags: {},
    isExported: true,
    isInternal: false,
    isPreserved: false,
    ...opts,
  };
}

describe('detectRenames', () => {
  it('pairs a same-shape symbol with a similar name', () => {
    const removed = [node('src/date.ts', 'formatDate')];
    const added = [node('src/date.ts', 'formatDateUTC')];
    const renames = detectRenames(removed, added);
    expect(renames).toHaveLength(1);
    expect(renames[0].from.id).toBe('src/date.ts::formatDate');
    expect(renames[0].to.id).toBe('src/date.ts::formatDateUTC');
    expect(renames[0].signatureChanged).toBe(false);
    expect(renames[0].confidence).toBeGreaterThan(0.6);
  });

  it('flags a rename that also changed signature', () => {
    const removed = [node('src/date.ts', 'formatDate')];
    const added = [
      node('src/date.ts', 'formatDateUTC', {
        signature: 'function formatDateUTC(d: Date, tz: string): string',
        params: [
          { name: 'd', type: 'Date', optional: false },
          { name: 'tz', type: 'string', optional: false },
        ],
      }),
    ];
    const renames = detectRenames(removed, added);
    expect(renames).toHaveLength(1);
    expect(renames[0].signatureChanged).toBe(true);
  });

  it('does not pair unrelated symbols that merely share a shape', () => {
    const removed = [node('src/a.ts', 'parseConfig')];
    const added = [node('src/a.ts', 'shutdown')];
    expect(detectRenames(removed, added)).toHaveLength(0);
  });

  it('does not pair across different kinds', () => {
    const removed = [node('src/a.ts', 'thing', { kind: 'function' })];
    const added = [node('src/a.ts', 'thing', { kind: 'interface', id: 'src/a.ts::thing2', name: 'thing2' })];
    // same-ish name but different kind → not a rename
    const renames = detectRenames(removed, added);
    expect(renames).toHaveLength(0);
  });

  it('matches greedily 1:1 by best score', () => {
    const removed = [node('src/m.ts', 'getUser'), node('src/m.ts', 'getOrder')];
    const added = [node('src/m.ts', 'getOrderById'), node('src/m.ts', 'getUserById')];
    const renames = detectRenames(removed, added);
    const pairs = Object.fromEntries(renames.map((r) => [r.from.name, r.to.name]));
    expect(pairs.getUser).toBe('getUserById');
    expect(pairs.getOrder).toBe('getOrderById');
  });

  it('detects a moved-file rename when name + shape are strong', () => {
    const removed = [node('src/old.ts', 'formatDate')];
    const added = [node('src/new.ts', 'formatDate')];
    const renames = detectRenames(removed, added);
    expect(renames).toHaveLength(1);
    expect(renames[0].from.source).toBe('src/old.ts');
    expect(renames[0].to.source).toBe('src/new.ts');
  });
});
