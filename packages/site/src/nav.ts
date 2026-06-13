import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { isExcludedContentFile, isExcludedDirName } from './content-filter.js';

export interface NavNode {
  /** Display title. */
  title: string;
  /** Site-relative URL with trailing slash (`/foo/`, `/foo/bar/`, or `/` for root). */
  url: string;
  /** Source file relative to project root, or undefined for directory-only nodes. */
  sourcePath?: string;
  /**
   * Per-folder sidebar collapse override from `_meta.json` (`false` = always
   * expanded, `true` = collapsed). Undefined = inherit `site.sidebar.collapse`.
   */
  collapse?: boolean;
  /** Child nodes (sub-pages and sub-directories). */
  children: NavNode[];
}

/**
 * Flatten a nav tree to the linear reading order — depth-first, root first.
 * Used to compute prev/next links on each doc page.
 *
 * Includes only nodes that point to a real source file (`sourcePath !== undefined`).
 * Directory-only group nodes are skipped.
 */
export function flattenNav(root: NavNode): NavNode[] {
  const out: NavNode[] = [];
  function walk(node: NavNode): void {
    if (node.sourcePath !== undefined) out.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  return out;
}

/**
 * Walk the nav tree to find the chain of ancestors ending at `url`, root-first.
 * Returns `[]` when the url isn't present in the tree.
 *
 * The result includes the root node and the matching node itself, so the last
 * entry is the current page. Callers typically render this as the breadcrumb
 * trail and skip the leading root entry.
 */
export function findBreadcrumbs(root: NavNode, url: string): NavNode[] {
  const path: NavNode[] = [];
  function walk(node: NavNode): boolean {
    path.push(node);
    if (node.url === url) return true;
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    path.pop();
    return false;
  }
  walk(root);
  return path;
}

export interface AdjacentPages {
  prev?: NavNode;
  next?: NavNode;
}

/**
 * Find the prev / next page for `url` in the flattened nav order.
 * Returns `{}` when `url` is not in the nav (e.g. the root landing page) or
 * when there's no neighbour on a given side.
 */
export function findAdjacent(root: NavNode, url: string): AdjacentPages {
  // The 404 page carries a sourcePath (so it renders) but isn't part of the
  // linear reading flow — drop it so it never becomes a prev/next neighbour
  // (otherwise it lands as the "Previous" of the first real page, since
  // `/404/` sorts ahead of the content URLs).
  const flat = flattenNav(root).filter((p) => p.url !== '/404/');
  const idx = flat.findIndex((p) => p.url === url);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? flat[idx - 1] : undefined,
    next: idx + 1 < flat.length ? flat[idx + 1] : undefined,
  };
}

interface MetaJson {
  title?: string;
  order?: string[];
  /** When true, the folder and all its content are excluded from nav + build. */
  hidden?: boolean;
  /**
   * Per-folder override of the sidebar collapse default (`site.sidebar.collapse`).
   * `false` keeps this folder expanded; `true` collapses it. Unset = inherit.
   */
  collapse?: boolean;
}

interface FsItem {
  name: string;
  abs: string;
  isDir: boolean;
}

/**
 * Walk a content directory and build a `NavNode` tree:
 *
 *  - `.md` files become page nodes; `index.md` represents its containing
 *    directory (its title and url collapse onto the parent node).
 *  - Subdirectories become group nodes; each is recursively built.
 *  - Per-directory `_meta.json` may set `title` and an explicit `order` of
 *    child slugs.
 *  - Without explicit order, items sort alphabetically by slug, but any
 *    directory's `index` always leads.
 */
export async function buildNav(
  rootDir: string,
  cwd: string,
  ignoreFolders: string[] = [],
  ignoreFiles: string[] = [],
  outputAbs?: string,
  /** Basename of the root home file (e.g. `README.md`) — used as the root index. */
  homeBasename?: string,
): Promise<NavNode> {
  const absRoot = path.resolve(cwd, rootDir);
  const rel = (abs: string) => '/' + path.posix.relative(absRoot, abs).replace(/\\/g, '/');
  const root = await walk(
    absRoot,
    '/',
    cwd,
    rel,
    ignoreFolders,
    ignoreFiles,
    absRoot,
    outputAbs,
    homeBasename,
    true,
  );
  // walk() returns null for hidden/empty dirs; the root is never pruned.
  return root ?? { title: 'Untitled', url: '/', children: [] };
}

/** True when `<dirAbs>/_meta.json` marks the folder `"hidden": true`. */
export async function isHiddenDir(dirAbs: string): Promise<boolean> {
  return (await readMeta(dirAbs))?.hidden === true;
}

async function walk(
  dirAbs: string,
  urlPrefix: string,
  cwd: string,
  rel: (abs: string) => string,
  ignoreFolders: string[],
  ignoreFiles: string[],
  absRoot: string,
  outputAbs: string | undefined,
  homeBasename: string | undefined,
  isRoot: boolean,
): Promise<NavNode | null> {
  const items = await listDir(dirAbs);
  const meta = await readMeta(dirAbs);

  // At the root, the home file (index.md / README.md / site.home) is the index;
  // elsewhere the index is `index.md` as usual.
  const indexItem =
    isRoot && homeBasename
      ? items.find((i) => !i.isDir && i.name === homeBasename && isMarkdown(i.name))
      : items.find((i) => !i.isDir && stem(i.name) === 'index' && isMarkdown(i.name));
  const indexNode = indexItem ? await pageNode(indexItem.abs, urlPrefix, cwd) : undefined;

  const children: NavNode[] = [];
  for (const item of items) {
    if (item === indexItem) continue;
    if (item.isDir) {
      // Output dir (avoids self-recursion under `input: '.'`), structural
      // (`_`/dot/`node_modules`), configured, and self-hidden folders.
      if (outputAbs && item.abs === outputAbs) continue;
      if (isExcludedDirName(item.name)) continue;
      if (ignoreFolders.includes(item.name)) continue;
      if (await isHiddenDir(item.abs)) continue;
      const childUrl = ensureTrailingSlash(urlPrefix + item.name + '/');
      const child = await walk(
        item.abs,
        childUrl,
        cwd,
        rel,
        ignoreFolders,
        ignoreFiles,
        absRoot,
        outputAbs,
        homeBasename,
        false,
      );
      if (child) children.push(child);
    } else if (isMarkdown(item.name)) {
      // Honour the same file excludes as the build walk — auto-excluded files
      // (`_meta`, dotfiles, manifests, the config) and `site.ignoreFiles` globs
      // so an emitted page never appears in the sidebar.
      const relForMatch = path.posix.relative(absRoot, item.abs).replace(/\\/g, '/');
      if (isExcludedContentFile(relForMatch, item.name, ignoreFiles)) continue;
      const childUrl = ensureTrailingSlash(urlPrefix + stem(item.name) + '/');
      const node = await pageNode(item.abs, childUrl, cwd);
      if (node) children.push(node);
    }
  }

  // Prune non-root folders that contribute no pages — asset-only dirs (e.g.
  // `public/`), or folders left empty after draft/hidden exclusions.
  if (!isRoot && !indexNode?.sourcePath && children.length === 0) return null;

  applyOrdering(children, meta);

  const title =
    meta?.title ?? indexNode?.title ?? titleFromSegment(path.basename(dirAbs)) ?? 'Untitled';
  const url = ensureTrailingSlash(urlPrefix);

  return {
    title,
    url,
    sourcePath: indexNode?.sourcePath,
    collapse: meta?.collapse,
    children,
  };
}

async function pageNode(abs: string, url: string, cwd: string): Promise<NavNode | null> {
  const raw = await readFile(abs, 'utf8');
  const { data, content } = matter(raw);
  // Draft pages are unpublished — kept out of the nav (and the build).
  if (data.draft === true) return null;
  const fmTitle = typeof data.title === 'string' ? data.title : undefined;
  const h1 = firstH1(content);
  const title = fmTitle ?? h1 ?? titleFromSegment(stem(path.basename(abs))) ?? 'Untitled';
  return {
    title,
    url: ensureTrailingSlash(url),
    sourcePath: path.relative(cwd, abs).replace(/\\/g, '/'),
    children: [],
  };
}

async function listDir(dirAbs: string): Promise<FsItem[]> {
  const names = await readdir(dirAbs);
  const out: FsItem[] = [];
  for (const name of names) {
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    out.push({ name, abs, isDir: st.isDirectory() });
  }
  return out;
}

async function readMeta(dirAbs: string): Promise<MetaJson | undefined> {
  const metaPath = path.join(dirAbs, '_meta.json');
  try {
    const raw = await readFile(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as MetaJson;
    return parsed;
  } catch {
    return undefined;
  }
}

function applyOrdering(children: NavNode[], meta: MetaJson | undefined): void {
  if (meta?.order && meta.order.length > 0) {
    const rank = new Map(meta.order.map((slug, i) => [slug, i]));
    children.sort((a, b) => {
      const ra = rank.get(slugOf(a)) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(slugOf(b)) ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return a.title.localeCompare(b.title);
    });
    return;
  }
  children.sort((a, b) => a.title.localeCompare(b.title));
}

function slugOf(node: NavNode): string {
  const trimmed = node.url.replace(/\/+$/, '');
  return trimmed.slice(trimmed.lastIndexOf('/') + 1);
}

function isMarkdown(name: string): boolean {
  return /\.(md|markdown)$/i.test(name);
}

function stem(name: string): string {
  return name.replace(/\.(md|markdown)$/i, '');
}

function ensureTrailingSlash(p: string): string {
  return p.endsWith('/') ? p : p + '/';
}

function titleFromSegment(seg: string): string | undefined {
  if (!seg) return undefined;
  return seg
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function firstH1(content: string): string | undefined {
  const m = content.match(/^\s*#\s+(.+)$/m);
  return m ? m[1]!.trim() : undefined;
}
