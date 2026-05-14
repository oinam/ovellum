const ANCHOR_RE = /<!--\s*ovellum:anchor\s+id=("([^"]*)"|'([^']*)')[^>]*-->/g;

export interface AnchorMatch {
  id: string;
  /** Byte index where the `<!-- ovellum:anchor ... -->` comment begins. */
  index: number;
  /** Byte index immediately after the `-->`. */
  endIndex: number;
}

/**
 * Locate every ovellum anchor comment in a Markdown body, in document order.
 */
export function findAnchors(content: string): AnchorMatch[] {
  const out: AnchorMatch[] = [];
  ANCHOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANCHOR_RE.exec(content)) !== null) {
    const id = m[2] ?? m[3];
    if (!id) continue;
    out.push({ id, index: m.index, endIndex: m.index + m[0].length });
  }
  return out;
}
