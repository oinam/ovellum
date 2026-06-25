import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { runBuild } from '../dev/run-build.js';
import { runCheck } from '../commands/check.js';

/**
 * `ovellum check --strict` extra validations (ROADMAP A6): id-less protected
 * zones, anchors pointing at gone symbols, and pages with no resolvable title.
 * None of these fire without `--strict`.
 */

describe('check --strict — hybrid (zones + anchors)', () => {
  let dir: string;
  const config: OvellumConfig = { ...DEFAULT_CONFIG, input: './src', output: './docs', mode: 'hybrid' };

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-strict-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'src', 'm.ts'),
      '/** Add. */\nexport function add(a: number): number {\n  return a;\n}\n/** Sub. */\nexport function sub(a: number): number {\n  return a;\n}\n',
      'utf8',
    );
    await runBuild({ config, cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('flags an id-less protected zone, only under --strict', async () => {
    const docPath = path.join(dir, 'docs', 'm.md');
    let doc = readFileSync(docPath, 'utf8');
    const anchor = doc.match(/<!-- ovellum:anchor id="src\/m.ts::add"[^>]*-->/)![0];
    doc = doc.replace(anchor, `${anchor}\n<!-- @manual:start -->\nnote\n<!-- @manual:end -->`);
    writeFileSync(docPath, doc, 'utf8');

    const lax = await runCheck({ config, cwd: dir });
    expect(lax.issues.some((i) => i.kind === 'positional-zone')).toBe(false);

    const strict = await runCheck({ config, cwd: dir, strict: true });
    const zone = strict.issues.find((i) => i.kind === 'positional-zone');
    expect(zone?.file).toBe('docs/m.md');
  });

  it('flags a doc anchor whose symbol is gone from the source', async () => {
    // Remove `sub` from source without rebuilding — the doc anchor lingers.
    writeFileSync(path.join(dir, 'src', 'm.ts'), '/** Add. */\nexport function add(a: number): number {\n  return a;\n}\n', 'utf8');

    const strict = await runCheck({ config, cwd: dir, strict: true });
    const stale = strict.issues.find((i) => i.kind === 'stale-anchor');
    expect(stale?.message).toContain('src/m.ts::sub');
    // `add` is still present, so only one stale anchor.
    expect(strict.issues.filter((i) => i.kind === 'stale-anchor')).toHaveLength(1);
  });
});

describe('check --strict — manual (titles)', () => {
  let dir: string;
  const config: OvellumConfig = { ...DEFAULT_CONFIG, input: './content', output: './dist', mode: 'manual' };

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-strict-m-'));
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '---\ntitle: Home\n---\n\n# Home\n\nok\n', 'utf8');
    writeFileSync(path.join(dir, 'content', 'h1only.md'), '# Just an H1\n\nbody\n', 'utf8');
    writeFileSync(path.join(dir, 'content', 'notitle.md'), 'Body with no title and no heading.\n', 'utf8');
    await runBuild({ config, cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('flags only the page with neither frontmatter title nor an H1', async () => {
    const strict = await runCheck({ config, cwd: dir, strict: true });
    const missing = strict.issues.filter((i) => i.kind === 'missing-frontmatter');
    expect(missing.map((i) => i.file)).toEqual(['content/notitle.md']);

    const lax = await runCheck({ config, cwd: dir });
    expect(lax.issues.some((i) => i.kind === 'missing-frontmatter')).toBe(false);
  });
});
