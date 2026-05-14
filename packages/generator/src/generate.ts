import type { DocFile, DocProject, OvellumConfig } from '@ovellum/core';
import { buildFrontmatter } from './frontmatter.js';
import { outputPathFor } from './path.js';
import { renderNode } from './templates.js';

export interface GenerateResult {
  /** Output path (relative to project root) → markdown body. */
  files: Map<string, string>;
  warnings: string[];
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
export function generateDocs(project: DocProject, config: OvellumConfig): GenerateResult {
  const files = new Map<string, string>();
  const warnings: string[] = [];

  for (const file of project.files) {
    const outputPath = outputPathFor(file.filePath, config);
    const body = renderFile(file, project.generatedAt);
    files.set(outputPath, body);
  }

  return { files, warnings };
}

function renderFile(file: DocFile, generatedAt: string): string {
  const parts: string[] = [buildFrontmatter(file, generatedAt)];

  if (file.description) {
    parts.push(file.description.trim());
  }

  for (const node of file.nodes) {
    parts.push(renderNode(node));
  }

  return parts.filter(Boolean).join('\n\n') + '\n';
}
