---
title: Theming
description: How the default theme is structured, where to override, and what the topbar / hero / icon system give you for free.
---

# Theming

The default site template ships with a small, opinionated design system:
OKLCH palette, fluid Utopia type and space scales, system fonts,
auto/light/dark themes, an icon set, and a centred hero with subtle
background imagery. Out of the box, you get something that looks
finished without writing a single line of CSS.

This page covers how the theme is structured and how to override the
parts you'll most often want to.

## Token model

Every colour is a CSS custom property at one of three layers, each built on the
one above:

- **Primitives — one neutral ramp.** `--color-gray-50` through
  `--color-gray-950`, plus `--color-white` / `--color-black`. This is the *only*
  place raw colour values live. The default theme uses a pure-neutral grey ramp;
  change these eleven values and every surface and text colour follows — no
  other file to touch.
- **Roles — the "brand".** `--color-primary`, `--color-secondary`,
  `--color-accent`, each with a `-fg` (text on it) and `-hover` variant. The
  default maps them to greys; point a role at a colour ramp (say a red) and
  every button, link, and focus ring re-skins. Non-grey roles can differ
  between light and dark.
- **Semantic — surfaces + text.** `--color-bg`, `--color-surface`,
  `--color-fg`, `--color-border`, the callout tokens, etc., mapped onto the
  ramp. Components reference roles and semantics — never the ramp directly.

Dark mode is the **same ramp remapped to reversed steps**: no separate dark
colour *values*, just a small block pointing the roles and surfaces at the
opposite end of the grey ramp (`--color-bg` → a dark grey, `--color-fg` → a
light grey; elevation inverts, so "lifted" surfaces get *lighter*). Change the
ramp once and both themes update together.

The token *architecture* (names, layering, scales) lives in the project's
[`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md);
the per-theme colour *values* live in the theme's stylesheet
([`templates/default/style.css`](https://github.com/oinam/ovellum/blob/main/packages/site/src/templates/default/style.css)).

## Available themes

Five bundled page-wide palettes, each with a light **and** a dark variant
(the light/dark/auto mode stays an independent choice). **Ovellum** is the
default; the rest are listed alphabetically, as in the picker:

| Theme         | Notes                                                                      |
| ------------- | --------------------------------------------------------------------------- |
| **Ovellum**   | Monochrome, pure-neutral grey ramp (`palette: 'default'`). The theme this site uses. |
| **E-ink**     | Warm paper + ink black, max-contrast monochrome — like an e-reader. No coloured accent; pairs especially well with `site.font: 'serif'`. |
| **Flexoki**   | Warm inky paper tones, after [Flexoki](https://stephango.com/flexoki).      |
| **Nord**      | Arctic blue-greys — Snow Storm lights, Polar Night darks, Frost accent.     |
| **Solarized** | Ethan Schoonover's base tones; cream light, deep-teal dark.                 |

Each palette is implemented exactly the way the token model above promises: it
re-skins the same eleven-step grey ramp the roles point at, so the dark variant
comes free from the reversed-ramp remap. Set the server-rendered default with
[`site.palette`](/docs/reference/config/); visitors switch at runtime from the
topbar appearance control (persisted in `localStorage`, applied before paint).
Code-block syntax themes are independent and selectable via
[`site.codeTheme`](#code-block-themes).

## Typography

### Fonts

Font roles are CSS variables: `--font-sans` (body + headings), `--font-mono`
(code), `--font-serif` (the serif option). The active body font is
`--font-body`, set from `site.font` and overridable live by the visitor.

The default ships **system-font only** — instant first paint, no webfont hop.

#### Built-in font picker

[`site.font`](/docs/reference/config/) takes **four** values, and the appearance
control exposes the same set as a live **Font** picker:

| Value     | Font                              | Loads a webfont?                 |
| --------- | --------------------------------- | -------------------------------- |
| `'sans'`  | System sans-serif stack (default) | No                               |
| `'serif'` | System serif (Georgia, …)         | No                               |
| `'inter'` | Inter                             | Yes — **bundled**, on demand     |
| `'geist'` | Geist                             | Yes — **bundled**, on demand     |

Inter and Geist ship **inside the template** (served from `/assets/fonts/`), so
there's nothing to host. Their `@font-face` rules are lazy by spec: a file is
fetched only when a page actually renders in that family — i.e. when `site.font`
is set to it, or a visitor picks it. So the default site stays zero-webfont and
fast; the cost is paid only on opt-in. (Code stays monospace either way.)

Both bundled families are under the **SIL Open Font License 1.1**, which permits
redistributing them inside software — so Ovellum can carry them and your build
can serve them with no licensing concern.

#### Bringing your own font

For a family beyond the bundled two, override the token — it's just a
CSS-variable change. **Self-hosting is recommended** over a Google Fonts link:
it avoids the third-party connection and the privacy/GDPR concern of sending
visitor IPs to a font CDN, and the old "shared browser cache" argument no longer
holds (browsers partition their cache per-site).

> **Check the licence first.** Self-hosting means *you* serve the font file, so
> only use one whose licence permits web embedding. Open-font-licensed (OFL)
> families — like the bundled Inter and Geist — are always safe. Some "free"
> fonts are free to embed on your own site but **may not be redistributed**;
> those are fine to self-host yourself, the responsibility is just yours.

1. Drop the font (and a small stylesheet) into the
   [`publicDir`](/docs/reference/config/) — `content/public/` is copied to the
   **output root**, so `content/public/fonts/…` is served at `/fonts/…` and
   `content/public/site.css` at `/site.css`.
2. In that stylesheet, referenced from `site.headExtra`, `@font-face` it and
   override `--font-sans`. If your family ships a matching monospace, override
   `--font-mono` too; otherwise leave it on the system stack:

```css
/* content/public/site.css → served at /site.css */
@font-face {
  font-family: 'My Font';
  src: url('/fonts/my-font.woff2') format('woff2');
  font-weight: 100 900; /* variable weight axis */
  font-display: swap;
}
:root {
  --font-sans: 'My Font', ui-sans-serif, system-ui, sans-serif;
}
```

```html
<!-- site.headExtra (ovellum.config.*) -->
<link rel="preload" href="/fonts/my-font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/site.css">
```

Body, headings, and prose pick up `--font-sans` automatically. The `headExtra`
stylesheet loads after the theme's CSS, so its `:root` override wins; the
`preload` warms the fetch. (A token override like this overrides the picker
default — your font, not the system stack, becomes the baseline.)

### Reading text size

The appearance control also carries a five-step **Text size** scale (two steps
smaller, the default in the middle, two larger), rendered as a graduated "A"
ramp — like a Kindle or Safari Reader size stepper. It scales the whole modular
type scale (body and every heading) proportionally via `--ov-text-scale`,
written to `<html data-text-size>` and remembered per visitor.

## Appearance control

The palette icon at the right end of the topbar opens a small panel with
five controls (inlined into the menu sheet on mobile):

- **Mode** — `auto` (follow the OS via `prefers-color-scheme`), `light`,
  or `dark`, written to `<html data-theme>`.
- **Theme** — one of the five bundled palettes (each with its own line
  glyph), written to `<html data-palette>`.
- **Color** — the primary colour that drives the **CTA buttons** as well as
  links, focus rings, and the "On this page" indicator; hover states are
  mixed from it automatically. Six presets, a native custom-colour picker,
  and a leading **Default** swatch that returns to the theme's own primary
  (the dark charcoal in Ovellum).
- **Text size** — a five-step "A" ramp that scales the reading type, written
  to `<html data-text-size>`.
- **Font** — Sans-Serif (Default) / Serif / Inter / Geist, written to
  `<html data-font>`; Inter and Geist load on demand (see [Fonts](#fonts) above).

Every choice is saved in `localStorage` and applied before paint, so
revisits never flash the wrong colours, and a visitor's selections follow
them across pages and sessions.

Set the first-visit defaults in config:

```json
{
  "site": {
    "defaultTheme": "dark",
    "palette": "nord",
    "accent": "oklch(57% 0.16 255)"
  }
}
```

`accent` takes any CSS colour value and drives the primary + accent roles
until the visitor picks their own. Unset, each theme uses its own primary
(Ovellum's is the monochrome charcoal).

## Topbar

The default topbar is a three-column grid: brand on the left,
right-aligned nav, and a controls cluster (search slot + appearance
control + mobile menu button).

The brand is the **site title** by default. Add an optional mark before it
with [`site.logo`](/docs/reference/config/) (a path to a single-colour
SVG/PNG — it renders as a theme-flipping monochrome silhouette); leave it
unset and the title stands alone. The favicon defaults to a root
`/favicon.ico`, overridable with `site.favicon`.

Add nav items via `site.topbarNav`:

```json
{
  "site": {
    "topbarNav": [
      { "label": "Guides", "href": "/guides/manual-mode/" },
      { "label": "Reference", "href": "/reference/config/" },
      { "label": "GitHub", "href": "https://github.com/you/repo", "external": true }
    ]
  }
}
```

External links (`external: true` or any `http(s)://` URL) open in a new
tab with `rel="noopener"` and a small external-link icon. Below 720px
the nav collapses into a hamburger that opens a full-width sheet
anchored under the topbar — no extra config required.

## Hero

The landing-page hero (when `site.landing.enabled` is `true`) is
centred and gets two stacked background layers, applied via
pseudo-elements so no images ship with the site:

- A 24 px dotted SVG pattern (theme-aware fill, masked to fade at the
  edges).
- A radial spotlight gradient in your accent color, low alpha.

Hero typography uses `clamp()` so it scales from mobile to desktop
without a media-query forest. Title max-width is 16 ch; subtitle 56 ch.

## Icons

The template uses [Lucide](https://lucide.dev/) icons throughout —
each one is an inline SVG with `stroke="currentColor"` and
`stroke-width="2"`, so they pick up colors from the surrounding text
in every theme automatically. No icon font, no separate request.

Available icons in the current bundle:
`menu`, `close`, `sun`, `moon`, `monitor`, `chevron-down`, `github`,
`external-link`, `search`, `check`.

Adding a new one is one import in `packages/site/src/icons.ts` and one
entry in the `REGISTRY` map — the package tree-shakes the rest of
Lucide away, so each icon adds roughly 100 bytes to the bundle.

> Lucide v1 dropped brand marks (trademark concerns), so `github` is
> a hand-rolled exception drawn to match Lucide's stroke language. If
> you need more brand logos, [simple-icons](https://simpleicons.org/)
> is the standard companion.

## Customising the default theme

Today, the simplest override is a follow-up stylesheet. Drop a CSS file
in `content/` (it passes through as a static asset), then reference it
from your pages or — better — extend the template later via a plugin
system (planned, not built yet).

Re-skin a **role** — links and accents follow it everywhere (light + dark
differ because this is a non-grey colour):

```css
:root {
  --color-accent: oklch(55% 0.20 320); /* magenta */
  --color-accent-fg: var(--color-white);
  --color-accent-hover: oklch(48% 0.22 320);
}

:root[data-theme='dark'] {
  --color-accent: oklch(72% 0.18 320);
  --color-accent-fg: var(--color-gray-950);
  --color-accent-hover: oklch(80% 0.16 320);
}
```

Or re-tone the whole UI by overriding the **grey ramp** — every surface, text,
and (grey) role shifts at once, no per-component edits:

```css
:root {
  /* e.g. a warmer 'stone'-style neutral */
  --color-gray-100: oklch(97% 0.004 60);
  --color-gray-900: oklch(20.5% 0.006 60);
  /* …override whichever steps you use */
}
```

Save as `content/css/override.css` and reference it from each page's
frontmatter via a future `extraStyles` field (planned).

> The override pattern is still being formalised — for now, expect to
> fork the default template if you want anything more than colour
> tweaks. Plugin / template-override APIs are on the roadmap.

## Theming the landing page

If you've enabled `site.landing`, the landing inherits the same tokens.
Hero, feature cards, and trust strip read `--color-fg`, `--color-bg`,
`--color-accent`, and `--color-border` like every other component. The
hero spotlight tint follows `--color-accent` automatically, so changing
the accent re-skins the hero atmosphere for free.

## Code-block themes

Code blocks are rendered with [shiki](https://shiki.style/) at build
time. Each theme is a `{ light, dark }` pair emitted through CSS
variables — the same HTML serves both colour schemes; switching
`[data-theme]` on `<html>` swaps the palette with zero runtime cost.

Pick one via `site.codeTheme`:

```json
{
  "site": {
    "codeTheme": "nord"
  }
}
```

| Value         | Light          | Dark              | Notes                              |
| ------------- | -------------- | ----------------- | ---------------------------------- |
| `'github'`    | github-light   | github-dark       | Default. Matches Ovellum's defaults. |
| `'nord'`      | min-light      | nord              | Nord ships dark-only in shiki; paired with min-light for a clean, low-saturation light. |
| `'solarized'` | solarized-light| solarized-dark    | Ethan Schoonover's solarized.      |

## What's bundled today vs. planned

**Available now:**

- Default light + default dark.
- Auto-follow-OS via `prefers-color-scheme`.
- Pre-paint theme script (no flash).
- Lucide-backed icon registry with a `renderIcon(name)` helper.
- Right-aligned topbar nav with mobile sheet (hamburger below 720 px).
- Centred hero with dotted-noise + accent spotlight background.
- Breadcrumbs above the article on nested pages.
- Per-page meta line (reading time + last-modified) above the article.
- Print stylesheet that strips chrome and widens the article.
- Custom 404 layout (narrower column, larger heading, no chrome).
- Copy buttons on every code block.

**Roadmap:**

- A `site.theme` config to switch the **page** theme by name (Nord, Dracula,
  …). Each theme ships its own grey ramp + role values plus a reversed-ramp
  dark block, per the [token model](#token-model). Today only the default
  page theme ships; `site.codeTheme` already switches the syntax palette.
- A plugin API for fully custom templates.
- Per-page `extraStyles` for one-off page-specific CSS.

Until those land, the recommended path for serious customisation is:

1. Fork the [`templates/default/`](https://github.com/oinam/ovellum/tree/main/packages/site/src/templates/default)
   directory.
2. Run your own `ovellum.config.ts` that points at your fork.
3. Re-rebase when Ovellum updates its template.

This is a deliberate constraint for v1 — once the customisation surface
is stable, an API is easier to commit to.
