import path from 'node:path';
import { defineCommand } from 'citty';
import chokidar, { type FSWatcher } from 'chokidar';
import { ConfigError, loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import { buildSite } from '@ovellum/site';

const DEBOUNCE_MS = 300;

export const watchCommand = defineCommand({
  meta: {
    name: 'watch',
    description: 'Build the site, then rebuild on every change under input/.',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to ovellum.config.{ts,js,json}',
    },
    cwd: {
      type: 'string',
      description: 'Project root (defaults to current directory)',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    let loaded;
    try {
      loaded = await loadOvellumConfig({ cwd, configFile: args.config });
    } catch (err) {
      if (err instanceof ConfigError) {
        process.stderr.write(`config error: ${err.message}\n`);
        if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        process.exit(3);
      }
      throw err;
    }
    let { config, configFile } = loaded;

    if (config.mode !== 'manual') {
      process.stderr.write(
        `'watch' currently supports manual mode only. Got '${config.mode}'. ` +
          `Auto / hybrid coverage is tracked in TODO.md Phase 6.\n`,
      );
      process.exit(1);
    }

    process.stdout.write(`ovellum watch starting from ${configFile ?? '(defaults)'}\n`);

    await safeBuild(config, cwd);

    const inputAbs = path.resolve(cwd, config.input);
    const watchPaths = [inputAbs];
    if (configFile) watchPaths.push(configFile);

    const watcher: FSWatcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
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
        // If the config file changed, reload it.
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
        await safeBuild(config, cwd);
      }, DEBOUNCE_MS);
    };

    watcher.on('add', schedule);
    watcher.on('change', schedule);
    watcher.on('unlink', schedule);

    process.stdout.write(`watching ${path.relative(cwd, inputAbs) || inputAbs} for changes…\n`);
    process.stdout.write('press Ctrl-C to exit.\n');

    const shutdown = async (): Promise<void> => {
      process.stdout.write('\nstopping watcher…\n');
      await watcher.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep the process alive (chokidar's watcher already does this on its own,
    // but be explicit so future refactors don't accidentally let the event
    // loop drain).
    await new Promise(() => {});
  },
});

async function safeBuild(config: OvellumConfig, cwd: string): Promise<void> {
  const startedAt = Date.now();
  try {
    const result = await buildSite({ config, cwd });
    const elapsed = Date.now() - startedAt;
    process.stdout.write(
      `built ${result.pages.length} page(s) in ${elapsed}ms` +
        (result.warnings.length > 0 ? ` (${result.warnings.length} warning(s))` : '') +
        '\n',
    );
    for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
  } catch (err) {
    process.stderr.write(`build failed: ${(err as Error).message}\n`);
  }
}
