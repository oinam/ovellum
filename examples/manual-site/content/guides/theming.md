---
title: Theming
description: Override the default tokens or ship your own stylesheet.
---

# Theming

The default template draws from the design tokens in
[`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md):
OKLCH palette, fluid type scale, fluid space scale, system fonts.

## The shipped theme

Out of the box you get:

- A neutral `zinc`-based grayscale
- A `blue` accent for links and the active sidebar item
- `auto` / `light` / `dark` modes via `[data-theme]` on `<html>`
- `prefers-color-scheme` honored in `auto` mode

## Adjusting via custom CSS

The simplest override is a follow-up `<link rel="stylesheet">` that
reassigns the Tier 2 semantic tokens:

```css
:root {
  --color-accent: oklch(60% 0.18 320); /* magenta */
  --color-accent-hover: oklch(54% 0.22 320);
  --color-link: var(--color-accent);
  --color-link-hover: var(--color-accent-hover);
}
```

Drop that file under `content/css/` and reference it from a custom layout
in a future release (template overrides are on the roadmap, not in v1).

## Roadmap

- A `theme:` config field to swap the bundled theme by name
  (e.g. `theme: 'nord'`).
- Plugin API for custom templates.
- A small CLI flag (`ovellum build --inspect-tokens`) that dumps every
  resolved token value for debugging.
