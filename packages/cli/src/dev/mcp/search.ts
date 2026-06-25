import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * In-process full-text search over the built Markdown, behind the MCP
 * `ovellum_search_docs` tool (M3). Pagefind's query runtime is browser-only
 * WASM (the npm package only *builds* indexes), so for an agent we run a small
 * term-frequency search over the output `.md` files instead — mode-agnostic and
 * dependency-free. Pure-ish: reads the output dir, no protocol concerns.
 */

export interface SearchHit {
  /** Output-relative path of the matching doc. */
  path: string;
  title: string;
  /** Higher = more relevant (term frequency + title-match bonus). */
  score: number;
  /** A short excerpt around the first match. */
  snippet: string;
}

const TITLE_BONUS = 5;
const SNIPPET_RADIUS = 90;

/** Recursively collect `.md` files under a dir, skipping dot-dirs (.ovellum, …). */
async function walkMarkdown(dir: string, root: string, acc: string[]): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'pagefind') continue;
      await walkMarkdown(abs, root, acc);
    } else if (/\.(md|markdown)$/i.test(entry.name)) {
      acc.push(abs);
    }
  }
}

function titleOf(data: Record<string, unknown>, body: string): string {
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim();
  const h1 = body.match(/^#\s+(.+)$/m);
  return h1 ? h1[1]!.trim() : '(untitled)';
}

function makeSnippet(body: string, term: string): string {
  const i = body.toLowerCase().indexOf(term);
  if (i === -1) return body.slice(0, SNIPPET_RADIUS * 2).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, i - SNIPPET_RADIUS);
  const end = Math.min(body.length, i + term.length + SNIPPET_RADIUS);
  const core = body.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${core}${end < body.length ? '…' : ''}`;
}

/**
 * Rank the built docs against a query. `outputAbs` is the build output dir;
 * throws (caller surfaces it) only on a genuinely unreadable dir.
 */
export async function searchDocs(opts: {
  outputAbs: string;
  query: string;
  limit?: number;
}): Promise<SearchHit[]> {
  const terms = opts.query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0 || !existsSync(opts.outputAbs)) return [];

  const files: string[] = [];
  await walkMarkdown(opts.outputAbs, opts.outputAbs, files);

  const hits: SearchHit[] = [];
  for (const abs of files) {
    const raw = await readFile(abs, 'utf8');
    const { content, data } = matter(raw);
    const title = titleOf(data, content);
    const haystack = content.toLowerCase();
    const titleLower = title.toLowerCase();

    let score = 0;
    for (const term of terms) {
      let from = 0;
      let n = 0;
      for (;;) {
        const at = haystack.indexOf(term, from);
        if (at === -1) break;
        n++;
        from = at + term.length;
      }
      score += n;
      if (titleLower.includes(term)) score += TITLE_BONUS;
    }
    if (score === 0) continue;

    hits.push({
      path: path.relative(opts.outputAbs, abs).replace(/\\/g, '/'),
      title,
      score,
      snippet: makeSnippet(content, terms[0]!),
    });
  }

  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return hits.slice(0, opts.limit ?? 10);
}
