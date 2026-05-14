import type { ManualDoc, OrphanRecord, ProtectedBlock } from '@ovellum/core';
import { findAnchors } from './anchors.js';

export interface MergeOptions {
  /** ISO timestamp for any orphan records produced. Defaults to `now`. */
  now?: string;
  /** Output file the manual doc came from — recorded on orphan records. */
  sourceFile?: string;
}

export interface MergeResult {
  /** Final merged Markdown content. */
  content: string;
  /** Manual blocks whose anchor no longer exists in the generated content. */
  orphans: OrphanRecord[];
  /** Non-fatal issues (e.g. positional fallback used). */
  warnings: string[];
}

/**
 * Merge a freshly generated Markdown body with the protected zones extracted
 * from the previous version of the same file.
 *
 * For each protected block in `manual`, we look up its `anchorId` in `generated`.
 * When found, the block is appended to that anchor's section (right before the
 * next anchor or the end of the file). When the anchor no longer exists, the
 * block becomes an orphan: returned in `result.orphans` for the caller to
 * quarantine via `writeOrphan`.
 *
 * Blocks without an `anchorId` (i.e. they had no preceding ovellum anchor in
 * the previous file) are surfaced as warnings and treated as orphans — there
 * is nothing to attach them to.
 */
export function merge(
  generated: string,
  manual: ManualDoc,
  options: MergeOptions = {},
): MergeResult {
  const orphans: OrphanRecord[] = [];
  const warnings: string[] = [];
  const now = options.now ?? new Date().toISOString();
  const sourceFile = options.sourceFile ?? manual.filePath;

  // Build a map of anchorId → list of protected blocks (preserve document order)
  const anchorToBlocks = new Map<string, ProtectedBlock[]>();
  const anchorless: ProtectedBlock[] = [];
  for (const block of manual.protectedBlocks) {
    if (!block.anchorId) {
      anchorless.push(block);
      continue;
    }
    let list = anchorToBlocks.get(block.anchorId);
    if (!list) {
      list = [];
      anchorToBlocks.set(block.anchorId, list);
    }
    list.push(block);
  }

  for (const block of anchorless) {
    warnings.push(`Protected block ${block.id} has no associated anchor — treated as orphan.`);
    orphans.push(orphanFromBlock(block, undefined, sourceFile, now));
  }

  const anchors = findAnchors(generated);
  if (anchors.length === 0) {
    // No anchors in generated content — every anchored block becomes an orphan.
    for (const [anchorId, blocks] of anchorToBlocks) {
      for (const block of blocks) {
        orphans.push(orphanFromBlock(block, anchorId, sourceFile, now));
      }
    }
    return { content: generated, orphans, warnings };
  }

  // Walk the generated content and splice protected blocks in at the end of
  // each anchor's section. The "section end" is the line where the NEXT
  // heading starts (or end-of-file), because in our output headings precede
  // anchors — so the next anchor's section actually begins at its heading.
  const pieces: string[] = [];
  let cursor = 0;

  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i]!;
    const sectionEnd = findSectionEnd(generated, anchor.endIndex);

    pieces.push(generated.slice(cursor, sectionEnd));

    const blocks = anchorToBlocks.get(anchor.id);
    if (blocks && blocks.length > 0) {
      pieces.push(renderBlocks(blocks));
      anchorToBlocks.delete(anchor.id);
    }

    cursor = sectionEnd;
  }
  // Trailing content after the last section (file-level matter only).
  if (cursor < generated.length) {
    pieces.push(generated.slice(cursor));
  }

  // Anything still in the map → orphan (its anchor disappeared).
  for (const [anchorId, blocks] of anchorToBlocks) {
    for (const block of blocks) {
      orphans.push(orphanFromBlock(block, anchorId, sourceFile, now));
    }
  }

  return { content: pieces.join(''), orphans, warnings };
}

/**
 * Find the index of the next Markdown heading line (lines starting with
 * `#`, `##`, … followed by a space) after `from`, or `content.length` if no
 * heading remains. Used to bound the current anchor's "section."
 */
function findSectionEnd(content: string, from: number): number {
  const re = /\n(#{1,6} )/g;
  re.lastIndex = from;
  const m = re.exec(content);
  return m ? m.index + 1 : content.length;
}

function renderBlocks(blocks: ProtectedBlock[]): string {
  return blocks.map((b) => renderBlock(b)).join('\n');
}

function renderBlock(block: ProtectedBlock): string {
  const idAttr = block.hasExplicitId ? ` id="${block.id}"` : '';
  return `<!-- @manual:start${idAttr} -->\n${block.content}\n<!-- @manual:end -->\n\n`;
}

function orphanFromBlock(
  block: ProtectedBlock,
  anchorId: string | undefined,
  sourceFile: string,
  orphanedAt: string,
): OrphanRecord {
  const out: OrphanRecord = {
    orphanedAt,
    sourceFile,
    anchorId: anchorId ?? 'unknown',
    content: block.content,
  };
  if (block.hasExplicitId) out.manualBlockId = block.id;
  return out;
}
