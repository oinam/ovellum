import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { OrphanRecord, OvellumConfig, OvellumMode } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { generateDocs } from '@ovellum/generator';
import { readManualDoc } from '@ovellum/reader';
import { merge, writeOrphan } from '@ovellum/merger';
import { buildSite, type PageOutput } from '@ovellum/site';
import { writeDeployManifest } from './manifest.js';

export interface RunBuildInput {
  config: OvellumConfig;
  cwd: string;
  /** Include draft pages (dev/watch preview); production build excludes them. */
  includeDrafts?: boolean;
  /** Override `config.output` for this build (CLI `--out`). */
  outDir?: string;
  /** Override `config.site.basePath` for this build (CLI `--base`). */
  basePath?: string;
  /** Write `<output>/.ovellum/manifest.json` after the build (CLI `--manifest`). */
  manifest?: boolean;
}

/** Apply per-invocation CLI overrides (`--out`, `--base`) to the loaded config. */
function applyOverrides(config: OvellumConfig, input: RunBuildInput): OvellumConfig {
  let out = config;
  if (input.outDir) out = { ...out, output: input.outDir };
  if (input.basePath !== undefined) {
    out = { ...out, site: { ...out.site, basePath: input.basePath } };
  }
  return out;
}

/**
 * Shape returned by `runBuild` regardless of mode. Some fields are mode-
 * specific (manual gets `pages` + `outputDir`; auto/hybrid get `written`,
 * `merged`, `orphans`, `quarantined`). Both arms always populate `warnings`
 * and `elapsedMs` so callers can log uniformly.
 */
export interface BuildSummary {
  mode: OvellumMode;
  elapsedMs: number;
  warnings: string[];

  // Manual-mode fields
  outputDir?: string;
  pages?: PageOutput[];
  landingRendered?: boolean;

  // Auto / hybrid fields
  sources?: number;
  written?: string[];
  merged?: string[];
  orphans?: number;
  quarantined?: string[];

  /** Path to the deploy manifest, when `--manifest` was requested. */
  manifestPath?: string;
}

/**
 * Run an Ovellum build dispatched by `config.mode`. Shared between
 * `ovellum build` (one-shot) and the watcher used by `ovellum watch` /
 * `ovellum dev` (rebuilds on file changes).
 */
export async function runBuild(input: RunBuildInput): Promise<BuildSummary> {
  const { cwd } = input;
  const startedAt = Date.now();
  const config = applyOverrides(input.config, input);

  const summary = await runBuildForMode(config, cwd, input, startedAt);

  // Deploy manifest — an inventory of the built output a host tool can use to
  // deploy anywhere (atomic / incremental uploads), independent of any host.
  if (input.manifest) {
    const outputAbs = path.resolve(cwd, config.output);
    const manifestPath = await writeDeployManifest({ outputAbs, generatedAt: new Date() });
    summary.manifestPath = path.relative(cwd, manifestPath).replace(/\\/g, '/');
  }
  return summary;
}

async function runBuildForMode(
  config: OvellumConfig,
  cwd: string,
  input: RunBuildInput,
  startedAt: number,
): Promise<BuildSummary> {
  if (config.mode === 'manual') {
    const result = await buildSite({ config, cwd, includeDrafts: input.includeDrafts });
    return {
      mode: 'manual',
      elapsedMs: Date.now() - startedAt,
      warnings: result.warnings,
      outputDir: result.outputDir,
      pages: result.pages,
      landingRendered: result.landingRendered,
    };
  }

  // auto / hybrid
  const project = parseProject({ config, cwd });
  const { files, warnings } = generateDocs(project, config);

  const orphanRecords: OrphanRecord[] = [];
  const mergedFiles: string[] = [];

  for (const [relOut, generatedBody] of files) {
    const abs = path.resolve(cwd, relOut);
    let finalBody = generatedBody;

    if (config.mode === 'hybrid' && existsSync(abs)) {
      const manualDoc = await readManualDoc(abs);
      warnings.push(...manualDoc.warnings);
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

  const quarantined: string[] = [];
  if (orphanRecords.length > 0) {
    const orphanDir = path.resolve(cwd, config.protect.orphanDir);
    for (const record of orphanRecords) {
      const archivePath = await writeOrphan(record, orphanDir);
      quarantined.push(path.relative(cwd, archivePath));
    }
  }

  return {
    mode: config.mode,
    elapsedMs: Date.now() - startedAt,
    warnings,
    sources: project.files.length,
    written: Array.from(files.keys()),
    merged: mergedFiles,
    orphans: orphanRecords.length,
    quarantined,
  };
}
