import { OvellumError } from '@ovellum/core';
import type { ProtectedBlock } from '@ovellum/core';

const START_RE = /<!--\s*@manual:start(?:\s+id=("([^"]*)"|'([^']*)'))?\s*-->/g;
const END_RE = /<!--\s*@manual:end\s*-->/g;
const ANCHOR_RE = /<!--\s*ovellum:anchor\s+id=("([^"]*)"|'([^']*)')[^>]*-->/g;

interface RawTagMatch {
  kind: 'start' | 'end' | 'anchor';
  index: number;
  endIndex: number;
  /** Explicit ID attribute, if present. */
  id?: string;
  /** Line number (1-based) where the tag starts. */
  line: number;
}

/**
 * Scan a Markdown body for protected zones. Returns the extracted blocks in
 * document order, each associated with the nearest preceding ovellum anchor
 * (when one exists).
 *
 * Errors thrown:
 *  - `UNCLOSED_MANUAL_TAG` — a `@manual:start` had no matching `@manual:end`
 *  - `NESTED_MANUAL_TAG`   — a second `@manual:start` opened before the prior closed
 *  - `STRAY_MANUAL_END`    — an `@manual:end` was found without a preceding start
 */
export function extractProtectedZones(content: string): ProtectedBlock[] {
  const tags = collectTags(content);
  const blocks: ProtectedBlock[] = [];

  let lastAnchorId: string | undefined;
  let positionalCounter = 0;
  let openStart: RawTagMatch | null = null;

  for (const tag of tags) {
    if (tag.kind === 'anchor') {
      lastAnchorId = tag.id;
      continue;
    }
    if (tag.kind === 'start') {
      if (openStart) {
        throw new OvellumError(
          `Nested @manual:start tag at line ${tag.line} (previous opened at line ${openStart.line}).`,
          {
            code: 'NESTED_MANUAL_TAG',
            hint: 'Close the first @manual block before opening another.',
          },
        );
      }
      openStart = tag;
      continue;
    }
    // tag.kind === 'end'
    if (!openStart) {
      throw new OvellumError(`Stray @manual:end at line ${tag.line}: no matching @manual:start.`, {
        code: 'STRAY_MANUAL_END',
      });
    }
    const inner = content.slice(openStart.endIndex, tag.index);
    const trimmed = inner.replace(/^\n/, '').replace(/\n$/, '');
    const hasExplicitId = openStart.id !== undefined && openStart.id.length > 0;
    const id = hasExplicitId ? openStart.id! : `manual-block-${++positionalCounter}`;
    const block: ProtectedBlock = {
      id,
      hasExplicitId,
      content: trimmed,
      startLine: openStart.line,
      endLine: tag.line,
    };
    if (lastAnchorId !== undefined) block.anchorId = lastAnchorId;
    blocks.push(block);
    openStart = null;
  }

  if (openStart) {
    throw new OvellumError(`Unclosed @manual:start at line ${openStart.line}.`, {
      code: 'UNCLOSED_MANUAL_TAG',
      hint: 'Add a matching <!-- @manual:end --> tag.',
    });
  }

  return blocks;
}

function collectTags(content: string): RawTagMatch[] {
  const tags: RawTagMatch[] = [];

  scan(content, START_RE, (m) => {
    tags.push({
      kind: 'start',
      index: m.index,
      endIndex: m.index + m[0].length,
      id: m[2] ?? m[3],
      line: lineNumberAt(content, m.index),
    });
  });
  scan(content, END_RE, (m) => {
    tags.push({
      kind: 'end',
      index: m.index,
      endIndex: m.index + m[0].length,
      line: lineNumberAt(content, m.index),
    });
  });
  scan(content, ANCHOR_RE, (m) => {
    tags.push({
      kind: 'anchor',
      index: m.index,
      endIndex: m.index + m[0].length,
      id: m[2] ?? m[3],
      line: lineNumberAt(content, m.index),
    });
  });

  return tags.sort((a, b) => a.index - b.index);
}

function scan(input: string, re: RegExp, onMatch: (m: RegExpExecArray) => void): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) onMatch(m);
}

function lineNumberAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 0x0a) line++;
  }
  return line;
}
