import type { DocFile } from '@ovellum/core';

export interface FrontmatterFields {
  title: string;
  source: string;
  /**
   * The documented source file's last real content change, ISO-8601. Powers the
   * page "Edited" date downstream. Present only when the caller could resolve it
   * (git-tracked source); omitted otherwise so the site falls back to its own
   * git/mtime lookup.
   */
  updated?: string;
  ovellum: true;
}

export interface FrontmatterOptions {
  /** The source file's last-change date (ISO-8601), stamped as `updated:`. */
  updated?: string;
}

/**
 * Build the YAML frontmatter block for a generated doc.
 *
 * Deliberately deterministic: given the same source file and `updated` date, the
 * output is byte-identical across runs. There is **no** build timestamp — a
 * volatile `generated: <now>` field used to live here, but it churned the file
 * on every build (a fresh git diff each time), which made every doc read "Edited
 * today" forever. The edited date now comes from the source's own history via
 * `updated`, so regenerating unchanged source produces identical bytes.
 */
export function buildFrontmatter(file: DocFile, opts: FrontmatterOptions = {}): string {
  const title = file.moduleName ?? defaultTitle(file.filePath);
  const fields: FrontmatterFields = {
    title,
    source: file.filePath,
    ...(opts.updated ? { updated: opts.updated } : {}),
    ovellum: true,
  };
  const yaml = Object.entries(fields)
    .map(([k, v]) => `${k}: ${formatYamlScalar(v)}`)
    .join('\n');
  return `---\n${yaml}\n---`;
}

function defaultTitle(filePath: string): string {
  const segments = filePath.replace(/\\/g, '/').split('/');
  const last = segments[segments.length - 1] ?? filePath;
  return last.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '');
}

function formatYamlScalar(v: unknown): string {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (/[:#\-?{}[\],&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}
