---
title: Deploy
description: Build once to a self-contained dist/ folder, then host it anywhere — self-hosted, GitHub Pages, Cloudflare, or any static host.
---

# Deploy

`ovellum build` produces a self-contained `dist/` directory — HTML + CSS + ~2 KB
of JavaScript. No server, no database, no runtime. Anything that serves static
files will serve it.

So "deploying" is really just "get `dist/` to a host." This page covers the
common ways, simplest first. Pick the one that matches where your code already
lives.

## Options at a glance

- **[Self-hosted](#self-hosted)** — build locally, copy `dist/` to any static
  host (Nginx, Apache, S3, a VPS, or `serve` for a quick look).
- **[GitHub Pages](#github-pages)** — two routes: a CI workflow, or a local
  `gh-pages` push.
- **[Cloudflare (Pages / Workers)](#cloudflare-pages--workers)** — connect the
  repo; Cloudflare builds and deploys on every push.
- **[Other platforms](#other-platforms)** — GitLab Pages, Netlify, Vercel, and
  friends. Same pattern, different config file.

---

## Self-hosted

The baseline, and the default: build, then put the folder wherever you serve
static files.

```bash
ovellum build      # writes ./dist
```

Then:

- **Any web server (Nginx, Apache, Caddy):** point the document root at `dist/`.
- **Object storage (S3, R2, GCS):** upload the *contents* of `dist/` to the
  bucket and turn on static-site serving.
- **A quick local look:** `npx serve dist`.

Pretty URLs (`<slug>/index.html`) work without rewrite rules — a request for
`/guides/` serves `/guides/index.html`, which every static server does by
default. The build also writes `dist/404.html`; wire it up as the host's
not-found page if it supports one.

### Choosing the output folder

`ovellum build` writes to `./dist` by default. If a host expects a different
folder (some expect `public/`), set `output`:

```json
{
  "output": "./public"
}
```

Nothing in Ovellum hard-codes "dist".

### Verify before you ship

```bash
ovellum build
npx serve dist
```

Open the URL it prints, click around, toggle the theme, and hit a missing path
to confirm the 404. If it works locally, it works on the host.

---

## GitHub Pages

For projects already on GitHub. Two routes — pick one.

### Route A — GitHub Actions (recommended)

A workflow builds on every push to `main` and publishes the result. No local
build, no extra branch. This is what publishes the site you're reading; a
working copy lives at
[`/.github/workflows/deploy-website.yml`](https://github.com/oinam/ovellum/blob/main/.github/workflows/deploy-website.yml).

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

Then set **Settings → Pages → Source** to **GitHub Actions**, push to `main`,
and the workflow handles the rest. (Using npm instead of pnpm? Swap the
`pnpm/action-setup` step for `cache: npm` on `setup-node`, and run
`npm ci` + `npx ovellum build`.)

### Route B — local build + `gh-pages` branch

No CI. You build locally and publish `dist/` to a `gh-pages` branch with the
[`gh-pages`](https://www.npmjs.com/package/gh-pages) helper:

```bash
ovellum build
npx gh-pages -d dist --dotfiles
```

- `-d dist` publishes the build output.
- `--dotfiles` includes dotfiles like `CNAME` and `.nojekyll`.

Then set **Settings → Pages → Source** to **Deploy from a branch**, branch
**`gh-pages`**, folder **`/ (root)`**.

Two notes for this route:

- **Add a `.nojekyll` file.** Branch-based Pages runs the output through Jekyll,
  which ignores files and folders that start with `_`. Drop an empty `.nojekyll`
  into your `input/` directory — Ovellum copies it through to `dist/` and Jekyll
  stays out of the way. (Route A doesn't need this; it serves the artifact
  directly, no Jekyll.)
- **Make it one command.** Add a script to `package.json`:
  `"deploy": "ovellum build && gh-pages -d dist --dotfiles"`, then
  `npm run deploy` whenever you want to publish.

### Custom domain

Drop a `CNAME` file inside your `input/` directory with one line — the hostname
you control:

```
docs.example.com
```

Ovellum copies non-`.md` files through verbatim, so `CNAME` lands in
`dist/CNAME` and Pages picks it up automatically. Then point DNS at GitHub
Pages. The exact steps depend on your DNS provider — Cloudflare is by far the
most common, and it has one non-obvious gotcha worth calling out.

#### DNS via Cloudflare (the common case)

1. In Cloudflare's DNS panel, add a record:
   - **Type**: `CNAME`
   - **Name**: the subdomain part of your custom domain
     (e.g. `docs` for `docs.example.com`, or `ovellum.oss` for
     `ovellum.oss.oinam.com`)
   - **Target**: `<your-user>.github.io` (no protocol, no path, no trailing dot)
   - **Proxy status**: **DNS only (grey cloud).** This is the gotcha.

2. In your GitHub repo, **Settings → Pages**, confirm:
   - **Source** is "GitHub Actions" (Route A) or the `gh-pages` branch (Route B).
   - The **Custom domain** field shows the value from your `CNAME` file. GitHub
     picks it up from `dist/CNAME` on the first deploy.

3. Wait a few minutes. GitHub Pages issues a Let's Encrypt certificate for the
   custom domain automatically once DNS resolves to its servers. Refresh the
   Pages settings page until **Enforce HTTPS** becomes available, then check it.

That's it — `https://docs.example.com/` now serves your site over HTTPS.

#### Why grey cloud (DNS-only)?

When Cloudflare's proxy is on (orange cloud), Cloudflare terminates SSL itself
and answers the HTTP-01 challenge that Let's Encrypt sends to issue GitHub
Pages' certificate. The challenge never reaches GitHub, the cert never issues,
and Pages serves the bare github.io URL instead. Grey cloud (DNS-only) bypasses
Cloudflare's proxy so the challenge reaches GitHub directly.

You **can** flip to orange-cloud (proxy on) later, once the cert is issued. If
you do:

- Set Cloudflare **SSL/TLS mode** to **Full (strict)** — anything less and
  Cloudflare may serve cleartext or warn about an invalid cert downstream.
- Don't disable the GitHub-issued cert. GitHub Pages keeps re-issuing it;
  Cloudflare's edge cert is what's served to visitors.

For most documentation sites, grey-cloud is enough: GitHub Pages is already on a
CDN, and Cloudflare's proxy features are usually overkill for a docs subdomain.

#### DNS via other providers

Same idea, different UI:

- **Namecheap / GoDaddy / Route 53 / etc.** — add a CNAME record from your
  subdomain to `<your-user>.github.io`. No proxy concerns.
- **Apex domain (`example.com`, not `docs.example.com`)** — most providers don't
  allow CNAMEs at the apex. Use four A records pointing at GitHub Pages' IPs
  instead. See
  [GitHub's docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)
  for the current IP list.

#### Without a custom domain

The site is served from `https://<user>.github.io/<repo>/` — note the subpath.
Internal links break unless you set `site.basePath`. See
[Hosting under a subpath](#hosting-under-a-subpath).

---

## Cloudflare (Pages / Workers)

Assumes your code is on GitHub (or any git host Cloudflare can connect to).
Cloudflare watches the repo and rebuilds on every push — you don't run a build
or upload anything.

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the repository and the production branch (`main`).
3. Build settings:
   - **Build command:** `npx ovellum build`
   - **Build output directory:** `dist`
   - **Root directory:** leave blank, or set it to the subfolder if the site
     lives in a monorepo (e.g. `website`).
4. Save. Cloudflare builds and deploys; every later push redeploys automatically.

Cloudflare's CDN handles caching and TLS. Pages and the newer Workers
static-assets hosting share the same connect-and-build flow — either works;
Pages is the simplest for a docs site.

> [!NOTE]
> Prefer to push the built folder yourself rather than have Cloudflare build?
> Use Wrangler: `npx wrangler pages deploy dist`. The git-connected flow above
> is the common case and needs no local tooling.

---

## Other platforms

Every other static host follows the same shape: **build command
`npx ovellum build`, output directory `dist`.** Point the host at those two and
it works. A few specifics:

### GitLab Pages

Commit a `.gitlab-ci.yml`. GitLab Pages serves the artifact of a job named
`pages`, and expects it in a `public/` folder — so move the build output there:

```yaml
pages:
  image: node:20
  script:
    - npx ovellum build
    - mv dist public
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

GitLab serves the result at `https://<group>.gitlab.io/<project>/` — a subpath,
so set `site.basePath` (see below) unless you add a custom domain.

### Netlify

```bash
npx netlify deploy --prod --dir=dist
```

Or commit `netlify.toml`:

```toml
[build]
  command = "npx ovellum build"
  publish = "dist"
```

### Vercel

```bash
npx vercel --prod dist
```

Or `vercel.json`:

```json
{
  "buildCommand": "npx ovellum build",
  "outputDirectory": "dist",
  "framework": null
}
```

### Anything else

Render, Surge, Fly static, an internal CDN — the recipe doesn't change. If the
host builds from git, give it the build command (`npx ovellum build`) and output
dir (`dist`). If it doesn't, run `ovellum build` locally and upload `dist/`.

---

## Hosting under a subpath

Three cases where the site doesn't live at the origin's root:

1. **Docs as part of an existing site** — e.g. `example.com/docs/`.
2. **GitHub Pages without a custom domain** — `<user>.github.io/<repo>/`.
3. **GitLab Pages without a custom domain** — `<group>.gitlab.io/<project>/`.

All need the same fix: tell Ovellum the subpath so it can prefix every internal
link, asset URL, canonical, and sitemap entry. Set `site.basePath`:

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
  `/reference/config/`). The build adds the prefix at render time.
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

External links, fragment-only links (`#anchor`), and `mailto:` / absolute URLs
pass through unchanged.

If you host the site standalone (`docs.example.com` or similar), leave
`basePath` empty — that's the default. Setting it for a root-served site would
prefix every link incorrectly.
