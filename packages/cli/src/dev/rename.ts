import type { DocNode } from '@ovellum/core';

/**
 * Suggest-only rename detection (ROADMAP A3). When an anchor disappears and a
 * similar symbol appears, the two are very likely the same thing renamed (the
 * #1 cause of orphans is refactors). Pairing them lets `ovellum diff` show a
 * rename instead of an unrelated remove + add, and lets `build` / `orphans`
 * point at the probable new home for a protected block. Pure: no I/O. This
 * only *suggests* — reattaching is still a human action.
 */

export interface RenameSide {
  id: string;
  name: string;
  source: string;
}

export interface Rename {
  from: RenameSide;
  to: RenameSide;
  /** 0–1 match confidence. */
  confidence: number;
  /** The signature changed too (rename + edit), vs a pure rename. */
  signatureChanged: boolean;
}

/** Minimum confidence for a pair to be reported as a likely rename. */
const THRESHOLD = 0.6;
/** Names below this similarity are never paired, even with an identical shape. */
const NAME_FLOOR = 0.34;

/** The source file an anchor id belongs to (prefix before `::`). */
function sourceOf(id: string): string {
  const i = id.indexOf('::');
  return i === -1 ? id : id.slice(0, i);
}

/** Levenshtein edit distance (rolling single-row DP). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row: number[] = [];
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const above = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(above + 1, row[j - 1]! + 1, diag + cost);
      diag = above;
    }
  }
  return row[n]!;
}

/** Name similarity in [0,1] (1 = identical). */
function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - editDistance(a, b) / max;
}

/** A signature with the symbol name elided, for shape comparison. */
function shapeKey(node: DocNode): string {
  const params = (node.params ?? []).map((p) => p.type).join(',');
  return `${node.kind}(${params}):${node.returns?.type ?? ''}`;
}

/** Shape similarity in [0,1]: identical signature shape → 1, partial → less. */
function shapeSimilarity(r: DocNode, a: DocNode): number {
  if (r.kind !== a.kind) return 0;
  if (shapeKey(r) === shapeKey(a)) return 1;
  const rp = r.params ?? [];
  const ap = a.params ?? [];
  let score = 0;
  if (rp.length === ap.length) score += 0.6;
  if ((r.returns?.type ?? '') === (a.returns?.type ?? '')) score += 0.4;
  return score;
}

function score(r: DocNode, a: DocNode): number {
  if (r.kind !== a.kind) return 0;
  const name = nameSimilarity(r.name, a.name);
  if (name < NAME_FLOOR) return 0;
  const shape = shapeSimilarity(r, a);
  const fileBonus = sourceOf(r.id) === sourceOf(a.id) ? 0.1 : 0;
  return Math.min(1, 0.55 * name + 0.45 * shape + fileBonus);
}

function side(node: DocNode): RenameSide {
  return { id: node.id, name: node.name, source: sourceOf(node.id) };
}

/**
 * Pair removed symbols with added symbols that are likely the same thing
 * renamed. Greedy best-first 1:1 matching above {@link THRESHOLD}.
 */
export function detectRenames(removed: DocNode[], added: DocNode[]): Rename[] {
  const candidates: Array<{ r: DocNode; a: DocNode; s: number }> = [];
  for (const r of removed) {
    for (const a of added) {
      const s = score(r, a);
      if (s >= THRESHOLD) candidates.push({ r, a, s });
    }
  }
  candidates.sort((x, y) => y.s - x.s || x.r.id.localeCompare(y.r.id));

  const usedFrom = new Set<string>();
  const usedTo = new Set<string>();
  const renames: Rename[] = [];
  for (const { r, a, s } of candidates) {
    if (usedFrom.has(r.id) || usedTo.has(a.id)) continue;
    usedFrom.add(r.id);
    usedTo.add(a.id);
    renames.push({
      from: side(r),
      to: side(a),
      confidence: Math.round(s * 100) / 100,
      signatureChanged: shapeKey(r) !== shapeKey(a),
    });
  }
  renames.sort((x, y) => x.from.id.localeCompare(y.from.id));
  return renames;
}
