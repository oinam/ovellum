import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig, type OrphanRecord } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { generateDocs } from '@ovellum/generator';
import { readManualDoc } from '@ovellum/reader';
import { merge, writeOrphan } from '@ovellum/merger';
import { buildSite } from '@ovellum/site';

export const buildCommand = defineCommand({
  meta: {
    name: 'build',
    description: 'Parse source and emit documentation files (or a static site in manual mode).',
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

    if (config.mode === 'manual') {
      await runManual({ config, configFile, cwd });
      return;
    }
    if (config.mode !== 'auto' && config.mode !== 'hybrid') {
      process.stderr.write(`'${config.mode}' mode is not recognized.\n`);
      process.exit(1);
    }

    await runAutoOrHybrid({ config, configFile, cwd });
  },
});

interface ModeRunInput {
  config: import('@ovellum/core').OvellumConfig;
  configFile: string | undefined;
  cwd: string;
}

async function runAutoOrHybrid({ config, configFile, cwd }: ModeRunInput): Promise<void> {
  const startedAt = Date.now();
  const project = parseProject({ config, cwd });
  const { files, warnings } = generateDocs(project, config);

  const orphanRecords: OrphanRecord[] = [];
  const mergedFiles: string[] = [];

  for (const [relOut, generatedBody] of files) {
    const abs = path.resolve(cwd, relOut);
    let finalBody = generatedBody;

    if (config.mode === 'hybrid' && existsSync(abs)) {
      const manualDoc = await readManualDoc(abs);
      if (manualDoc.protectedBlocks.length > 0) {
        const result = merge(generatedBody, manualDoc, { sourceFile: relOut });
        finalBody = result.content;
        orphanRecords.push(...result.orphans);
        warnings.push(...result.warnings);
        mergedFiles.push(relOut);
      }
    }

    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, finalBody, 'utf8');
  }

  const orphanPaths: string[] = [];
  if (orphanRecords.length > 0) {
    const orphanDir = path.resolve(cwd, config.protect.orphanDir);
    for (const record of orphanRecords) {
      const archivePath = await writeOrphan(record, orphanDir);
      orphanPaths.push(path.relative(cwd, archivePath));
    }
  }

  const elapsed = Date.now() - startedAt;
  const lines = [
    `ovellum build complete in ${elapsed}ms`,
    `  config:    ${configFile ?? '(defaults)'}`,
    `  mode:      ${config.mode}`,
    `  sources:   ${project.files.length}`,
    `  written:   ${files.size} file(s)`,
    `  merged:    ${mergedFiles.length} file(s)`,
    `  orphans:   ${orphanRecords.length}`,
    `  warnings:  ${warnings.length}`,
    ...Array.from(files.keys()).map((f) => `    → ${f}`),
  ];
  if (orphanPaths.length > 0) {
    lines.push('  quarantined:');
    lines.push(...orphanPaths.map((p) => `    ↪ ${p}`));
  }
  process.stdout.write(lines.join('\n') + '\n');

  for (const w of warnings) process.stderr.write(`warning: ${w}\n`);
}

async function runManual({ config, configFile, cwd }: ModeRunInput): Promise<void> {
  const startedAt = Date.now();
  const result = await buildSite({ config, cwd });
  const elapsed = Date.now() - startedAt;

  const lines = [
    `ovellum build complete in ${elapsed}ms`,
    `  config:    ${configFile ?? '(defaults)'}`,
    `  mode:      manual`,
    `  output:    ${result.outputDir}/`,
    `  pages:     ${result.pages.length}`,
    `  warnings:  ${result.warnings.length}`,
    ...result.pages.map((p) => `    → ${p.url}  (${p.outputPath})`),
  ];
  process.stdout.write(lines.join('\n') + '\n');

  for (const w of result.warnings) process.stderr.write(`warning: ${w}\n`);
}
