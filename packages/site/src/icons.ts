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
import Globe from 'lucide/dist/esm/icons/globe.mjs';
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

// Hand-rolled markdown mark in Lucide's stroke language (Lucide dropped brand
// marks). A rounded frame, an "M", and a down-arrow — the widely-recognized
// Markdown glyph. Used by the per-page "View as Markdown" action.
const MARKDOWN_MARK: LucideChild[] = [
  ['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }],
  ['path', { d: 'M7 15V9l2.5 3L12 9v6' }],
  ['path', { d: 'M17 15V9' }],
  ['path', { d: 'M14.5 12.5 17 15l2.5-2.5' }],
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
  globe: Globe,
  // Theme glyphs for the appearance panel.
  'pen-tool': PenTool,
  'book-open': BookOpen,
  feather: Feather,
  snowflake: Snowflake,
  'sun-dim': SunDim,
  markdown: MARKDOWN_MARK,
} as const;

export type IconName = keyof typeof REGISTRY;

// Filled brand marks for the per-page "Open in <assistant>" links. Kept
// separate from the stroke-based Lucide set above because brand logos are
// filled shapes, not 2px strokes — they render with `fill="currentColor"` and
// no stroke. Paths from Simple Icons (CC0); the marks remain each company's
// trademark and are used only, nominatively, to label a link that opens the
// current page in that assistant. Same precedent as the GitHub mark above.
const BRAND_ICONS = {
  // ChatGPT / OpenAI blossom.
  chatgpt:
    '<path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>',
  // Claude sunburst.
  claude:
    '<path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/>',
  // Google Gemini spark.
  gemini:
    '<path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/>',
} as const;

export type BrandIconName = keyof typeof BRAND_ICONS;

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

/**
 * Render a filled brand mark (`chatgpt` / `claude` / `gemini`) as an HTML-ready
 * SVG string. Unlike {@link renderIcon}, brand marks are filled shapes, so the
 * wrapper sets `fill="currentColor"` and no stroke — they inherit text color and
 * work in any theme, matching the monochrome icon language everywhere else.
 */
export function renderBrandIcon(name: BrandIconName, opts: RenderIconOptions = {}): string {
  const size = opts.size ?? 20;
  const className = opts.class ? ` class="${escapeAttr(opts.class)}"` : '';
  const labelled = typeof opts.label === 'string' && opts.label.length > 0;
  const a11y = labelled
    ? ` role="img" aria-label="${escapeAttr(opts.label!)}"`
    : opts.ariaHidden === false
      ? ''
      : ' aria-hidden="true" focusable="false"';
  return `<svg${className} width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"${a11y}>${BRAND_ICONS[name]}</svg>`;
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
