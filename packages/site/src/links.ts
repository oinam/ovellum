import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type { Root, Link } from 'mdast';

export interface MarkdownLink {
  /** Raw href as it appeared in the source (`./foo`, `/bar/`, `https://…`, etc.). */
  target: string;
  /** 1-based source line of the opening `[`. */
  line: number;
}

/**
 * Extract every `[text](url)` and `<https://…>` autolink from a Markdown body.
 *
 * Uses the same remark parser as the renderer, so links inside fenced code
 * blocks, inline code, and HTML are correctly ignored (the regex-based
 * approach this replaces would match them too).
 *
 * Returned URLs are exactly what the author wrote — no resolution, no
 * normalization. Caller decides what's internal vs external.
 */
export function extractMarkdownLinks(content: string): MarkdownLink[] {
  const tree = unified().use(remarkParse).parse(content) as Root;
  const out: MarkdownLink[] = [];
  visit(tree, 'link', (node: Link) => {
    if (typeof node.url !== 'string') return;
    out.push({
      target: node.url,
      line: node.position?.start.line ?? 1,
    });
  });
  return out;
}
