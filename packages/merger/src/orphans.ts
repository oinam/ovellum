import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { OrphanRecord } from '@ovellum/core';

/**
 * Slugify an anchor ID into a path-safe filename component. Replaces every
 * non-`[A-Za-z0-9._-]` byte with `-`, collapses runs of `-`, trims edges.
 */
export function slugifyAnchor(anchorId: string): string {
  return anchorId
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format a Date as `YYYY-MM-DD` in UTC. Used for orphan filenames.
 */
export function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Render an `OrphanRecord` as a Markdown file body with frontmatter + content.
 */
export function renderOrphanFile(record: OrphanRecord): string {
  const fields: Record<string, string> = {
    orphaned: record.orphanedAt,
    source_file: record.sourceFile,
    anchor_id: record.anchorId,
  };
  if (record.anchorLastSeen) fields.anchor_last_seen = record.anchorLastSeen;
  if (record.manualBlockId) fields.manual_block_id = record.manualBlockId;
  const yaml = Object.entries(fields)
    .map(([k, v]) => `${k}: ${formatYamlScalar(v)}`)
    .join('\n');
  return `---\n${yaml}\n---\n\n${record.content}\n`;
}

/**
 * Write an orphan record to disk. Returns the absolute path written.
 */
export async function writeOrphan(record: OrphanRecord, orphanDir: string): Promise<string> {
  const slug = slugifyAnchor(record.anchorId);
  const dateStamp = formatDateUTC(new Date(record.orphanedAt));
  await mkdir(orphanDir, { recursive: true });
  // Same anchor orphaned twice on the same UTC day must not overwrite the
  // earlier archive (each file is unrecoverable hand-written prose) — suffix
  // with a counter until the name is free.
  let absPath = path.resolve(orphanDir, `${dateStamp}_${slug}.md`);
  for (let n = 2; existsSync(absPath); n++) {
    absPath = path.resolve(orphanDir, `${dateStamp}_${slug}-${n}.md`);
  }
  await writeFile(absPath, renderOrphanFile(record), 'utf8');
  return absPath;
}

function formatYamlScalar(s: string): string {
  if (/[:#\-?{}[\],&*!|>'"%@`]/.test(s) || /^\s|\s$/.test(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}
