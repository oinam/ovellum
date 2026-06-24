import path from 'node:path';
import { defineCommand } from 'citty';
import { createMcpServer } from '../dev/mcp/server.js';

// Replaced at build time by tsup `define` (see tsup.config.ts).
declare const __OVELLUM_VERSION__: string;

export const mcpCommand = defineCommand({
  meta: {
    name: 'mcp',
    description:
      'Run Ovellum as an MCP server over stdio, exposing its tools (query symbols, diff, list orphans, get page, build, write protected zones) to an AI agent.',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Project root the tools operate on (defaults to current directory)',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    const version = typeof __OVELLUM_VERSION__ === 'string' ? __OVELLUM_VERSION__ : '0.0.0';
    const server = createMcpServer({ cwd, version });
    // Stdout is the protocol channel — never write anything else to it.
    await server.runStdio(process.stdin, process.stdout);
  },
});
