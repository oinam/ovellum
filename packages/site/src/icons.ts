/**
 * Inline SVG icon registry.
 *
 * Conventions (matched to lucide-icons so we can swap implementations later
 * without changing markup):
 *
 *   - 24×24 viewBox
 *   - fill="none", stroke="currentColor"
 *   - stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round"
 *
 * Every icon inherits its color from `currentColor`, so themes work for free.
 * No emojis, no raster images, no external deps — per project policy.
 */
export const ICONS = {
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
} as const;

export type IconName = keyof typeof ICONS;

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
  return `<svg${className} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"${a11y}>${inner}</svg>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
