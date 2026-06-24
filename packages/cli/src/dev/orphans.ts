import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { OrphanRecord } from '@ovellum/core';

/**
 * Reading + analysis side of the orphan archive, for `ovellum orphans`. The
 * merger owns the *writer* (`renderOrphanFile`/`writeOrphan` in
 * `@ovellum/merger`); this is the round-trip *reader* plus the staleness /
 * reattachability rollup the command renders. Kept here (not in the merger) so
 * the merger stays dependency-light; a round-trip test pins the two together.
 */

/** Parse one orphan `.md` file body (frontmatter + prose) into an OrphanRecord. */
export function parseOrphanFile(fileBody: string): OrphanRecord {
  const { data, content } = matter(fileBody);
  const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const record: OrphanRecord = {
    orphanedAt: str(data.orphaned),
    sourceFile: str(data.source_file),
    anchorId: str(data.anchor_id),
    content: content.replace(/^\n+/, '').replace(/\n+$/, ''),
  };
  if (data.anchor_last_seen != null) record.anchorLastSeen = str(data.anchor_last_seen);
  if (data.manual_block_id != null) record.manualBlockId = str(data.manual_block_id);
  return record;
}

/**
 * Load every orphan record under `orphanDir` (sorted oldest-first by the
 * orphaned timestamp). Missing dir → empty list. Each record's `archivePath`
 * is set to the absolute file it was read from.
 */
export async function loadOrphans(orphanDir: string): Promise<OrphanRecord[]> {
  if (!existsSync(orphanDir)) return [];
  const entries = await readdir(orphanDir, { withFileTypes: true });
  const records: OrphanRecord[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const abs = path.join(orphanDir, entry.name);
    const record = parseOrphanFile(await readFile(abs, 'utf8'));
    record.archivePath = abs;
    records.push(record);
  }
  records.sort((a, b) => a.orphanedAt.localeCompare(b.orphanedAt));
  return records;
}

/** Whether the anchor exists in the current source snapshot, if one is known. */
export type AnchorStatus = 'present' | 'gone' | 'unknown';

export interface OrphanSummary {
  record: OrphanRecord;
  /** Whole days since the block was orphaned (floored, ≥ 0). */
  ageDays: number;
  /** Older than the retention threshold. */
  stale: boolean;
  /** `present` = the symbol is back (reattachable); `unknown` = no IR snapshot. */
  anchor: AnchorStatus;
  /** Relative archive path (POSIX), for display. */
  file: string;
}

/**
 * Enrich orphan records with age, staleness, and reattachability. Pure: `now`,
 * the retention window, the set of currently-known anchor ids (or `null` when
 * no IR snapshot exists), and the cwd for relative paths are all passed in.
 */
export function summarizeOrphans(
  records: OrphanRecord[],
  opts: { now: Date; retentionDays: number; currentAnchorIds: Set<string> | null; cwd: string },
): OrphanSummary[] {
  const nowMs = opts.now.getTime();
  return records.map((record) => {
    const orphanedMs = Date.parse(record.orphanedAt);
    const ageDays = Number.isNaN(orphanedMs)
      ? 0
      : Math.max(0, Math.floor((nowMs - orphanedMs) / 86_400_000));
    const anchor: AnchorStatus = !opts.currentAnchorIds
      ? 'unknown'
      : opts.currentAnchorIds.has(record.anchorId)
        ? 'present'
        : 'gone';
    const file = record.archivePath
      ? path.relative(opts.cwd, record.archivePath).replace(/\\/g, '/')
      : '';
    return { record, ageDays, stale: ageDays >= opts.retentionDays, anchor, file };
  });
}
