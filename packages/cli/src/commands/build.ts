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
    json: {
      type: 'boolean',
      description: 'Emit the build summary as JSON (for CI / tooling); no decorative output.',
    },
    verbose: {
      type: 'boolean',
      description: 'Print config-resolution and per-stage / file-I/O detail to stderr.',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    const asJson = args.json === true;
    const verbose = args.verbose === true;
    const onLog = verbose ? (m: string) => process.stderr.write(`verbose: ${m}\n`) : undefined;
    let loaded;
    try {
      loaded = await loadOvellumConfig({ cwd, configFile: args.config });
    } catch (err) {
      if (err instanceof ConfigError) {
        if (asJson) {
          process.stdout.write(
            JSON.stringify({ ok: false, command: 'build', error: err.message, hint: err.hint ?? null }, null, 2) + '\n',
          );
        } else {
          process.stderr.write(`config error: ${err.message}\n`);
          if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        }
        process.exit(3);
      }
      throw err;
    }

    const { config, configFile } = loaded;
    onLog?.(`config ${configFile ?? '(defaults)'}`);

    if (config.mode !== 'auto' && config.mode !== 'hybrid' && config.mode !== 'manual') {
      if (asJson) {
        process.stdout.write(
          JSON.stringify({ ok: false, command: 'build', error: `'${config.mode}' mode is not recognized.` }, null, 2) + '\n',
        );
      } else {
        process.stderr.write(`'${config.mode}' mode is not recognized.\n`);
      }
      process.exit(1);
    }

    const summary = await runBuild({
      config,
      cwd,
      includeDrafts: args.drafts === true,
      outDir: typeof args.out === 'string' ? args.out : undefined,
      basePath: typeof args.base === 'string' ? args.base : undefined,
      manifest: args.manifest === true,
      onLog,
    });

    if (asJson) {
      process.stdout.write(JSON.stringify(buildSummaryToJson(summary, configFile), null, 2) + '\n');
      return;
    }
    process.stdout.write(formatBuildSummary(summary, configFile) + '\n');
    for (const w of summary.warnings) process.stderr.write(`warning: ${w}\n`);
  },
});

/**
 * The machine-readable shape of a build for `--json` — a stable contract an
 * agent or CI step parses. Mode-specific fields are included only when present;
 * `warnings` always appears so a caller never has to scrape stderr.
 */
export function buildSummaryToJson(
  summary: BuildSummary,
  configFile: string | undefined,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ok: true,
    command: 'build',
    mode: summary.mode,
    durationMs: summary.elapsedMs,
    config: configFile ?? null,
    warnings: summary.warnings,
  };
  if (summary.mode === 'manual') {
    return {
      ...base,
      output: summary.outputDir ?? null,
      landingRendered: summary.landingRendered ?? false,
      pages: (summary.pages ?? []).map((p) => ({ url: p.url, outputPath: p.outputPath })),
      manifest: summary.manifestPath ?? null,
    };
  }
  return {
    ...base,
    sources: summary.sources ?? 0,
    written: summary.written ?? [],
    merged: summary.merged ?? [],
    orphans: summary.orphans ?? 0,
    quarantined: summary.quarantined ?? [],
    ir: summary.irPath ?? null,
    manifest: summary.manifestPath ?? null,
  };
}

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
    if (summary.irPath) lines.push(`  ir:        ${summary.irPath}`);
  }
  if (summary.manifestPath) lines.push(`  manifest:  ${summary.manifestPath}`);
  return lines.join('\n');
}
