import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { build, watch, loadConfig } from '../api.js';

/**
 * Programmatic API (ROADMAP D2) — driving Ovellum in-process via `build` /
 * `watch` / `loadConfig`, returning the same structured BuildSummary the CLI
 * computes. (Packaging — ESM-only, self-contained dts, no shebang on the lib —
 * is verified at build time.)
 */

describe('programmatic API', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-api-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', input: './src', output: './docs' }),
    );
    writeFileSync(
      path.join(dir, 'src', 'm.ts'),
      '/** Add. */\nexport function add(a: number): number {\n  return a;\n}\n',
      'utf8',
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('build() runs a build and returns the BuildSummary', async () => {
    const summary = await build({ cwd: dir });
    expect(summary.mode).toBe('hybrid');
    expect(summary.written).toEqual(['docs/m.md']);
    expect(summary.irPath).toBe('.ovellum/ir.json');
    expect(existsSync(path.join(dir, 'docs', 'm.md'))).toBe(true);
  });

  it('build() honors the out / base overrides', async () => {
    const summary = await build({ cwd: dir, out: 'site/docs', base: '/docs' });
    expect(summary.written).toEqual(['site/docs/m.md']);
    expect(existsSync(path.join(dir, 'site', 'docs', 'm.md'))).toBe(true);
    // The IR snapshot stays at the project root regardless of --out.
    expect(existsSync(path.join(dir, '.ovellum', 'ir.json'))).toBe(true);
  });

  it('build() streams stage detail to the onLog callback', async () => {
    const lines: string[] = [];
    await build({ cwd: dir, onLog: (m) => lines.push(m) });
    expect(lines.some((l) => l.startsWith('parsed'))).toBe(true);
    expect(lines.some((l) => l.startsWith('wrote docs/m.md'))).toBe(true);
  });

  it('watch() builds once and returns a closable handle', async () => {
    let builds = 0;
    const watcher = await watch({ cwd: dir, onBuild: () => void builds++ });
    try {
      expect(typeof watcher.close).toBe('function');
      expect(builds).toBeGreaterThanOrEqual(1); // initial build fired onBuild
    } finally {
      await watcher.close();
    }
  });

  it('loadConfig() returns the resolved config', async () => {
    const { config, configFile } = await loadConfig({ cwd: dir });
    expect(config.mode).toBe('hybrid');
    expect(configFile).toBeTruthy();
  });
});
