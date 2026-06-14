import path from 'node:path';
import { defineCommand } from 'citty';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { runBuild, type BuildSummary } from '../dev/run-build.js';

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
    drafts: {
      type: 'boolean',
      description: 'Include draft pages (default: drafts are excluded from a production build)',
    },
    out: {
      type: 'string',
      description: 'Output directory for this build (overrides `output` in the config)',
    },
    base: {
      type: 'string',
      description: 'Base path the site is served from, e.g. /docs (overrides `site.basePath`)',
    },
    manifest: {
      type: 'boolean',
      description: 'Write <output>/.ovellum/manifest.json (a hashed inventory for deploy tools)',
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

    if (config.mode !== 'auto' && config.mode !== 'hybrid' && config.mode !== 'manual') {
      process.stderr.write(`'${config.mode}' mode is not recognized.\n`);
      process.exit(1);
    }

    const summary = await runBuild({
      config,
      cwd,
      includeDrafts: args.drafts === true,
      outDir: typeof args.out === 'string' ? args.out : undefined,
      basePath: typeof args.base === 'string' ? args.base : undefined,
      manifest: args.manifest === true,
    });
    process.stdout.write(formatBuildSummary(summary, configFile) + '\n');
    for (const w of summary.warnings) process.stderr.write(`warning: ${w}\n`);
  },
});

/**
 * Render a `BuildSummary` as the CLI's stdout block. Exported in case other
 * commands want the same shape (e.g. a future `ovellum status`).
 */
export function formatBuildSummary(
  summary: BuildSummary,
  configFile: string | undefined,
): string {
  const lines = [
    `ovellum build complete in ${summary.elapsedMs}ms`,
    `  config:    ${configFile ?? '(defaults)'}`,
    `  mode:      ${summary.mode}`,
  ];

  if (summary.mode === 'manual') {
    lines.push(
      `  output:    ${summary.outputDir}/`,
      `  pages:     ${summary.pages?.length ?? 0}`,
      `  warnings:  ${summary.warnings.length}`,
      ...(summary.pages ?? []).map((p) => `    → ${p.url}  (${p.outputPath})`),
    );
  } else {
    lines.push(
      `  sources:   ${summary.sources}`,
      `  written:   ${summary.written?.length ?? 0} file(s)`,
      `  merged:    ${summary.merged?.length ?? 0} file(s)`,
      `  orphans:   ${summary.orphans ?? 0}`,
      `  warnings:  ${summary.warnings.length}`,
      ...(summary.written ?? []).map((f) => `    → ${f}`),
    );
    if ((summary.quarantined ?? []).length > 0) {
      lines.push('  quarantined:');
      lines.push(...(summary.quarantined ?? []).map((p) => `    ↪ ${p}`));
    }
  }
  if (summary.manifestPath) lines.push(`  manifest:  ${summary.manifestPath}`);
  return lines.join('\n');
}
