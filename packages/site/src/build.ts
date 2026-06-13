import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { OvellumConfig, OvellumSiteConfig } from '@ovellum/core';
import { renderMarkdown } from './markdown.js';
import { buildNav, findAdjacent, findBreadcrumbs, isHiddenDir, type NavNode } from './nav.js';
import { countWords, lastModifiedISO, readingMinutes } from './page-meta.js';
import { indexSite } from './search.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { renderLanding, renderPage } from './template.js';
import { normaliseBasePath, siteUrl } from './url.js';

export interface BuildSiteOptions {
  config: OvellumConfig;
  cwd: string;
  /** Build timestamp recorded in page footers. Defaults to `new Date()`. */
  now?: Date;
}

export interface PageOutput {
  sourcePath: string;
  outputPath: string;
  url: string;
  title: string;
  /** Frontmatter `description`, when set. Used by the RSS feed and metadata. */
  description?: string;
  /** ISO-8601 last-modified timestamp from git → fs mtime fallback. */
  lastModified?: string;
}

export interface BuildSiteResult {
  pages: PageOutput[];
  warnings: string[];
  outputDir: string;
  assetsDir: string;
  /** True when a landing page was rendered at `/`. */
  landingRendered: boolean;
}

const TEMPLATE_DIR_NAME = 'templates/default';
const LANDING_BODY_FILE = '_landing.md';

/**
 * Escape a string for safe interpolation into a double-quoted HTML attribute.
 * Newlines may stay literal — they are valid inside a quoted attribute value.
 */
function escapeCopyAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Line-comment prefix for a highlight language, used to fold an install
 * snippet's title into the code block as a leading comment. Defaults to `#`
 * for shells/config langs; `//` for the C-family/JS-family. Falls back to `#`.
 */
function commentPrefix(lang: string): string {
  const l = lang.toLowerCase();
  const slash = new Set([
    'js',
    'ts',
    'javascript',
    'typescript',
    'json5',
    'jsonc',
    'c',
    'cpp',
    'go',
    'rust',
    'java',
  ]);
  return slash.has(l) ? '//' : '#';
}

/**
 * Build a static site from a folder of `.md` files. Wired by the CLI when
 * `config.mode === 'manual'`.
 *
 *   content/index.md           →  dist/index.html
 *   content/getting-started.md →  dist/getting-started/index.html
 *   content/guides/install.md  →  dist/guides/install/index.html
 *   content/img/logo.svg       →  dist/img/logo.svg   (passthrough)
 *
 * When `config.site.landing.enabled` is true, `dist/index.html` is rendered
 * from the landing template (hero + features + optional `_landing.md` pitch
 * + trust strip), and any `content/index.md` is skipped with a warning.
 *
 * Also writes `dist/assets/ovellum.css` and `dist/assets/ovellum.js` from the
 * bundled default template.
 */
export async function buildSite(options: BuildSiteOptions): Promise<BuildSiteResult> {
  const { config, cwd } = options;
  const now = options.now ?? new Date();

  const inputAbs = path.resolve(cwd, config.input);
  const outputAbs = path.resolve(cwd, config.output);
  const assetsAbs = path.join(outputAbs, 'assets');

  if (config.defaultFormat !== 'md') {
    throw new Error(
      `manual mode currently only supports 'md' output; got '${config.defaultFormat}'.`,
    );
  }

  const site = resolveSiteConfig(config);
  const nav = await buildNav(config.input, cwd, site.ignoreFolders);
  const warnings: string[] = [];

  await mkdir(assetsAbs, { recursive: true });
  await writeStaticAssets(assetsAbs);

  const landingEnabled = site.landing.enabled === true;
  const docsHref = landingEnabled ? (site.landing.docsHref ?? firstNavUrl(nav)) : undefined;

  const pages: PageOutput[] = [];
  let landingRendered = false;
  // Tracks whether the content walk produced a /404/ page (from content/404.md).
  // If not, we synthesise a default one below — every site gets a 404 that
  // matches the template, whether or not the author wrote one.
  let notFoundRendered = false;

  // Render the landing page first (if enabled) so `content/index.md`
  // can be detected as a conflict during the walk.
  if (landingEnabled) {
    const landingBody = await readLandingBody(inputAbs, site);
    // Render each install snippet through the same markdown/shiki pipeline as
    // doc code blocks (and the pitch body) so it gets syntax highlighting plus
    // the `data-language` eyebrow + `data-copy` the copy-button JS looks for.
    const install: Array<{ html: string }> = [];
    for (const entry of site.landing.install ?? []) {
      // Fold the title into the code as a leading comment line (rather than a
      // separate heading), so it copies along with the command and reads like
      // a hand-typed `# describe this command` annotation.
      const prefix = commentPrefix(entry.lang || 'bash');
      const withComment = entry.title
        ? prefix + ' ' + entry.title + '\n' + entry.code
        : entry.code;
      const fenced = '```' + (entry.lang || 'bash') + '\n' + withComment + '\n```';
      const { html: snippetHtml } = await renderMarkdown(fenced, { codeTheme: site.codeTheme });
      // The visible block keeps the folded-in title comment, but the copy
      // button should yield only the command. Stamp the comment-free command
      // onto the <pre> as data-copy-text so the copy JS can prefer it.
      if (snippetHtml.includes('<pre ')) {
        const escaped = escapeCopyAttr(entry.code);
        const withAttr = snippetHtml.replace('<pre ', `<pre data-copy-text="${escaped}" `);
        install.push({ html: withAttr });
      } else {
        install.push({ html: snippetHtml });
      }
    }
    const html = renderLanding({
      site,
      landing: site.landing,
      pitchHtml: landingBody?.html,
      install,
      generatedAt: now.toISOString(),
      docsHref,
    });
    await writeFile(path.join(outputAbs, 'index.html'), html, 'utf8');
    pages.push({
      sourcePath: landingBody?.sourcePath ?? '(landing config)',
      outputPath: path.relative(cwd, path.join(outputAbs, 'index.html')).replace(/\\/g, '/'),
      url: '/',
      title: site.landing.hero.title ?? site.title,
    });
    landingRendered = true;
  }

  for await (const file of walkContent(inputAbs, site.ignoreFolders)) {
    const relFromInput = path.relative(inputAbs, file).replace(/\\/g, '/');
    if (isMarkdown(file)) {
      const url = urlFor(relFromInput);
      if (landingEnabled && url === '/') {
        warnings.push(
          `Skipped ${relFromInput} because site.landing.enabled is true; ` +
            `the landing template renders / instead. Move prose to ${LANDING_BODY_FILE} ` +
            `or rename this file.`,
        );
        continue;
      }
      const outputPath = path.join(outputAbs, urlToOutputPath(url));
      const { prev, next } = findAdjacent(nav, url);
      const breadcrumbs = findBreadcrumbs(nav, url).map((n) => ({ title: n.title, url: n.url }));
      const sourceRelFromCwd = path.relative(cwd, file).replace(/\\/g, '/');
      const result = await renderOne({
        absInput: file,
        url,
        site,
        // Sidebar renders the section subtree; prev/next + breadcrumbs above
        // still use the full nav so reading order spans the whole site.
        nav: sidebarRootFor(nav),
        cwd,
        generatedAt: now.toISOString(),
        docsHref,
        prev: prev ? { title: prev.title, url: prev.url } : undefined,
        next: next ? { title: next.title, url: next.url } : undefined,
        breadcrumbs,
        sourceRelFromCwd,
      });
      if (!result) continue; // draft page (frontmatter draft: true) — skip
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, result.html, 'utf8');
      // Mirror the not-found page to a top-level `404.html`. The pretty-URL
      // output is `404/index.html`, but most static hosts (GitHub Pages,
      // Netlify, Cloudflare, …) serve a root-level `404.html` for missing
      // paths and never look inside `404/index.html`. Emitting both makes a
      // custom 404 actually trigger in production with no extra build step.
      if (url === '/404/') {
        await writeFile(path.join(outputAbs, '404.html'), result.html, 'utf8');
        notFoundRendered = true;
      }
      pages.push({
        sourcePath: path.relative(cwd, file).replace(/\\/g, '/'),
        outputPath: path.relative(cwd, outputPath).replace(/\\/g, '/'),
        url,
        title: result.title,
        description: result.description,
        lastModified: result.lastModified,
      });
      warnings.push(...result.warnings);
    } else {
      // Passthrough static asset
      const outputPath = path.join(outputAbs, relFromInput);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(file, outputPath);
    }
  }

  // Always emit a 404 that matches the template. If the author wrote
  // `content/404.md` it was rendered above; otherwise synthesise a default
  // here. Both `404/index.html` (pretty URL) and a root `404.html` are written
  // so static hosts that look for the root file (GitHub Pages, Netlify, …)
  // trigger it. A platform that serves its own 404 simply ignores ours.
  if (!notFoundRendered) {
    const homeHref = siteUrl('/', normaliseBasePath(site.basePath));
    const bodyHtml =
      `<h1>Page not found</h1>\n` +
      `<p>The page you’re looking for doesn’t exist or may have moved.</p>\n` +
      `<p><a href="${homeHref}">Go to the homepage</a></p>`;
    const html = renderPage({
      site,
      nav: sidebarRootFor(nav),
      url: '/404/',
      title: 'Page not found',
      bodyHtml,
      headings: [],
      generatedAt: now.toISOString(),
      docsHref,
      bodyClass: 'ov-body-404',
    });
    await mkdir(path.join(outputAbs, '404'), { recursive: true });
    await writeFile(path.join(outputAbs, '404', 'index.html'), html, 'utf8');
    await writeFile(path.join(outputAbs, '404.html'), html, 'utf8');
    // Intentionally NOT pushed to `pages`: the default 404 is infrastructure,
    // not authored content, so it shouldn't inflate the build's page count
    // (nor appear in sitemap/RSS, which already exclude /404/).
  }

  // Sort pages for deterministic summary output (but keep `/` first).
  pages.sort((a, b) => {
    if (a.url === '/') return -1;
    if (b.url === '/') return 1;
    return a.url.localeCompare(b.url);
  });

  // Emit sitemap.xml and feed.xml when site.baseUrl is configured.
  if (site.baseUrl) {
    const xml = generateSitemap({ pages, baseUrl: site.baseUrl, basePath: site.basePath });
    if (xml) await writeFile(path.join(outputAbs, 'sitemap.xml'), xml, 'utf8');

    const rss = generateRss({
      pages,
      baseUrl: site.baseUrl,
      basePath: site.basePath,
      title: site.title,
      description: site.description,
      exclude: ['/404/', '/'],
      generatedAt: now,
    });
    if (rss) await writeFile(path.join(outputAbs, 'feed.xml'), rss, 'utf8');
  } else {
    warnings.push(
      'sitemap.xml and feed.xml not generated: set `site.baseUrl` in your config to enable them.',
    );
  }

  // Run Pagefind search indexing when enabled.
  if (site.search.enabled) {
    const idx = await indexSite({ outputAbs });
    if (idx.exitCode !== 0) {
      for (const err of idx.errors) warnings.push(`search: ${err}`);
    }
  }

  return {
    pages,
    warnings,
    outputDir: path.relative(cwd, outputAbs).replace(/\\/g, '/'),
    assetsDir: path.relative(cwd, assetsAbs).replace(/\\/g, '/'),
    landingRendered,
  };
}

interface RenderOneInput {
  absInput: string;
  url: string;
  site: OvellumSiteConfig & { title: string };
  nav: NavNode;
  cwd: string;
  generatedAt: string;
  docsHref?: string;
  prev?: { title: string; url: string };
  next?: { title: string; url: string };
  breadcrumbs?: Array<{ title: string; url: string }>;
  /** Page's source path relative to the project root; substituted into the edit URL. */
  sourceRelFromCwd: string;
}

interface RenderOneResult {
  html: string;
  title: string;
  description?: string;
  lastModified?: string;
  warnings: string[];
}

async function renderOne(input: RenderOneInput): Promise<RenderOneResult | null> {
  const raw = await readFile(input.absInput, 'utf8');
  const parsed = matter(raw);
  const frontmatter = parsed.data as { title?: string; description?: string; draft?: boolean };
  // Draft pages are unpublished — skip rendering (nav.ts keeps them out too).
  if (frontmatter.draft === true) return null;
  const { html: bodyHtml, headings } = await renderMarkdown(parsed.content, {
    codeTheme: input.site.codeTheme,
  });
  // Title resolution mirrors the nav (nav.ts pageNode): frontmatter `title`,
  // else the first `# H1` in the body, else the site title. (The ToC only
  // collects h2–h3, so we read the H1 from the raw content, not `headings`.)
  const title = frontmatter.title ?? firstH1(parsed.content) ?? input.site.title;

  const editUrl = input.site.editUrlPattern
    ? input.site.editUrlPattern.replace('{path}', input.sourceRelFromCwd)
    : undefined;

  const pageMetaCfg = input.site.pageMeta;
  const readingMin = pageMetaCfg.readingTime
    ? readingMinutes(countWords(parsed.content))
    : undefined;
  const lastModified = pageMetaCfg.lastModified
    ? await lastModifiedISO({ absPath: input.absInput, cwd: input.cwd })
    : undefined;

  const html = renderPage({
    site: input.site,
    nav: input.nav,
    url: input.url,
    title,
    description: frontmatter.description,
    bodyHtml,
    headings,
    generatedAt: input.generatedAt,
    docsHref: input.docsHref,
    prev: input.prev,
    next: input.next,
    breadcrumbs: input.breadcrumbs,
    editUrl,
    readingMinutes: readingMin,
    lastModified,
    bodyClass: input.url === '/404/' ? 'ov-body-404' : undefined,
  });
  return {
    html,
    title,
    description: frontmatter.description,
    lastModified,
    warnings: [],
  };
}

interface LandingBody {
  html: string;
  sourcePath: string;
}

async function readLandingBody(
  inputAbs: string,
  site: OvellumSiteConfig,
): Promise<LandingBody | undefined> {
  const abs = path.join(inputAbs, LANDING_BODY_FILE);
  if (!existsSync(abs)) return undefined;
  const raw = await readFile(abs, 'utf8');
  const { content } = matter(raw);
  if (!content.trim()) return undefined;
  const { html } = await renderMarkdown(content, { codeTheme: site.codeTheme });
  return { html, sourcePath: path.join(path.basename(inputAbs), LANDING_BODY_FILE) };
}

function firstNavUrl(nav: NavNode): string | undefined {
  const first = nav.children.find((c) => c.sourcePath !== undefined);
  return first?.url;
}

/**
 * Choose the nav subtree to render in the sidebar.
 *
 * When a site funnels all of its pages through a single top-level section
 * (e.g. everything under `/docs`), we root the sidebar at that section so its
 * pages sit at the top level instead of under a redundant wrapper — and stray
 * root entries (a 404 page, a `public/` asset folder) stay out of the nav.
 * The section's own index page is surfaced as the leading sidebar item.
 *
 * This only kicks in for the single-section shape: a site with loose root
 * pages alongside groups (the usual multi-section layout) keeps the full nav.
 */
function sidebarRootFor(nav: NavNode): NavNode {
  const groups = nav.children.filter((c) => c.children.length > 0);
  // Root-level content pages (a page node is childless with a source file).
  // The synthetic 404 page doesn't count — it's not part of the reading flow.
  const looseRootPages = nav.children.filter(
    (c) => c.sourcePath !== undefined && c.children.length === 0 && c.url !== '/404/',
  );
  if (groups.length !== 1 || looseRootPages.length > 0) return nav;
  const section = groups[0]!;
  const lead: NavNode[] = section.sourcePath
    ? [
        {
          title: section.title,
          url: section.url,
          sourcePath: section.sourcePath,
          children: [],
        },
      ]
    : [];
  return { ...section, children: [...lead, ...section.children] };
}

function resolveSiteConfig(config: OvellumConfig): OvellumSiteConfig & { title: string } {
  const title = config.site.title ?? config.name ?? 'Ovellum site';
  return { ...config.site, title };
}

async function* walkContent(dirAbs: string, ignoreFolders: string[]): AsyncGenerator<string> {
  const entries = await readdir(dirAbs);
  for (const name of entries) {
    if (name.startsWith('_')) continue;
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      // Skip excluded folders entirely — no render, no asset copy: explicit
      // `ignoreFolders`, or a folder opting out via `_meta.json` "hidden": true.
      if (ignoreFolders.includes(name)) continue;
      if (await isHiddenDir(abs)) continue;
      yield* walkContent(abs, ignoreFolders);
    } else {
      yield abs;
    }
  }
}

function isMarkdown(p: string): boolean {
  return /\.(md|markdown)$/i.test(p);
}

/**
 * Map a content-relative path to its public URL.
 *
 *   index.md             → /
 *   getting-started.md   → /getting-started/
 *   guides/install.md    → /guides/install/
 *   guides/index.md      → /guides/
 */
function urlFor(relFromInput: string): string {
  const noExt = relFromInput.replace(/\.(md|markdown)$/i, '');
  const parts = noExt.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts[parts.length - 1] === 'index') parts.pop();
  if (parts.length === 0) return '/';
  return '/' + parts.join('/') + '/';
}

function urlToOutputPath(url: string): string {
  if (url === '/') return 'index.html';
  return url.replace(/^\/+/, '').replace(/\/+$/, '') + '/index.html';
}

/**
 * First `# H1` in the raw markdown body — the page title when frontmatter
 * omits one. Mirrors `firstH1` in nav.ts so the `<title>` and the sidebar /
 * breadcrumb always agree.
 */
function firstH1(content: string): string | undefined {
  const m = content.match(/^\s*#\s+(.+)$/m);
  return m ? m[1]!.trim() : undefined;
}

async function writeStaticAssets(assetsAbs: string): Promise<void> {
  const templateDir = resolveTemplateDir();
  await copyFile(path.join(templateDir, 'style.css'), path.join(assetsAbs, 'ovellum.css'));
  await copyFile(path.join(templateDir, 'script.js'), path.join(assetsAbs, 'ovellum.js'));
}

function resolveTemplateDir(): string {
  // Both possible runtime locations:
  //   dist/index.js  →  dist/templates/default  (post-build copy ships this)
  //   src/build.ts   →  src/templates/default   (vitest / dev)
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, TEMPLATE_DIR_NAME),
    path.join(here, '..', 'src', TEMPLATE_DIR_NAME),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    `Could not locate Ovellum default template directory near ${here}. Looked in: ${candidates.join(', ')}`,
  );
}
