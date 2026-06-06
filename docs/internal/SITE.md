# Ovellum - Static Site Builder (`manual` mode)

Design for the `@ovellum/site` package: turn a folder of `.md` files into a
deployable static site (HTML + CSS + minimal JS). Powers `ovellum build` when
`config.mode === 'manual'`. Inspired by Retype.com; less ambitious in scope.

This is a v1 design — what we ship first. Deferred items are listed at the
bottom so they don't get lost.

---

## 1. Goals

1. **Markdown in, static site out.** `.md` files at known paths, hosted-anywhere `dist/`. Zero proprietary formats.
2. **Looks finished out of the box.** One default template; clean prose typography; auto / light / dark themes from `STYLES.md`; sidebar nav; right-side "on this page" ToC; syntax-highlighted code.
3. **Zero runtime weight where possible.** Code highlighting baked at build time (shiki). The only client JS is a small theme-toggle + copy-button bundle.
4. **Composable, not coupled.** `@ovellum/site` reuses `@ovellum/reader` for frontmatter and (eventually) protected-zone awareness. Doesn't depend on `parser`, `generator`, or `merger`.

## 2. Non-goals (v1)

- Search (Pagefind / lunr / Algolia) — separate later slice
- Live reload / watch — uses the existing Phase 6 watch ticket
- MDX rendering — `.md` only for v1
- Multiple templates — one default, extensible later via plugin API (not yet built)
- Multilingual / multi-version / redirects
- Edit-this-page links (configurable, defer)
- Custom shortcodes / directives beyond what remark gives natively
- RSS / sitemap.xml (small follow-up; not v1)

## 2a. Landing page (added 2026-05-16)

Optional homepage rendered at `/` when `site.landing.enabled === true`.
Disabled by default — existing manual-mode sites keep using
`content/index.md` for `/`. Inspired by Material for MkDocs.

**Sections, in order, on the landing page:**

1. **Hero** — full-width title + subtitle + CTA row. Title falls back to
   `site.title`. First CTA gets `primary` style by default, the rest
   `secondary`. The hero sits on a flat background — the earlier
   dotted-noise + radial-spotlight pair was removed (a blended background
   image is planned to take that surface later). Setting
   `hero.media = { light, dark?, alt? }` switches to the **imagery hero
   variant** (§2b).
2. **Feature grid** — responsive grid of cards (icon + title + description).
   `auto-fit, minmax(260px, 1fr)` — collapses to 1 column on narrow
   viewports. Cards use the reusable `.ov-card` primitive: `--color-surface`
   (a hair lighter than the page) + a hairline border + `--radius-lg` + a
   whisper of shadow. This reverses the earlier editorial-calm "no cards"
   experiment (top-rule blocks); the subtle-card treatment is the current
   direction and `.ov-card` is meant to be reused for other surfaces.
3. **Pitch (optional)** — free-form Markdown from `{input}/_landing.md` if
   present. Renders between feature grid and trust strip. The underscore
   prefix keeps the file out of the regular sidebar walk.
4. **Trust strip (optional)** — small row of partner/sponsor links. Each
   item is text or an `<img>` (path is passed through as a static asset).

**Routing model:** the landing replaces `content/index.md`'s output at `/`.
If both exist, `index.md` is skipped with a warning during the build.
All other pages keep their slugged URLs. The topbar gains a **Docs** link
(`site.landing.docsHref`, falling back to the first child in the sidebar
nav) so users always have a one-click path into the documentation.

**Why not put hero/features in Markdown?** Two reasons:

- Structured config validates at load time (typos in field names error
  cleanly).
- The CSS layout has to know which slot is which; encoding that in
  Markdown would require either custom directives or a brittle "first h1
  is the hero" convention.

The hybrid lets writers keep their prose voice for the "Why" section while
the structured bits (hero, features, trust) stay in config.

**Deferred (post-v1):**

- Multiple bundled landing templates / hero variants
- Live GitHub stars / sponsor APIs
- Video hero
- Per-section show-if-viewport / animation directives

## 2b. Imagery hero variant (added 2026-05-19)

Opt-in alternative to the flat default hero. Configured via:

```ts
site.landing.hero.media = {
  light: '/hero-light.svg',  // required
  dark?:  '/hero-dark.svg',   // optional; falls back to light
  alt?:   '',                  // decorative by default
}
```

**Rendered markup.** `<section class="ov-hero" data-media>` gains an
`<div class="ov-hero-art">` that stacks two `<img>` tags (`--light`,
`--dark`) absolutely. The two `<img>` tags are always emitted; CSS
toggles opacity by the page-level `[data-theme]` attribute (and by
`prefers-color-scheme` under `data-theme='auto'`). Title/subtitle/CTAs
move inside `<div class="ov-hero-inner">` and sit above the art via
`position: relative; z-index: 1`.

**Asset shipping.** Assets follow Ovellum's manual-mode passthrough
convention: drop the SVG alongside Markdown content (e.g.
`content/hero-light.svg`), and the build copies it verbatim to `dist/`.
No new directory convention or registration step.

**Why two files (light + dark) rather than one self-theming SVG.** An
SVG referenced via `<img>` runs in its own document context, so it
cannot read the page's `[data-theme]` attribute or `data-theme='auto'`
JS-toggled state. It can only respect OS-level `prefers-color-scheme`.
Two files swapped via CSS lets the SVG follow the page's manual theme
toggle without inline-injecting markup or running JS.

**Why the animation lives inside the SVG.** Each asset embeds its own
`<style>` block with `@keyframes` and a
`@media (prefers-reduced-motion: reduce)` no-op fallback. The editor
focuses on one file to change motion or palette; no parent CSS, no JS.
Trade-off: animation doesn't synchronise with anything on the page
(which is fine — by design it's ambient).

**Where the CSS lives.** `.ov-hero[data-media]` overrides in
`packages/site/src/templates/default/style.css` (search for "Imagery
hero variant"). The variant suppresses the `::before` / `::after`
pseudo-layers, gives the section a min-block-size + flex column so the
content centres, applies a bottom mask-image fade so the visual recedes
into the feature grid below.

## 2c. Section scenes (added 2026-05-22)

Optional ambient visuals woven between the rendered landing sections.
Driven by `site.landing.scenes: OvellumLandingScene[]` — a small array
where each entry is `{ light, dark?, alt? }`. With three sections
after the hero (features / pitch / trust), three scenes fill all
three gaps; extras fall through after the last section.

**Rendered markup.** Each scene becomes a centered
`<section class="ov-scene" aria-hidden style="--ov-scene-i: i;">`
holding two stacked `<img>` tags (`--light` / `--dark`), same
`[data-theme]` flip the hero uses. The inline `--ov-scene-i` integer
is published as a CSS hook for wrapper-level effects (none ship by
default; the scene wrapper is intentionally still — see below).

**Asset shipping.** User-supplied imagery lives in
`{input}/public/` (e.g. `website/content/public/tree-house.svg`) and
passes through to `dist/public/<file>` verbatim. The hero SVGs live
in the same folder so the imagery tree is cohesive and stays out of
the article tree. References from config use `/public/<file>`.

**Why a separate `public/` folder.** Editorial imagery is asset
content, not page content. Keeping it out of `content/*.md` means
the writer's view of the site (the file tree) stays readable, and
drop-replace updates ("here's a new picture") don't risk colliding
with a same-named `.md` file. The convention follows Next.js /
Jekyll prior art.

**SVG over raster.** The bundled website scenes are hand-authored
SVGs (~10KB each) with named groups (`.layer-mountains-near`,
`.feature-windmill`, `.feature-drones`, `.anim-windmill`, etc.) so
the maintainer can target individual elements from inside the SVG's
own `<style>` block — windmill blades rotate, drones bob, propellers
spin, ripples shimmer, leaves fall, etc. Raster formats (PNG/JPG)
are not blocked by the schema, but a raster scene has no per-element
handle — any motion must come from the wrapping `<img>`, which is
deliberately still here. Practical rule: use SVG when you want
animation, raster only if you're sure the scene should be static.

**Why per-asset animation, not wrapper CSS.** Mirrors the hero
pattern (§2b). Each SVG embeds its own `<style>` block with
`@keyframes` and a `@media (prefers-reduced-motion: reduce)` no-op
fallback. The editor focuses on one file to change motion or
palette; no parent CSS, no JS. Trade-off: animation doesn't
synchronise across scenes (which is fine — by design they're
ambient and each has its own personality).

**Why `aria-hidden` by default.** Scenes are atmospheric, not
informational; announcing them would clutter the AT stream. Pages
that want a scene announced set `alt: "..."` and the section's
`aria-hidden` flips to `false`.

**Where the CSS lives.** `.ov-scene*` rules in
`packages/site/src/templates/default/style.css` (search for
"Ambient \"scenes\""). Scenes inherit the landing's `--page-max`
(1100px on `body.ov-body-landing`) for width and centre themselves
via `.ov-landing`'s existing `margin-inline: auto`. The figure uses
`object-fit: contain` + `aspect-ratio: 16 / 9` so the SVG keeps its
intrinsic proportions. Top/bottom mask-image fades soften the
section's transition into surrounding content.

## 3. Architecture

```
                          ┌────────────────────────────┐
content/*.md   ───────►   │  @ovellum/reader            │
                          │  frontmatter + raw body     │
                          └─────────────┬───────────────┘
                                        │
                          ┌─────────────▼───────────────┐
                          │  @ovellum/site               │
                          │                              │
                          │   markdown.ts  remark+rehype │
                          │                +shiki        │
                          │   nav.ts       file-tree →   │
                          │                NavNode[]     │
                          │   toc.ts       h2/h3 → ToC   │
                          │   template.ts  HTML shell    │
                          │   build.ts     orchestrator  │
                          └─────────────┬───────────────┘
                                        │
                          ┌─────────────▼───────────────┐
                          │  dist/                       │
                          │    index.html                │
                          │    foo/index.html            │
                          │    foo/bar/index.html        │
                          │    assets/ovellum.css        │
                          │    assets/ovellum.js         │
                          │    (passthrough assets)      │
                          └──────────────────────────────┘
```

CLI (`packages/cli`) routes to `buildSite()` when `config.mode === 'manual'`.
`hybrid` and `auto` modes are unchanged.

## 4. Dependencies

Build-time only. Nothing ships to the browser except a small theme/copy script.

| Package                    | Purpose                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `unified`                  | pipeline orchestrator                                                        |
| `remark-parse`             | Markdown → mdast                                                             |
| `remark-rehype`            | mdast → hast                                                                 |
| `rehype-stringify`         | hast → HTML string                                                           |
| `rehype-slug`              | id="" attrs on headings (for anchors + ToC)                                  |
| `rehype-autolink-headings` | clickable `#` links on headings                                              |
| `shiki`                    | code-block syntax highlighting (TextMate grammars; theme-loadable from JSON) |
| `unist-util-visit`         | AST traversal helper                                                         |

Reader already supplies `gray-matter` for frontmatter.

## 5. Config additions

Extends `OvellumConfig` in `@ovellum/core`:

```typescript
export interface OvellumSiteConfig {
  /** Site title. Defaults to OvellumConfig.name. */
  title?: string;
  /** Short description (used in <meta>, footer). */
  description?: string;
  /** Base URL for absolute links / OG cards. e.g. 'https://docs.example.com'. */
  baseUrl?: string;
  /** Initial theme before user preference loads: 'auto' (default), 'light', 'dark'. */
  defaultTheme?: 'auto' | 'light' | 'dark';
  /** Footer text; defaults to a small "Built with Ovellum" line. */
  footer?: string;
}

export interface OvellumConfig {
  // … existing fields …
  site?: OvellumSiteConfig;
}
```

All optional, all sane-defaulted in `DEFAULT_CONFIG`. Existing config fields
that already apply:

- `input` — root of `.md` content (defaults to `./src`; for manual sites the
  example uses `./content`)
- `output` — `dist/` directory
- `defaultFormat` — must be `'md'` for v1; `'mdx'` rejected with a clear error

## 6. Input → output mapping

```
content/index.md            →  dist/index.html
content/getting-started.md  →  dist/getting-started/index.html
content/guides/install.md   →  dist/guides/install/index.html
content/img/logo.svg        →  dist/img/logo.svg          (passthrough)
```

- `index.md` at any level is the directory's landing page; everything else
  becomes `name/index.html` (pretty URLs).
- Files starting with `_` are ignored except `_meta.json` (see §7).
- Static assets (non-`.md`, non-`_*`) are copied through verbatim.

## 7. Navigation

Auto-generated from the file tree. Per directory:

1. List `.md` files. For each: title from frontmatter `title:`, or first `# H1`, or filename.
2. List subdirectories. Title from `_meta.json#title`, or the directory's
   `index.md` H1, or directory name.
3. Sort: explicit `nav:` order on frontmatter wins; `_meta.json#order` next;
   then alphabetical.

Optional `_meta.json` per directory:

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

`nav.ts` outputs a `NavNode` tree the template consumes.

## 8. Page layout

````
┌──────────────────────────────────────────────────────────────────┐
│  TopBar   [site title] ··················· [theme toggle]        │
├──────────────────────────────────────────────────────────────────┤
│           │                                       │              │
│ Sidebar   │   Content (prose)                     │  On this     │
│  - links  │     # H1 (matches page title)         │  page (ToC)  │
│  - groups │     ## h2  ◄────── anchor link `#`    │   - h2       │
│           │     paragraph …                       │     - h3     │
│           │     ``` typescript                    │              │
│           │     // shiki-highlighted              │              │
│           │     ```                               │              │
│           │     ## another h2                     │              │
│           │                                       │              │
├──────────────────────────────────────────────────────────────────┤
│  Footer   ··· Built with Ovellum · 2026-05-15 ···                │
└──────────────────────────────────────────────────────────────────┘
````

Grid:

```css
display: grid;
grid-template-columns: 240px minmax(0, 1fr) 200px;
gap: var(--space-l);
```

At narrow viewports the right ToC drops first, then the sidebar collapses to
a hamburger button.

### 8a. Chrome width + background (added 2026-05-23)

The topbar (`.ov-topbar`) and footer (`.ov-footer`) are **full-bleed**:
the outer element spans the viewport and paints the chrome background
+ border; an inner wrapper (`.ov-topbar-inner` / `.ov-footer-inner`)
holds the grid and constrains contents to a max width.

Two width tokens, kept deliberately separate:

| Token          | Purpose                                  | Default | Overridden on landing? |
| -------------- | ---------------------------------------- | ------- | ---------------------- |
| `--chrome-max` | Topbar + footer inner contents           | 1600px  | **No** — stays constant so the header never jumps width between landing and docs |
| `--page-max`   | Main content area (`.ov-layout`, `.ov-landing`) | 1600px  | **Yes** — `body.ov-body-landing` tightens it to 1100px for the editorial centerpiece feel |

Backgrounds use two semantic tokens (see STYLES.md §7.2 / §7.3 for the
exact oklch values):

- `--color-bg` — body, topbar, **and `html`**. Pure-neutral gray (no
  hue): off-white in light, near-black in dark; pure white / pure black
  are still avoided. The earlier faint bluish tint was dropped, pending
  a blended background image. The topbar reads as a continuation of the
  body, separated only by a 1px `border-block-end`.
- `--color-bg-chrome` — footer only. ~4% L below body in light, ~6% L
  above body in dark (elevation inversion — going darker than
  near-black reads as a void). Reads as a closing baseline below the
  content.

**Why topbar = body, footer = chrome (asymmetric):** an earlier pass
made *both* topbar and footer chrome-colored, but a tinted topbar
fought every other surface on the page — and Safari sampled the
sticky-translucent topbar's blended color into its URL-bar tint,
which never matched. A body-colored topbar with a hairline border is
quieter, matches Safari's URL-bar sampling cleanly (since both read
as the same body color), and lets the footer's chrome tint do the
ambient-separation work on its own.

`html { background: var(--color-bg) }` so Safari's top-of-page
rubber-band overscroll continues the topbar's body color cleanly.
Bottom overscroll will reveal body instead of the footer's chrome
tint — accepted tradeoff (top overscroll is the one users notice).

### 8b. Editorial frame + monochrome chrome (added 2026-06-04)

A neutral, "framed page" treatment applied site-wide (docs **and** landing).
Three moving parts:

- **Fully monochrome (incl. dark mode).** Chrome AND callouts are neutral in
  both themes — the only colour on a page is code syntax highlighting. Callout
  type tokens (`--callout-*-fg/-bg`) are fg-derived (`--color-fg` rule/label on
  a `--color-bg-subtle` tint), defined once in `:root` so they auto-adapt to
  dark; the dark blocks no longer redeclare them. Each callout still carries its
  uppercase label for meaning. The active sidebar item and other "current/
  selected" states use `--color-fg` (high-contrast monochrome), never a hue.
- **Monochrome chrome.** `--color-accent` and `--color-link` resolve to the
  foreground neutral (`--color-fg`), and `--color-border-focus` to a neutral
  gray — chrome carries no hue. The blue ramp stays defined but is reserved
  for semantic callouts (the only hue-bearing surfaces left). Links are set
  apart from body text by their underline, not a color. See STYLES.md §6.3.
- **Translucent hairlines.** `--color-border` / `--color-border-strong` are
  now `color-mix` tints of `--color-fg` (~10% / ~18%), defined **once** in
  `:root` — they auto-adapt when `--color-fg` flips per theme, so the dark
  blocks no longer redeclare them. Whisper-thin structure over filled boxes.
- **The frame.** `renderFrame()` (template.ts) injects a fixed,
  `pointer-events:none`, `aria-hidden` `.ov-frame` right after `<body>`. Its
  inner box is centered to `--chrome-max` (the *constant* chrome width, so the
  rules line up with the topbar brand + footer edges on every page including
  the landing). Two `::before`/`::after` vertical rules in `--color-frame-line`
  (~7% fg, the faintest hairline) sit `--frame-inset` (`--space-m`) inside the
  inner box's edges; at each header-baseline crossing sits a small darker **`+`**
  mark (`.ov-frame-node--tl/--tr`) — a 10px box drawn with two 1px crossing
  `--color-fg-subtle` gradients (no fill, no border), so the intersection reads
  as a quiet cross, not a dot. The vertical arm overlays the rail; the
  horizontal arm crosses it. The **footer** mirrors this: `.ov-footer-inner::before/::after`
  draw the same `+` where the rails cross the footer's top border (positioned to
  the footer-inner = `--chrome-max` box, so they coincide with the fixed rails).
  Both header and footer marks are hidden below 720px (frame off); the footer
  uses `::before`/`::after` because the footer isn't fixed, so a viewport-fixed
  node couldn't track its scrolling top edge.
- **Sidebar = one border, flat list.** There is no separate sidebar track: the
  frame's **left rail is** the sidebar's left border. `.ov-layout` uses
  asymmetric inline padding — left = `--frame-inset` (flush onto the rail),
  right = `--frame-inset + --frame-gutter` (ToC clears the right rail) — so the
  sidebar touches the single left line. Group headings and links (including
  nested children) share one flush-left edge with only a minimal `--space-2xs`
  inset (no indent hierarchy — children indent via nothing). The active link is
  marked by darker colour (`--color-fg`, not bold) plus a 2px `--color-fg`
  `::before` strip that lands on the rail; section group headings stay bold
  `--color-fg`.
- **Content card.** On doc pages the reading column (breadcrumbs + page-meta +
  article + edit link) is wrapped in `.ov-content-card` — a light `--color-surface`
  box with a hairline border, `--radius-lg` corners, and a soft drop-shadow,
  lifted off the body. The card carries the width cap via `--content-card-max`
  (`--content-max` + the card's L/R padding) and releases the prose's own cap,
  so the box hugs the reading measure rather than filling the whole track. The
  **prev/next** pair sits *outside* (below) the card — capped to the same width
  so its edges align — and lost its old top rule (the card's border separates
  it now). The card is neutralised on the centred 404 and in print. Landing
  pages keep their own (un-carded) section layout.
- **Consistent clearance.** Two tokens carry the geometry: `--frame-inset`
  (`--space-m`) positions the rules + corner nodes, and `--frame-gutter`
  (`--space-s`) is the breathing room inside them. The topbar, footer, and doc
  `.ov-layout` all pad their content by `calc(--frame-inset + --frame-gutter)`,
  so every surface clears the lines by the same rhythmic (utopia) step rather
  than sitting flush against them. Tune the gutter in one place. On mobile the
  frame is hidden and the content drops back to a plain `--space-s` inset.

The header is now a fixed-height (`--ov-header-h: 4rem`) frosted bar:
`.ov-topbar` paints a translucent `--color-bg` tint plus `backdrop-filter:
blur()` (solid fallback declared first), so content scrolls under it. The
header height token also drives the sidebar/ToC sticky offsets, the mobile-nav
top, and the frame's corner-node baseline.

## 9. Theme integration

The stylesheet sources its tokens from `docs/internal/STYLES.md` (Tier 1 +
Tier 2 default-light / default-dark blocks). Authoritative copy lives in
`packages/site/src/templates/default/style.css`; if `STYLES.md` changes, we
hand-port the relevant token values. (Future: a small token-extraction script
could automate this, but a hand-port is fine for v1 — the palette doesn't move
weekly.)

The theme toggle (`script.js`):

- Reads `localStorage.getItem('ovellum-theme')` synchronously before paint
- Writes `<html data-theme="…">` accordingly
- Cycles auto → light → dark on click

Nord / Solarized exist in `STYLES.md` but aren't wired into the toggle in v1.
They're swappable later by emitting their CSS blocks too and extending the
toggle to a select.

## 9a. Template anatomy

Where each piece of the bundled template lives, what format it's in, and
how to make a change.

### File map

```
packages/site/
├── src/
│   ├── template.ts                          ← HTML structure
│   └── templates/
│       └── default/                         ← one bundled template, named `default`
│           ├── style.css                    ← visual design
│           └── script.js                    ← client behaviour
└── dist/
    └── templates/default/                   ← shipped to npm; produced at build time
        ├── style.css
        └── script.js
```

### Three formats, deliberately chosen

| Concern | File | Format | Why |
|---|---|---|---|
| HTML structure | `src/template.ts` | TypeScript template literals | No template engine, no extra dep. Escape helpers (`escapeHtml`, `escapeAttr`) are real TS functions the type-checker watches; IDE autocomplete and import navigation work. |
| Visual design | `src/templates/default/style.css` | Vanilla CSS with custom properties | One file, no preprocessor, no PostCSS, no bundler. Tier 1 + Tier 2 OKLCH tokens hand-ported from `STYLES.md`. Themes swap at runtime via `[data-theme]`. |
| Client behaviour | `src/templates/default/script.js` | Vanilla browser JS | Zero framework cost. Two responsibilities: theme cycle + icon copy buttons on code blocks (copy glyph → check; the old language eyebrow is gone). Ships under 2 KB. |

`template.ts` exports three render functions:

- `renderShell({ site, body, … })` — outermost `<html>` / `<head>` / `<body>`
  chrome, topbar, footer, pre-paint theme bootstrap. Shared.
- `renderPage(input)` — doc-page body: sidebar + content + right-side ToC.
- `renderLanding(input)` — landing-page body: hero + feature grid +
  optional pitch + trust strip.

### How the template ships

At `pnpm --filter @ovellum/site build`:

1. `tsup` bundles `src/index.ts` → `dist/index.js` (the package entry).
2. `tsc -b --force` emits `.d.ts` files alongside.
3. A `node -e "require('fs').cpSync(...)"` step copies `src/templates/`
   to `dist/templates/` so the runtime can find them.

At runtime, `buildSite()` calls `resolveTemplateDir()` which uses
`import.meta.url` to find the bundled template next to the running module:

```typescript
const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(here, 'templates/default'),        // dist/index.js → dist/templates/default
  path.join(here, '..', 'src/templates/default'), // vitest / dev
];
```

`writeStaticAssets()` then copies the CSS and JS into the consumer's
`{output}/assets/` directory on every build.

### How to change the design

In increasing order of friction:

| You want to… | Do this |
|---|---|
| Tweak colours / spacing / type | Override Tier 2 CSS variables (`--color-accent`, `--color-bg`, `--space-m`, etc.) in a follow-up stylesheet. The override path for end users is documented in `website/content/guides/themes.md`. |
| Tweak the markup / layout | Edit `packages/site/src/template.ts`. Add a `data-…` attribute, rearrange the topbar, change the heading rendering, etc. Run `pnpm --filter @ovellum/site test` to keep the template tests green, then `pnpm --filter @ovellum/site build` and `pnpm -w run build:website` to verify. |
| Add a new section (e.g., right-side action buttons, breadcrumbs) | Edit `template.ts` to render the new markup, then add the corresponding selectors to `templates/default/style.css`. Tests in `__tests__/template.test.ts` cover that the active link still works, ToC renders, etc.; add a test for any new section. |
| Replace the template wholesale | Fork `packages/site/src/templates/default/` (plus the `template.ts` render functions if you need different markup), maintain your own version, point your build at the fork. The plugin / template-override API for cleanly swapping templates is on the roadmap and tracked in TODO.md Phase 4.5 follow-ups. |

### What's intentionally not in v1

- **A plugin / template-override API.** Adding it before the customisation
  surface stabilises locks us into bad shapes. Deferred until external
  demand says otherwise.
- **Multiple bundled templates / hero variants.** Same reasoning. The
  current `default` is the only template; the `templates/` directory uses
  the plural form so a `templates/<name>/` siblings layout adds cleanly.
- **MDX rendering.** `.md` only for v1; reader already parses MDX
  frontmatter but the render path through remark-mdx is wired off.
- **Token-extraction script** (auto-sync `style.css` ← `STYLES.md`).
  Hand-port is fine while the palette is stable. Add when tokens drift.
- **`<base href>` / `site.basePath`** for sub-path hosting. Needed only if
  serving from `<user>.github.io/<repo>/` rather than a custom domain.

### When this section changes

This section is part of the architectural record. Update it whenever:

- A new file joins `src/templates/default/`.
- A new render function lands in `src/template.ts`.
- The build-time copy step changes.
- The runtime template-resolution path changes.
- A new bundled template appears (one day).

## 10. Page metadata + `<head>`

For each page:

- `<title>` = `{page.title} · {site.title}` (or just `{site.title}` for the index)
- `<meta name="description">` from frontmatter `description:` or site default
- `<link rel="canonical">` if `site.baseUrl` is set
- OG / Twitter cards if `baseUrl` set — minimal: title + description + URL
- `<link rel="stylesheet" href="/assets/ovellum.css">`
- `<meta name="theme-color" id="ov-theme-color" data-light="…" data-dark="…" content="…">`
  drives Safari's URL bar tint and the iOS safe-area band. The hex
  approximations of `--color-bg` (**body**, not chrome — the topbar
  reads as a continuation of the body, see §8a) live in the
  `data-light` / `data-dark` attributes — single source of truth for
  both the inline boot script and `script.js`. If `--color-bg` moves,
  update these hex values in `packages/site/src/template.ts`.
- Theme-bootstrap inline `<script>` runs before paint: applies the
  stored `data-theme`, resolves the effective theme (using
  `prefers-color-scheme` when stored value is `auto`), and writes the
  matching hex into the meta's `content`. Avoids a light-flash on
  dark-OS first load.
- Deferred `<script src="/assets/ovellum.js">` keeps theme-color in
  sync on toggle (calls `syncThemeColor()` inside `apply()`) and on OS
  appearance changes when the stored theme is `auto`
  (`matchMedia('(prefers-color-scheme: dark)').addEventListener('change', …)`).

## 11. Open questions (later)

- Search: Pagefind is the cleanest static fit (post-build index, ~50KB
  client). Plan to add as a separate package or as a `--search` flag.
- Multi-version: not in v1.
- Custom themes: needs a small plugin API. Hold off until there's demand.
- Live reload: pairs with `ovellum watch`; ship the watcher first.
- Sitemap.xml + RSS: small follow-up.

## 12. Out of scope but worth a note

- **MDX rendering**: the reader can already parse MDX frontmatter and zones.
  Wiring it through `remark-mdx` for rendering is straightforward but
  intentionally not in v1 — keeps the dep surface small.
- **`@ovellum/site` and the merger**: in v1 they don't talk. Long-term, a
  `hybrid-html` mode could run the merger first (Markdown out) and then this
  site builder (HTML out) so auto-generated API pages live alongside hand-
  written narrative pages with shared chrome.

---

## 13. Decisions log

| Decision                                      | Why                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| One default template                          | Faster to ship; plugin API can come once there's a second template demanding it.                  |
| Shiki at build time, zero runtime highlighter | Output quality matters for a docs tool; baked-in shiki output is the right default.               |
| Pretty URLs (`name/index.html`)               | Standard for static sites; works on any host without server-side rewrites.                        |
| `_meta.json` for nav overrides                | JSON over YAML so we don't drag in another parser; per-directory locality > root-config nav tree. |
| No live reload in v1                          | Phase 6 watch ticket already exists; site builder shouldn't ship a second watcher.                |
| Hand-port STYLES.md tokens into `style.css`   | Avoid a token-extraction step for v1; revisit when tokens drift.                                  |
