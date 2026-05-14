import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigError } from '../errors.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { loadDirectoryOverride, loadOvellumConfig } from '../config/load.js';

describe('loadOvellumConfig', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'ovellum-core-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns defaults when no config file is present', async () => {
    const result = await loadOvellumConfig({ cwd: tmp });
    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.configFile).toBeUndefined();
    expect(result.cwd).toBe(path.resolve(tmp));
  });

  it('loads and merges a JSON config', async () => {
    writeFileSync(
      path.join(tmp, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', output: './site' }),
    );
    const result = await loadOvellumConfig({ cwd: tmp });
    expect(result.config.mode).toBe('manual');
    expect(result.config.output).toBe('./site');
    // Defaults preserved for untouched fields:
    expect(result.config.input).toBe(DEFAULT_CONFIG.input);
    expect(result.config.protect.orphanDir).toBe(DEFAULT_CONFIG.protect.orphanDir);
    expect(result.configFile).toBeDefined();
  });

  it('applies protect partials without losing defaults', async () => {
    writeFileSync(
      path.join(tmp, 'ovellum.config.json'),
      JSON.stringify({ protect: { orphanRetention: 7 } }),
    );
    const { config } = await loadOvellumConfig({ cwd: tmp });
    expect(config.protect.orphanRetention).toBe(7);
    expect(config.protect.blockTag).toBe(DEFAULT_CONFIG.protect.blockTag);
  });

  it('throws ConfigError on invalid mode', async () => {
    writeFileSync(path.join(tmp, 'ovellum.config.json'), JSON.stringify({ mode: 'nope' }));
    await expect(loadOvellumConfig({ cwd: tmp })).rejects.toBeInstanceOf(ConfigError);
  });
});

describe('loadDirectoryOverride', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'ovellum-core-dir-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns rootConfig unchanged when no nested config exists', async () => {
    const sub = path.join(tmp, 'src', 'utils');
    mkdirSync(sub, { recursive: true });
    const root = await loadOvellumConfig({ cwd: tmp });
    const result = await loadDirectoryOverride(tmp, sub, root.config);
    expect(result).toEqual(root.config);
  });

  it('child config wins on conflict (deepest dir wins)', async () => {
    writeFileSync(
      path.join(tmp, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', defaultFormat: 'md' }),
    );
    const sub = path.join(tmp, 'packages');
    mkdirSync(sub);
    writeFileSync(path.join(sub, 'ovellum.config.json'), JSON.stringify({ mode: 'manual' }));
    const root = await loadOvellumConfig({ cwd: tmp });
    expect(root.config.mode).toBe('hybrid');

    const result = await loadDirectoryOverride(tmp, sub, root.config);
    expect(result.mode).toBe('manual');
    // Inherited defaultFormat from root (sub did not set it):
    expect(result.defaultFormat).toBe('md');
  });

  it('rejects target directory outside the project root', async () => {
    const outside = path.join(tmp, '..', 'somewhere-else');
    await expect(loadDirectoryOverride(tmp, outside, DEFAULT_CONFIG)).rejects.toBeInstanceOf(
      ConfigError,
    );
  });
});
