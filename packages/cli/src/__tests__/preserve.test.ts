import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';

/**
 * End-to-end `@preserve` (A5): a `@preserve`-tagged symbol's doc is seeded as a
 * `@manual` zone on first build; author edits inside it survive regeneration,
 * with no duplicate block. Non-preserved symbols get no zone.
 */

describe('@preserve auto-wrapping', () => {
  let dir: string;
  let doc: string;
  const config: OvellumConfig = { ...DEFAULT_CONFIG, input: './src', output: './docs', mode: 'hybrid' };

  function countOccurrences(s: string, sub: string): number {
    return s.split(sub).length - 1;
  }

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-preserve-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    doc = path.join(dir, 'docs', 'm.md');
    writeFileSync(
      path.join(dir, 'src', 'm.ts'),
      [
        '/**',
        ' * Add two numbers.',
        ' * @preserve',
        ' */',
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
        '/** Plain subtract. */',
        'export function sub(a: number, b: number): number {',
        '  return a - b;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('seeds a zone for the preserved symbol only', async () => {
    await runBuild({ config, cwd: dir });
    const body = readFileSync(doc, 'utf8');
    expect(countOccurrences(body, '@manual:start')).toBe(1);
    expect(body).toContain('<!-- @manual:start id="src/m.ts::add" -->');
  });

  it('preserves an edit across rebuild without duplicating the block', async () => {
    await runBuild({ config, cwd: dir });
    let body = readFileSync(doc, 'utf8');
    body = body.replace('Add two numbers.', 'Add two numbers. HAND-EDITED.');
    writeFileSync(doc, body, 'utf8');

    const summary = await runBuild({ config, cwd: dir });
    const after = readFileSync(doc, 'utf8');
    expect(after).toContain('HAND-EDITED.');
    expect(countOccurrences(after, '@manual:start')).toBe(1);
    expect(summary.orphans).toBe(0);
  });

  it('orphans the preserved prose if the symbol is deleted', async () => {
    await runBuild({ config, cwd: dir });
    let body = readFileSync(doc, 'utf8');
    body = body.replace('Add two numbers.', 'Add two numbers. KEEP-ME.');
    writeFileSync(doc, body, 'utf8');
    await runBuild({ config, cwd: dir });

    // Remove `add` from source; keep `sub` so the doc still generates.
    writeFileSync(
      path.join(dir, 'src', 'm.ts'),
      '/** Plain subtract. */\nexport function sub(a: number, b: number): number {\n  return a - b;\n}\n',
      'utf8',
    );
    const summary = await runBuild({ config, cwd: dir });
    expect(summary.orphans).toBeGreaterThanOrEqual(1);
  });
});
