import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options as Schema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { createHighlighter, type Highlighter } from 'shiki';
import type { Root, Element, ElementContent } from 'hast';
import type { OvellumCodeTheme } from '@ovellum/core';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface RenderedMarkdown {
  html: string;
  headings: Heading[];
}

export interface RenderMarkdownOptions {
  /** Shiki theme pair to highlight code blocks with. Defaults to `'github'`. */
  codeTheme?: OvellumCodeTheme;
}

/**
 * Each `OvellumCodeTheme` maps to a `{ light, dark }` shiki pair. Both halves
 * are emitted into the HTML through CSS variables; switching `[data-theme]`
 * on `<html>` swaps the colours with zero runtime cost.
 *
 * Nord ships dark-only in shiki, so we pair it with `min-light` — a clean
 * low-saturation light theme that doesn't clash with Nord's frosty palette.
 */
const CODE_THEME_PAIRS: Record<OvellumCodeTheme, { light: string; dark: string }> = {
  github: { light: 'github-light', dark: 'github-dark' },
  nord: { light: 'min-light', dark: 'nord' },
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
};

const ALL_SHIKI_THEMES = Array.from(
  new Set(
    Object.values(CODE_THEME_PAIRS).flatMap((pair) => [pair.light, pair.dark]),
  ),
);

const SHIKI_LANGS = [
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'json',
  'bash',
  'shell',
  'markdown',
  'yaml',
  'html',
  'css',
] as const;

// HTML-in-Markdown sanitization policy.
//
// We accept raw HTML inside Markdown so authors can mix in <details>, <kbd>,
// an SVG, etc., but every Markdown source — even one written by a trusted
// teammate — is sanitized BEFORE shiki injects its highlighted HAST. That
// order matters: shiki output relies on inline `style` attributes that the
// sanitizer would strip, so we keep shiki's emissions out of the sanitization
// path entirely.
//
// Removed: <script>, <iframe>, <object>, <embed>, on* event-handler attrs,
// and any URL whose scheme isn't on the per-attribute allowlist below
// (so `javascript:`, `vbscript:`, and `data:` URLs are all dropped — including
// from <img src>, because data:image/svg+xml can carry executable JS).
const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Authors writing raw <code> blocks should keep their language class
    // so shiki picks them up on the next pass; defaultSchema already permits
    // `className`, but we widen `code` explicitly to be defensive.
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
  },
};

// One highlighter holds every supported theme; the choice per page is just
// which two names from that bundle we pass to `codeToHast`. Avoids the cost
// of re-instantiating shiki when a site uses multiple code themes (rare, but
// possible across separate builds in one process — e.g. tests).
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ALL_SHIKI_THEMES,
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighterPromise;
}

/**
 * Render a Markdown string to HTML. Returns the HTML body plus a list of
 * h2/h3 headings (with stable ids) for the right-side "On this page" ToC.
 *
 * - rehype-slug adds `id="…"` to every heading.
 * - rehype-autolink-headings wraps each heading text in an `<a href="#…">` so
 *   clicking the heading copies its URL.
 * - Code fences are rendered with shiki, using the theme pair chosen via
 *   `opts.codeTheme` (defaults to `github`) and emitted through CSS
 *   variables — switching `[data-theme]` on `<html>` swaps the colours
 *   with no runtime cost.
 */
export async function renderMarkdown(
  md: string,
  opts: RenderMarkdownOptions = {},
): Promise<RenderedMarkdown> {
  const highlighter = await getHighlighter();
  const themes = CODE_THEME_PAIRS[opts.codeTheme ?? 'github'] ?? CODE_THEME_PAIRS.github;
  const headings: Heading[] = [];

  const file = await unified()
    .use(remarkParse)
    // GFM enables tables, strikethrough, task lists, and literal autolinks
    // — Markdown features people expect, none of which CommonMark includes.
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    // rehype-raw parses `raw` HAST nodes (the literal HTML that survived
    // remark-rehype because of allowDangerousHtml) into real element nodes
    // so rehype-sanitize can actually walk them. Without this, raw HTML
    // would either pass straight through or be wholesale dropped — neither
    // is what we want.
    .use(rehypeRaw)
    // Sanitize BEFORE shiki — see SANITIZE_SCHEMA comment above.
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    // Transform `> [!NOTE]` etc. blockquotes into ov-callout panels. Runs
    // post-sanitize so the className we add is trusted — the HAST we emit
    // here doesn't go back through sanitization.
    .use(rehypeCallouts)
    // Wrap every `<table>` in `<div class="ov-table-wrap">` so a table
    // wider than the prose column scrolls horizontally instead of
    // blowing out the layout.
    .use(rehypeTableWrap)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      // `append` keeps the heading text flush-left along with the prose;
      // the `#` indicator floats in after the text on hover (see styles).
      behavior: 'append',
      properties: { className: ['heading-anchor'], 'aria-label': 'Permalink' },
      content: { type: 'text', value: '#' },
    })
    .use(() => (tree: Root) => {
      collectHeadings(tree, headings);
      highlightCodeBlocks(tree, highlighter, themes);
    })
    // allowDangerousHtml stays true so shiki's hast (which has been generated
    // post-sanitize and is trusted) renders without re-escaping.
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);

  return { html: String(file), headings };
}

/**
 * Wrap each top-level `<table>` in `<div class="ov-table-wrap">` so the
 * CSS can put `overflow-x: auto` on the wrapper and let wide tables
 * scroll horizontally without forcing the parent column to grow.
 *
 * Skips tables that are already inside an `.ov-table-wrap` (defensive
 * — relevant if authors hand-wrap a table in raw HTML).
 */
function rehypeTableWrap() {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'table') return;
      if (!parent || typeof index !== 'number') return;
      if (
        parent.type === 'element' &&
        readClassNames(parent as Element).includes('ov-table-wrap')
      ) {
        return;
      }
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['ov-table-wrap'] },
        children: [node],
      };
      (parent.children as ElementContent[])[index] = wrapper;
    });
  };
}

type CalloutType = 'note' | 'tip' | 'important' | 'warning' | 'caution';
const CALLOUT_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][^\S\n]*\n?/i;
const CALLOUT_LABEL: Record<CalloutType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

/**
 * remark/rehype plugin that turns GitHub-flavored alert blockquotes into
 * `.ov-callout` panels.
 *
 *   > [!NOTE]
 *   > Body content.
 *
 * becomes
 *
 *   <div class="ov-callout ov-callout--note">
 *     <div class="ov-callout-label">Note</div>
 *     <p>Body content.</p>
 *   </div>
 *
 * The blockquote must open with `[!TYPE]` on its first text node. Anything
 * else is left as a normal blockquote.
 */
function rehypeCallouts() {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') return;
      const firstP = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'p',
      );
      if (!firstP) return;
      const firstText = firstP.children[0];
      if (!firstText || firstText.type !== 'text') return;
      const m = CALLOUT_RE.exec(firstText.value);
      if (!m) return;

      const type = m[1]!.toLowerCase() as CalloutType;
      firstText.value = firstText.value.slice(m[0].length);
      // If stripping the marker left only whitespace, drop the paragraph
      // (and any line break that preceded the body).
      const stripped = firstText.value.replace(/^\s+/, '');
      if (
        firstP.children.length === 1 &&
        firstText.type === 'text' &&
        stripped.length === 0
      ) {
        node.children = node.children.filter((c) => c !== firstP);
      } else {
        // Keep the paragraph but normalize the leading newline / whitespace
        // we left behind on the first text node.
        firstText.value = stripped;
      }

      node.tagName = 'div';
      node.properties = {
        ...(node.properties ?? {}),
        className: ['ov-callout', `ov-callout--${type}`],
      };
      const label: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['ov-callout-label'] },
        children: [{ type: 'text', value: CALLOUT_LABEL[type] }],
      };
      node.children = [label, ...node.children];
    });
  };
}

function collectHeadings(tree: Root, into: Heading[]): void {
  visit(tree, 'element', (node: Element) => {
    if (!/^h[2-3]$/.test(node.tagName)) return;
    const depth = Number(node.tagName.slice(1));
    const id = typeof node.properties?.id === 'string' ? node.properties.id : '';
    if (!id) return;
    // rehype-autolink-headings appends a `<a class="heading-anchor">#</a>` to
    // every heading. Skip that child when collecting the text so the ToC
    // doesn't read "Install#" / "1. Build#" etc.
    const text = textOfHeading(node).trim();
    into.push({ depth, text, id });
  });
}

function textOfHeading(node: Element): string {
  let out = '';
  for (const child of node.children as ElementContent[]) {
    if (child.type === 'text') {
      out += child.value;
    } else if (child.type === 'element') {
      const classNames = readClassNames(child);
      if (classNames.includes('heading-anchor')) continue;
      out += textOf(child);
    }
  }
  return out;
}

function highlightCodeBlocks(
  tree: Root,
  highlighter: Highlighter,
  themes: { light: string; dark: string },
): void {
  visit(tree, 'element', (node: Element, index, parent) => {
    if (node.tagName !== 'pre' || !parent || typeof index !== 'number' || !node.children?.length) {
      return;
    }
    const code = node.children.find(
      (c): c is Element => c.type === 'element' && c.tagName === 'code',
    );
    if (!code) return;

    const langClass = readClassNames(code).find((c) => c.startsWith('language-'));
    const lang = langClass ? langClass.slice('language-'.length) : 'text';
    if (!SHIKI_LANGS.includes(lang as (typeof SHIKI_LANGS)[number])) return;

    const source = textOf(code);
    const hast = highlighter.codeToHast(source, {
      lang: lang as (typeof SHIKI_LANGS)[number],
      themes,
      defaultColor: false,
    });
    const replacement = hast.children[0];
    if (!replacement || replacement.type !== 'element') return;
    // Tag the rendered <pre> with its language so CSS can surface a
    // subtle eyebrow label (top-right of every fenced block). Also
    // tag a `data-copy` attribute that the client-side copy button
    // hook (script.js) looks for to know which blocks are eligible.
    replacement.properties = {
      ...(replacement.properties ?? {}),
      'data-language': LANG_LABEL[lang as (typeof SHIKI_LANGS)[number]] ?? lang,
      'data-copy': 'true',
    };
    (parent.children as ElementContent[])[index] = replacement;
  });
}

/**
 * Display labels for the shiki language IDs we support. Lowercase,
 * short — sits in the corner of the code block as a quiet eyebrow.
 */
const LANG_LABEL: Record<(typeof SHIKI_LANGS)[number], string> = {
  typescript: 'ts',
  tsx: 'tsx',
  javascript: 'js',
  jsx: 'jsx',
  json: 'json',
  bash: 'bash',
  shell: 'shell',
  markdown: 'md',
  yaml: 'yaml',
  html: 'html',
  css: 'css',
};

function readClassNames(node: Element): string[] {
  const cn = node.properties?.className;
  if (Array.isArray(cn)) return cn.filter((c): c is string => typeof c === 'string');
  if (typeof cn === 'string') return cn.split(/\s+/);
  return [];
}

function textOf(node: Element): string {
  let out = '';
  for (const child of node.children as ElementContent[]) {
    if (child.type === 'text') out += child.value;
    else if (child.type === 'element') out += textOf(child);
  }
  return out;
}
