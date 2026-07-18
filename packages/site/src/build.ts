import { existsSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { PluggableList } from 'unified';
import { convertDest, isFormatConvertible, isOptimizableImage, optimizeImageFile } from './images.js';
import { isMinifiable, minifyFile } from './minify.js';
import { generateOgCard, ogSlug, resolveOgConfig, type ResolvedOgConfig } from './og-image.js';
import type {
  BuildWarning,
  OvellumConfig,
  OvellumLocale,
  OvellumPageContext,
  OvellumSiteConfig,
} from '@ovellum/core';
import { renderMarkdown } from './markdown.js';
import { isExcludedContentFile, isExcludedDirName } from './content-filter.js';
import {
  buildNav,
  findAdjacent,
  findBreadcrumbs,
  flattenNav,
  isDraftDir,
  isHiddenDir,
  type NavDraftStats,
  type NavNode,
} from './nav.js';
import {
  countWords,
  isShallowRepository,
  lastModifiedISO,
  normalizeFrontmatterDate,
  readingMinutes,
} from './page-meta.js';
import { indexSite } from './search.js';
import {
  resolveAiConfig,
  mdMirrorPath,
  renderPageMarkdown,
  renderRobotsTxt,
  generateLlmsTxt,
  generateLlmsFullText,
  type AiDoc,
} from './llms.js';
import { generateRss } from './rss.js';
import { generateSitemap } from './sitemap.js';
import { renderLanding, renderPage, type LocaleAlternate, type VersionAlternate } from './template.js';
import { isRtl, localize, resolveStrings, type UiStrings } from './strings.js';
import { normaliseBasePath, siteUrl } from './url.js';

export interface BuildSiteOptions {
  config: OvellumConfig;
  cwd: string;
  /** Build timestamp recorded in page footers. Defaults to `new Date()`. */
  now?: Date;
  /**
   * Include draft pages/folders (frontmatter `draft: true` / `_meta.json
   * "draft"`). `true` for `ovellum dev`/`watch` (preview, with a ribbon +
   * sidebar badge); `false` (default) for production `build`, which excludes
   * them and reports how many were dropped.
   */
  includeDrafts?: boolean;
  /**
   * Per-page transform — given a rendered page, returns the (possibly rewritten)
   * HTML to write. Composed from plugins' `transformPage` hooks by the CLI; the
   * site builder stays plugin-agnostic (same pattern as a resolved callback).
   */
  transformPage?: TransformPage;
  /** Plugin-supplied remark plugins for the Markdown pipeline (B1). Unified `PluggableList`. */
  remarkPlugins?: unknown[];
  /** Plugin-supplied rehype plugins, injected before sanitize (B1). Unified `PluggableList`. */
  rehypePlugins?: unknown[];
}

/**
 * Resolved per-page transform: receives a rendered HTML page and returns the
 * HTML to write (unchanged if no plugin altered it).
 */
export type TransformPage = (page: OvellumPageContext) => Promise<string>;

export interface PageOutput {
  sourcePath: string;
  outputPath: string;
  url: string;
  title: string;
  /** Frontmatter `description`, when set. Used by the RSS feed and metadata. */
  description?: string;
  /** ISO-8601 last-modified timestamp from git → fs mtime fallback. */
  lastModified?: string;
  /** True for a draft page (dev builds only); excluded from sitemap/RSS. */
  draft?: boolean;
  /** True for a page of a non-latest docs version — noindexed, out of the sitemap. */
  oldVersion?: boolean;
}

export interface BuildSiteResult {
  pages: PageOutput[];
  warnings: BuildWarning[];
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
/**
 * Escape a string for safe element *text content* (the synthesized 404 body).
 * Only `&` and `<` are significant in text; apostrophes/quotes are left as-is so
 * the rendered characters match the source string exactly.
 */
function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

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
  const includeDrafts = options.includeDrafts === true;
  // Accumulated across locales so a production build can report total drafts dropped.
  const draftStats: NavDraftStats = { draftPages: 0, draftSections: 0 };

  const inputAbs = path.resolve(cwd, config.input);
  const outputAbs = path.resolve(cwd, config.output);
  const assetsAbs = path.join(outputAbs, 'assets');

  if (config.defaultFormat !== 'md') {
    throw new Error(
      `manual mode currently only supports 'md' output; got '${config.defaultFormat}'.`,
    );
  }

  const site = resolveSiteConfig(config);
  // AI-friendly companion output (llms.txt / llms-full.txt / per-page `.md`).
  const ai = resolveAiConfig(site.ai);
  const basePrefix = normaliseBasePath(site.basePath);
  // The reserved static-assets dir (default `public`) is SHARED across locales:
  // it lives at the content root, is copied to the output root below, and is
  // skipped everywhere else (no pages, no nav, never under a locale subtree).
  const publicAbs = path.join(inputAbs, site.publicDir);
  const warnings: BuildWarning[] = [];
  // `info` = a benign note about what the build did; `warn` = a real problem.
  const info = (message: string): BuildWarning => ({ message, severity: 'info' });
  const warn = (message: string): BuildWarning => ({ message, severity: 'warning' });

  // Guard the classic CI footgun: a shallow checkout (`fetch-depth: 1`, the
  // `actions/checkout` default) leaves git with only the tip commit, so every
  // page's git-derived "Edited" date collapses onto the latest commit and the
  // whole site reads "Edited today". Warn once and loudly rather than ship
  // wrong dates silently — the fix is `fetch-depth: 0` (or an explicit
  // `updated:` frontmatter / `pageMeta.lastModified: false`).
  if (site.pageMeta.lastModified && (await isShallowRepository(cwd))) {
    warnings.push(
      warn(
        'Shallow git clone detected — every page\'s "Edited" date collapses onto the latest commit ' +
          '(the site will read "Edited today"). Fetch full history (`fetch-depth: 0` in actions/checkout) ' +
          'or disable `pageMeta.lastModified`.',
      ),
    );
  }

  // Opt-in raster-image optimization (B9). When `site.images` is set, copied
  // image assets are re-encoded in place via sharp; everything else copies
  // verbatim. A per-file encode failure degrades to a plain copy + a warning, so
  // one bad image never fails the build. Totals are reported as an info note.
  const imagesCfg = site.images;
  const imageQuality = imagesCfg?.quality ?? 80;
  const imageFormat = imagesCfg?.format; // 'webp'/'avif' → convert png/jpg/jpeg
  const imageMaxWidth = imagesCfg?.maxWidth; // downscale wider rasters (aspect kept)
  const imageStats = { count: 0, savedBytes: 0 };
  // Opt-in CSS/JS minification of author-supplied assets (`site.minify`, B9
  // sibling). The bundled theme is already minified at our package build, so
  // this only touches content-folder `.css`/`.js` and a templateDir's
  // style.css/script.js. A transform failure degrades to a plain copy + warning.
  const minifyCfg = site.minify === true;
  const minifyStats = { count: 0, savedBytes: 0 };
  // Per-page OpenGraph cards (B9). Needs `site.baseUrl` (social tags are absolute
  // URLs) — enabled-without-baseUrl warns once and generates nothing.
  const ogConfig = resolveOgConfig(site.ogImage);
  if (ogConfig && !site.baseUrl) {
    warnings.push(
      warn('`site.ogImage` is set but `site.baseUrl` is unset — social cards need absolute URLs, so none were generated.'),
    );
  }
  const ogContext =
    ogConfig && site.baseUrl
      ? { dirAbs: path.join(outputAbs, 'og'), config: ogConfig, baseUrl: site.baseUrl, basePath: site.basePath ?? '' }
      : undefined;
  const ogStats = { count: 0 };
  const minifyAsset = async (srcAbs: string, destAbs: string): Promise<void> => {
    try {
      const { minified, savedBytes } = await minifyFile(srcAbs, destAbs);
      if (minified) {
        minifyStats.count++;
        minifyStats.savedBytes += savedBytes;
      }
    } catch (err) {
      warnings.push(
        warn(
          `Minification failed for ${path.relative(cwd, srcAbs)} — copied as-is: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ),
      );
      await copyFile(srcAbs, destAbs);
    }
  };
  const copyAsset = async (srcAbs: string, destAbs: string): Promise<void> => {
    if (imagesCfg && isOptimizableImage(srcAbs)) {
      // Under `format`, png/jpg/jpeg are written as a sibling `.webp`/`.avif`
      // (the Markdown `<img src>` refs are rewritten to match); other images
      // re-encode in place. `maxWidth` downscales oversized rasters either way.
      const convert = imageFormat !== undefined && isFormatConvertible(srcAbs);
      const dest = convert && imageFormat ? convertDest(destAbs, imageFormat) : destAbs;
      try {
        const { optimized, savedBytes } = await optimizeImageFile(srcAbs, dest, {
          quality: imageQuality,
          format: convert ? imageFormat : undefined,
          maxWidth: imageMaxWidth,
        });
        if (optimized) {
          imageStats.count++;
          imageStats.savedBytes += savedBytes;
        }
        return;
      } catch (err) {
        warnings.push(
          warn(
            `Image optimization failed for ${path.relative(cwd, srcAbs)} — copied as-is: ${
              err instanceof Error ? err.message : String(err)
            }`,
          ),
        );
      }
    }
    if (minifyCfg && isMinifiable(srcAbs)) {
      await minifyAsset(srcAbs, destAbs);
      return;
    }
    await copyFile(srcAbs, destAbs);
  };
  // Recursively copy a directory, routing image files through copyAsset. Used
  // for publicDir when optimization is on (the plain `cp -r` path stays for the
  // common no-optimization case, so default builds are byte-identical + fast).
  const copyTree = async (srcDir: string, destDir: string): Promise<void> => {
    await mkdir(destDir, { recursive: true });
    for (const entry of await readdir(srcDir, { withFileTypes: true })) {
      const s = path.join(srcDir, entry.name);
      const d = path.join(destDir, entry.name);
      if (entry.isDirectory()) await copyTree(s, d);
      else if (entry.isFile()) await copyAsset(s, d);
    }
  };

  await mkdir(assetsAbs, { recursive: true });
  // `site.templateDir` (B1 slice 3) replaces the bundled CSS/JS/fonts per file.
  const userTemplateDir = site.templateDir ? path.resolve(cwd, site.templateDir) : undefined;
  await writeStaticAssets(assetsAbs, userTemplateDir, minifyCfg ? minifyAsset : undefined);

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
      if (imagesCfg) {
        // Walk + optimize images; copyTree handles the top-level files + dirs.
        await copyTree(publicAbs, outputAbs);
      } else {
        for (const name of await readdir(publicAbs)) {
          await cp(path.join(publicAbs, name), path.join(outputAbs, name), {
            recursive: true,
            force: true,
          });
        }
      }
    }
  }
  // Rewrite references to publicDir assets → the CDN, in every page's HTML.
  const finalizeHtml = (h: string): string =>
    assetBase && publicPaths.length ? rewriteAssetUrls(h, assetBase, publicPaths) : h;

  // Run the resolved plugin `transformPage` hook (if any) over a finalized page
  // just before write. `outputPath` is reported relative to the output dir.
  const transformPage = options.transformPage;
  const finalizePage = async (url: string, absOut: string, html: string): Promise<string> => {
    const finalized = finalizeHtml(html);
    if (!transformPage) return finalized;
    return transformPage({
      url,
      html: finalized,
      outputPath: path.relative(outputAbs, absOut).replace(/\\/g, '/'),
    });
  };

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
      includeDrafts,
      draftStats,
    );
    // The nav is the single source of truth for page URLs; prefix every URL
    // with the locale's path so non-default locales serve under `/<code>/`.
    spec.nav = prefixNav(rawNav, spec.urlPrefix);
    spec.sidebarNav = sidebarRootFor(spec.nav);
    spec.urlBySource = new Map();
    spec.draftBySource = new Set();
    spec.keys = new Map();
    for (const node of flattenNav(spec.nav)) {
      if (!node.sourcePath) continue;
      spec.urlBySource.set(node.sourcePath, node.url);
      if (node.draft) spec.draftBySource.add(node.sourcePath);
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
    const versionAlts = (key: string) => buildVersionAlternates(specs, spec, key);
    // `::include` resolution roots: this tree first, then the default locale's
    // tree of the SAME version (i18n fallback — a locale missing a snippet
    // renders the default-locale one instead of a hole).
    const defaultSpec = specs.find((s) => s.version === spec.version && s.isDefault);
    const includeRoots =
      defaultSpec && defaultSpec.inputAbs !== spec.inputAbs
        ? [spec.inputAbs, defaultSpec.inputAbs]
        : [spec.inputAbs];
    // Non-latest versions get a noindex meta, an old-version banner, and stay
    // out of the sitemap — readers land there on purpose, crawlers shouldn't.
    const oldVersion = !spec.isLatestVersion;
    const oldVersionFor = (key: string): { label: string; latestUrl: string } | undefined => {
      if (!oldVersion) return undefined;
      const latest = versionAlts(key).find((a) => a.isLatest);
      return {
        label: spec.versionLabel ?? spec.version ?? '',
        latestUrl: latest?.url ?? '/',
      };
    };
    // Tracks whether this locale's content walk produced its /404/ page.
    let notFoundRendered = false;
    // Non-draft, non-404 pages for this locale's llms.txt / llms-full.txt.
    const localeDocs: AiDoc[] = [];

    // Render the landing page first (if enabled) so a locale `index.md`
    // can be detected as a conflict during the walk.
    if (landingEnabled) {
      const landingBody = await readLandingBody(spec.inputAbs, site, {
        remarkPlugins: options.remarkPlugins,
        rehypePlugins: options.rehypePlugins,
        convertImages: imageFormat,
        includeRoots,
      });
      // Render each install snippet through the same markdown/shiki pipeline as
      // doc code blocks (and the pitch body) so it gets syntax highlighting plus
      // the `data-language` eyebrow + `data-copy` the copy-button JS looks for.
      const install: Array<{ html: string }> = [];
      for (const entry of site.landing.install ?? []) {
        const prefix = commentPrefix(entry.lang || 'bash');
        const title = localize(entry.title, spec.code ?? undefined, site.defaultLocale);
        const withComment = title ? prefix + ' ' + title + '\n' + entry.code : entry.code;
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
      // OpenGraph card for the landing page (same pipeline as doc pages; a
      // failure warns and just omits the meta).
      const landingTitle =
        localize(site.landing.hero.title, spec.code ?? undefined, site.defaultLocale) || site.title;
      let landingOgUrl: string | undefined;
      if (ogContext) {
        try {
          const png = await generateOgCard({
            title: landingTitle,
            siteTitle: site.title,
            config: ogContext.config,
          });
          const slug = ogSlug(homeUrl);
          await mkdir(ogContext.dirAbs, { recursive: true });
          await writeFile(path.join(ogContext.dirAbs, `${slug}.png`), png);
          landingOgUrl =
            ogContext.baseUrl.replace(/\/+$/, '') +
            siteUrl(`/og/${slug}.png`, normaliseBasePath(ogContext.basePath));
          ogStats.count++;
        } catch (err) {
          warnings.push(
            warn(
              `OG image generation failed for ${homeUrl} — meta omitted: ${
                err instanceof Error ? err.message : String(err)
              }`,
            ),
          );
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
        ogImageUrl: landingOgUrl,
        lang: spec.lang,
        localeAlternates: alternates('/'),
        versionAlternates: versionAlts('/'),
        localePrefix: spec.urlPrefix,
        noindex: oldVersion || undefined,
        oldVersion: oldVersionFor('/'),
        strings: spec.strings,
        dir: spec.dir,
      });
      const landingOut = path.join(outputAbs, urlToOutputPath(homeUrl));
      await mkdir(path.dirname(landingOut), { recursive: true });
      await writeFile(landingOut, await finalizePage(homeUrl, landingOut, html), 'utf8');
      pages.push({
        sourcePath: landingBody?.sourcePath ?? '(landing config)',
        outputPath: path.relative(cwd, landingOut).replace(/\\/g, '/'),
        url: homeUrl,
        title: landingTitle,
        oldVersion: oldVersion || undefined,
      });
      landingRendered = true;
    }

    for await (const file of walkContent(spec.inputAbs, {
      inputAbs: spec.inputAbs,
      ignoreFolders: site.ignoreFolders,
      ignoreFiles: site.ignoreFiles ?? [],
      outputAbs,
      publicAbs,
      includeDrafts,
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
            info(
              `Skipped ${sourceRelFromCwd} because site.landing.enabled is true; ` +
                `the landing template renders ${homeUrl} instead. Move prose to ` +
                `${LANDING_BODY_FILE} or rename this file.`,
            ),
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
          versionAlternates: versionAlts(stripLocalePrefix(url, spec.urlPrefix)),
          localePrefix: spec.urlPrefix,
          includeDrafts,
          draft: spec.draftBySource.has(sourceRelFromCwd),
          noindex: oldVersion || undefined,
          oldVersion: oldVersionFor(stripLocalePrefix(url, spec.urlPrefix)),
          strings: spec.strings,
          dir: spec.dir,
          remarkPlugins: options.remarkPlugins,
          rehypePlugins: options.rehypePlugins,
          convertImages: imageFormat,
          includeRoots,
          ogImage: ogContext,
        });
        if (!result) continue; // draft page excluded in production — skip
        if (result.ogGenerated) ogStats.count++;
        const pageHtml = await finalizePage(url, outputPath, result.html);
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
          draft: spec.draftBySource.has(sourceRelFromCwd) || undefined,
          oldVersion: oldVersion || undefined,
        });
        // Per-page render warnings (e.g. an unparseable `updated:` date) are
        // real problems the author should fix.
        warnings.push(...result.warnings.map(warn));

        // AI-friendly companions. Drafts and the 404 stay out of these (the
        // same rule as sitemap/RSS) — they're publish artifacts.
        const isDraft = spec.draftBySource.has(sourceRelFromCwd);
        const mirrorRel = mdMirrorPath(url);
        if (!isDraft && mirrorRel) {
          if (ai.mdMirror) {
            const mirrorOut = path.join(outputAbs, mirrorRel);
            await mkdir(path.dirname(mirrorOut), { recursive: true });
            await writeFile(
              mirrorOut,
              renderPageMarkdown(result.title, result.markdown),
              'utf8',
            );
          }
          if (ai.llmsTxt || ai.fullText) {
            localeDocs.push({
              url,
              link: siteUrl(ai.mdMirror ? '/' + mirrorRel : url, basePrefix),
              title: result.title,
              description: result.description,
              markdown: result.markdown,
            });
          }
        }
      } else {
        // Passthrough static asset — served under the locale prefix so a
        // co-located `content/<code>/x.png` lands at `/<code>/x.png`.
        // Guard against escaping the content dir: a `..` in the relative path,
        // or a symlink that resolves outside it (only an in-repo symlink could
        // trigger this, but it's cheap to close).
        if (relFromInput.startsWith('..') || path.isAbsolute(relFromInput)) {
          warnings.push(warn(`Skipped asset outside the content directory: ${relFromInput}`));
          continue;
        }
        if (!(await isInsideDir(file, spec.inputAbs))) {
          warnings.push(
            warn(`Skipped symlinked asset resolving outside the content directory: ${relFromInput}`),
          );
          continue;
        }
        const outRel = spec.urlPrefix ? path.join(spec.urlPrefix.slice(1), relFromInput) : relFromInput;
        const outputPath = path.join(outputAbs, outRel);
        await mkdir(path.dirname(outputPath), { recursive: true });
        await copyAsset(file, outputPath);
      }
    }

    // Always emit a 404 that matches the template. If this locale authored a
    // 404 page it was rendered above; otherwise synthesise the default here at
    // `<prefix>/404/`. The default locale additionally writes the root
    // `404.html` so hosts that look for the root file trigger it.
    if (!notFoundRendered) {
      const notFoundUrl = spec.urlPrefix + '/404/';
      const homeHref = siteUrl(homeUrl, normaliseBasePath(site.basePath));
      const s = spec.strings;
      const bodyHtml =
        `<h1>${escapeText(s.pageNotFoundTitle)}</h1>\n` +
        `<p>${escapeText(s.pageNotFoundBody)}</p>\n` +
        `<p><a href="${homeHref}">${escapeText(s.goHome)}</a></p>`;
      const html = renderPage({
        site,
        nav: spec.sidebarNav,
        url: notFoundUrl,
        title: s.pageNotFoundTitle,
        bodyHtml,
        headings: [],
        generatedAt: now.toISOString(),
        docsHref: spec.docsHref,
        bodyClass: 'ov-body-404',
        lang: spec.lang,
        localeAlternates: alternates('/404/'),
        versionAlternates: versionAlts('/404/'),
        localePrefix: spec.urlPrefix,
        strings: spec.strings,
        dir: spec.dir,
      });
      const out404 = path.join(outputAbs, urlToOutputPath(notFoundUrl));
      const html404 = await finalizePage(notFoundUrl, out404, html);
      await mkdir(path.dirname(out404), { recursive: true });
      await writeFile(out404, html404, 'utf8');
      if (spec.isDefault) {
        await writeFile(path.join(outputAbs, '404.html'), html404, 'utf8');
      }
    }

    // Emit this locale's AI index/corpus at its prefix root (`/llms.txt`,
    // `/ja/llms.txt`), with pages ordered by the sidebar nav.
    if ((ai.llmsTxt || ai.fullText) && localeDocs.length > 0) {
      const order = new Map<string, number>();
      flattenNav(spec.nav).forEach((n, i) => order.set(n.url, i));
      const ordered = [...localeDocs].sort(
        (a, b) => (order.get(a.url) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.url) ?? Number.MAX_SAFE_INTEGER),
      );
      const aiDirAbs = spec.urlPrefix ? path.join(outputAbs, spec.urlPrefix.slice(1)) : outputAbs;
      await mkdir(aiDirAbs, { recursive: true });
      if (ai.llmsTxt) {
        const txt = generateLlmsTxt({
          siteTitle: site.title,
          siteDescription: site.description,
          docs: ordered,
        });
        await writeFile(path.join(aiDirAbs, 'llms.txt'), txt, 'utf8');
      }
      if (ai.fullText) {
        const full = generateLlmsFullText(site.title, ordered);
        await writeFile(path.join(aiDirAbs, 'llms-full.txt'), full, 'utf8');
      }
    }
  }

  // Sort pages for deterministic summary output (but keep `/` first).
  pages.sort((a, b) => {
    if (a.url === '/') return -1;
    if (b.url === '/') return 1;
    return a.url.localeCompare(b.url);
  });

  // Tell the author when a production build dropped drafts — so a draft never
  // silently vanishes from the published site.
  if (!includeDrafts && draftStats.draftPages + draftStats.draftSections > 0) {
    const parts: string[] = [];
    if (draftStats.draftPages) {
      parts.push(`${draftStats.draftPages} draft page${draftStats.draftPages === 1 ? '' : 's'}`);
    }
    if (draftStats.draftSections) {
      parts.push(
        `${draftStats.draftSections} draft section${draftStats.draftSections === 1 ? '' : 's'}`,
      );
    }
    warnings.push(
      info(
        `Excluded ${parts.join(' and ')} from this production build — run \`ovellum dev\` to preview drafts.`,
      ),
    );
  }

  // Drafts (dev builds) never belong in publish artifacts.
  const publishedPages = pages.filter((p) => !p.draft);

  // robots.txt — emitted only when the llms.txt index is on, and never over a
  // user-supplied one (publicDir copies land in the output root before this).
  // Points crawlers at the sitemap (when absolute URLs exist) and at the
  // AI-readable index; comments are ignored by robots parsers, read by people.
  if (ai.llmsTxt) {
    const robotsAbs = path.join(outputAbs, 'robots.txt');
    if (!existsSync(robotsAbs)) {
      await writeFile(robotsAbs, renderRobotsTxt(site.baseUrl, basePrefix), 'utf8');
    }
  }

  // Emit sitemap.xml and feed.xml when site.baseUrl is configured.
  // Non-latest versions stay out of the sitemap (they're noindexed too) —
  // search traffic should land on the latest docs.
  if (site.baseUrl) {
    const xml = generateSitemap({
      pages: publishedPages.filter((p) => !p.oldVersion),
      baseUrl: site.baseUrl,
      basePath: site.basePath,
    });
    if (xml) await writeFile(path.join(outputAbs, 'sitemap.xml'), xml, 'utf8');

    // The sitemap is one combined file (all locales + hreflang), but RSS is
    // per-locale: each language gets its own feed at `<prefix>/feed.xml` scoped
    // to that locale's pages. A single-locale site (one spec, `urlPrefix: ''`)
    // produces exactly one `feed.xml` over all pages — byte-identical to before.
    for (const spec of specs) {
      const homeUrl = spec.urlPrefix ? spec.urlPrefix + '/' : '/';
      const localePages = publishedPages.filter((p) => localeForUrl(p.url, specs) === spec.urlPrefix);
      const rss = generateRss({
        pages: localePages,
        baseUrl: site.baseUrl,
        basePath: site.basePath,
        localePrefix: spec.urlPrefix,
        title: site.title,
        description: site.description,
        exclude: [`${spec.urlPrefix}/404/`, homeUrl],
        generatedAt: now,
      });
      if (rss) {
        const feedDir = path.join(outputAbs, spec.urlPrefix.replace(/^\//, ''));
        await mkdir(feedDir, { recursive: true });
        await writeFile(path.join(feedDir, 'feed.xml'), rss, 'utf8');
      }
    }
  } else {
    warnings.push(
      info('sitemap.xml and feed.xml not generated: set `site.baseUrl` in your config to enable them.'),
    );
  }

  // Run Pagefind search indexing when enabled.
  if (site.search.enabled) {
    const idx = await indexSite({ outputAbs });
    if (idx.exitCode !== 0) {
      for (const err of idx.errors) warnings.push(warn(`search: ${err}`));
    }
  }

  if (imageStats.count > 0) {
    const savedKb = (imageStats.savedBytes / 1024).toFixed(1);
    warnings.push(
      info(`Optimized ${imageStats.count} image(s), saving ${savedKb} KB.`),
    );
  }
  if (minifyStats.count > 0) {
    const savedKb = (minifyStats.savedBytes / 1024).toFixed(1);
    warnings.push(info(`Minified ${minifyStats.count} asset(s), saving ${savedKb} KB.`));
  }
  if (ogStats.count > 0) {
    warnings.push(info(`Generated ${ogStats.count} OpenGraph image(s).`));
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
  /** Version-picker entries (versioned sites); empty for unversioned sites. */
  versionAlternates?: VersionAlternate[];
  /** Current locale's URL prefix (`'/ja'`, or `''`) — localizes config nav links. */
  localePrefix?: string;
  /** Whether this build includes drafts (dev). Production excludes them. */
  includeDrafts?: boolean;
  /** Whether this page is a draft (renders the ribbon; only ever in dev). */
  draft?: boolean;
  /** Non-latest version page → noindex meta. */
  noindex?: boolean;
  /** Old-version banner data (non-latest versions). */
  oldVersion?: { label: string; latestUrl: string };
  /** Resolved UI-chrome strings for this locale. */
  strings: UiStrings;
  /** Text direction for `<html dir>`. */
  dir: 'ltr' | 'rtl';
  /** Plugin-supplied remark/rehype plugins for the Markdown render (B1). */
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  /** Rewrite local raster `<img src>` to the converted format (`site.images.format`). */
  convertImages?: 'webp' | 'avif';
  /** Ordered content roots for `::include` resolution (current tree, then
   *  the default-locale fallback). Unset = include directives are dropped. */
  includeRoots?: string[];
  /** Per-page OpenGraph card generation (`site.ogImage` + `site.baseUrl`). */
  ogImage?: { dirAbs: string; config: ResolvedOgConfig; baseUrl: string; basePath: string };
}

interface RenderOneResult {
  html: string;
  title: string;
  description?: string;
  lastModified?: string;
  /** Raw Markdown body (frontmatter stripped) — feeds the `.md` mirror + llms output. */
  markdown: string;
  warnings: string[];
  /** True when an OpenGraph card was generated for this page (`site.ogImage`). */
  ogGenerated?: boolean;
}

async function renderOne(input: RenderOneInput): Promise<RenderOneResult | null> {
  const raw = await readFile(input.absInput, 'utf8');
  const parsed = matter(raw);
  const frontmatter = parsed.data as {
    title?: string;
    description?: string;
    draft?: boolean;
    tags?: unknown;
    updated?: unknown;
  };
  // A frontmatter draft is excluded from production (dev renders it with a
  // ribbon). walkContent still yields the file (it doesn't read frontmatter), so
  // skip it here. The COUNT is owned by nav.ts `pageNode` (same draftStats),
  // which already tallied it — don't double-count.
  if (frontmatter.draft === true && !input.includeDrafts) return null;
  // `tags` (string or string[]) → <meta name="keywords">. Coerced + trimmed.
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((t): t is string => typeof t === 'string')
    : typeof frontmatter.tags === 'string'
      ? [frontmatter.tags]
      : undefined;
  const {
    html: bodyHtml,
    headings,
    warnings: includeWarnings,
  } = await renderMarkdown(parsed.content, {
    codeTheme: input.site.codeTheme,
    convertImages: input.convertImages,
    remarkPlugins: input.remarkPlugins as PluggableList | undefined,
    rehypePlugins: input.rehypePlugins as PluggableList | undefined,
    include: input.includeRoots
      ? { sourceAbs: input.absInput, roots: input.includeRoots }
      : undefined,
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
  // A frontmatter `updated:` pins the "Edited" date explicitly, overriding the
  // git/fs lookup. Unparseable → warn and fall back to git.
  const warnings: string[] = [];
  // Snippet-expansion problems (missing include, escape, cycle) are real
  // authoring errors — surface them like any other per-page warning.
  warnings.push(...includeWarnings.map((w) => `${input.sourceRelFromCwd} ${w}`));
  const pinnedDate = normalizeFrontmatterDate(frontmatter.updated);
  if (frontmatter.updated !== undefined && pinnedDate === undefined) {
    warnings.push(
      `${input.sourceRelFromCwd}: frontmatter \`updated\` is not a valid date — using git/filesystem instead.`,
    );
  }
  const lastModified = pageMetaCfg.lastModified
    ? (pinnedDate ?? (await lastModifiedISO({ absPath: input.absInput, cwd: input.cwd })))
    : undefined;

  // The `.md` mirror URL (when one is emitted) powers the page's LLM actions —
  // same conditions as the mirror write below: mdMirror on, not a draft, not 404.
  const aiCfg = resolveAiConfig(input.site.ai);
  const mirrorRel = mdMirrorPath(input.url);
  const markdownUrl =
    aiCfg.mdMirror && !input.draft && input.url !== '/404/' && mirrorRel
      ? siteUrl('/' + mirrorRel, normaliseBasePath(input.site.basePath))
      : undefined;

  // Per-page OpenGraph card (B9). Generated for real pages only (drafts + 404
  // excluded, like sitemap/RSS); a render failure warns and just omits the meta.
  let ogImageUrl: string | undefined;
  if (input.ogImage && !input.draft && input.url !== '/404/') {
    try {
      const png = await generateOgCard({
        title,
        siteTitle: input.site.title,
        config: input.ogImage.config,
      });
      const rel = siteUrl(`/og/${ogSlug(input.url)}.png`, normaliseBasePath(input.ogImage.basePath));
      await mkdir(input.ogImage.dirAbs, { recursive: true });
      await writeFile(path.join(input.ogImage.dirAbs, `${ogSlug(input.url)}.png`), png);
      ogImageUrl = input.ogImage.baseUrl.replace(/\/+$/, '') + rel;
    } catch (err) {
      warnings.push(
        `OG image generation failed for ${input.url} — meta omitted: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  const html = renderPage({
    site: input.site,
    nav: input.nav,
    url: input.url,
    title,
    description: frontmatter.description,
    tags,
    ogImageUrl,
    bodyHtml,
    headings,
    generatedAt: input.generatedAt,
    docsHref: input.docsHref,
    prev: input.prev,
    next: input.next,
    breadcrumbs: input.breadcrumbs,
    editUrl,
    markdownUrl,
    readingMinutes: readingMin,
    lastModified,
    bodyClass: input.url === '/404/' ? 'ov-body-404' : undefined,
    lang: input.lang,
    localeAlternates: input.localeAlternates,
    versionAlternates: input.versionAlternates,
    localePrefix: input.localePrefix,
    draft: input.draft,
    noindex: input.noindex,
    oldVersion: input.oldVersion,
    strings: input.strings,
    dir: input.dir,
  });
  return {
    html,
    title,
    description: frontmatter.description,
    lastModified,
    markdown: parsed.content,
    warnings,
    ogGenerated: ogImageUrl !== undefined,
  };
}

interface LandingBody {
  html: string;
  sourcePath: string;
}

async function readLandingBody(
  inputAbs: string,
  site: OvellumSiteConfig,
  markdownPlugins?: {
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    convertImages?: 'webp' | 'avif';
    includeRoots?: string[];
  },
): Promise<LandingBody | undefined> {
  const abs = path.join(inputAbs, LANDING_BODY_FILE);
  if (!existsSync(abs)) return undefined;
  const raw = await readFile(abs, 'utf8');
  const { content } = matter(raw);
  if (!content.trim()) return undefined;
  const { html } = await renderMarkdown(content, {
    codeTheme: site.codeTheme,
    convertImages: markdownPlugins?.convertImages,
    remarkPlugins: markdownPlugins?.remarkPlugins as PluggableList | undefined,
    rehypePlugins: markdownPlugins?.rehypePlugins as PluggableList | undefined,
    include: markdownPlugins?.includeRoots
      ? { sourceAbs: abs, roots: markdownPlugins.includeRoots }
      : undefined,
  });
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
  /** URL prefix: version prefix + locale prefix (`''`, `'/ja'`, `'/v1'`, `'/v1/ja'`). */
  urlPrefix: string;
  isDefault: boolean;
  /** Version id, or null for an unversioned site. */
  version: string | null;
  /** Version display label (defaults to the id); undefined when unversioned. */
  versionLabel: string | undefined;
  /** True for the version served at the site root. */
  isLatestVersion: boolean;
  // Filled in Phase A:
  nav: NavNode;
  sidebarNav: NavNode;
  urlBySource: Map<string, string>;
  /** Source paths whose nav node is a draft (dev builds) → drives the ribbon. */
  draftBySource: Set<string>;
  /** Translation key (prefix-stripped URL) → full URL in this locale. */
  keys: Map<string, string>;
  docsHref?: string;
  /** Resolved UI-chrome strings for this locale (English + built-in + config override). */
  strings: UiStrings;
  /** Text direction for this locale's `<html dir>`. */
  dir: 'ltr' | 'rtl';
}

interface VersionMeta {
  version: string | null;
  versionLabel: string | undefined;
  versionPrefix: string;
  isLatestVersion: boolean;
  inputAbs: string;
}

/**
 * Resolve the full set of build specs — one per (version × locale). Versions are
 * the outer dimension: each maps to a `content/<id>/` subtree, the `latest` one
 * served at the root, the rest under `/<id>/`. Unversioned + single-language is
 * a single unprefixed spec rooted at the content dir, so its output stays
 * byte-for-byte identical to before either feature existed.
 */
function resolveLocaleSpecs(site: OvellumSiteConfig, inputAbs: string): LocaleSpec[] {
  const versionMetas: VersionMeta[] =
    site.versions && site.versions.length > 0
      ? (() => {
          const latest = site.versions.find((v) => v.latest) ?? site.versions[0]!;
          return site.versions.map((v) => ({
            version: v.id,
            versionLabel: v.label ?? v.id,
            versionPrefix: v.id === latest.id ? '' : '/' + v.id,
            isLatestVersion: v.id === latest.id,
            inputAbs: path.join(inputAbs, v.id),
          }));
        })()
      : [{ version: null, versionLabel: undefined, versionPrefix: '', isLatestVersion: true, inputAbs }];

  return versionMetas.flatMap((vm) => localeSpecsForVersion(site, vm));
}

function localeSpecsForVersion(site: OvellumSiteConfig, vm: VersionMeta): LocaleSpec[] {
  const placeholders = {
    nav: { title: '', url: '/', children: [] } as NavNode,
    sidebarNav: { title: '', url: '/', children: [] } as NavNode,
    urlBySource: new Map<string, string>(),
    draftBySource: new Set<string>(),
    keys: new Map<string, string>(),
  };
  const vFields = {
    version: vm.version,
    versionLabel: vm.versionLabel,
    isLatestVersion: vm.isLatestVersion,
  };
  // No i18n → one spec rooted at the version's content dir, prefixed only by the
  // version (empty for the latest). Unversioned + no-i18n = `''` = legacy output.
  if (!site.locales || site.locales.length === 0) {
    return [
      {
        locale: null,
        code: null,
        lang: undefined,
        inputAbs: vm.inputAbs,
        urlPrefix: vm.versionPrefix,
        isDefault: true,
        ...vFields,
        ...placeholders,
        urlBySource: new Map(),
        draftBySource: new Set(),
        keys: new Map(),
        strings: resolveStrings(undefined),
        dir: 'ltr',
      },
    ];
  }
  const def = site.defaultLocale ?? site.locales[0]!.code;
  return site.locales.map((l) => ({
    locale: l,
    code: l.code,
    lang: l.code,
    inputAbs: path.join(vm.inputAbs, l.code),
    urlPrefix: vm.versionPrefix + (l.code === def ? '' : '/' + l.code),
    isDefault: l.code === def,
    ...vFields,
    ...placeholders,
    urlBySource: new Map(),
    draftBySource: new Set(),
    keys: new Map(),
    // English fills any gap a built-in translation leaves; a per-locale config
    // `strings` override wins. RTL languages get `<html dir="rtl">`.
    strings: resolveStrings(l.code, l.strings as Partial<UiStrings> | undefined),
    dir: isRtl(l.code) ? 'rtl' : 'ltr',
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
  // Stay within the current version — the language picker switches locale, not
  // version (the version picker handles the other axis).
  return specs
    .filter((s) => s.version === current.version)
    .map((s) => {
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

/** Cross-version links for the topbar version picker, within the current locale.
 *  Maps to the same page in each version (falling back to that version's home). */
function buildVersionAlternates(
  specs: LocaleSpec[],
  current: LocaleSpec,
  key: string,
): VersionAlternate[] {
  if (!current.version) return [];
  return specs
    .filter((s) => s.code === current.code)
    .map((s) => {
      const url = s.keys.get(key);
      const homeUrl = s.urlPrefix ? s.urlPrefix + '/' : '/';
      return {
        id: s.version!,
        label: s.versionLabel ?? s.version!,
        url: url ?? homeUrl,
        current: s === current,
        isLatest: s.isLatestVersion,
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
  /** Include `_meta.json "draft"` folders (dev). Production skips them. */
  includeDrafts?: boolean;
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
      // Draft folders (`_meta.json "draft"`) are skipped in production; dev
      // descends into them (the pages render with a ribbon).
      if (!opts.includeDrafts && (await isDraftDir(abs))) continue;
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
  return /\.(md|markdown|mdx)$/i.test(p);
}

/**
 * Which locale a page URL belongs to, for per-locale RSS: the longest non-empty
 * `urlPrefix` the URL sits under (`/ja/guide/` → `/ja`), else `''` (the default
 * locale, served at the root). Returns the matching `spec.urlPrefix`.
 */
function localeForUrl(url: string, specs: ReadonlyArray<{ urlPrefix: string }>): string {
  let best = '';
  for (const s of specs) {
    if (
      s.urlPrefix &&
      (url === s.urlPrefix || url.startsWith(s.urlPrefix + '/')) &&
      s.urlPrefix.length > best.length
    ) {
      best = s.urlPrefix;
    }
  }
  return best;
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

/** Whether `file`'s real (symlink-resolved) path stays inside `dir`. Used to
 *  reject passthrough assets that a symlink points outside the content dir. */
async function isInsideDir(file: string, dir: string): Promise<boolean> {
  try {
    const root = await realpath(dir);
    const real = await realpath(file);
    return real === root || real.startsWith(root + path.sep);
  } catch {
    return false;
  }
}

function urlFor(relFromInput: string): string {
  const noExt = relFromInput.replace(/\.(md|markdown|mdx)$/i, '');
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

async function writeStaticAssets(
  assetsAbs: string,
  userTemplateDir?: string,
  // Minify a user-supplied template asset (`site.minify`). Only called for files
  // that came from `userTemplateDir` — the bundled fallback is already minified.
  minifyUserAsset?: (srcAbs: string, destAbs: string) => Promise<void>,
): Promise<void> {
  const defaultDir = resolveTemplateDir();
  // Per asset, prefer the user template dir's version (B1 slice 3 — "bring your
  // own template directory"); fall back to the bundled default so a partial
  // override (e.g. only `style.css`) still produces a complete asset set.
  const pick = (rel: string): { path: string; fromUser: boolean } => {
    if (userTemplateDir) {
      const candidate = path.join(userTemplateDir, rel);
      if (existsSync(candidate)) return { path: candidate, fromUser: true };
    }
    return { path: path.join(defaultDir, rel), fromUser: false };
  };
  const writeAsset = async (rel: string, destName: string): Promise<void> => {
    const { path: src, fromUser } = pick(rel);
    const dest = path.join(assetsAbs, destName);
    if (fromUser && minifyUserAsset) await minifyUserAsset(src, dest);
    else await copyFile(src, dest);
  };
  await writeAsset('style.css', 'ovellum.css');
  await writeAsset('script.js', 'ovellum.js');
  // Bundled webfonts (Inter, Geist) for the font picker. The @font-face rules
  // in ovellum.css reference them at fonts/… relative to the stylesheet, so
  // they must land in assets/fonts/. Lazy by spec — the browser only fetches a
  // file when a page actually renders in that family (data-font=inter|geist).
  const fontsDir = pick('fonts').path;
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
