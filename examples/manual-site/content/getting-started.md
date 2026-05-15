---
title: Getting started
description: Set up Ovellum's manual mode and produce your first static site.
---

# Getting started

Ovellum's `manual` mode turns a folder of Markdown files into a deployable
static site. There's no source-code parsing involved — just clean HTML, CSS,
and a tiny bit of JavaScript for theme switching and copy buttons.

## Install

```bash
npm i -D ovellum
```

Or run without installing:

```bash
npx ovellum build
```

## Project layout

The smallest viable site looks like this:

```
my-docs/
  ovellum.config.json
  content/
    index.md
    getting-started.md
```

## Minimal config

```json
{
  "mode": "manual",
  "input": "./content",
  "output": "./dist",
  "site": {
    "title": "My docs",
    "defaultTheme": "auto"
  }
}
```

## Build it

```bash
npx ovellum build
```

You'll get a `dist/` directory ready to deploy anywhere — Netlify, Vercel,
GitHub Pages, S3 + CloudFront, whatever you like.

## What happens behind the scenes

1. Ovellum walks the `content/` directory.
2. Each `.md` file is rendered through the `remark` + `rehype` pipeline.
3. Code fences are highlighted at build time with `shiki` (zero runtime cost).
4. A sidebar nav is built from the file tree.
5. An "On this page" table of contents is generated per page from h2/h3 headings.
6. Each page is wrapped in the default template and written to `dist/`.

You also get a small `assets/ovellum.js` for the theme toggle and copy buttons.
That's the entire client-side JavaScript surface — under 2KB.
