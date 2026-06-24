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
import { collectAnchorIds, collectNodes, readProjectIR, writeProjectIR } from './ir.js';
import { detectRenames } from './rename.js';

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
  /** Path to the persisted IR snapshot (auto/hybrid builds). */
  irPath?: string;
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
  //
  // Read the previous IR snapshot *before* we overwrite it, so a freshly
  // orphaned block can record when its anchor was last seen — the timestamp of
  // the last build that still contained it (A4 / `ovellum orphans`).
  const prevIR = readProjectIR(cwd);
  const prevAnchors = prevIR ? collectAnchorIds(prevIR.project) : null;

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

    // Suggest-only rename detection: if a block was orphaned because its anchor
    // vanished, but a similar new symbol appeared this build, the symbol was
    // probably renamed — point at the likely new home instead of silently
    // quarantining (A3).
    const currentAnchors = collectAnchorIds(project);
    const renameTarget = new Map<string, string>();
    if (prevIR && prevAnchors) {
      const removed = collectNodes(prevIR.project).filter((n) => !currentAnchors.has(n.id));
      const added = collectNodes(project).filter((n) => !prevAnchors.has(n.id));
      for (const r of detectRenames(removed, added)) renameTarget.set(r.from.id, r.to.id);
    }

    for (const record of orphanRecords) {
      // If the prior snapshot still carried this anchor, that build's
      // timestamp is when the symbol was last seen.
      if (prevIR && prevAnchors?.has(record.anchorId)) {
        record.anchorLastSeen = prevIR.project.generatedAt;
      }
      const archivePath = await writeOrphan(record, orphanDir);
      quarantined.push(path.relative(cwd, archivePath));

      const target = renameTarget.get(record.anchorId);
      if (target) {
        warnings.push(
          `did ${record.anchorId} become ${target}? a protected block was orphaned — reattach it under the new anchor (see \`ovellum orphans\`).`,
        );
      }
    }
  }

  // Persist the parsed IR as build state for diff / rename / last-seen.
  const irAbs = await writeProjectIR(project, { cwd });
  const irPath = path.relative(cwd, irAbs).replace(/\\/g, '/');

  return {
    mode: config.mode,
    elapsedMs: Date.now() - startedAt,
    warnings,
    sources: project.files.length,
    written: Array.from(files.keys()),
    merged: mergedFiles,
    orphans: orphanRecords.length,
    quarantined,
    irPath,
  };
}
