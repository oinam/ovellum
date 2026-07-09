import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
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
import { remarkComponents, rehypeTabs, rehypeMermaid, COMPONENT_CLASSES } from './directives.js';
import { remarkIncludes } from './includes.js';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface RenderedMarkdown {
  html: string;
  headings: Heading[];
  /** Problems from snippet expansion (missing include, escape, cycle). */
  warnings: string[];
}

export interface RenderMarkdownOptions {
  /** Shiki theme pair to highlight code blocks with. Defaults to `'github'`. */
  codeTheme?: OvellumCodeTheme;
  /** Plugin-supplied remark plugins, injected after the built-ins, before HTML. */
  remarkPlugins?: PluggableList;
  /** Plugin-supplied rehype plugins, injected before sanitize (sanitize stays the guard). */
  rehypePlugins?: PluggableList;
  /** Rewrite local `.png`/`.jpg`/`.jpeg` `<img src>` to this format's extension. */
  convertImages?: 'webp' | 'avif';
  /**
   * Enable `::include[/path.md]` snippet expansion: the rendered file's
   * absolute path plus the ordered content roots (current tree, then the
   * default-locale fallback). Unset = include directives are dropped.
   */
  include?: { sourceAbs: string; roots: string[] };
}

/**
 * Rewrite local raster `<img src>` (`.png`/`.jpg`/`.jpeg`) to the converted
 * format's extension, matching the build's `site.images.format` conversion.
 * Skips external/data URLs and other formats; preserves any `?query`/`#hash`.
 * Runs post-sanitize on the trusted tree (it only swaps a same-origin path's
 * extension).
 */
function rehypeConvertImages(format: 'webp' | 'avif') {
  return () =>
    (tree: Root): void => {
      visit(tree, 'element', (node: Element) => {
        if (node.tagName !== 'img') return;
        const src = node.properties?.src;
        if (typeof src !== 'string') return;
        // Skip schemes (http:, data:, …) and protocol-relative (//host/…).
        if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return;
        node.properties.src = src.replace(/\.(?:png|jpe?g)(?=$|[?#])/i, '.' + format);
      });
    };
}

/**
 * Each `OvellumCodeTheme` maps to a `{ light, dark }` shiki pair. Both halves
 * are emitted into the HTML through CSS variables; switching `[data-theme]`
 * on `<html>` swaps the colors with zero runtime cost.
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
// Removed: <script>, <object>, <embed>, on* event-handler attrs, and any URL
// whose scheme isn't on the per-attribute allowlist below (so `javascript:`,
// `vbscript:`, and `data:` URLs are all dropped — including from <img src>,
// because data:image/svg+xml can carry executable JS).
//
// `<iframe>` is allowed through here at the schema level (tag + a fixed
// attribute set), but a bare iframe is a click-jacking / phishing surface, so
// it's narrowed a SECOND time by `rehypeSafeIframe` (post-sanitize): any
// iframe whose `src` host isn't a known video player (YouTube/Vimeo) is
// removed. Schema = the outer guard (which attributes survive); the host
// allowlist = the inner guard (which iframes survive at all).
const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  // GFM footnotes: remark-rehype already prefixes each footnote id/href pair
  // with `user-content-` to guard against DOM clobbering, so the pair is
  // internally consistent (`<a href="#user-content-fn-1">` → `<li
  // id="user-content-fn-1">`). The sanitizer's own `clobberPrefix` would then
  // prefix the `id`s a SECOND time — but it leaves the `href`s untouched — so
  // the two ends no longer match and every footnote jump link breaks. Disable
  // the re-prefix: the single surviving prefix keeps both ends aligned, and the
  // clobber protection is retained because remark-rehype already applied it.
  clobberPrefix: '',
  // Allow native media players in Markdown — <video>/<audio> (+ their
  // <source>/<track> children) — and scoped <iframe> video embeds. The default
  // schema strips all of these; we add them so authors can embed an mp4/webm/
  // mp3 inline or drop in a YouTube/Vimeo player, not just link out.
  tagNames: [...(defaultSchema.tagNames ?? []), 'video', 'audio', 'source', 'track', 'iframe'],
  attributes: {
    ...defaultSchema.attributes,
    // Component directives (`:::note` / `:::tabs` / …) are emitted in the REMARK
    // phase as class-tagged <div>/<a>, so their classes must survive the
    // sanitizer. Whitelist *exactly* our component class tokens on every element
    // (value-restricted via the `[attr, ...allowed]` tuple — authors still can't
    // inject arbitrary classes), on top of the default `*` attrs. Tabs are then
    // upgraded post-sanitize by `rehypeTabs` (button/role/aria are trusted).
    '*': [...(defaultSchema.attributes?.['*'] ?? []), ['className', ...COMPONENT_CLASSES]],
    // `a` carries its OWN className allowlist in the default schema (footnote
    // backrefs), and an element-specific list OVERRIDES the `*` one for that
    // attribute — so a linked `:::card` (`<a class="ov-card …">`) would lose its
    // classes. Rebuild `a`: keep the default attrs, but replace the className
    // tuple with one that allows the footnote backref AND the card classes.
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter(
        (attr) => !(Array.isArray(attr) && attr[0] === 'className'),
      ),
      ['className', 'data-footnote-backref', 'ov-card', 'ov-component-card', 'ov-component-card-link'],
    ],
    // Authors writing raw <code> blocks should keep their language class
    // so shiki picks them up on the next pass; defaultSchema already permits
    // `className`, but we widen `code` explicitly to be defensive.
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    // Presentational + playback attributes only — no event handlers (on*),
    // which aren't listed and so are stripped. `src`/`poster` URLs are still
    // scheme-checked by `protocols` below.
    video: [
      'src',
      'controls',
      'width',
      'height',
      'poster',
      'preload',
      'loop',
      'muted',
      'autoPlay',
      'playsInline',
    ],
    audio: ['src', 'controls', 'preload', 'loop', 'muted', 'autoPlay'],
    source: ['src', 'type', 'srcSet', 'media', 'sizes'],
    track: ['src', 'kind', 'srcLang', 'label', 'default'],
    // Embed players. `src` is host-scoped by rehypeSafeIframe; the booleans
    // below (loading/referrerPolicy/allowFullScreen) are also force-set there,
    // but listing them keeps any author-provided values from being stripped
    // before that pass runs. The set mirrors YouTube's / Vimeo's own
    // copy-paste "Share → Embed" markup (incl. the legacy `frameBorder`) so a
    // pasted snippet survives intact — CSS zeroes the border regardless.
    iframe: [
      'src',
      'title',
      'width',
      'height',
      'loading',
      'referrerPolicy',
      'allow',
      'allowFullScreen',
      'frameBorder',
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    // Media `src` + the poster image are limited to http(s) (and relative),
    // so `javascript:`/`data:` can't sneak in via a media element.
    src: [...(defaultSchema.protocols?.src ?? []), 'http', 'https'],
    poster: ['http', 'https'],
  },
};

// Hosts whose <iframe> players we let through. Matched against the src URL's
// hostname after stripping a leading `www.`, so `www.youtube.com/embed/…`,
// `www.youtube-nocookie.com/embed/…`, and `player.vimeo.com/video/…` all pass.
// Anything else — a relative src, a malformed URL, or any other host — is
// dropped wholesale. Keep this list tight; each entry is attack surface.
const IFRAME_ALLOWED_HOSTS = new Set([
  'youtube.com',
  'youtube-nocookie.com',
  'vimeo.com',
  'player.vimeo.com',
]);

function iframeHostAllowed(src: unknown): boolean {
  if (typeof src !== 'string' || src.length === 0) return false;
  let host: string;
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    // Relative or malformed src — never an embeddable third-party player.
    return false;
  }
  return IFRAME_ALLOWED_HOSTS.has(host.replace(/^www\./, ''));
}

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
 *   variables — switching `[data-theme]` on `<html>` swaps the colors
 *   with no runtime cost.
 */
export async function renderMarkdown(
  md: string,
  opts: RenderMarkdownOptions = {},
): Promise<RenderedMarkdown> {
  const highlighter = await getHighlighter();
  const themes = CODE_THEME_PAIRS[opts.codeTheme ?? 'github'] ?? CODE_THEME_PAIRS.github;
  const headings: Heading[] = [];

  const includeWarnings: string[] = [];
  const processor = unified()
    .use(remarkParse)
    // GFM enables tables, strikethrough, task lists, and literal autolinks
    // — Markdown features people expect, none of which CommonMark includes.
    .use(remarkGfm)
    // Component directives: remark-directive parses `:::name`, then
    // remarkComponents maps our known directives (callouts/steps/cards/tabs) to
    // class-tagged elements. Runs in the remark phase so the structure flows
    // through sanitize (its classes are whitelisted in SANITIZE_SCHEMA).
    .use(remarkDirective)
    // Snippet expansion (`::include[/path.md]`) sits between the directive
    // parse and the component transform: included content is spliced in as
    // mdast, so snippets may use directives AND everything still flows through
    // sanitize below — includes add no unsanitized surface.
    .use(
      remarkIncludes(
        opts.include ? { ...opts.include, warnings: includeWarnings } : undefined,
      ),
    )
    .use(remarkComponents);
  // Plugin-supplied remark plugins (B1): after the built-ins, before the HTML
  // conversion — so whatever mdast they emit still flows through sanitize.
  if (opts.remarkPlugins?.length) processor.use(opts.remarkPlugins);
  processor
    .use(remarkRehype, { allowDangerousHtml: true })
    // rehype-raw parses `raw` HAST nodes (the literal HTML that survived
    // remark-rehype because of allowDangerousHtml) into real element nodes
    // so rehype-sanitize can actually walk them. Without this, raw HTML
    // would either pass straight through or be wholesale dropped — neither
    // is what we want.
    .use(rehypeRaw);
  // Plugin-supplied rehype plugins (B1): BEFORE sanitize, so sanitize stays the
  // security guard over everything they produce — a plugin can't smuggle in
  // unsanitized HTML.
  if (opts.rehypePlugins?.length) processor.use(opts.rehypePlugins);
  // webp conversion (B9): rewrite local raster `<img src>` to `.webp`. Runs
  // before sanitize — it only swaps a relative path's extension, which sanitize
  // keeps — so the rewritten refs match the converted files on disk.
  if (opts.convertImages) processor.use(rehypeConvertImages(opts.convertImages));
  const file = await processor
    // Sanitize BEFORE shiki — see SANITIZE_SCHEMA comment above.
    .use(rehypeSanitize, SANITIZE_SCHEMA)
    // Transform `> [!NOTE]` etc. blockquotes into ov-callout panels. Runs
    // post-sanitize so the className we add is trusted — the HAST we emit
    // here doesn't go back through sanitization.
    .use(rehypeCallouts)
    // Upgrade `:::tabs` structure into an accessible tablist + panels. Post-
    // sanitize (like rehypeCallouts) so the role/aria/button markup is trusted.
    .use(rehypeTabs)
    // Turn ```mermaid fences into `<pre class="mermaid">` for client-side lazy
    // rendering. Before highlightCodeBlocks (shiki skips `mermaid` regardless).
    .use(rehypeMermaid)
    // Narrow <iframe> to known video hosts and wrap survivors in a responsive
    // 16:9 frame. Runs post-sanitize so the schema is the outer guard and this
    // is the host allowlist — see SANITIZE_SCHEMA / IFRAME_ALLOWED_HOSTS above.
    .use(rehypeSafeIframe)
    // Wrap every `<table>` in `<div class="ov-table-wrap">` so a table
    // wider than the prose column scrolls horizontally instead of
    // blowing out the layout.
    .use(rehypeTableWrap)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      // `append` keeps the heading text flush-left along with the prose;
      // the `#` indicator floats in after the text on hover (see styles).
      behavior: 'append',
      // Skip the visually-hidden "Footnotes" label remark-gfm injects — it's a
      // screen-reader cue, not a navigable heading, so it shouldn't get an anchor.
      test: (el: Element) => !readClassNames(el).includes('sr-only'),
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

  return { html: String(file), headings, warnings: includeWarnings };
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

/**
 * Post-sanitize guard for `<iframe>` embeds. The sanitizer lets iframes
 * through with a fixed attribute set; this pass:
 *
 *  - removes any iframe whose `src` host isn't a known video player
 *    (`iframeHostAllowed`) — relative/malformed src and every other host go,
 *  - force-sets privacy/perf defaults on the survivors (`loading=lazy`,
 *    `referrerpolicy=strict-origin-when-cross-origin`, `allowfullscreen`), and
 *  - wraps each survivor in `<div class="ov-embed">` so CSS can give it a
 *    responsive 16:9 frame instead of a fixed pixel size.
 *
 * Iframes already inside an `.ov-embed` wrapper are skipped (defensive, and it
 * stops the wrapper we insert from being re-processed into an infinite nest).
 */
function rehypeSafeIframe() {
  return (tree: Root): void => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'iframe') return;
      if (!parent || typeof index !== 'number') return;
      if (
        parent.type === 'element' &&
        readClassNames(parent as Element).includes('ov-embed')
      ) {
        return;
      }
      if (!iframeHostAllowed(node.properties?.src)) {
        (parent.children as ElementContent[]).splice(index, 1);
        return index; // re-visit the node now occupying this slot
      }
      node.properties = {
        ...(node.properties ?? {}),
        loading: 'lazy',
        referrerPolicy: 'strict-origin-when-cross-origin',
        allowFullScreen: true,
      };
      const wrapper: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['ov-embed'] },
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
    // The "Footnotes" label remark-gfm injects is an h2, but it's a
    // visually-hidden screen-reader cue — keep it out of the visible ToC.
    if (readClassNames(node).includes('sr-only')) return;
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
