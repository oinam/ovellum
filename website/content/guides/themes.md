---
title: Theming
description: How the default theme is structured and where to override.
---

# Theming

The default site template ships with a small, opinionated design system:
OKLCH palette, fluid Utopia type and space scales, system fonts,
auto/light/dark themes. Out of the box, you get something that looks
finished without writing a single line of CSS.

This page covers how the theme is structured and how to override it.

## The token model

Every visual decision is a CSS custom property at one of three tiers:

- **Tier 1 — palette.** Raw OKLCH values: `--color-zinc-50` through
  `--color-zinc-950`, plus accent ramps (blue, red, etc.). Theme-agnostic.
- **Tier 2 — semantic.** Maps palette entries to roles:
  `--color-fg`, `--color-bg`, `--color-accent`, `--color-border`.
  Components reference these, so swapping themes only touches Tier 2.
- **Tier 3 — component.** Optional per-component overrides
  (`--feature-card-bg`, etc.) that default to Tier 2 values.

The full token list is in the project's
[`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md).

## Switching themes

Three values for `<html data-theme>`:

- `auto` — follow the OS via `prefers-color-scheme`.
- `light` — force light.
- `dark` — force dark.

The topbar toggle cycles between them. The selection is saved in
`localStorage` and applied before paint, so revisits never flash the
wrong colours.

To set the initial theme for first-time visitors:

```json
{
  "site": {
    "defaultTheme": "dark"
  }
}
```

## Where the template lives

Before customising, it helps to know where each piece of the bundled
template sits and what format it's in.

| Concern             | Path                                                | Format                                |
| ------------------- | --------------------------------------------------- | ------------------------------------- |
| HTML structure      | `packages/site/src/template.ts`                     | TypeScript template literals          |
| Visual design (CSS) | `packages/site/src/templates/default/style.css`     | Vanilla CSS + custom properties       |
| Client behaviour    | `packages/site/src/templates/default/script.js`     | Vanilla browser JS (~50 lines)        |

There's one bundled template, named `default`. The choice of "no template
engine, vanilla CSS, vanilla JS" is intentional — every override path
below works without any extra build tooling on your end.

## Customising the default theme

The simplest override is a follow-up stylesheet. Drop a CSS file in
`content/` (it'll pass through as a static asset), then reference it
from your pages or — better — extend the template later via a plugin
system (planned, not built yet).

A minimal override that re-skins the accent colour:

```css
:root {
  --color-accent: oklch(60% 0.18 320); /* magenta */
  --color-accent-hover: oklch(54% 0.22 320);
  --color-link: var(--color-accent);
  --color-link-hover: var(--color-accent-hover);
}

:root[data-theme='dark'] {
  --color-accent: oklch(70% 0.18 320);
  --color-accent-hover: oklch(78% 0.16 320);
}
```

Save as `content/css/override.css` and reference it from each page's
frontmatter via a future `extraStyles` field (planned).

> The override pattern is still being formalised — for now, expect to
> fork the default template if you want anything more than colour tweaks.
> Plugin / template-override APIs are on the roadmap.

## Theming the landing page

If you've enabled `site.landing`, the landing inherits the same tokens.
Hero, feature cards, and trust strip read `--color-fg`, `--color-bg`,
`--color-accent`, and `--color-border` like every other component.

Setting `--color-accent` per-theme (above) is usually enough to make the
landing feel like your brand.

## Code-block themes

Code blocks are rendered with [shiki](https://shiki.style/) at build
time. The default uses `github-light` + `github-dark` paired through CSS
variables — the same single piece of HTML serves both light and dark
without a runtime highlighter.

Today the theme pair isn't configurable. A future `site.codeTheme` field
will let you pick from any shiki bundled theme.

## What's bundled today vs. planned

**Available now:**

- Default light + default dark.
- Auto-follow-OS via `prefers-color-scheme`.
- Pre-paint theme script (no flash).
- Copy buttons on every code block.

**Defined in `STYLES.md` but not yet wired into the toggle:**

- Nord (light + dark).
- Solarized (light + dark).

**Roadmap:**

- A `site.theme` config to switch the bundled theme by name.
- A plugin API for fully custom templates.
- Per-page `extraStyles` for one-off page-specific CSS.

Until those land, the recommended path for serious customisation is:

1. Fork the [`templates/default/`](https://github.com/oinam/ovellum/tree/main/packages/site/src/templates/default)
   directory.
2. Run your own `ovellum.config.ts` that points at your fork.
3. Re-rebase when Ovellum updates its template.

This is a deliberate constraint for v1 — once the customisation surface
is stable, an API is easier to commit to.
