import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { OvellumPlugin } from '@ovellum/core';
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

/**
 * Plugin / build-lifecycle hooks (B1 slice 1 + D3). Driven via `build({ plugins })`
 * so the functions don't need a TS config file on disk.
 */
describe('plugins (lifecycle hooks)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-plugin-'));
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', input: './content', output: './dist', site: { title: 'Base' } }),
    );
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Home\n\nHello.\n', 'utf8');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('fires every hook in order; transformPage rewrites the written HTML', async () => {
    const calls: string[] = [];
    const plugin: OvellumPlugin = {
      name: 'recorder',
      onResolveConfig: () => void calls.push('resolve'),
      onBuildStart: ({ mode }) => void calls.push(`start:${mode}`),
      transformPage: ({ url, html }) => {
        calls.push(`page:${url}`);
        return { html: html.replace('</body>', '<!--ov-plugin--></body>') };
      },
      onBuildComplete: ({ outDir, manifest }) => {
        calls.push(`complete:${manifest.fileCount > 0}:${path.isAbsolute(outDir)}`);
      },
    };

    await build({ cwd: dir, plugins: [plugin] });

    expect(calls[0]).toBe('resolve');
    expect(calls[1]).toBe('start:manual');
    expect(calls).toContain('page:/');
    // onBuildComplete ran last, got a populated manifest + an absolute outDir.
    expect(calls[calls.length - 1]).toBe('complete:true:true');

    const html = readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');
    expect(html).toContain('<!--ov-plugin-->');
  });

  it('onResolveConfig can replace the config for the build', async () => {
    const retitle: OvellumPlugin = {
      name: 'retitle',
      onResolveConfig: (config) => ({ ...config, site: { ...config.site, title: 'Plugged' } }),
    };
    await build({ cwd: dir, plugins: [retitle] });
    const html = readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');
    expect(html).toContain('Plugged');
    expect(html).not.toContain('>Base<');
  });

  it('a plugin remarkPlugin flows through the build into the rendered HTML', async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const remarkStamp = () => (tree: any) =>
      void tree.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: 'FROM_REMARK_PLUGIN' }],
      });
    const plugin: OvellumPlugin = { name: 'md', remarkPlugins: [remarkStamp] };
    await build({ cwd: dir, plugins: [plugin] });
    const html = readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');
    expect(html).toContain('FROM_REMARK_PLUGIN');
  });

  it('a throwing hook fails the build, attributed to the plugin by name', async () => {
    const boom: OvellumPlugin = {
      name: 'boom',
      onBuildStart: () => {
        throw new Error('nope');
      },
    };
    await expect(build({ cwd: dir, plugins: [boom] })).rejects.toThrow(
      /\[plugin: boom\] onBuildStart failed: nope/,
    );
  });
});
