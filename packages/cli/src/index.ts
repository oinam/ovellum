import { defineCommand, runMain } from 'citty';
import { buildCommand } from './commands/build.js';

const main = defineCommand({
  meta: {
    name: 'ovellum',
    description: "Ovellum - documentation tool for TypeScript and JavaScript projects.",
  },
  subCommands: {
    build: buildCommand,
  },
});

void runMain(main);
