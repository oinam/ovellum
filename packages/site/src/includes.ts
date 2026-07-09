import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

/**
 * Reusable snippets (W1): `::include[/path.md]` (or `::include{file="…"}`)
 * splices another Markdown file into the page at parse time — BEFORE the
 * component transform and the HTML sanitizer, so snippets may use directives
 * and every byte still passes the same sanitize guard as inline content.
 *
 * Resolution: a root-absolute path (`/_snippets/x.md`) is tried against each
 * content root in order — the current (version × locale) tree first, then the
 * default locale's tree (i18n fallback). A relative path resolves against the
 * including file's directory. Every resolved path must stay inside one of the
 * roots; escapes, misses, and cycles degrade to a warning + omitted content
 * (never a build failure, never raw markup on the page).
 */

/** Cap on nested include depth — a backstop behind the cycle guard. */
const MAX_DEPTH = 16;

export interface IncludeContext {
  /** Absolute path of the file being rendered (cycle-guard seed + relative base). */
  sourceAbs: string;
  /** Ordered content roots: current tree first, then fallback tree(s). */
  roots: string[];
  /** Collects human-readable problems (missing target, escape, cycle). */
  warnings: string[];
}

interface MdNode {
  type: string;
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MdNode[];
  value?: string;
  position?: { start: { line: number } };
}

/** The include target as written: `file=` attribute, else the `[label]`. */
function includeTarget(node: MdNode): string | undefined {
  const attr = node.attributes?.file;
  if (typeof attr === 'string' && attr.trim().length > 0) return attr.trim();
  const label = (node.children ?? [])
    .map((c) => (c.type === 'text' && typeof c.value === 'string' ? c.value : ''))
    .join('')
    .trim();
  return label.length > 0 ? label : undefined;
}

function isInside(p: string, root: string): boolean {
  return p === root || p.startsWith(root + path.sep);
}

/**
 * Resolve an include target to an absolute path, or a string error reason.
 * Root-absolute → each root in order; relative → the including file's dir.
 * Either way the result must stay inside one of the roots.
 */
export function resolveInclude(
  target: string,
  baseDir: string,
  roots: string[],
  exists: (abs: string) => boolean,
): { abs: string } | { error: string } {
  const candidates: string[] = [];
  if (target.startsWith('/')) {
    for (const root of roots) candidates.push(path.normalize(path.join(root, target)));
  } else {
    candidates.push(path.normalize(path.join(baseDir, target)));
  }
  let sawContained = false;
  for (const abs of candidates) {
    if (!roots.some((root) => isInside(abs, path.normalize(root)))) continue;
    sawContained = true;
    if (exists(abs)) return { abs };
  }
  if (!sawContained) return { error: 'path escapes the content directory' };
  return { error: 'file not found' };
}

/** Collect `[parent, index]` positions of every include directive, in order. */
function findIncludes(tree: MdNode): Array<{ parent: MdNode; index: number; node: MdNode }> {
  const found: Array<{ parent: MdNode; index: number; node: MdNode }> = [];
  visit(tree as never, (node: unknown, index: number | undefined, parent: unknown) => {
    const n = node as MdNode;
    if (n.type !== 'leafDirective' || n.name !== 'include') return;
    if (parent === undefined || index === undefined) return;
    found.push({ parent: parent as MdNode, index, node: n });
  });
  return found;
}

async function expand(
  tree: MdNode,
  baseDir: string,
  ctx: IncludeContext,
  stack: string[],
): Promise<void> {
  // Snapshot positions first, then splice back-to-front so indices hold.
  const sites = findIncludes(tree);
  for (let i = sites.length - 1; i >= 0; i--) {
    const { parent, index, node } = sites[i]!;
    const replacement = await renderIncludeNode(node, baseDir, ctx, stack);
    (parent.children ?? []).splice(index, 1, ...replacement);
  }
}

async function renderIncludeNode(
  node: MdNode,
  baseDir: string,
  ctx: IncludeContext,
  stack: string[],
): Promise<MdNode[]> {
  const target = includeTarget(node);
  const at = node.position?.start.line;
  const where = at !== undefined ? `:${at}` : '';
  if (target === undefined) {
    ctx.warnings.push(`include${where}: no target — write ::include[/path.md]`);
    return [];
  }
  if (stack.length > MAX_DEPTH) {
    ctx.warnings.push(`include${where}: ${target} — nesting deeper than ${MAX_DEPTH} levels`);
    return [];
  }

  const resolved = resolveInclude(target, baseDir, ctx.roots, existsSync);
  if ('error' in resolved) {
    ctx.warnings.push(`include${where}: ${target} — ${resolved.error}`);
    return [];
  }
  if (stack.includes(resolved.abs)) {
    ctx.warnings.push(`include${where}: ${target} — circular include`);
    return [];
  }

  const raw = await readFile(resolved.abs, 'utf8');
  // Snippet frontmatter is metadata about the snippet, not the page — dropped.
  const { content } = matter(raw);
  const sub = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(content) as Root;
  await expand(sub as unknown as MdNode, path.dirname(resolved.abs), ctx, [...stack, resolved.abs]);
  return ((sub as unknown as MdNode).children ?? []) as MdNode[];
}

/**
 * The remark plugin. Registered between `remarkDirective` (so include nodes
 * exist) and `remarkComponents` (so directives INSIDE a snippet still get
 * transformed). Without a context (unit renders, programmatic callers with no
 * file), include directives are removed rather than leaked into the HTML.
 */
export function remarkIncludes(ctx: IncludeContext | undefined) {
  return () =>
    async (tree: Root): Promise<void> => {
      if (!ctx) {
        const sites = findIncludes(tree as unknown as MdNode);
        for (let i = sites.length - 1; i >= 0; i--) {
          const { parent, index } = sites[i]!;
          (parent.children ?? []).splice(index, 1);
        }
        return;
      }
      await expand(tree as unknown as MdNode, path.dirname(ctx.sourceAbs), ctx, [ctx.sourceAbs]);
    };
}

export interface IncludeRef {
  /** The include target as written, or null when the directive has none. */
  file: string | null;
  /** 1-based source line. */
  line: number;
}

/**
 * List every `::include` directive in a Markdown source (for `ovellum check`).
 * Parses with the same remark-directive grammar as the renderer, so a
 * `::include` inside a code fence is (correctly) not reported.
 */
export function extractIncludes(content: string): IncludeRef[] {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkDirective).parse(content);
  const out: IncludeRef[] = [];
  visit(tree as never, (node: unknown) => {
    const n = node as MdNode;
    if (n.type !== 'leafDirective' || n.name !== 'include') return;
    out.push({ file: includeTarget(n) ?? null, line: n.position?.start.line ?? 1 });
  });
  return out;
}
