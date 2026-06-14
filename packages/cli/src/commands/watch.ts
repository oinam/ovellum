import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { watchAndBuild } from '../dev/watcher.js';

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
    drafts: {
      type: 'boolean',
      default: true,
      description: 'Show draft pages (on by default; use --no-drafts to simulate production)',
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
    const { config, configFile } = loaded;
    process.stdout.write(
      `ovellum watch starting from ${configFile ?? '(defaults)'} (mode: ${config.mode})\n`,
    );

    const watcher = await watchAndBuild({
      cwd,
      config,
      configFile,
      includeDrafts: args.drafts !== false,
    });

    const inputAbs = path.resolve(cwd, config.input);
    process.stdout.write(`watching ${path.relative(cwd, inputAbs) || inputAbs} for changes…\n`);
    process.stdout.write('press Ctrl-C to exit.\n');

    const shutdown = async (): Promise<void> => {
      process.stdout.write('\nstopping watcher…\n');
      await watcher.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await new Promise(() => {});
  },
});
