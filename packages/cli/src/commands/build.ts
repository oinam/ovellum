import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { generateDocs } from '@ovellum/generator';

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Parse source and emit documentation files.',
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

    if (config.mode !== 'auto' && config.mode !== 'hybrid') {
      process.stderr.write(
        `'${config.mode}' mode is not implemented yet in this CLI slice. ` +
          `Only 'auto' (and 'hybrid' as auto) is supported. ` +
          `See docs/internal/TODO.md Phase 6.\n`,
      );
      process.exit(1);
    }

    const startedAt = Date.now();
    const project = parseProject({ config, cwd });
    const { files, warnings } = generateDocs(project, config);

    for (const [relOut, body] of files) {
      const abs = path.resolve(cwd, relOut);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, body, 'utf8');
    }

    const elapsed = Date.now() - startedAt;
    process.stdout.write(
      [
        `ovellum build complete in ${elapsed}ms`,
        `  config:    ${configFile ?? '(defaults)'}`,
        `  mode:      ${config.mode}`,
        `  sources:   ${project.files.length}`,
        `  written:   ${files.size} file(s)`,
        `  warnings:  ${warnings.length}`,
        ...Array.from(files.keys()).map((f) => `    → ${f}`),
      ].join('\n') + '\n',
    );

    for (const w of warnings) process.stderr.write(`warning: ${w}\n`);
  },
});
