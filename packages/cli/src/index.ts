import { defineCommand, runMain } from 'citty';
import { agentsCommand } from './commands/agents.js';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { cleanCommand } from './commands/clean.js';
import { devCommand } from './commands/dev.js';
import { diffCommand } from './commands/diff.js';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
import { orphansCommand } from './commands/orphans.js';
import { serveCommand } from './commands/serve.js';
import { upgradeCommand } from './commands/upgrade.js';
import { watchCommand } from './commands/watch.js';
import { maybeNotifyUpdate } from './update/notifier.js';

// Replaced at build time by tsup `define` with the version from package.json.
declare const __OVELLUM_VERSION__: string;

const main = defineCommand({
  meta: {
    name: 'ovellum',
    version: __OVELLUM_VERSION__,
    description: 'Auto, manual, or hybrid docs that never fall out of sync.',
  },
  subCommands: {
    init: initCommand,
    build: buildCommand,
    diff: diffCommand,
    dev: devCommand,
    watch: watchCommand,
    serve: serveCommand,
    check: checkCommand,
    clean: cleanCommand,
    orphans: orphansCommand,
    agents: agentsCommand,
    mcp: mcpCommand,
    upgrade: upgradeCommand,
  },
});

// Run the command, then (only on success) print an update notice if one is
// due. The notifier self-gates on CI / TTY / config / argv and swallows all
// errors, so this never delays or breaks a normal run.
void runMain(main).then(() => maybeNotifyUpdate(__OVELLUM_VERSION__));
