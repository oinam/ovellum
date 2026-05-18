import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { OrphanRecord, OvellumConfig, OvellumMode } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { generateDocs } from '@ovellum/generator';
import { readManualDoc } from '@ovellum/reader';
import { merge, writeOrphan } from '@ovellum/merger';
import { buildSite, type PageOutput } from '@ovellum/site';

export interface RunBuildInput {
  config: OvellumConfig;
  cwd: string;
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
}

/**
 * Run an Ovellum build dispatched by `config.mode`. Shared between
 * `ovellum build` (one-shot) and the watcher used by `ovellum watch` /
 * `ovellum dev` (rebuilds on file changes).
 */
export async function runBuild(input: RunBuildInput): Promise<BuildSummary> {
  const { config, cwd } = input;
  const startedAt = Date.now();

  if (config.mode === 'manual') {
    const result = await buildSite({ config, cwd });
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
