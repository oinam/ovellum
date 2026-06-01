import { defineCommand, runMain } from 'citty';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { devCommand } from './commands/dev.js';
import { initCommand } from './commands/init.js';
import { serveCommand } from './commands/serve.js';
import { watchCommand } from './commands/watch.js';

// Replaced at build time by tsup `define` with the version from package.json.
declare const __OVELLUM_VERSION__: string;

const main = defineCommand({
  meta: {
    name: 'ovellum',
    version: __OVELLUM_VERSION__,
    description: 'Ovellum - documentation tool for TypeScript and JavaScript projects.',
  },
  subCommands: {
    init: initCommand,
    build: buildCommand,
    dev: devCommand,
    watch: watchCommand,
    serve: serveCommand,
    check: checkCommand,
  },
});

void runMain(main);
