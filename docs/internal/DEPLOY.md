# Ovellum - Deployment

How the official Ovellum website is built and deployed, and how anyone
using Ovellum can copy the pattern for their own projects.

Last updated: 2026-05-16

For the user-facing deploy guide (Netlify / Vercel / S3 / Nginx variants)
see [`website/content/guides/deploy.md`](../../website/content/guides/deploy.md).
This document is for repo maintainers: it documents what's wired up in
this repository and why.

---

## 1. What's deployed

The site at `https://ovellum.oss.oinam.com` is built from
[`website/`](../../website/) and deployed to GitHub Pages.

| Surface                          | Source                                                                  |
| -------------------------------- | ----------------------------------------------------------------------- |
| Landing page                     | `website/ovellum.config.json` + `website/content/_landing.md`           |
| Documentation pages              | `website/content/**/*.md`                                               |
| Stylesheet + theme-toggle script | `@ovellum/site` default template (copied at build time into `assets/`)  |
| Custom domain                    | `website/content/CNAME` → `dist/CNAME` (`ovellum.oss.oinam.com`)        |
| 404                              | `website/content/404.md` → `dist/404/index.html`, copied to `dist/404.html` by `scripts/website-postbuild.mjs` |

The `website/dist/` directory is generated; it's gitignored.

## 2. How the build runs

Two workflows in [`.github/workflows/`](../../.github/workflows/):

### `deploy-website.yml`

Triggers:

- `push` to `main` touching `website/**`, `packages/**`, `package.json`,
  `pnpm-lock.yaml`, or the workflow itself.
- `workflow_dispatch` for manual re-deploys.

Two jobs:

1. **build** — checkout, set up pnpm + Node 20, `pnpm install --frozen-lockfile`,
   `turbo run build --filter='ovellum...'`, `ovellum build --cwd website`,
   upload `website/dist/` as a Pages artifact.
2. **deploy** — `actions/deploy-pages@v4` consumes the artifact and
   publishes to the `github-pages` environment.

Concurrency: `group: pages`, `cancel-in-progress: true`. A newer push
cancels any in-flight deploy so we never publish stale builds.

Permissions are scoped: `contents: read`, `pages: write`,
`id-token: write`. No write access to the repo from the workflow.

### `website-preview.yml`

Triggers on `pull_request` to `main` touching the same paths. Builds the
site and uploads the artifact (`website-dist`, 7-day retention) without
deploying. Reviewers can download the artifact and inspect the HTML
locally.

Adds a step summary to the PR run so reviewers see at a glance whether
the build succeeded.

## 3. One-time setup

Done already; recorded here so future maintainers know what to expect:

1. **GitHub Pages source.** Repo Settings → Pages → "Build and
   deployment" → Source: **GitHub Actions**. (Not "Deploy from a
   branch" — we use the modern artifact upload flow.)
2. **Custom domain.** `website/CNAME` contains `ovellum.oss.oinam.com`.
   GH Pages reads it from `dist/CNAME` (which the build passes through)
   on each deploy. DNS for `ovellum.oss.oinam.com` points to
   `oinam.github.io` via a `CNAME` record.
3. **HTTPS.** GitHub Pages provisions a Let's Encrypt cert
   automatically once DNS resolves. Force-HTTPS toggle in Pages
   settings: enabled.

The DNS step is on the human-only TODO; once DNS is set up the deploys
will start to be served from the custom domain.

## 4. How `dist/` reaches the live site

```
website/                       (repo)
  ovellum.config.json
  content/**/*.md
  CNAME

      │  on push to main
      ▼

GitHub Actions runner
  pnpm install --frozen-lockfile
  pnpm exec turbo run build --filter='ovellum...'
  node packages/cli/dist/index.js build --cwd website
       → emits website/dist/ with HTML, CSS, JS, CNAME

      │  upload-pages-artifact@v3
      ▼

Pages artifact storage

      │  deploy-pages@v4
      ▼

https://ovellum.oss.oinam.com   (live site)
```

## 5. Smoke-testing locally

Same pipeline as CI, run from your laptop:

```bash
pnpm install
pnpm exec turbo run build --filter='ovellum...'
pnpm -w run build:website
npx serve website/dist
```

What to check:

- The site loads at the served URL (no 404 on `/`).
- The landing's CTA links resolve to existing pages.
- The sidebar shows every page; `_meta.json` ordering is respected.
- The right-side ToC populates on a page with multiple `## h2` headings.
- Theme toggle cycles `auto` → `light` → `dark` and persists across reloads.
- `npx serve` returns the 404 page for an unknown path (e.g. `/wat/`).

## 6. If the site can't be served from `/`

The current template uses site-absolute URLs (`/getting-started/`). They
work on:

- A custom domain (`ovellum.oss.oinam.com/`).
- A user-page root (e.g. `<user>.github.io/`).

They break on project-page subpaths (`<user>.github.io/ovellum/`). To
serve from a subpath we'd need a `site.basePath` config that prefixes
every generated link. Tracked in TODO.md under Phase 4.5 follow-ups.

Until that lands, prefer a custom domain or a user-page root.

## 7. How others can copy the pattern

The same workflow shape works for any Ovellum-based project. Three
adjustments:

1. **Project layout.** Replace `--cwd website` with whatever
   subdirectory contains your `ovellum.config.*`. Or run from the repo
   root if your config is there.
2. **Custom domain.** If you have one, drop a `CNAME` file inside
   `input/` (it'll pass through as a static asset). If you don't, your
   site will serve from `<user>.github.io/<repo>/` — and you'll need
   the future `site.basePath` config for internal links to resolve.
3. **Hosting target.** Swap the `upload-pages-artifact` + `deploy-pages`
   steps for whatever your host provides (Netlify, Vercel, S3, etc.).
   See the user-facing
   [`website/content/guides/deploy.md`](../../website/content/guides/deploy.md)
   for variants.

The build half of the workflow (install, turbo build, ovellum build) is
identical regardless of host.

## 8. Failure modes worth knowing

- **`pnpm install --frozen-lockfile` fails.** The lockfile and
  `package.json`s drifted. Run `pnpm install` locally, commit the
  lockfile, push. (The intermediate-commit caveat documented in
  project memory only affects bisects within local dev history; it
  doesn't affect HEAD.)
- **`ovellum build` warns about `_landing.md` + `index.md` both
  present.** Drop one. Landing is enabled in `website/ovellum.config.json`,
  so the build expects no `content/index.md`.
- **Custom domain not propagating.** Check that the DNS `CNAME` record
  for `ovellum.oss.oinam.com` resolves to `oinam.github.io`, and that
  the Pages settings haven't reverted the domain (clicking the X next
  to the domain in the UI removes it; you have to re-enter it).
- **404 page not served.** GH Pages serves `dist/404.html` on missing
  paths. Our build emits `dist/404/index.html`; the post-build script
  (`scripts/website-postbuild.mjs`) copies it to `dist/404.html`. Both
  workflows invoke the script after `ovellum build`. If the 404 stops
  working, check that the post-build step actually ran (look for
  `[website-postbuild] wrote dist/404.html` in the run log).

## 9. Shipped follow-ups

- `site.basePath` config to support project-page hosting — shipped.
- Pagefind search integration (post-build indexer + JS bundle) — shipped.
- Sitemap.xml + RSS feed generation — shipped (auto-emit when `site.baseUrl`
  is set).
- Lighthouse CI run as a separate workflow — shipped at
  `.github/workflows/lighthouse.yml`; informational artifact upload only,
  no merge gate.
