import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';

/**
 * The headline promise: in `hybrid` mode, hand-written prose tagged as
 * protected survives every regeneration, and when the symbol it was tied to
 * disappears, the prose is quarantined to the orphan dir rather than lost.
 *
 * This drives the real pipeline in-process — parser → generator → reader →
 * merger → orphan writer via `runBuild` — against a temp project on disk.
 * Unlike the subprocess smoke test, running in-process means this path is
 * visible to coverage and any throw surfaces with a usable stack.
 */

const NOTE = 'HAND-WRITTEN NOTE — keep me across rebuilds.';

function hybridConfig(): OvellumConfig {
  // DEFAULT_CONFIG is already mode: 'hybrid', input: './src', output: './docs'.
  return { ...DEFAULT_CONFIG };
}

/** Collect every file path under a directory tree (recursive). */
async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

describe('hybrid merge survival', () => {
  let dir: string;
  let srcFile: string;
  let docFile: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-merge-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    srcFile = path.join(dir, 'src', 'math.ts');
    docFile = path.join(dir, 'docs', 'math.md');
    writeFileSync(
      srcFile,
      [
        '/** Add two numbers. */',
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
        '',
        '/** Subtract b from a. */',
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

  it('generates anchored docs, then preserves a protected block on rebuild, then orphans it when the symbol is removed', async () => {
    // 1. First build — pure generation. Produces docs/math.md with an anchor
    //    comment per exported symbol.
    const first = await runBuild({ config: hybridConfig(), cwd: dir });
    expect(first.mode).toBe('hybrid');
    expect(existsSync(docFile)).toBe(true);

    let doc = readFileSync(docFile, 'utf8');
    const anchorMatch = doc.match(/<!-- ovellum:anchor id="([^"]*::add)"[^>]*-->/);
    expect(anchorMatch, 'expected an anchor comment for the `add` symbol').not.toBeNull();
    const addAnchorLine = anchorMatch![0];

    // 2. Author a protected block directly under the `add` anchor — exactly
    //    what a human editing the generated file would do.
    const block = ['<!-- @manual:start id="note" -->', NOTE, '<!-- @manual:end -->'].join('\n');
    doc = doc.replace(addAnchorLine, `${addAnchorLine}\n${block}`);
    writeFileSync(docFile, doc, 'utf8');

    // 3. Rebuild with the source unchanged — the prose must survive, and
    //    nothing should be orphaned.
    const second = await runBuild({ config: hybridConfig(), cwd: dir });
    const afterRebuild = readFileSync(docFile, 'utf8');
    expect(afterRebuild).toContain(NOTE);
    expect(afterRebuild).toContain('<!-- @manual:start id="note" -->');
    expect(second.merged).toContain('docs/math.md');
    expect(second.orphans).toBe(0);
    // Regenerated content is still present alongside the preserved prose.
    expect(afterRebuild).toContain('add');

    // 4. Remove the `add` symbol. Its anchor disappears, so the protected
    //    prose tied to it can no longer be placed — it must be quarantined,
    //    never silently dropped. `sub` is kept so the doc still generates.
    writeFileSync(
      srcFile,
      [
        '/** Subtract b from a. */',
        'export function sub(a: number, b: number): number {',
        '  return a - b;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );

    const third = await runBuild({ config: hybridConfig(), cwd: dir });
    const afterRemoval = readFileSync(docFile, 'utf8');

    // The prose is gone from the live doc...
    expect(afterRemoval).not.toContain(NOTE);
    // ...the summary reports the quarantine...
    expect(third.orphans).toBeGreaterThanOrEqual(1);
    expect(third.quarantined?.length ?? 0).toBeGreaterThanOrEqual(1);

    // ...and it is recoverable: an orphan file under the orphan dir still
    // holds the exact prose.
    const orphanDir = path.resolve(dir, DEFAULT_CONFIG.protect.orphanDir);
    const orphanFiles = await walk(orphanDir);
    expect(orphanFiles.length).toBeGreaterThanOrEqual(1);
    const anyHoldsNote = orphanFiles.some((f) => readFileSync(f, 'utf8').includes(NOTE));
    expect(anyHoldsNote, 'an orphan file should contain the rescued prose').toBe(true);
  });
});
