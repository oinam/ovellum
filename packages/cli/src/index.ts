import { defineCommand, runMain } from 'citty';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { devCommand } from './commands/dev.js';
import { initCommand } from './commands/init.js';
import { serveCommand } from './commands/serve.js';
import { watchCommand } from './commands/watch.js';

const main = defineCommand({
  meta: {
    name: 'ovellum',
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
