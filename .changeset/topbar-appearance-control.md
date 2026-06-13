---
'ovellum': minor
---

Topbar appearance control with page-wide theme palettes and a custom accent.

The single light/dark cycle toggle is replaced by a palette-icon popover
(inlined into the mobile menu sheet) with three controls:

- **Mode** — auto / light / dark segmented control (`<html data-theme>`).
- **Theme** — five bundled palettes, each with light + dark variants and a
  crisp monochrome line glyph: Ovellum (the monochrome base), E-ink (warm
  paper + ink black), Flexoki, Nord, Solarized (`<html data-palette>`).
- **Color** — the primary colour the CTA buttons, links, focus rings, and the
  ToC indicator all derive from; six presets, a native colour picker, and a
  leading "Default" swatch that returns to the theme's own primary (hover
  states mixed automatically).

All selections persist in `localStorage` and apply before paint (no flash;
Safari's `theme-color` tracks the active palette). New config defaults:
`site.palette` ('default' | 'nord' | 'flexoki' | 'solarized' | 'eink') and
`site.accent` (any CSS colour value).
