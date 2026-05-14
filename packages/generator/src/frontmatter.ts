import type { DocFile } from '@ovellum/core';

export interface FrontmatterFields {
  title: string;
  source: string;
  generated: string;
  ovellum: true;
}

export function buildFrontmatter(file: DocFile, generatedAt: string): string {
  const title = file.moduleName ?? defaultTitle(file.filePath);
  const fields: FrontmatterFields = {
    title,
    source: file.filePath,
    generated: generatedAt,
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
