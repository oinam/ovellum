---
title: Getting started
description: Install Ovellum, point it at your project, and build your first docs.
---

# Getting started

Ovellum is a single CLI you install in your TypeScript or JavaScript project.
The three steps below take you from zero to a built `dist/` (or `docs/`)
directory you can deploy to any static host.

## 1. Install

In an existing TypeScript or JavaScript project:

```bash
npm install --save-dev ovellum
```

Or use `pnpm`, `yarn`, or `bun` — Ovellum has no opinion. Node.js 20 or newer
is required.

If you'd rather not add a dependency, you can skip install and run via
`npx ovellum <command>` instead. The first invocation downloads the binary;
subsequent runs are cached by your package manager.

See the full [Install guide](/install/) for details on each package manager.

## 2. Configure

Create an `ovellum.config.json` at your project root:

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

That config tells Ovellum to walk `./content/` for `.md` files and write a
static site to `./dist/`. Replace `mode` with `auto` if you want to generate
docs from TypeScript source instead, or `hybrid` if you want to mix both in
the same files. See [Concepts → Modes](/concepts/modes/) for the differences.

A TypeScript config (`ovellum.config.ts`) works too and gives you
autocomplete via the exported `defineConfig` helper:

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'manual',
  input: './content',
  output: './dist',
  site: {
    title: 'My docs',
    defaultTheme: 'auto',
  },
});
```

## 3. Build

Add some content:

```
content/
  index.md
  getting-started.md
  guides/
    deploy.md
```

Then build:

```bash
npx ovellum build
```

You'll see a summary like:

```
ovellum build complete in 198ms
  config:    .../ovellum.config.json
  mode:      manual
  output:    dist/
  pages:     3
  warnings:  0
    → /                       (dist/index.html)
    → /getting-started/       (dist/getting-started/index.html)
    → /guides/deploy/         (dist/guides/deploy/index.html)
```

Open `dist/index.html` in a browser, or serve the folder:

```bash
npx serve dist
```

## What's next

- Want a landing/marketing page above your docs?
  [Enable the landing](/guides/manual-mode/#landing).
- Mixing auto-generated API docs with hand-written narrative?
  See [Hybrid mode](/guides/hybrid-mode/).
- Ready to publish? The [Deploy guide](/guides/deploy/) walks through
  GitHub Pages, Netlify, Vercel, and "just upload `dist/` to anything".
- Reference: [config fields](/reference/config/) and [CLI commands](/reference/cli/).
