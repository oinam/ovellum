import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { ConfigError, loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import { runBuild, type BuildSummary } from './run-build.js';

const DEBOUNCE_MS = 300;

export interface WatchAndBuildOptions {
  /** Resolved project root. All paths in the config resolve relative to this. */
  cwd: string;
  /** Initial loaded config. */
  config: OvellumConfig;
  /** Path to the loaded config file, or undefined when defaults-only. */
  configFile: string | undefined;
  /**
   * Called after every successful build (initial + each rebuild). Use this
   * hook to broadcast live-reload events or log custom output.
   */
  onBuild?: (result: BuildSummary) => void | Promise<void>;
  /**
   * Called when a build fails. Default: log to stderr. Override to keep a
   * dev server alive instead of crashing.
   */
  onError?: (err: Error) => void;
}

export interface ActiveWatcher {
  /** Close chokidar and release the underlying handles. */
  close: () => Promise<void>;
}

/**
 * Run an initial build, then watch the input directory and the config file
 * and rebuild on every change (debounced 300 ms). When the config file
 * itself changes, reload it before the next build.
 *
 * Shared between `ovellum watch` (which just logs) and `ovellum dev`
 * (which also broadcasts a live-reload signal via the dev server).
 */
export async function watchAndBuild(input: WatchAndBuildOptions): Promise<ActiveWatcher> {
  let { config, configFile } = input;
  const { cwd, onBuild, onError } = input;
  const logError = onError ?? ((err) => process.stderr.write(`build failed: ${err.message}\n`));

  await safeBuild(config, cwd, onBuild, logError);

  const inputAbs = path.resolve(cwd, config.input);
  const outputAbs = path.resolve(cwd, config.output);
  const ignoreFolders = config.site?.ignoreFolders ?? [];
  const watchPaths = [inputAbs];
  if (configFile) watchPaths.push(configFile);

  // Don't watch the output dir, node_modules, dot-dirs, or configured ignore
  // folders. Critically, watching the output dir under `input: '.'` caused an
  // endless rebuild loop — each build writes `dist/`, which fired a change
  // event, which triggered another build. The config file is still watched
  // (added explicitly above and not matched here) so config edits reload.
  const ignored = (testPath: string): boolean => {
    const relOut = path.relative(outputAbs, testPath);
    if (relOut === '' || (!relOut.startsWith('..') && !path.isAbsolute(relOut))) return true;
    const segs = path.relative(inputAbs, testPath).split(path.sep);
    return segs.some((s) => s === 'node_modules' || s.startsWith('.') || ignoreFolders.includes(s));
  };

  const watcher: FSWatcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    ignored,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 25 },
  });

  let timer: NodeJS.Timeout | undefined;
  let pending: Set<string> = new Set();

  const schedule = (file: string): void => {
    pending.add(path.relative(cwd, file).replace(/\\/g, '/') || file);
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const files = Array.from(pending);
      pending = new Set();
      process.stdout.write(
        `\nchanged: ${files.length === 1 ? files[0] : `${files.length} files`}\n`,
      );
      // Reload config if it changed.
      if (configFile && files.some((f) => path.resolve(cwd, f) === configFile)) {
        try {
          const reloaded = await loadOvellumConfig({ cwd, configFile });
          config = reloaded.config;
          configFile = reloaded.configFile;
          process.stdout.write('config reloaded\n');
        } catch (err) {
          if (err instanceof ConfigError) {
            process.stderr.write(`config error: ${err.message}\n`);
            if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
            return;
          }
          throw err;
        }
      }
      await safeBuild(config, cwd, onBuild, logError);
    }, DEBOUNCE_MS);
  };

  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);

  return {
    close: async () => {
      if (timer) clearTimeout(timer);
      await watcher.close();
    },
  };
}

async function safeBuild(
  config: OvellumConfig,
  cwd: string,
  onBuild: WatchAndBuildOptions['onBuild'],
  onError: (err: Error) => void,
): Promise<void> {
  try {
    const result = await runBuild({ config, cwd });
    const count = result.mode === 'manual' ? result.pages?.length ?? 0 : result.written?.length ?? 0;
    const unit = result.mode === 'manual' ? 'page' : 'file';
    process.stdout.write(
      `built ${count} ${unit}(s) in ${result.elapsedMs}ms` +
        (result.warnings.length > 0 ? ` (${result.warnings.length} warning(s))` : '') +
        '\n',
    );
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
    if (onBuild) await onBuild(result);
  } catch (err) {
    onError(err as Error);
  }
}
