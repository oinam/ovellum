import { defineCommand, runMain } from 'citty';
import { buildCommand } from './commands/build.js';
import { checkCommand } from './commands/check.js';
import { watchCommand } from './commands/watch.js';

const main = defineCommand({
  meta: {
    name: 'ovellum',
    description: 'Ovellum - documentation tool for TypeScript and JavaScript projects.',
  },
  subCommands: {
    build: buildCommand,
    check: checkCommand,
    watch: watchCommand,
  },
});

void runMain(main);
