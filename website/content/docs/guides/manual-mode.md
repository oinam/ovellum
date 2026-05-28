---
title: Building a manual-mode site
description: From a folder of Markdown files to a deployable static site.
---

# Building a manual-mode site

Manual mode is the simplest pipeline. You write Markdown; Ovellum produces
HTML, CSS, and a tiny bit of JavaScript. There's no source parsing, no
merge engine, no orphan archive — just rendering.

## The minimum project

```
my-docs/
  ovellum.config.json
  content/
    index.md
    getting-started.md
```

Config:

```json
{
  "mode": "manual",
  "input": "./content",
  "output": "./dist",
  "site": {
    "title": "My docs"
  }
}
```

Build:

```bash
npx ovellum build
```

Result:

```
dist/
  index.html
  getting-started/index.html
  assets/
    ovellum.css
    ovellum.js
```

Pretty URLs are the default. Every page becomes `<slug>/index.html` so the
URL is `/<slug>/`. No server-side rewrites needed; works on any static
host.

## Adding navigation

The sidebar nav is built automatically from your file tree. Page titles
come from:

1. The frontmatter `title:` field, if set.
2. The first `# H1` in the body, otherwise.
3. The filename, as a last resort (`getting-started.md` → `Getting started`).

For ordering and group titles, drop a `_meta.json` into any directory:

```
content/
  guides/
    _meta.json
    install.md
    configure.md
    deploy.md
```

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

`order` is a list of slugs (file or subdirectory names without `.md`).
Anything not listed sorts alphabetically after the explicit set.

## Callouts

Five labelled callout types — `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
`[!WARNING]`, `[!CAUTION]` — render by writing GitHub-flavored alert
blockquotes:

```markdown
> [!NOTE]
> Background context that's useful but skippable.

> [!TIP]
> A shortcut or a sharper way of doing the thing above.

> [!IMPORTANT]
> Something the reader has to internalize before going further.

> [!WARNING]
> Footgun. Action causes mild damage.

> [!CAUTION]
> Footgun. Action causes severe damage. Data loss, broken state, etc.
```

Each renders as a panel with a coloured left rule, a small uppercase
label, and the body content. Mix any inline Markdown inside —
links, code spans, even nested lists.

> [!NOTE]
> Like this one. The label disappears when the syntax matches; if it
> doesn't, you get a plain blockquote — handy for short pull-quotes.

> [!TIP]
> Drop the `[!TYPE]` marker on its own line, then leave a blank
> blockquote line before the body, if you want a clean visual break in
> the source.

> [!WARNING]
> Use callouts sparingly — three per page is plenty. They're meant to
> interrupt the reader, so each one should earn the interruption.

## Adding the right-side ToC

There's nothing to enable — the right column populates automatically from
every page's `## h2` and `### h3` headings. Each heading also gets a
clickable `#` anchor on hover, so readers can deep-link.

You don't need a single configuration line for any of this. Write Markdown,
get a working ToC.

## Static assets

Anything in `content/` that isn't a `.md` file passes through verbatim:

```
content/
  images/
    architecture.svg
    screenshot.png
  hello.md
```

Reference assets with relative paths in your Markdown:

```markdown
![Architecture](/images/architecture.svg)
```

After build:

```
dist/
  images/
    architecture.svg
    screenshot.png
  hello/index.html
```

## Landing page <a id="landing"></a>

Manual mode ships an optional marketing-style homepage. The behavior
at `/` depends on a single flag:

- `site.landing.enabled: false` (the default) — `/` is just a doc
  page. It renders `content/index.md` with the regular layout
  (sidebar, content, on-this-page ToC). Use this if you want readers
  to land straight in the documentation.
- `site.landing.enabled: true` — `/` becomes a marketing-style page:
  hero, feature grid, optional `_landing.md` prose body, optional
  trust strip. The topbar grows a "Docs" link so readers always have
  a one-click path into the documentation proper, and the build
  ignores `content/index.md` with a warning (move that prose to
  `_landing.md` or rename the file).

> [!TIP]
> If you flip from landing-on to landing-off, rename `_landing.md` to
> `index.md` (or write a fresh `index.md`) so `/` still has content.

When enabled, the config looks like this:

```json
{
  "site": {
    "landing": {
      "enabled": true,
      "docsHref": "/getting-started/",
      "hero": {
        "title": "My project",
        "subtitle": "What it does in one sentence.",
        "ctas": [
          { "label": "Get started", "href": "/getting-started/" },
          { "label": "GitHub", "href": "https://github.com/me/proj", "style": "secondary" }
        ]
      },
      "features": [
        { "title": "Fast", "description": "Builds in seconds." },
        { "title": "Themed", "description": "Auto/light/dark out of the box." }
      ]
    }
  }
}
```

If you have a `content/_landing.md` file, its prose body renders between
the feature grid and the trust strip. Treat it as the "Why" section.

Full landing reference: [config → site.landing](/docs/reference/config/#sitelanding).

## Theme switching

Three themes ship in the default template: `auto` (follow OS),
`light`, and `dark`. The topbar toggle cycles between them; the choice is
remembered in `localStorage` and applied before paint, so there's no theme
flash on subsequent loads.

If you want to ship a different default for first-time visitors, set
`site.defaultTheme` to `light` or `dark`. See
[Theming](/docs/guides/themes/) for restyling beyond the defaults.

## Static-site essentials

The default template ships with sensible defaults for the things that
matter:

- Light + dark themes from the same OKLCH palette.
- System fonts only — no `@font-face`, no FOIT.
- Build-time syntax highlighting via shiki; zero runtime JS for code.
- Pre-paint theme script (no flash on reload).
- Copy buttons injected client-side onto every code block.
- Responsive grid: sidebar drops first, then collapses on narrow viewports.
- Accessible: focus rings, semantic landmarks (`<header>`, `<main>`,
  `<aside>` with `aria-label`s), and proper heading levels.

Everything is generated; nothing here is configurable for now. The
[theming guide](/docs/guides/themes/) covers what's customisable today.
