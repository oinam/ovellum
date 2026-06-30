---
title: Theming
description: How the default theme is structured, where to override, and what the topbar / hero / icon system give you for free.
---

# Theming

The default site template ships with a small, opinionated design system:
OKLCH palette, fluid Utopia type and space scales, system fonts,
auto/light/dark themes, an icon set, and a centered hero with subtle
background imagery. Out of the box, you get something that looks
finished without writing a single line of CSS.

This page covers how the theme is structured and how to override the
parts you'll most often want to.

## Token model

Every color is a CSS custom property at one of three layers, each built on the
one above:

- **Primitives — one neutral ramp.** `--color-gray-50` through
  `--color-gray-950`, plus `--color-white` / `--color-black`. This is the *only*
  place raw color values live. The default theme uses a pure-neutral gray ramp;
  change these eleven values and every surface and text color follows — no
  other file to touch.
- **Roles — the "brand".** `--color-primary`, `--color-secondary`,
  `--color-accent`, each with a `-fg` (text on it) and `-hover` variant. The
  default maps them to grays; point a role at a color ramp (say a red) and
  every button, link, and focus ring re-skins. Non-gray roles can differ
  between light and dark.
- **Semantic — surfaces + text.** `--color-bg`, `--color-surface`,
  `--color-fg`, `--color-border`, the callout tokens, etc., mapped onto the
  ramp. Components reference roles and semantics — never the ramp directly.

Dark mode is the **same ramp remapped to reversed steps**: no separate dark
color *values*, just a small block pointing the roles and surfaces at the
opposite end of the gray ramp (`--color-bg` → a dark gray, `--color-fg` → a
light gray; elevation inverts, so "lifted" surfaces get *lighter*). Change the
ramp once and both themes update together.

The token *architecture* (names, layering, scales) lives in the project's
[`docs/internal/STYLES.md`](https://github.com/oinam/ovellum/blob/main/docs/internal/STYLES.md);
the per-theme color *values* live in the theme's stylesheet
([`templates/default/style.css`](https://github.com/oinam/ovellum/blob/main/packages/site/src/templates/default/style.css)).

## Available themes

Five bundled page-wide palettes, each with a light **and** a dark variant
(the light/dark/auto mode stays an independent choice). **Ovellum** is the
default; the rest are listed alphabetically, as in the picker:

| Theme         | Notes                                                                      |
| ------------- | --------------------------------------------------------------------------- |
| **Ovellum**   | Monochrome, pure-neutral gray ramp (`palette: 'default'`). The theme this site uses. |
| **E-ink**     | Warm paper + ink black, max-contrast monochrome — like an e-reader. No colored accent; pairs especially well with `site.font: 'serif'`. |
| **Flexoki**   | Warm inky paper tones, after [Flexoki](https://stephango.com/flexoki).      |
| **Nord**      | Arctic blue-grays — Snow Storm lights, Polar Night darks, Frost accent.     |
| **Solarized** | Ethan Schoonover's base tones; cream light, deep-teal dark.                 |

Each palette is implemented exactly the way the token model above promises: it
re-skins the same eleven-step gray ramp the roles point at, so the dark variant
comes free from the reversed-ramp remap. Set the server-rendered default with
[`site.palette`](/docs/reference/config/); visitors switch at runtime from the
topbar appearance control (persisted in `localStorage`, applied before paint).
Code-block syntax themes are independent and selectable via
[`site.codeTheme`](#code-block-themes).

Ovellum's own palettes (**Ovellum**, **E-ink**) deliberately avoid absolute
black or white for backgrounds and text — pure `#000` on `#fff` is harsh — while
the standard palettes (**Flexoki**, **Nord**, **Solarized**) reproduce their
published values faithfully.

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

For a family beyond the bundled two, point [`site.font`](/docs/reference/config/)
at an **object** instead of a keyword. Ovellum makes it the default, loads your
`@font-face` stylesheet, and adds it to the reader's picker — no `headExtra`
needed. **Self-hosting is recommended** over a Google Fonts link: it avoids the
third-party connection and the privacy/GDPR concern of sending visitor IPs to a
font CDN, and the old "shared browser cache" argument no longer holds (browsers
partition their cache per-site).

> **Check the license first.** Self-hosting means *you* serve the font file, so
> only use one whose license permits web embedding. Open-font-licensed (OFL)
> families — like the bundled Inter and Geist — are always safe. Some "free"
> fonts are free to embed on your own site but **may not be redistributed**;
> those are fine to self-host yourself, the responsibility is just yours.

1. Drop the font (and a small `@font-face` stylesheet) into the
   [`publicDir`](/docs/reference/config/) — `content/public/` is copied to the
   **output root**, so `content/public/fonts/…` is served at `/fonts/…` and
   `content/public/fonts.css` at `/fonts.css`:

   ```css
   /* content/public/fonts.css → served at /fonts.css */
   @font-face {
     font-family: 'My Font';
     src: url('/fonts/my-font.woff2') format('woff2');
     font-weight: 100 900; /* variable weight axis */
     font-display: swap;   /* FOUT control — show fallback text immediately, swap when ready */
   }
   ```

2. Point `site.font` at it:

   ```ts
   site: {
     font: {
       body: "'My Font', ui-sans-serif, system-ui, sans-serif",
       mono: "'My Mono', ui-monospace, monospace", // optional — omit to keep system mono
       source: '/fonts.css',                       // your @font-face stylesheet (or an array)
       label: 'My Font',                           // optional — picker label (defaults to "Custom")
     },
   },
   ```

Ovellum sets your font as the default (`<html data-font="custom">`), links
`source` in the `<head>`, and maps `--font-body` (and `--font-mono` when you give
one). It also adds a custom entry to the appearance **Font** picker, previewed in
its own family — so readers can still switch to the built-ins and back. The
`font-display` descriptor in *your* `@font-face` owns the FOUT/opt-out story:
`swap` paints fallback text instantly then swaps; `optional` avoids a late swap
on slow links. Want to warm the fetch? Add a `<link rel="preload" as="font" …>`
via `site.headExtra`.

**Lower-level alternative.** You can still override the `--font-sans` /
`--font-mono` tokens directly from a `headExtra` stylesheet if you'd rather not
touch the picker — the `site.font` object is simply the ergonomic path that also
wires it.

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
- **Color** — the primary color that drives the **CTA buttons** as well as
  links, focus rings, and the "On this page" indicator; hover states are
  mixed from it automatically. Six presets, a native custom-color picker,
  and a leading **Default** swatch that returns to the theme's own primary
  (the dark charcoal in Ovellum).
- **Text size** — a five-step "A" ramp that scales the reading type, written
  to `<html data-text-size>`.
- **Font** — Sans-Serif (Default) / Serif / Inter / Geist, written to
  `<html data-font>`; Inter and Geist load on demand (see [Fonts](#fonts) above).

Every choice is saved in `localStorage` and applied before paint, so
revisits never flash the wrong colors, and a visitor's selections follow
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

`accent` takes any CSS color value and drives the primary + accent roles
until the visitor picks their own. Unset, each theme uses its own primary
(Ovellum's is the monochrome charcoal).

## Topbar

The default topbar is a three-column grid: brand on the left,
right-aligned nav, and a controls cluster (search slot + appearance
control + mobile menu button).

The brand is the **site title** by default. Add an optional mark before it
with [`site.logo`](/docs/reference/config/) (a path to a single-color
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
centered and gets two stacked background layers, applied via
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

## Customizing the default theme

The first-class override hook is [`site.css`](/docs/reference/config/) — one or
more stylesheet URLs that Ovellum links into `<head>` **after** its own theme
CSS, so your rules win the cascade by source order. Because every surface, text,
and role is a [token](#token-model), an override file that re-declares a handful
of custom properties re-skins the whole site — no forking, no per-page wiring.

1. Drop a CSS file into the [`publicDir`](/docs/reference/config/) (it's copied
   to the output root): `content/public/theme.css` is served at `/theme.css`.
2. Point `site.css` at it:

   ```ts
   site: {
     css: '/theme.css',          // a single URL, or an array of them
   }
   ```

Now re-skin a **role** — links and accents follow it everywhere (light + dark
differ because this is a non-gray color):

```css
/* content/public/theme.css → served at /theme.css */
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

Or re-tone the whole UI by overriding the **gray ramp** — every surface, text,
and (gray) role shifts at once, no per-component edits:

```css
:root {
  /* e.g. a warmer 'stone'-style neutral */
  --color-gray-100: oklch(97% 0.004 60);
  --color-gray-900: oklch(20.5% 0.006 60);
  /* …override whichever steps you use */
}
```

`site.css` accepts an array, and `http(s)://` URLs as well as local paths — so
you can layer a shared design-system stylesheet from a CDN ahead of a small
site-specific override:

```ts
site: {
  css: ['https://cdn.acme.com/brand/tokens.css', '/theme.css'],
}
```

It only ever emits `<link rel="stylesheet">` tags and rejects `javascript:` /
`data:` URLs — for arbitrary `<head>` markup (a `<style>` block, a preload hint,
analytics) use [`site.headExtra`](/docs/reference/config/), which is injected
*after* your `css` so it can still override if you need it to.

### Inheriting a host project's design

When Ovellum docs are built into a larger product — say a host app that runs
`ovellum build` for its `/docs` and already has its own colors, light/dark, and
typography — `site.css` lets the docs **adopt the host's design** instead of
shipping their own palette. The contract is the **token layer**: re-declare
these properties and the template follows.

| Token group | Override these                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Surfaces    | `--color-bg`, `--color-surface`, `--color-bg-subtle`, `--color-bg-muted`                         |
| Text        | `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`                                            |
| Lines       | `--color-border`, `--color-border-strong`                                                        |
| Brand roles | `--color-primary` (+ `-fg`/`-hover`), `--color-accent` (+ `-fg`/`-hover`)                         |
| Callouts    | `--callout-note-bg`/`-fg`, and the `tip` / `important` / `warning` / `caution` pairs            |
| Typography  | `--font-body`, `--font-mono` (and the `--font-sans` / `--font-serif` stacks they default to)     |

Map each to the host's own variables (or values), and supply the dark variant
under `:root[data-theme='dark']`:

```css
/* host-bridge.css — make the docs read the host design system's tokens */
:root {
  --color-bg: var(--app-bg, #fff);
  --color-surface: var(--app-surface, #fff);
  --color-fg: var(--app-text, #1a1a1a);
  --color-fg-muted: var(--app-text-muted, #555);
  --color-border: var(--app-border, oklch(0% 0 0 / 0.1));
  --color-primary: var(--app-brand);
  --color-accent: var(--app-brand);
  --font-body: var(--app-font-sans);
  --font-mono: var(--app-font-mono);
}

:root[data-theme='dark'] {
  --color-bg: var(--app-bg-dark, #101010);
  --color-surface: var(--app-surface-dark, #181818);
  --color-fg: var(--app-text-dark, #f4f4f4);
  /* …the dark side of each token */
}
```

The host's design variables (`--app-*` above) need to be **in scope on the
generated pages** — Ovellum builds standalone HTML, so reference a stylesheet
that defines them (a shared `tokens.css`, the same one the host app loads) from
`site.css` ahead of the bridge file.

#### Following the host's light/dark switch

`site.css` makes the *colors* inherit, but light/dark is still **two switches**
until you bridge them: by default Ovellum owns the mode through its own
appearance control (persisted in `localStorage`), independent of how the host
toggles. **[`site.appearance`](/docs/reference/config/)** closes that gap.

```ts
site: {
  // Drop Ovellum's own light/dark toggle and follow the host instead.
  appearance: 'inherit',
}
```

With `appearance: 'inherit'`, Ovellum:

- **removes the Mode (auto/light/dark) control** from the appearance panel — the
  host owns it now (Theme, Color, Text size, and Font stay reader-controllable);
- **stops persisting its own mode**, so a stale Ovellum choice can't override;
- **resolves light/dark from `prefers-color-scheme`** — which is exactly what a
  host's *auto* light/dark already follows, so an OS-driven host needs nothing
  more.

If the host's toggle is a **manual** choice (a `.dark` class, next-themes, a
Tailwind `class` strategy) persisted to **same-origin `localStorage`**, point
Ovellum at that key — it reads it on load and live-updates when the host flips
it in another tab:

```ts
site: {
  appearance: {
    mode: 'inherit',
    storageKey: 'theme',   // the host app's own localStorage key
    darkValue: 'dark',     // value that means dark (default 'dark')
    lightValue: 'light',   // value that means light (default 'light')
  },
}
```

Ovellum maps `darkValue`→dark and `lightValue`→light; anything else (a
`'system'` value, unset, unknown) falls back to `prefers-color-scheme`. Because
the docs and the host app share an origin, a `storage` event fires on the docs
page when the host toggles its theme elsewhere, so the two stay in lockstep.
(This needs same-origin hosting and the host writing its choice to
`localStorage`; for a host that only flips a class with no persisted signal,
stick with `'inherit'` + `prefers-color-scheme`, or mirror the class to the key.)

> Still override both `:root` and `:root[data-theme='dark']` in your bridge
> stylesheet — `appearance: 'inherit'` decides *which* mode is active, and your
> `site.css` decides what each mode looks like.

#### Bare mode

For the cleanest "host owns all the color" path, the bridge stylesheet above
maps Ovellum's tokens onto a host's variables by
hand. **`palette: 'bare'`** does that wiring for you: it ships **no baked
palette** and instead exposes a small, fixed set of **`--ov-host-*`** variables —
define them (in your `site.css`) and they own the color; define none and the
default Ovellum look stays intact.

```ts
site: {
  palette: 'bare',         // no baked palette — defer color to --ov-host-*
  css: '/host-theme.css',
  appearance: 'inherit',   // and defer light/dark to the host too
}
```

```css
/* host-theme.css — the only colors the bare docs will use */
:root {
  --ov-host-bg: #fafafa;
  --ov-host-surface: #fff;
  --ov-host-fg: #1a1a1a;
  --ov-host-fg-muted: #585858;
  --ov-host-border: oklch(0% 0 0 / 0.1);
  --ov-host-primary: #2563eb;       /* CTA buttons; primary-hover derives */
  --ov-host-accent: #2563eb;        /* links + focus rings */
  --ov-host-font-body: 'Inter', system-ui, sans-serif;
}
:root[data-theme='dark'] {
  --ov-host-bg: #0c0c0c;
  --ov-host-surface: #161616;
  --ov-host-fg: #f4f4f4;
  /* …the dark side of each */
}
```

The full set: `--ov-host-bg`, `--ov-host-surface`, `--ov-host-fg`,
`--ov-host-fg-muted`, `--ov-host-border`, `--ov-host-border-strong`,
`--ov-host-primary` (+ `-fg`, `-hover`), `--ov-host-accent` (+ `-fg`, `-hover`),
and `--ov-host-font-body`. Anything you leave undefined falls back to the
Ovellum default for that mode, and the derived tokens (links, callouts, the
border hairlines, inline-code chips) follow `--color-fg`/`--color-accent`
automatically — so you rarely set more than the handful above. The Theme picker
is dropped (switching to a baked palette would fight your colors); Color, Text
size, and Font stay.

**Bare vs. a hand-written bridge:** they reach the same place. Use `palette:
'bare'` when you want a published, named contract (`--ov-host-*`) and the picker
removed for you; write the bridge from the [token table](#inheriting-a-host-projects-design)
directly when you only need to nudge a few tokens and want to keep the baked
palettes available as a fallback.

### Bring your own template directory

When `site.css` and `palette: 'bare'` aren't enough — you want to **replace**
Ovellum's stylesheet and client script entirely, not layer on top —
[`site.templateDir`](/docs/reference/config/) points at a directory whose assets
take over:

```ts
site: {
  templateDir: './theme',   // relative to the project root
}
```

```text
theme/
  style.css     → emitted as /assets/ovellum.css   (replaces the bundled theme CSS)
  script.js     → emitted as /assets/ovellum.js    (replaces the bundled runtime)
  fonts/        → emitted as /assets/fonts/         (your webfonts)
```

It's a **per-file** override with fallback: provide only `style.css` and you get
your CSS plus Ovellum's bundled `script.js`; provide only `script.js` and the
default theme CSS stays. So you can take over just the layer you care about.

**What it does and doesn't cover.** This replaces the *styling and client
behavior* — your `style.css` is the whole stylesheet now, so it targets the same
`ov-*` class names the [generated HTML](#whats-bundled-today-vs-planned) uses
(topbar, sidebar, appearance panel, content card, …). The page **HTML structure
is generated in code** and isn't a template you override here — a full
layout/partial system is out of scope. For color/font tweaks rather than a
ground-up rewrite, reach for `site.css` or `palette: 'bare'` first; `templateDir`
is the escape hatch when you want total control without forking the package.

## Theming the landing page

If you've enabled `site.landing`, the landing inherits the same tokens.
Hero, feature cards, and trust strip read `--color-fg`, `--color-bg`,
`--color-accent`, and `--color-border` like every other component. The
hero spotlight tint follows `--color-accent` automatically, so changing
the accent re-skins the hero atmosphere for free.

## Code-block themes

Code blocks are rendered with [shiki](https://shiki.style/) at build
time. Each theme is a `{ light, dark }` pair emitted through CSS
variables — the same HTML serves both color schemes; switching
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

- Site-wide CSS overrides + theme inheritance via [`site.css`](#customizing-the-default-theme).
- Follow a host project's light/dark via [`site.appearance: 'inherit'`](#following-the-hosts-lightdark-switch).
- Default light + default dark.
- Auto-follow-OS via `prefers-color-scheme`.
- Pre-paint theme script (no flash).
- Lucide-backed icon registry with a `renderIcon(name)` helper.
- Right-aligned topbar nav with mobile sheet (hamburger below 720 px).
- Centered hero with dotted-noise + accent spotlight background.
- Breadcrumbs above the article on nested pages.
- Per-page meta line (reading time + last-modified) above the article.
- Print stylesheet that strips chrome and widens the article.
- Custom 404 layout (narrower column, larger heading, no chrome).
- Copy buttons on every code block.

**Roadmap:**

- Per-page `extraStyles` for one-off page-specific CSS.
- A layout/partial system for overriding the page **HTML structure** (today the
  markup is generated in code).

The CSS/JS layer is fully customizable today: [`site.css`](#customizing-the-default-theme)
layers overrides, [`palette: 'bare'`](#bare-mode) defers all color to a host, and
[`site.templateDir`](#bring-your-own-template-directory) replaces the bundled
stylesheet + script wholesale — none of which require forking the package. The
roadmap items above are about going *beyond* CSS/JS: changing the generated
markup itself. That's the deliberate v1 constraint — the styling surface is
open, the structure is still code.
