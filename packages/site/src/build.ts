import { existsSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { OvellumConfig, OvellumLocale, OvellumSiteConfig } from '@ovellum/core';
import { renderMarkdown } from './markdown.js';
import { isExcludedContentFile, isExcludedDirName } from './content-filter.js';
import {
  buildNav,
  findAdjacent,
  findBreadcrumbs,
  flattenNav,
  isHiddenDir,
  type NavNode,
} from './nav.js';
import { countWords, lastModifiedISO, readingMinutes } from './page-meta.js';
import { indexSite } from './search.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { renderLanding, renderPage, type LocaleAlternate } from './template.js';
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
  // The reserved static-assets dir (default `public`) is SHARED across locales:
  // it lives at the content root, is copied to the output root below, and is
  // skipped everywhere else (no pages, no nav, never under a locale subtree).
  const publicAbs = path.join(inputAbs, site.publicDir);
  const warnings: string[] = [];

  await mkdir(assetsAbs, { recursive: true });
  await writeStaticAssets(assetsAbs);

  // publicDir → output ROOT (the SSG norm: `public/favicon.ico` → `/favicon.ico`),
  // copied verbatim, before page render (so a generated route wins a same-name
  // collision). BUT if `assetBaseUrl` is set, those assets live on a CDN — skip
  // the copy and instead collect their root-served paths so references to them
  // can be rewritten to the CDN below.
  const assetBase = site.assetBaseUrl ? site.assetBaseUrl.replace(/\/+$/, '') : undefined;
  let publicPaths: string[] = [];
  if (existsSync(publicAbs) && publicAbs !== outputAbs) {
    if (assetBase) {
      publicPaths = await collectPublicPaths(publicAbs, publicAbs);
    } else {
      for (const name of await readdir(publicAbs)) {
        await cp(path.join(publicAbs, name), path.join(outputAbs, name), {
          recursive: true,
          force: true,
        });
      }
    }
  }
  // Rewrite references to publicDir assets → the CDN, in every page's HTML.
  const finalizeHtml = (h: string): string =>
    assetBase && publicPaths.length ? rewriteAssetUrls(h, assetBase, publicPaths) : h;

  const landingEnabled = site.landing.enabled === true;

  // Resolve which languages to build. A single-language site (no `site.locales`)
  // yields exactly one spec rooted at the content dir with no URL prefix — the
  // legacy path, byte-for-byte unchanged. An i18n site yields one spec per
  // locale (`content/<code>/…`, default locale at root, others prefixed).
  const specs = resolveLocaleSpecs(site, inputAbs);

  // Phase A — build each locale's nav + URL map + translation keys up front, so
  // Phase B can render the language picker / hreflang with full cross-locale
  // knowledge (a page in one locale linking to its equivalent in another).
  for (const spec of specs) {
    const homeRel = resolveHomeRel(spec.inputAbs, site);
    const homeBasename = homeRel && !homeRel.includes('/') ? homeRel : undefined;
    const rawNav = await buildNav(
      path.relative(cwd, spec.inputAbs).replace(/\\/g, '/') || '.',
      cwd,
      site.ignoreFolders,
      site.ignoreFiles ?? [],
      outputAbs,
      homeBasename,
      publicAbs,
    );
    // The nav is the single source of truth for page URLs; prefix every URL
    // with the locale's path so non-default locales serve under `/<code>/`.
    spec.nav = prefixNav(rawNav, spec.urlPrefix);
    spec.sidebarNav = sidebarRootFor(spec.nav);
    spec.urlBySource = new Map();
    spec.keys = new Map();
    for (const node of flattenNav(spec.nav)) {
      if (!node.sourcePath) continue;
      spec.urlBySource.set(node.sourcePath, node.url);
      // Translation key = the URL with the locale prefix stripped, so the same
      // page in different locales shares a key (that's what the picker follows).
      spec.keys.set(stripLocalePrefix(node.url, spec.urlPrefix), node.url);
    }
    spec.docsHref = landingEnabled
      ? site.landing.docsHref
        ? spec.urlPrefix + site.landing.docsHref
        : firstNavUrl(spec.nav)
      : undefined;
  }

  const pages: PageOutput[] = [];
  let landingRendered = false;

  for (const spec of specs) {
    const homeUrl = spec.urlPrefix ? spec.urlPrefix + '/' : '/';
    const alternates = (key: string) => buildLocaleAlternates(specs, spec, key);
    // Tracks whether this locale's content walk produced its /404/ page.
    let notFoundRendered = false;

    // Render the landing page first (if enabled) so a locale `index.md`
    // can be detected as a conflict during the walk.
    if (landingEnabled) {
      const landingBody = await readLandingBody(spec.inputAbs, site);
      // Render each install snippet through the same markdown/shiki pipeline as
      // doc code blocks (and the pitch body) so it gets syntax highlighting plus
      // the `data-language` eyebrow + `data-copy` the copy-button JS looks for.
      const install: Array<{ html: string }> = [];
      for (const entry of site.landing.install ?? []) {
        const prefix = commentPrefix(entry.lang || 'bash');
        const withComment = entry.title
          ? prefix + ' ' + entry.title + '\n' + entry.code
          : entry.code;
        const fenced = '```' + (entry.lang || 'bash') + '\n' + withComment + '\n```';
        const { html: snippetHtml } = await renderMarkdown(fenced, { codeTheme: site.codeTheme });
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
        docsHref: spec.docsHref,
        url: homeUrl,
        lang: spec.lang,
        localeAlternates: alternates('/'),
        localePrefix: spec.urlPrefix,
      });
      const landingOut = path.join(outputAbs, urlToOutputPath(homeUrl));
      await mkdir(path.dirname(landingOut), { recursive: true });
      await writeFile(landingOut, finalizeHtml(html), 'utf8');
      pages.push({
        sourcePath: landingBody?.sourcePath ?? '(landing config)',
        outputPath: path.relative(cwd, landingOut).replace(/\\/g, '/'),
        url: homeUrl,
        title: site.landing.hero.title ?? site.title,
      });
      landingRendered = true;
    }

    for await (const file of walkContent(spec.inputAbs, {
      inputAbs: spec.inputAbs,
      ignoreFolders: site.ignoreFolders,
      ignoreFiles: site.ignoreFiles ?? [],
      outputAbs,
      publicAbs,
    })) {
      const relFromInput = path.relative(spec.inputAbs, file).replace(/\\/g, '/');
      if (isMarkdown(file)) {
        // URL comes from the nav (handles index/README folder pages + permalinks);
        // urlFor is only a fallback for a file the nav didn't surface (then
        // prefixed for non-default locales).
        const sourceRelFromCwd = path.relative(cwd, file).replace(/\\/g, '/');
        const url = spec.urlBySource.get(sourceRelFromCwd) ?? spec.urlPrefix + urlFor(relFromInput);
        if (landingEnabled && url === homeUrl) {
          warnings.push(
            `Skipped ${sourceRelFromCwd} because site.landing.enabled is true; ` +
              `the landing template renders ${homeUrl} instead. Move prose to ` +
              `${LANDING_BODY_FILE} or rename this file.`,
          );
          continue;
        }
        const outputPath = path.join(outputAbs, urlToOutputPath(url));
        const { prev, next } = findAdjacent(spec.nav, url);
        const breadcrumbs = findBreadcrumbs(spec.nav, url).map((n) => ({
          title: n.title,
          url: n.url,
          // A section folder with no index page (no sourcePath) isn't a real
          // route — render it as plain text, not a dead link.
          page: n.sourcePath !== undefined,
        }));
        const result = await renderOne({
          absInput: file,
          url,
          site,
          nav: spec.sidebarNav,
          cwd,
          generatedAt: now.toISOString(),
          docsHref: spec.docsHref,
          prev: prev ? { title: prev.title, url: prev.url } : undefined,
          next: next ? { title: next.title, url: next.url } : undefined,
          breadcrumbs,
          sourceRelFromCwd,
          lang: spec.lang,
          localeAlternates: alternates(stripLocalePrefix(url, spec.urlPrefix)),
          localePrefix: spec.urlPrefix,
        });
        if (!result) continue; // draft page (frontmatter draft: true) — skip
        const pageHtml = finalizeHtml(result.html);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, pageHtml, 'utf8');
        // The DEFAULT locale's 404 is mirrored to a root `404.html` (the file
        // static hosts serve for missing paths). Non-default locales keep their
        // own `/<code>/404/` but don't claim the single root mirror.
        if (url === '/404/') {
          await writeFile(path.join(outputAbs, '404.html'), pageHtml, 'utf8');
          notFoundRendered = true;
        }
        pages.push({
          sourcePath: sourceRelFromCwd,
          outputPath: path.relative(cwd, outputPath).replace(/\\/g, '/'),
          url,
          title: result.title,
          description: result.description,
          lastModified: result.lastModified,
        });
        warnings.push(...result.warnings);
      } else {
        // Passthrough static asset — served under the locale prefix so a
        // co-located `content/<code>/x.png` lands at `/<code>/x.png`.
        const outRel = spec.urlPrefix ? path.join(spec.urlPrefix.slice(1), relFromInput) : relFromInput;
        const outputPath = path.join(outputAbs, outRel);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await copyFile(file, outputPath);
      }
    }

    // Always emit a 404 that matches the template. If this locale authored a
    // 404 page it was rendered above; otherwise synthesise the default here at
    // `<prefix>/404/`. The default locale additionally writes the root
    // `404.html` so hosts that look for the root file trigger it.
    if (!notFoundRendered) {
      const notFoundUrl = spec.urlPrefix + '/404/';
      const homeHref = siteUrl(homeUrl, normaliseBasePath(site.basePath));
      const bodyHtml =
        `<h1>Page not found</h1>\n` +
        `<p>The page you’re looking for doesn’t exist or may have moved.</p>\n` +
        `<p><a href="${homeHref}">Go to the homepage</a></p>`;
      const html = renderPage({
        site,
        nav: spec.sidebarNav,
        url: notFoundUrl,
        title: 'Page not found',
        bodyHtml,
        headings: [],
        generatedAt: now.toISOString(),
        docsHref: spec.docsHref,
        bodyClass: 'ov-body-404',
        lang: spec.lang,
        localeAlternates: alternates('/404/'),
        localePrefix: spec.urlPrefix,
      });
      const html404 = finalizeHtml(html);
      const out404 = path.join(outputAbs, urlToOutputPath(notFoundUrl));
      await mkdir(path.dirname(out404), { recursive: true });
      await writeFile(out404, html404, 'utf8');
      if (spec.isDefault) {
        await writeFile(path.join(outputAbs, '404.html'), html404, 'utf8');
      }
    }
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
  /** `<html lang>` for this locale (i18n sites); undefined leaves the default. */
  lang?: string;
  /** Language-picker entries (i18n sites); empty for single-language sites. */
  localeAlternates?: LocaleAlternate[];
  /** Current locale's URL prefix (`'/ja'`, or `''`) — localizes config nav links. */
  localePrefix?: string;
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
  const frontmatter = parsed.data as {
    title?: string;
    description?: string;
    draft?: boolean;
    tags?: unknown;
  };
  // Draft pages are unpublished — skip rendering (nav.ts keeps them out too).
  if (frontmatter.draft === true) return null;
  // `tags` (string or string[]) → <meta name="keywords">. Coerced + trimmed.
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((t): t is string => typeof t === 'string')
    : typeof frontmatter.tags === 'string'
      ? [frontmatter.tags]
      : undefined;
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
    tags,
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
    lang: input.lang,
    localeAlternates: input.localeAlternates,
    localePrefix: input.localePrefix,
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

/** One language being built. Single-language sites get exactly one spec with a
 *  null locale, the content root as input, and no URL prefix (legacy path). */
interface LocaleSpec {
  locale: OvellumLocale | null;
  /** BCP 47 code, or null for a single-language site. */
  code: string | null;
  /** `<html lang>` value; undefined leaves the template default for legacy sites. */
  lang: string | undefined;
  /** Absolute content dir for this locale (`content/` or `content/<code>`). */
  inputAbs: string;
  /** URL prefix: `''` for the default/single locale, `'/ja'` for others. */
  urlPrefix: string;
  isDefault: boolean;
  // Filled in Phase A:
  nav: NavNode;
  sidebarNav: NavNode;
  urlBySource: Map<string, string>;
  /** Translation key (prefix-stripped URL) → full URL in this locale. */
  keys: Map<string, string>;
  docsHref?: string;
}

function resolveLocaleSpecs(site: OvellumSiteConfig, inputAbs: string): LocaleSpec[] {
  const placeholders = {
    nav: { title: '', url: '/', children: [] } as NavNode,
    sidebarNav: { title: '', url: '/', children: [] } as NavNode,
    urlBySource: new Map<string, string>(),
    keys: new Map<string, string>(),
  };
  // No i18n → one unprefixed spec rooted at the content dir (legacy behavior).
  if (!site.locales || site.locales.length === 0) {
    return [
      {
        locale: null,
        code: null,
        lang: undefined,
        inputAbs,
        urlPrefix: '',
        isDefault: true,
        ...placeholders,
        urlBySource: new Map(),
        keys: new Map(),
      },
    ];
  }
  const def = site.defaultLocale ?? site.locales[0]!.code;
  return site.locales.map((l) => ({
    locale: l,
    code: l.code,
    lang: l.code,
    inputAbs: path.join(inputAbs, l.code),
    urlPrefix: l.code === def ? '' : '/' + l.code,
    isDefault: l.code === def,
    ...placeholders,
    urlBySource: new Map(),
    keys: new Map(),
  }));
}

/** Prefix every URL in a nav subtree with the locale path (`/ja`). The default
 *  locale uses an empty prefix and is returned unchanged. */
function prefixNav(node: NavNode, prefix: string): NavNode {
  if (!prefix) return node;
  return {
    ...node,
    url: typeof node.url === 'string' ? prefix + node.url : node.url,
    children: node.children.map((c) => prefixNav(c, prefix)),
  };
}

/** Inverse of the prefix: maps a locale URL back to its translation key.
 *  `/ja/guides/` → `/guides/`, `/ja/` → `/`. */
function stripLocalePrefix(url: string, prefix: string): string {
  if (!prefix) return url;
  if (url === prefix + '/') return '/';
  if (url.startsWith(prefix + '/')) return url.slice(prefix.length);
  return url;
}

/** Build the language-picker entries for a page (translation key `key`) rendered
 *  in `current`. Each locale links to its equivalent page when it exists, else
 *  falls back to that locale's home. Returns [] for single-language sites (no
 *  picker). URLs are raw (no basePath) — the template finishes them. */
function buildLocaleAlternates(
  specs: LocaleSpec[],
  current: LocaleSpec,
  key: string,
): LocaleAlternate[] {
  if (!current.locale) return [];
  return specs.map((s) => {
    const translatedUrl = s.keys.get(key);
    const homeUrl = s.urlPrefix ? s.urlPrefix + '/' : '/';
    return {
      code: s.code!,
      label: s.locale!.label,
      url: translatedUrl ?? homeUrl,
      current: s === current,
      translated: translatedUrl !== undefined,
      isDefault: s.isDefault,
    };
  });
}

interface WalkOpts {
  inputAbs: string;
  ignoreFolders: string[];
  ignoreFiles: string[];
  /** Absolute output dir — skipped when it nests inside input (e.g. `input: '.'`,
   *  `output: 'dist'`), so the build never walks/copies its own output. */
  outputAbs?: string;
  /** Absolute reserved publicDir — skipped here (copied to the root separately). */
  publicAbs?: string;
}

export async function* walkContent(dirAbs: string, opts: WalkOpts): AsyncGenerator<string> {
  const entries = await readdir(dirAbs);
  for (const name of entries) {
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      // Skip excluded folders entirely — no render, no asset copy: the output
      // dir itself (avoids the `input: '.'` self-recursion), structural
      // (`_`/dot/`node_modules`), explicit `ignoreFolders`, or a folder opting
      // out via `_meta.json` "hidden": true.
      if (opts.outputAbs && abs === opts.outputAbs) continue;
      if (opts.publicAbs && abs === opts.publicAbs) continue;
      if (isExcludedDirName(name)) continue;
      if (opts.ignoreFolders.includes(name)) continue;
      if (await isHiddenDir(abs)) continue;
      yield* walkContent(abs, opts);
    } else {
      // Drop structural/project files (`_meta.json`, dotfiles, the config,
      // manifests) and anything matching `site.ignoreFiles`, so a root
      // `input: '.'` never leaks package.json/lockfiles/etc. into the output.
      const rel = path.relative(opts.inputAbs, abs).replace(/\\/g, '/');
      if (isExcludedContentFile(rel, name, opts.ignoreFiles)) continue;
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
/**
 * Resolve which Markdown file is the site home (rendered at `/`):
 * `site.home` → root `index.md` → root `README.md`. Returns the input-relative
 * posix path, or undefined when none exists (then the site simply has no `/`).
 * A candidate listed in `site.ignoreFiles` is skipped — so a user can opt a
 * root README out of being the home.
 */
export function resolveHomeRel(inputAbs: string, site: OvellumSiteConfig): string | undefined {
  const ignoreFiles = site.ignoreFiles ?? [];
  const consider = (relName: string): string | undefined => {
    const relPosix = relName.replace(/\\/g, '/');
    if (!existsSync(path.join(inputAbs, relPosix))) return undefined;
    if (isExcludedContentFile(relPosix, path.basename(relPosix), ignoreFiles)) return undefined;
    return relPosix;
  };
  if (site.home) {
    const explicit = consider(site.home);
    if (explicit) return explicit;
  }
  return (
    consider('index.md') ??
    consider('index.markdown') ??
    consider('README.md') ??
    consider('readme.md')
  );
}

/** Collect every file under the publicDir as its root-served path (`public/img/x.jpg`
 *  → `/img/x.jpg`) — the paths an author would reference and that get rewritten
 *  to the CDN when `assetBaseUrl` is set. */
async function collectPublicPaths(dirAbs: string, rootAbs: string): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(dirAbs)) {
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    if (st.isDirectory()) out.push(...(await collectPublicPaths(abs, rootAbs)));
    else out.push('/' + path.relative(rootAbs, abs).replace(/\\/g, '/'));
  }
  return out;
}

/**
 * Rewrite references to publicDir assets to the CDN base. Matches each path as a
 * full quoted attribute value (`src`/`href`/`poster`) or a CSS `url(...)`, so a
 * path can't partial-match a longer one. Query-stringed/`srcset` refs are left
 * as-is (documented). Pure + exported for testing.
 */
export function rewriteAssetUrls(html: string, base: string, paths: string[]): string {
  let out = html;
  for (const p of paths) {
    const cdn = base + p;
    out = out
      .split('"' + p + '"')
      .join('"' + cdn + '"')
      .split("'" + p + "'")
      .join("'" + cdn + "'")
      .split('(' + p + ')')
      .join('(' + cdn + ')');
  }
  return out;
}

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
  // Bundled webfonts (Inter, Geist) for the font picker. The @font-face rules
  // in ovellum.css reference them at fonts/… relative to the stylesheet, so
  // they must land in assets/fonts/. Lazy by spec — the browser only fetches a
  // file when a page actually renders in that family (data-font=inter|geist).
  const fontsDir = path.join(templateDir, 'fonts');
  if (existsSync(fontsDir)) {
    await cp(fontsDir, path.join(assetsAbs, 'fonts'), { recursive: true });
  }
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
