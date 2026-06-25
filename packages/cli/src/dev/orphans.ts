import { existsSync } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { DocNode, OvellumConfig, OrphanRecord } from '@ovellum/core';
import { outputPathFor } from '@ovellum/generator';
import { applyWriteZone } from './mcp/write-zone.js';
import { nameSimilarity } from './rename.js';

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

// --- Reattach (the A3/A4 write side) -------------------------------------

/** Minimum name-similarity for a rename-based reattach suggestion. */
const REATTACH_THRESHOLD = 0.6;

function symbolOf(id: string): string {
  const i = id.indexOf('::');
  return i === -1 ? id : id.slice(i + 2);
}
function sourceOf(id: string): string {
  const i = id.indexOf('::');
  return i === -1 ? id : id.slice(0, i);
}

export interface ReattachSuggestion {
  anchorId: string;
  /** `present` = the exact anchor is back; `rename` = a similar symbol matched. */
  reason: 'present' | 'rename';
  confidence: number;
}

/**
 * Suggest where an orphan's prose could be reattached, given the current IR
 * snapshot's nodes. Exact anchor back in source wins; otherwise the best
 * name-similar anchor (a likely rename) above the threshold. Pure.
 */
export function suggestReattachTarget(
  orphan: OrphanRecord,
  currentNodes: DocNode[],
): ReattachSuggestion | null {
  if (currentNodes.some((n) => n.id === orphan.anchorId)) {
    return { anchorId: orphan.anchorId, reason: 'present', confidence: 1 };
  }
  const orphanSym = symbolOf(orphan.anchorId);
  const orphanSrc = sourceOf(orphan.anchorId);
  let best: ReattachSuggestion | null = null;
  for (const node of currentNodes) {
    const sim = nameSimilarity(orphanSym, symbolOf(node.id));
    const score = Math.min(1, sim + (sourceOf(node.id) === orphanSrc ? 0.1 : 0));
    if (score >= REATTACH_THRESHOLD && (!best || score > best.confidence)) {
      best = { anchorId: node.id, reason: 'rename', confidence: Math.round(score * 100) / 100 };
    }
  }
  return best;
}

export interface ReattachResult {
  doc: string;
  action: 'inserted' | 'replaced';
}

/**
 * Reattach an orphan's prose into a `@manual` zone under `targetAnchorId`
 * (reusing the same writer the MCP tool uses, so the merge engine preserves it),
 * then remove the orphan archive file. Throws if the target doc isn't built or
 * the anchor isn't present in it.
 */
export async function reattachOrphan(opts: {
  orphan: OrphanRecord;
  targetAnchorId: string;
  config: OvellumConfig;
  cwd: string;
}): Promise<ReattachResult> {
  const { orphan, targetAnchorId, config, cwd } = opts;
  const docRel = outputPathFor(sourceOf(targetAnchorId), config);
  const docAbs = path.resolve(cwd, docRel);
  if (!existsSync(docAbs)) {
    throw new Error(`no built doc at ${docRel} for ${targetAnchorId} — run \`ovellum build\` first.`);
  }
  const doc = await readFile(docAbs, 'utf8');
  const result = applyWriteZone(doc, {
    anchorId: targetAnchorId,
    content: orphan.content,
    blockId: orphan.manualBlockId ?? 'reattached',
    blockTag: config.protect.blockTag,
  });
  if (!result.ok) {
    throw new Error(`anchor "${targetAnchorId}" not found in ${docRel} — is it documented and built?`);
  }
  await writeFile(docAbs, result.text, 'utf8');
  await deleteOrphan(orphan);
  return { doc: docRel, action: result.action };
}

/** Remove an orphan's archive file (the `delete` choice). No-op if missing. */
export async function deleteOrphan(orphan: OrphanRecord): Promise<void> {
  if (orphan.archivePath && existsSync(orphan.archivePath)) await rm(orphan.archivePath);
}
