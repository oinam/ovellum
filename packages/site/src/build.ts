import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type { OvellumConfig, OvellumSiteConfig } from '@ovellum/core';
import { renderMarkdown, type Heading } from './markdown.js';
import { buildNav, type NavNode } from './nav.js';
import { renderPage } from './template.js';

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
}

export interface BuildSiteResult {
  pages: PageOutput[];
  warnings: string[];
  outputDir: string;
  assetsDir: string;
}

const TEMPLATE_DIR_NAME = 'templates/default';

/**
 * Build a static site from a folder of `.md` files. Wired by the CLI when
 * `config.mode === 'manual'`.
 *
 *   content/index.md           →  dist/index.html
 *   content/getting-started.md →  dist/getting-started/index.html
 *   content/guides/install.md  →  dist/guides/install/index.html
 *   content/img/logo.svg       →  dist/img/logo.svg   (passthrough)
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
  const nav = await buildNav(config.input, cwd);
  const warnings: string[] = [];

  await mkdir(assetsAbs, { recursive: true });
  await writeStaticAssets(assetsAbs);

  const pages: PageOutput[] = [];
  for await (const file of walkContent(inputAbs)) {
    const relFromInput = path.relative(inputAbs, file).replace(/\\/g, '/');
    if (isMarkdown(file)) {
      const url = urlFor(relFromInput);
      const outputPath = path.join(outputAbs, urlToOutputPath(url));
      const result = await renderOne({
        absInput: file,
        relFromCwd: path.relative(cwd, file).replace(/\\/g, '/'),
        url,
        site,
        nav,
        generatedAt: now.toISOString(),
      });
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, result.html, 'utf8');
      pages.push({
        sourcePath: path.relative(cwd, file).replace(/\\/g, '/'),
        outputPath: path.relative(cwd, outputPath).replace(/\\/g, '/'),
        url,
        title: result.title,
      });
      warnings.push(...result.warnings);
    } else {
      // Passthrough static asset
      const outputPath = path.join(outputAbs, relFromInput);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(file, outputPath);
    }
  }

  // Sort pages for deterministic output order in the summary.
  pages.sort((a, b) => a.url.localeCompare(b.url));

  return {
    pages,
    warnings,
    outputDir: path.relative(cwd, outputAbs).replace(/\\/g, '/'),
    assetsDir: path.relative(cwd, assetsAbs).replace(/\\/g, '/'),
  };
}

interface RenderOneInput {
  absInput: string;
  relFromCwd: string;
  url: string;
  site: OvellumSiteConfig & { title: string };
  nav: NavNode;
  generatedAt: string;
}

interface RenderOneResult {
  html: string;
  title: string;
  warnings: string[];
}

async function renderOne(input: RenderOneInput): Promise<RenderOneResult> {
  const raw = await readFile(input.absInput, 'utf8');
  const parsed = matter(raw);
  const frontmatter = parsed.data as { title?: string; description?: string };
  const { html: bodyHtml, headings } = await renderMarkdown(parsed.content);
  const title = frontmatter.title ?? firstHeading(headings) ?? input.site.title;

  const html = renderPage({
    site: input.site,
    nav: input.nav,
    url: input.url,
    title,
    description: frontmatter.description,
    bodyHtml,
    headings,
    generatedAt: input.generatedAt,
  });
  return { html, title, warnings: [] };
}

function resolveSiteConfig(config: OvellumConfig): OvellumSiteConfig & { title: string } {
  const title = config.site.title ?? config.name ?? 'Ovellum site';
  return { ...config.site, title };
}

async function* walkContent(dirAbs: string): AsyncGenerator<string> {
  const entries = await readdir(dirAbs);
  for (const name of entries) {
    if (name.startsWith('_')) continue;
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      yield* walkContent(abs);
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

function firstHeading(headings: Heading[]): string | undefined {
  const h2 = headings.find((h) => h.depth === 2);
  return h2?.text;
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
