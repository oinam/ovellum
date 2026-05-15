import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { createHighlighter, type Highlighter } from 'shiki';
import type { Root, Element, ElementContent } from 'hast';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface RenderedMarkdown {
  html: string;
  headings: Heading[];
}

const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

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

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
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
 * - Code fences are rendered with shiki using dual `github-light` /
 *   `github-dark` themes via CSS variables; switching `[data-theme]` on
 *   `<html>` swaps the colors with no runtime cost.
 */
export async function renderMarkdown(md: string): Promise<RenderedMarkdown> {
  const highlighter = await getHighlighter();
  const headings: Heading[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'prepend',
      properties: { className: ['heading-anchor'], 'aria-label': 'Permalink' },
      content: { type: 'text', value: '#' },
    })
    .use(() => (tree: Root) => {
      collectHeadings(tree, headings);
      highlightCodeBlocks(tree, highlighter);
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);

  return { html: String(file), headings };
}

function collectHeadings(tree: Root, into: Heading[]): void {
  visit(tree, 'element', (node: Element) => {
    if (!/^h[2-3]$/.test(node.tagName)) return;
    const depth = Number(node.tagName.slice(1));
    const id = typeof node.properties?.id === 'string' ? node.properties.id : '';
    if (!id) return;
    const text = textOf(node).replace(/^#/, '').trim(); // strip the autolink prefix
    into.push({ depth, text, id });
  });
}

function highlightCodeBlocks(tree: Root, highlighter: Highlighter): void {
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
      themes: SHIKI_THEMES,
      defaultColor: false,
    });
    const replacement = hast.children[0];
    if (!replacement || replacement.type !== 'element') return;
    (parent.children as ElementContent[])[index] = replacement;
  });
}

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
