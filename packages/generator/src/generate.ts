import type { DocFile, DocProject, OvellumConfig } from '@ovellum/core';
import { buildFrontmatter } from './frontmatter.js';
import { outputPathFor } from './path.js';
import { renderNode, type RenderOptions } from './templates.js';

export interface GenerateResult {
  /** Output path (relative to project root) → markdown body. */
  files: Map<string, string>;
  warnings: string[];
}

export interface GenerateOptions {
  /**
   * Source file path (relative to project root, as in `DocFile.filePath`) → the
   * source's last-change date (ISO-8601). Stamped as each doc's `updated:`
   * frontmatter so the page "Edited" date tracks when the CODE last changed, not
   * when `ovellum build` last ran. Resolved by the caller (which owns git); the
   * generator stays pure. Files absent from the map get no `updated:` and fall
   * back to the site's own git/mtime lookup.
   */
  sourceDates?: Map<string, string>;
}

/**
 * Render a `DocProject` IR into markdown bodies keyed by output path.
 *
 * Implements the Phase 3 slice: per-file frontmatter, per-symbol templates for
 * function/class/interface/type/enum, anchor comments on every top-level node
 * and class/interface member. MDX detection, sidebar generation, and
 * deprecation callouts beyond a plain blockquote are deferred to later
 * Phase 3 work.
 */
export function generateDocs(
  project: DocProject,
  config: OvellumConfig,
  options: GenerateOptions = {},
): GenerateResult {
  const files = new Map<string, string>();
  const warnings: string[] = [];

  // Only hybrid mode merges, so only there does wrapping `@preserve` symbols in
  // a protected zone actually preserve anything (A5).
  const wrapPreserved = config.mode === 'hybrid';
  for (const file of project.files) {
    const outputPath = outputPathFor(file.filePath, config);
    const updated = options.sourceDates?.get(file.filePath);
    const body = renderFile(file, { wrapPreserved }, updated);
    files.set(outputPath, body);
  }

  return { files, warnings };
}

function renderFile(file: DocFile, opts: RenderOptions, updated?: string): string {
  const parts: string[] = [buildFrontmatter(file, { updated })];

  if (file.description) {
    parts.push(file.description.trim());
  }

  for (const node of file.nodes) {
    parts.push(renderNode(node, opts));
  }

  return parts.filter(Boolean).join('\n\n') + '\n';
}
