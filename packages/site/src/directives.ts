import { visit } from 'unist-util-visit';
import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot, Element, ElementContent } from 'hast';

/**
 * Markdown-native component directives (ROADMAP B2). Authors write block
 * components with `remark-directive`'s `:::name` syntax — no JSX/MDX, so the
 * source stays portable Markdown:
 *
 *   :::note{title="Heads up"}      :::steps            :::cards
 *   Body.                          :::step{title="One"}  :::card{title="A" href="/x"}
 *   :::                            …                     Body.
 *                                  :::                   :::
 *                                  :::                 :::
 *
 *   :::tabs
 *   :::tab{label="npm"}
 *   `npm i ovellum`
 *   :::
 *   :::
 *
 * `remarkComponents` (remark phase) turns directives into class-tagged elements
 * that survive sanitization (the component classes are whitelisted in
 * `SANITIZE_SCHEMA`). `rehypeTabs` (POST-sanitize, like `rehypeCallouts`)
 * upgrades the `:::tabs` structure into an accessible tablist whose
 * button/role/aria/data attributes are trusted because they're added after the
 * sanitizer has run. Labels render as `<div>`, never headings, so they stay out
 * of the "On this page" ToC.
 */

// Every class the directive transform emits. Whitelisted (value-restricted) on
// `*` in SANITIZE_SCHEMA so the structure survives the sanitizer; keep the two
// lists in sync.
export const COMPONENT_CLASSES = [
  'ov-callout',
  'ov-callout--note',
  'ov-callout--tip',
  'ov-callout--important',
  'ov-callout--warning',
  'ov-callout--caution',
  'ov-callout-label',
  'ov-steps',
  'ov-step',
  'ov-step-title',
  'ov-cards',
  'ov-card',
  'ov-component-card',
  'ov-component-card-link',
  'ov-component-card-title',
  'ov-tabs',
  'ov-tab',
  'ov-tab-label',
  'ov-code-group',
];

/** Read `title="…"` (or single-quoted) from a fenced code block's info string. */
function titleFromMeta(meta: unknown): string | undefined {
  if (typeof meta !== 'string') return undefined;
  const m = /title="([^"]*)"|title='([^']*)'/.exec(meta);
  return m ? (m[1] ?? m[2]) : undefined;
}

const CALLOUT_LABELS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

interface DirectiveNode {
  type: string;
  name: string;
  attributes?: Record<string, string | null | undefined> | null;
  children: unknown[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

/** A short bold label rendered as a `<div>` (not a heading — stays out of ToC). */
function labelNode(className: string, text: string): unknown {
  return {
    type: 'paragraph',
    data: { hName: 'div', hProperties: { className: [className] } },
    children: [{ type: 'text', value: text }],
  };
}

export function remarkComponents() {
  return (tree: MdastRoot): void => {
    visit(tree, (node) => {
      const n = node as unknown as DirectiveNode;
      if (n.type !== 'containerDirective' && n.type !== 'leafDirective') return;
      const name = n.name;
      const attrs = n.attributes ?? {};
      const title = typeof attrs.title === 'string' ? attrs.title : undefined;
      n.data = n.data ?? {};

      if (Object.prototype.hasOwnProperty.call(CALLOUT_LABELS, name)) {
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-callout', `ov-callout--${name}`] };
        n.children.unshift(labelNode('ov-callout-label', title ?? CALLOUT_LABELS[name]!));
      } else if (name === 'steps') {
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-steps'] };
      } else if (name === 'step') {
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-step'] };
        if (title) n.children.unshift(labelNode('ov-step-title', title));
      } else if (name === 'cards') {
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-cards'] };
      } else if (name === 'card') {
        const href = typeof attrs.href === 'string' ? attrs.href : undefined;
        n.data.hName = href ? 'a' : 'div';
        n.data.hProperties = href
          ? { className: ['ov-card', 'ov-component-card', 'ov-component-card-link'], href }
          : { className: ['ov-card', 'ov-component-card'] };
        if (title) n.children.unshift(labelNode('ov-component-card-title', title));
      } else if (name === 'code-group') {
        // Tabbed code blocks: each fenced child becomes a tab whose label is the
        // fence's `title="…"` (or its language). Reuses the `.ov-tabs` machinery
        // — rehypeTabs upgrades it, shiki highlights the code afterward. `:::`
        // (not `::::`) is fine here: the children are code fences, not directives.
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-tabs', 'ov-code-group'] };
        n.children = n.children.map((child) => {
          const c = child as { type?: string; lang?: string | null; meta?: string | null };
          if (c.type !== 'code') return child;
          const label =
            titleFromMeta(c.meta) ?? (typeof c.lang === 'string' && c.lang ? c.lang : 'code');
          return {
            type: 'ovTab',
            data: { hName: 'div', hProperties: { className: ['ov-tab'] } },
            children: [labelNode('ov-tab-label', label), child],
          };
        });
      } else if (name === 'tabs') {
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-tabs'] };
      } else if (name === 'tab') {
        const label =
          (typeof attrs.label === 'string' && attrs.label) ||
          title ||
          'Tab';
        n.data.hName = 'div';
        n.data.hProperties = { className: ['ov-tab'] };
        n.children.unshift(labelNode('ov-tab-label', label));
      } else if (n.type === 'containerDirective') {
        // Unknown container directive: unwrap to a plain div so `:::` markers
        // never leak as literal text. (Leaf/text directives fall through to
        // remark-rehype's defaults.)
        n.data.hName = 'div';
        n.data.hProperties = {};
      }
    });
  };
}

function classNames(node: Element): string[] {
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

/**
 * Post-sanitize: upgrade each `div.ov-tabs` (a list of `div.ov-tab`, each
 * opening with a `div.ov-tab-label`) into an accessible tablist + panels with
 * `role`/`aria`/`id` wiring. Runs after the sanitizer, so these attributes —
 * which the schema would otherwise strip — are trusted. No `hidden` is set
 * server-side: with JS off, every panel shows (degraded but complete); the
 * client script hides inactive panels on load. Ids are unique per render.
 */
export function rehypeTabs() {
  return (tree: HastRoot): void => {
    let group = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'div' || !classNames(node).includes('ov-tabs')) return;
      if (node.properties?.dataOvTabs) return;

      const tabs = node.children.filter(
        (c): c is Element =>
          c.type === 'element' && c.tagName === 'div' && classNames(c).includes('ov-tab'),
      );
      if (tabs.length === 0) return;

      const gid = `ovtabs-${group++}`;
      const buttons: Element[] = [];
      const panels: Element[] = [];

      tabs.forEach((tab, i) => {
        const labelEl = tab.children.find(
          (c): c is Element => c.type === 'element' && classNames(c).includes('ov-tab-label'),
        );
        const label = labelEl ? textOf(labelEl).trim() || `Tab ${i + 1}` : `Tab ${i + 1}`;
        const body = tab.children.filter((c) => c !== labelEl) as ElementContent[];
        const tabId = `${gid}-tab-${i}`;
        const panelId = `${gid}-panel-${i}`;
        const selected = i === 0;

        buttons.push({
          type: 'element',
          tagName: 'button',
          properties: {
            className: ['ov-tab-btn'],
            type: 'button',
            role: 'tab',
            id: tabId,
            'aria-controls': panelId,
            'aria-selected': selected ? 'true' : 'false',
            tabIndex: selected ? 0 : -1,
          },
          children: [{ type: 'text', value: label }],
        });
        panels.push({
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['ov-tabpanel'],
            role: 'tabpanel',
            id: panelId,
            'aria-labelledby': tabId,
          },
          children: body,
        });
      });

      const tablist: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['ov-tablist'], role: 'tablist' },
        children: buttons,
      };
      node.properties = { ...(node.properties ?? {}), dataOvTabs: 'true' };
      node.children = [tablist, ...panels];
    });
  };
}
