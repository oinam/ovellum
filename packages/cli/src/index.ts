import { defineCommand, runMain } from 'citty';
import { buildCommand } from './commands/build.js';

const main = defineCommand({
  meta: {
    name: 'ovellum',
    description: "O'Vellum - documentation tool for TypeScript and JavaScript projects.",
  },
  subCommands: {
    build: buildCommand,
  },
});

void runMain(main);
