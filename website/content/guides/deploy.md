---
title: Deploying
description: Drop the dist/ folder anywhere that serves static files.
---

# Deploying

`ovellum build` produces a self-contained `dist/` directory. There is
nothing dynamic to configure, no server to run, no database to attach.
The site is HTML + CSS + ~2 KB of JavaScript; whatever serves static
files will serve it.

This page covers the common deploy targets. Pick one; the rest are
optional reading.

## Default: GitHub Pages with Actions

For projects already living on GitHub, this is the lowest-friction path.
A workflow runs on every push to `main`, builds the site, uploads the
result as a Pages artifact, and deploys.

A working version of this workflow lives in
[`/.github/workflows/deploy-website.yml`](https://github.com/oinam/ovellum/blob/main/.github/workflows/deploy-website.yml)
of this repo — it's the one that publishes the site you're reading.

The shape:

```yaml
name: Deploy site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec ovellum build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Set GitHub Pages source to "GitHub Actions" in your repository's Settings
→ Pages, push to `main`, and the workflow takes care of the rest.

### Custom domain

Drop a `CNAME` file inside your `input/` directory with one line — the
hostname you control:

```
docs.example.com
```

Ovellum copies non-`.md` files through verbatim, so `CNAME` lands in
`dist/CNAME` and Pages picks it up. Point a `CNAME` DNS record from
`docs.example.com` to `<your-user>.github.io` and you're done.

If you don't set a custom domain, the site is served from
`https://<user>.github.io/<repo>/` — note the subpath. See
[Hosting under a subpath](#hosting-under-a-subpath) below for the
config change that makes this work.

## Hosting under a subpath

Two patterns where the site doesn't live at the origin's root:

1. **Docs as part of an existing site** — e.g. `example.com/docs/`.
2. **GitHub Pages without a custom domain** — e.g. `<user>.github.io/<repo>/`.

Both need the same fix: tell Ovellum the subpath so it can prefix every
internal link, asset URL, canonical, and sitemap entry. Set
`site.basePath` in `ovellum.config.json`:

```json
{
  "site": {
    "basePath": "/docs",
    "baseUrl": "https://example.com"
  }
}
```

Rules:

- Leading slash, no trailing slash. `/docs` ✓, `docs` ✗, `/docs/` ✗.
- Authors keep writing root-relative links (`/getting-started/`,
  `/reference/config/`). The build adds the `/docs` prefix at render
  time.
- The deployed site is reachable at `https://example.com/docs/`.
- `baseUrl` is the origin only (no path); the path lives in `basePath`.

What changes in the output:

```html
<!-- Without basePath -->
<a href="/getting-started/">Getting started</a>
<link rel="stylesheet" href="/assets/ovellum.css">

<!-- With basePath: "/docs" -->
<a href="/docs/getting-started/">Getting started</a>
<link rel="stylesheet" href="/docs/assets/ovellum.css">
```

External links, fragment-only links (`#anchor`), and `mailto:` /
absolute URLs are passed through unchanged.

If you're hosting the docs site standalone (`docs.example.com` or
similar), leave `basePath` empty — that's the default. Setting it for
a root-served site would prefix every link incorrectly.

## Netlify

```bash
npx netlify deploy --prod --dir=dist
```

Or commit a `netlify.toml`:

```toml
[build]
  command = "npx ovellum build"
  publish = "dist"

[[redirects]]
  from = "/*"
  status = 200
  to   = "/404.html"
```

The redirect rule isn't strictly needed for Ovellum (pretty URLs already
work) but it lets Netlify serve your `404.html` on missing paths.

## Vercel

```bash
npx vercel --prod dist
```

Or via `vercel.json`:

```json
{
  "buildCommand": "npx ovellum build",
  "outputDirectory": "dist",
  "framework": null
}
```

## Cloudflare Pages

In the dashboard, set:

- Build command: `npx ovellum build`
- Build output directory: `dist`
- Root directory: leave blank or set to the site folder if your repo has
  multiple projects.

The Cloudflare CDN handles caching headers; nothing else to configure.

## Plain Nginx / Apache / S3 / anything

Drop `dist/` on the server. Point the document root at it. That's it.

Pretty URLs (`<slug>/index.html`) work without rewrites because the
server already serves `index.html` from any directory request.

If your host adds a redirect from `/foo` to `/foo/`, you don't need to
disable it. If it doesn't, the default site still works — `/foo` returns
a 404 only because the server didn't try the directory; almost every
static host tries it automatically.

## What if my host needs a different folder?

The `output` field in `ovellum.config.json` controls where `ovellum build`
writes. The default is `./dist`. Change it to whatever your host expects:

```json
{
  "output": "./public"
}
```

The folder name is yours to choose. Nothing in Ovellum hard-codes "dist".

## Verifying before you ship

Build locally and serve the output:

```bash
npx ovellum build
npx serve dist
```

Open the URL `serve` prints, click around, toggle the theme, view a page
that doesn't exist (you should see the 404). If everything works locally,
it'll work on the host.
