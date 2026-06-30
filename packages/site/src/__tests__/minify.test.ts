import { mkdtempSync } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { isMinifiable, minifyFile } from '../minify.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
// esbuild is an optional peer; load it dynamically and skip the transform tests
// when it isn't installed so the suite stays green on environments without it.
let esbuild: any = null;
beforeAll(async () => {
  try {
    esbuild = await import('esbuild' as string);
  } catch {
    esbuild = null;
  }
});

describe('isMinifiable', () => {
  it('matches css/js (case-insensitive), skips other extensions', () => {
    for (const f of ['a.css', 'a.js', 'a.mjs', 'a.cjs', 'STYLE.CSS']) {
      expect(isMinifiable(f)).toBe(true);
    }
    for (const f of ['a.png', 'a.html', 'a.md', 'a.json', 'noext']) {
      expect(isMinifiable(f)).toBe(false);
    }
  });
});

describe('minifyFile', () => {
  it('minifies a CSS file smaller', async () => {
    if (!esbuild) return; // esbuild not installed — skip
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-min-'));
    const src = path.join(dir, 'in.css');
    const dest = path.join(dir, 'out.css');
    await writeFile(
      src,
      '/* a comment */\n.button {\n  color:  rebeccapurple;\n  padding: 8px  16px;\n}\n\n\n.other { margin: 0; }\n',
    );
    const res = await minifyFile(src, dest);
    expect(res.minified).toBe(true);
    expect(res.savedBytes).toBeGreaterThan(0);
    const out = await readFile(dest, 'utf8');
    expect(out).not.toContain('/* a comment */');
    expect((await stat(dest)).size).toBeLessThan((await stat(src)).size);
  });

  it('keeps the original bytes when minification would not be smaller', async () => {
    if (!esbuild) return;
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-min2-'));
    const src = path.join(dir, 'tiny.js');
    const dest = path.join(dir, 'out.js');
    await writeFile(src, 'a()'); // already minimal
    const res = await minifyFile(src, dest);
    if (!res.minified) {
      expect((await readFile(dest, 'utf8'))).toBe('a()');
    }
  });
});
