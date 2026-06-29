/**
 * Ovellum's programmatic API (ROADMAP D2).
 *
 * Import Ovellum as a library to drive it in-process — from a framework dev
 * server, a monorepo task runner, a custom build step — instead of shelling out
 * to the CLI and parsing stdout. You get back the same structured
 * {@link BuildSummary} the CLI computes.
 *
 * ```ts
 * import { build, watch } from 'ovellum';
 *
 * // One-shot: render docs into a host project's served folder.
 * const summary = await build({ cwd: 'docs', out: '../site/public/docs', base: '/docs' });
 *
 * // Alongside a dev server: rebuild on change, refresh when done.
 * const watcher = await watch({ cwd: 'docs', onBuild: () => devServer.reload() });
 * // …later: await watcher.close();
 * ```
 *
 * This module never runs the CLI — importing `ovellum` is side-effect-free. The
 * `ovellum` executable is a separate binary.
 */
import path from 'node:path';
import {
  loadOvellumConfig,
  type BuildWarning,
  type BuildWarningSeverity,
  type DeployManifest,
  type ManifestFile,
  type OvellumBuildCompleteContext,
  type OvellumBuildStartContext,
  type OvellumConfig,
  type OvellumPageContext,
  type OvellumPageResult,
  type OvellumPlugin,
  type OvellumUserConfig,
} from '@ovellum/core';
import { runBuild, type BuildSummary } from './dev/run-build.js';
import { watchAndBuild, type ActiveWatcher } from './dev/watcher.js';

export { defineConfig } from '@ovellum/core';
export type {
  BuildSummary,
  BuildWarning,
  BuildWarningSeverity,
  DeployManifest,
  ManifestFile,
  OvellumPlugin,
  OvellumPageContext,
  OvellumPageResult,
  OvellumBuildStartContext,
  OvellumBuildCompleteContext,
  ActiveWatcher,
  OvellumConfig,
  OvellumUserConfig,
};

export interface BuildOptions {
  /** Project root. Paths in the config resolve from here. Default: `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path. Auto-discovered from `cwd` when omitted. */
  configFile?: string;
  /** Override the output directory for this build (like the CLI `--out`). */
  out?: string;
  /** Override `site.basePath` for this build (like the CLI `--base`). */
  base?: string;
  /** Include draft pages. Default `false`, matching a production build. */
  drafts?: boolean;
  /** Write `<output>/.ovellum/manifest.json` — a hashed deploy inventory. */
  manifest?: boolean;
  /** Receive per-stage / file-I/O log lines (the data behind `--verbose`). */
  onLog?: (message: string) => void;
  /** Plugins supplied in code, run before any declared in the config. */
  plugins?: OvellumPlugin[];
}

/**
 * Run a one-shot build (parse + generate + merge, or a manual-mode site build)
 * and resolve with its {@link BuildSummary}. Loads and validates the config
 * (auto-discovered unless `configFile` is given) before building.
 */
export async function build(options: BuildOptions = {}): Promise<BuildSummary> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { config } = await loadOvellumConfig({ cwd, configFile: options.configFile });
  return runBuild({
    config,
    cwd,
    includeDrafts: options.drafts === true,
    outDir: options.out,
    basePath: options.base,
    manifest: options.manifest === true,
    onLog: options.onLog,
    plugins: options.plugins,
  });
}

export interface WatchOptions {
  /** Project root. Default: `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path. Auto-discovered from `cwd` when omitted. */
  configFile?: string;
  /** Include draft pages. Default `true`, matching the CLI `watch`/`dev` preview. */
  drafts?: boolean;
  /** Called after the initial build and every rebuild — e.g. to trigger reload. */
  onBuild?: (summary: BuildSummary) => void | Promise<void>;
  /** Called when a build fails (default: log to stderr) so the watcher survives. */
  onError?: (err: Error) => void;
}

/**
 * Build once, then watch the input dir + config file and rebuild on change
 * (incrementally in auto/hybrid mode). Resolves with a handle once the initial
 * build + watcher are up; call `handle.close()` to stop. Set the output
 * directory / base path via the config (e.g. point `output` into your dev
 * server's served folder).
 */
export async function watch(options: WatchOptions = {}): Promise<ActiveWatcher> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { config, configFile } = await loadOvellumConfig({ cwd, configFile: options.configFile });
  return watchAndBuild({
    cwd,
    config,
    configFile,
    includeDrafts: options.drafts ?? true,
    onBuild: options.onBuild,
    onError: options.onError,
  });
}

/**
 * Load and validate an Ovellum config (auto-discovered unless `configFile` is
 * given). Useful for inspecting resolved settings before a `build`/`watch`.
 */
export async function loadConfig(
  options: { cwd?: string; configFile?: string } = {},
): Promise<{ config: OvellumConfig; configFile: string | undefined }> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const { config, configFile } = await loadOvellumConfig({ cwd, configFile: options.configFile });
  return { config, configFile };
}
