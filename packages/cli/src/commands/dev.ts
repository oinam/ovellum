import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { startDevServer } from '../dev/server.js';
import { watchAndBuild } from '../dev/watcher.js';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '127.0.0.1';

export const devCommand = defineCommand({
  meta: {
    name: 'dev',
    description: 'Build, watch for changes, serve, and live-reload connected browsers.',
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
    port: {
      type: 'string',
      description: `Port to bind (default ${DEFAULT_PORT}; auto-bumps if busy)`,
    },
    host: {
      type: 'string',
      description: `Host to bind (default ${DEFAULT_HOST}; pass 0.0.0.0 to expose on the network)`,
    },
    drafts: {
      type: 'boolean',
      default: true,
      description: 'Show draft pages (on by default in dev; use --no-drafts to simulate production)',
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

    if (config.mode !== 'manual') {
      process.stderr.write(
        `'dev' currently supports manual mode only. Got '${config.mode}'. ` +
          `Auto / hybrid coverage is tracked in TODO.md Phase 6.\n`,
      );
      process.exit(1);
    }

    const port = parsePort(args.port) ?? DEFAULT_PORT;
    const host = args.host ?? DEFAULT_HOST;
    const outputAbs = path.resolve(cwd, config.output);

    process.stdout.write(`ovellum dev starting from ${configFile ?? '(defaults)'}\n`);

    // Start the server first so its `broadcastReload` is in scope when the
    // watcher fires its initial build. The server happily serves 404s
    // during the brief window before dist/ is populated.
    const server = await startDevServer({
      rootDir: outputAbs,
      port,
      host,
      liveReload: true,
    });

    const watcher = await watchAndBuild({
      cwd,
      config,
      configFile,
      includeDrafts: args.drafts !== false,
      onBuild: () => server.broadcastReload(),
    });

    const inputAbs = path.resolve(cwd, config.input);
    process.stdout.write(
      `\nwatching ${path.relative(cwd, inputAbs) || inputAbs} for changes…\n` +
        `local:   ${server.url}\n` +
        `press Ctrl-C to exit.\n`,
    );

    const shutdown = async (): Promise<void> => {
      process.stdout.write('\nstopping dev server…\n');
      await Promise.all([watcher.close(), server.close()]);
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await new Promise(() => {});
  },
});

function parsePort(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(`--port must be an integer between 1 and 65535; got '${raw}'.`);
  }
  return n;
}
