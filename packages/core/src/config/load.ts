import path from 'node:path';
import { existsSync } from 'node:fs';
import { loadConfig as c12LoadConfig } from 'c12';
import { ConfigError } from '../errors.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import type { OvellumConfig, OvellumUserConfig } from '../types/config.js';
import { mergeConfig } from './merge.js';
import { validateUserConfig } from './validate.js';

export interface LoadOvellumConfigOptions {
  /** Project root. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Override config file name (sans extension). Defaults to `ovellum`. */
  name?: string;
  /** Explicit path to a config file. Overrides discovery. */
  configFile?: string;
}

export interface LoadedOvellumConfig {
  config: OvellumConfig;
  /** Absolute path of the loaded config file, or `undefined` if defaults only. */
  configFile?: string;
  /** Resolved project root. */
  cwd: string;
}

const CONFIG_EXTENSIONS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json'] as const;

/**
 * Load the root `ovellum.config.*` from `cwd`, validate it, and merge it onto
 * built-in defaults. Returns defaults alone when no config file is present.
 */
export async function loadOvellumConfig(
  options: LoadOvellumConfigOptions = {},
): Promise<LoadedOvellumConfig> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const name = options.name ?? 'ovellum';

  let raw: unknown;
  let configFile: string | undefined;

  try {
    const result = await c12LoadConfig<OvellumUserConfig>({
      cwd,
      name,
      configFile: options.configFile,
      // We apply our own defaults after validation so users see clean errors
      // pointing only at their own fields.
      defaults: {},
    });
    raw = result.config ?? {};
    // c12 returns the bare name (e.g. "ovellum.config") even when no file
    // matched, so only treat it as a real file when it points at an existing
    // absolute path.
    const resolved = result.configFile
      ? path.isAbsolute(result.configFile)
        ? result.configFile
        : undefined
      : undefined;
    configFile = resolved && existsSync(resolved) ? resolved : undefined;
  } catch (err) {
    throw new ConfigError('Failed to load ovellum config.', { cause: err });
  }

  const userConfig = validateUserConfig(raw);
  const config = mergeConfig(DEFAULT_CONFIG, userConfig);
  return { config, configFile, cwd };
}

/**
 * Find the deepest `ovellum.config.*` between `cwd` and `targetDir` (inclusive
 * of `targetDir`, exclusive of `cwd`'s parent) and merge it onto `rootConfig`.
 * Returns `rootConfig` unchanged if no nested config is present.
 *
 * Per-directory configs are loaded synchronously via `import()` is overkill —
 * for Phase 1 we only support `.json`, `.js`, `.mjs`, `.cjs` here; `.ts`
 * support requires going through `c12` again. We defer the `.ts` path to a
 * follow-up since the parser pipeline will normally call this on every source
 * file and re-running c12 per directory would be expensive.
 */
export async function loadDirectoryOverride(
  rootCwd: string,
  targetDir: string,
  rootConfig: OvellumConfig,
  options: { name?: string } = {},
): Promise<OvellumConfig> {
  const name = options.name ?? 'ovellum';
  const root = path.resolve(rootCwd);
  let dir = path.resolve(targetDir);

  if (!dir.startsWith(root)) {
    throw new ConfigError(`targetDir (${targetDir}) is outside the project root (${rootCwd}).`, {
      hint: 'Per-directory overrides must live within the project root.',
    });
  }

  const overrideChain: string[] = [];
  while (dir !== root) {
    const found = findConfigFile(dir, name);
    if (found) overrideChain.unshift(found);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (overrideChain.length === 0) return rootConfig;

  let merged = rootConfig;
  for (const file of overrideChain) {
    const raw = await c12LoadConfig<OvellumUserConfig>({
      cwd: path.dirname(file),
      configFile: file,
      name,
      defaults: {},
    });
    const validated = validateUserConfig(raw.config ?? {});
    merged = mergeConfig(merged, validated);
  }
  return merged;
}

function findConfigFile(dir: string, name: string): string | undefined {
  for (const ext of CONFIG_EXTENSIONS) {
    const candidate = path.join(dir, `${name}.config.${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}
