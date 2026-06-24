/**
 * The protected-zone writer behind the MCP `ovellum_write_zone` tool (ROADMAP
 * C2's differentiator). An agent addresses a symbol by anchor id and writes
 * prose into a `@manual` protected block under it; because the block uses the
 * same markers a human would, the hybrid merge engine preserves it across the
 * next regeneration. Pure: operates on doc text, no I/O.
 */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface WriteZoneInput {
  /** Anchor id the block attaches to, e.g. `src/math.ts::add`. */
  anchorId: string;
  /** Markdown prose for the block body. */
  content: string;
  /** Stable id for the `@manual` block (so repeat writes replace, not stack). */
  blockId: string;
  /** Protected block tag without the `:start`/`:end` suffix (default `@manual`). */
  blockTag?: string;
}

export type WriteZoneResult =
  | { ok: true; action: 'inserted' | 'replaced'; text: string; block: string }
  | { ok: false; reason: 'anchor-not-found' };

/**
 * Insert or update a protected block under an anchor. If a block with the same
 * id already exists, its body is replaced (idempotent); otherwise a new block
 * is inserted directly after the anchor comment. Fails only when the anchor
 * comment isn't present in the doc (nothing to attach to).
 */
export function applyWriteZone(doc: string, input: WriteZoneInput): WriteZoneResult {
  const tag = input.blockTag ?? '@manual';
  const block = `<!-- ${tag}:start id="${input.blockId}" -->\n${input.content}\n<!-- ${tag}:end -->`;

  const existing = new RegExp(
    `<!-- ${escapeRe(tag)}:start id="${escapeRe(input.blockId)}" -->[\\s\\S]*?<!-- ${escapeRe(tag)}:end -->`,
  );
  if (existing.test(doc)) {
    return { ok: true, action: 'replaced', text: doc.replace(existing, block), block };
  }

  const anchorRe = new RegExp(`(<!-- ovellum:anchor id="${escapeRe(input.anchorId)}"[^>]*-->)`);
  if (!anchorRe.test(doc)) return { ok: false, reason: 'anchor-not-found' };
  return { ok: true, action: 'inserted', text: doc.replace(anchorRe, `$1\n${block}`), block };
}
