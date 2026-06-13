/**
 * Inline SVG icon registry, backed by Lucide.
 *
 * Each `<svg>` we emit follows Lucide's canonical attribute set:
 *
 *   - 24×24 viewBox
 *   - fill="none", stroke="currentColor"
 *   - stroke-width="2", stroke-linecap="round", stroke-linejoin="round"
 *
 * The icon nodes come straight from the `lucide` package — we import each one
 * by name, which means esbuild/tsup tree-shakes everything else away. Adding a
 * new icon is one import + one entry in REGISTRY.
 *
 * Why import from `lucide/dist/esm/icons/<name>.mjs` instead of the package
 * root: the root export only exposes Lucide's runtime helpers (`createIcons`),
 * not the icon tuples themselves. Each per-icon `.mjs` default-exports an
 * `IconNode[]` like `[['path', { d: 'M4 5h16' }], …]`.
 *
 * Lucide-static (the SVG-file variant) would also work, but it'd mean reading
 * files at module load. This avoids the I/O while keeping the wire payload
 * tiny (≈100B per icon after tree-shaking).
 */

import ArrowUp from 'lucide/dist/esm/icons/arrow-up.mjs';
import BookOpen from 'lucide/dist/esm/icons/book-open.mjs';
import Check from 'lucide/dist/esm/icons/check.mjs';
import ChevronDown from 'lucide/dist/esm/icons/chevron-down.mjs';
import Copy from 'lucide/dist/esm/icons/copy.mjs';
import ExternalLink from 'lucide/dist/esm/icons/external-link.mjs';
import Feather from 'lucide/dist/esm/icons/feather.mjs';
import Mail from 'lucide/dist/esm/icons/mail.mjs';
import Menu from 'lucide/dist/esm/icons/menu.mjs';
import Monitor from 'lucide/dist/esm/icons/monitor.mjs';
import Moon from 'lucide/dist/esm/icons/moon.mjs';
import Package from 'lucide/dist/esm/icons/package.mjs';
import Palette from 'lucide/dist/esm/icons/palette.mjs';
import PenTool from 'lucide/dist/esm/icons/pen-tool.mjs';
import Rss from 'lucide/dist/esm/icons/rss.mjs';
import Search from 'lucide/dist/esm/icons/search.mjs';
import Snowflake from 'lucide/dist/esm/icons/snowflake.mjs';
import Sun from 'lucide/dist/esm/icons/sun.mjs';
import SunDim from 'lucide/dist/esm/icons/sun-dim.mjs';
import X from 'lucide/dist/esm/icons/x.mjs';

type LucideAttrs = Record<string, string | number>;
type LucideNode = [string, LucideAttrs, LucideChild[]?];
type LucideChild = [string, LucideAttrs, LucideChild[]?];

// Lucide v1 dropped brand marks (trademark concerns). Hand-rolled GitHub mark
// kept here, matched to Lucide's stroke/curve language so it sits beside the
// real Lucide icons without looking out of place.
const GITHUB_MARK: LucideChild[] = [
  [
    'path',
    {
      d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
    },
  ],
  ['path', { d: 'M9 18c-4.51 2-5-2-7-2' }],
];

// Public name → Lucide node array. Public names follow our existing API
// (`close` instead of Lucide's `x`) so renaming doesn't ripple through call
// sites.
const REGISTRY = {
  menu: Menu,
  close: X,
  sun: Sun,
  moon: Moon,
  monitor: Monitor,
  'arrow-up': ArrowUp,
  'chevron-down': ChevronDown,
  github: GITHUB_MARK,
  'external-link': ExternalLink,
  search: Search,
  check: Check,
  copy: Copy,
  rss: Rss,
  mail: Mail,
  package: Package,
  palette: Palette,
  // Theme glyphs for the appearance panel.
  'pen-tool': PenTool,
  'book-open': BookOpen,
  feather: Feather,
  snowflake: Snowflake,
  'sun-dim': SunDim,
} as const;

export type IconName = keyof typeof REGISTRY;

/**
 * Backwards-compatible export: each entry is the inner SVG markup (no outer
 * `<svg>` wrapper). Preserved so existing call sites that read from `ICONS`
 * directly keep working.
 */
export const ICONS = Object.fromEntries(
  (Object.keys(REGISTRY) as IconName[]).map((name) => [name, nodesToInnerHtml(REGISTRY[name])]),
) as Record<IconName, string>;

export interface RenderIconOptions {
  /** CSS class on the `<svg>` element. */
  class?: string;
  /** Pixel size — applied as both width and height. Defaults to 20. */
  size?: number;
  /** `aria-hidden` — true by default since icons are usually decorative. */
  ariaHidden?: boolean;
  /** Visible accessible label. Forces `aria-hidden` off and adds `role="img"`. */
  label?: string;
}

/**
 * Render an icon as an HTML-ready SVG string. The result is safe to inline
 * directly into a template — every component is statically defined here.
 */
export function renderIcon(name: IconName, opts: RenderIconOptions = {}): string {
  const size = opts.size ?? 20;
  const className = opts.class ? ` class="${escapeAttr(opts.class)}"` : '';
  const labelled = typeof opts.label === 'string' && opts.label.length > 0;
  const a11y = labelled
    ? ` role="img" aria-label="${escapeAttr(opts.label!)}"`
    : opts.ariaHidden === false
      ? ''
      : ' aria-hidden="true" focusable="false"';
  const inner = ICONS[name];
  return `<svg${className} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${a11y}>${inner}</svg>`;
}

function nodesToInnerHtml(nodes: LucideChild[]): string {
  return nodes.map(nodeToHtml).join('');
}

function nodeToHtml(node: LucideChild | LucideNode): string {
  const [tag, attrs, children] = node;
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeAttr(String(v))}"`)
    .join(' ');
  const inner = children && children.length > 0 ? nodesToInnerHtml(children) : '';
  return inner ? `<${tag} ${attrStr}>${inner}</${tag}>` : `<${tag} ${attrStr}/>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
