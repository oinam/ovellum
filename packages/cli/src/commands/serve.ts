import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { startDevServer } from '../dev/server.js';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '127.0.0.1';

export const serveCommand = defineCommand({
  meta: {
    name: 'serve',
    description: 'Serve the built site over HTTP. No watch, no live reload.',
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
    const { config } = loaded;

    const outputAbs = path.resolve(cwd, config.output);
    if (!existsSync(outputAbs)) {
      process.stderr.write(
        `output directory does not exist: ${path.relative(cwd, outputAbs)}\n` +
          `hint: run \`ovellum build\` first, or \`ovellum dev\` to build + watch + serve.\n`,
      );
      process.exit(1);
    }

    const port = parsePort(args.port) ?? DEFAULT_PORT;
    const host = args.host ?? DEFAULT_HOST;

    const server = await startDevServer({
      rootDir: outputAbs,
      port,
      host,
      liveReload: false,
    });

    process.stdout.write(
      `ovellum serve\n` +
        `  serving: ${path.relative(cwd, outputAbs)}/\n` +
        `  url:     ${server.url}\n` +
        `press Ctrl-C to exit.\n`,
    );

    const shutdown = async (): Promise<void> => {
      process.stdout.write('\nstopping server…\n');
      await server.close();
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
