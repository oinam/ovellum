import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { createIncrementalParser } from '@ovellum/parser';
import { runBuild, runIncrementalBuild } from '../dev/run-build.js';
import { readProjectIR } from '../dev/ir.js';

/**
 * Incremental watch builds (ROADMAP A7): after a full build, a single-file edit
 * re-parses only that file (warm parser) and rebuilds only its output, leaving
 * other docs untouched — while the persisted IR still reflects the whole
 * project and hybrid protected blocks survive.
 */

describe('runIncrementalBuild', () => {
  let dir: string;
  const config: OvellumConfig = { ...DEFAULT_CONFIG, input: './src', output: './docs', mode: 'hybrid' };
  const srcAbs = (n: string) => path.join(dir, 'src', n);
  const writeSrc = (n: string, body: string) => writeFileSync(srcAbs(n), body, 'utf8');

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-incbuild-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeSrc('a.ts', '/** Alpha. */\nexport function alpha(): number {\n  return 1;\n}\n');
    writeSrc('b.ts', '/** Beta. */\nexport function beta(): number {\n  return 2;\n}\n');
    await runBuild({ config, cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('rebuilds only the changed file and leaves others untouched', async () => {
    const bDoc = path.join(dir, 'docs', 'b.md');
    const bMtimeBefore = statSync(bDoc).mtimeMs;

    const parser = createIncrementalParser({ config, cwd: dir });
    writeSrc('a.ts', '/** Alpha, revised. */\nexport function alpha(x: number): number {\n  return x;\n}\n');
    const summary = await runIncrementalBuild({ parser, config, cwd: dir, changed: [srcAbs('a.ts')], removed: [] });

    expect(summary.written).toEqual(['docs/a.md']);
    expect(readFileSync(path.join(dir, 'docs', 'a.md'), 'utf8')).toContain('x: number');
    // b.md was not rewritten.
    expect(statSync(bDoc).mtimeMs).toBe(bMtimeBefore);

    // IR reflects the whole project (both files), with a's update applied.
    const ir = readProjectIR(dir)!;
    expect(ir.project.files.map((f) => f.filePath)).toEqual(['src/a.ts', 'src/b.ts']);
    const alpha = ir.project.files.find((f) => f.filePath === 'src/a.ts')!.nodes[0];
    expect(alpha.signature).toContain('x: number');
  });

  it('preserves a hybrid protected block through an incremental rebuild', async () => {
    const aDoc = path.join(dir, 'docs', 'a.md');
    let body = readFileSync(aDoc, 'utf8');
    const anchor = body.match(/<!-- ovellum:anchor id="src\/a.ts::alpha"[^>]*-->/)![0];
    body = body.replace(anchor, `${anchor}\n<!-- @manual:start id="note" -->\nKEEP ME.\n<!-- @manual:end -->`);
    writeFileSync(aDoc, body, 'utf8');

    const parser = createIncrementalParser({ config, cwd: dir });
    writeSrc('a.ts', '/** Alpha, revised. */\nexport function alpha(): number {\n  return 9;\n}\n');
    const summary = await runIncrementalBuild({ parser, config, cwd: dir, changed: [srcAbs('a.ts')], removed: [] });

    const after = readFileSync(aDoc, 'utf8');
    expect(after).toContain('KEEP ME.');
    expect(after).toContain('Alpha, revised.');
    expect(summary.merged).toContain('docs/a.md');
  });

  it('does nothing when the edit does not change the IR', async () => {
    const parser = createIncrementalParser({ config, cwd: dir });
    // Rewrite a.ts with identical content.
    writeSrc('a.ts', '/** Alpha. */\nexport function alpha(): number {\n  return 1;\n}\n');
    const summary = await runIncrementalBuild({ parser, config, cwd: dir, changed: [srcAbs('a.ts')], removed: [] });
    expect(summary.written).toEqual([]);
  });
});
