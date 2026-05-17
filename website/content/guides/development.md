---
title: Development
description: The day-to-day loop — scaffold, write, watch, check, build, deploy.
---

# Development

A practical guide to working on an Ovellum site: scaffolding, writing,
rebuilding on change, checking links, and serving the output locally
before you ship.

For deployment targets, jump to the [Deploy guide](/guides/deploy/).
For Ovellum's own repo (the monorepo, packages, tests), see
[Contributing](/contributing/).

## Prerequisites

- **Node 20 or newer** — Ovellum targets Node 20 LTS.
- **A package manager** — pnpm, npm, and yarn all work. The commands
  below use `npx`, which is shipped with npm. Substitute `pnpm dlx` or
  `yarn dlx` to taste.

You don't need to install Ovellum globally. `npx ovellum <command>` will
download and cache it on first run; subsequent runs use the cache.

## Scaffold a new site

```bash
mkdir my-docs && cd my-docs
npx ovellum init
```

The init prompt asks for a project name, mode (`manual` for a docs
site, `auto` for API generation, `hybrid` for both), title, description,
input/output paths, and the default theme. Press Return through the
defaults if you're just trying it out.

Non-interactive scaffold (everything takes its default, useful in CI
or quick scripts):

```bash
npx ovellum init --yes
```

Files written:

- `ovellum.config.json` — your one config file.
- `content/index.md` — a starter page (manual + hybrid modes only).
- `.gitignore` — gets `dist/` and `.orphans/` appended if absent.

See the [CLI reference for `init`](/reference/cli/#ovellum-init) for the
full flag list and exit codes.

## Write

Drop `.md` files anywhere under your `input/` directory (default
`content/`). The shape:

```
content/
  index.md              ← becomes /
  getting-started.md    ← becomes /getting-started/
  guides/
    install.md          ← becomes /guides/install/
    deploy.md           ← becomes /guides/deploy/
  _meta.json            ← optional: directory title + page order
```

Page titles, descriptions, and other metadata go in YAML frontmatter:

```markdown
---
title: Getting started
description: Install Ovellum and build your first docs.
---

# Getting started

…
```

`_meta.json` per directory controls grouping and order:

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

See [`_meta.json`](/reference/config/#_metajson-per-directory-manual-mode)
in the config reference for the full spec.

## Iterate with `ovellum dev`

The dev command is the heart of the writing loop. One command does
everything: initial build, watch for changes, serve on
`http://127.0.0.1:3000/`, and auto-refresh open browser tabs on every
rebuild.

```bash
npx ovellum dev
```

What happens:

- **Initial build** on start.
- **HTTP server** starts on the next available port (3000 by default;
  bumps if busy).
- **Watcher** runs the rebuild on every change under `input/` —
  debounced 300 ms, with `chokidar`'s `awaitWriteFinish` enabled so
  partial writes from your editor don't trigger half-state rebuilds.
- **Live reload** pushes a Server-Sent Event to every connected browser
  tab on each successful build; the tiny client script injected into
  HTML responses calls `location.reload()`.
- **Config reload** when `ovellum.config.*` itself changes — the next
  build picks up the new settings.
- **Clean shutdown** on `Ctrl-C`.

Open the URL it prints and start editing. Save → see the page refresh
within ~100 ms.

### Flags

```bash
npx ovellum dev --port 4000          # pick a port
npx ovellum dev --host 0.0.0.0       # expose on the local network
npx ovellum dev --cwd ./website      # multi-site monorepo
```

See the [CLI reference for `dev`](/reference/cli/#ovellum-dev) for the
full flag list.

## Manual two-process loop (optional)

`ovellum dev` covers the common case. If you want to run your own
server (a CDN emulator, a reverse proxy, a process manager that
restarts the watcher), the primitives are still available:

```bash
# Terminal 1: watch only
npx ovellum watch

# Terminal 2: serve the dist/ directory
npx ovellum serve

# …or any other static server you prefer:
npx serve dist
python3 -m http.server -d dist 8000
npx http-server dist -c-1     # -c-1 disables caching
```

`ovellum serve` is a pure static server — no watching, no reload
injection. Cache headers are `public, max-age=0` so refreshes still
fetch the latest build.

## Check before you ship

`ovellum check` is the lint pass: no writes, exits non-zero if anything
looks wrong. It currently catches:

1. **Broken internal links** — any `/foo/` or `./bar.md` that doesn't
   resolve to a page in the sidebar.
2. **Unsafe URL schemes** — `javascript:`, `vbscript:`, `data:`,
   `file:`. These get stripped at render time anyway (see
   [Security](/reference/security/)), but `check` surfaces them as
   `[SECURITY]` issues so authors notice and remove them.

```bash
npx ovellum check
```

Output is a small per-file table with line numbers. Wire it into your
CI alongside `build` and you'll catch link rot before it ships.

See the [CLI reference for `check`](/reference/cli/#ovellum-check) for
the exact output shape and exit codes.

## Build for production

`ovellum build` is what your deploy pipeline runs:

```bash
npx ovellum build
```

In manual mode it produces:

- `dist/*.html` (and nested directories with `index.html` for pretty
  URLs).
- `dist/assets/ovellum.css` + `dist/assets/ovellum.js`.
- `dist/sitemap.xml` when `site.baseUrl` is configured.
- `dist/pagefind/` when `site.search.enabled` is `true`.
- `dist/404/index.html` and (via post-build script) `dist/404.html` —
  whichever your host looks for.

Build output is fully deterministic given the same inputs. Two runs
back-to-back produce byte-identical files.

## Recommended workflow

The whole loop, end-to-end:

```bash
npx ovellum init             # once, when starting
git init && git add . && git commit -m 'scaffold'

npx ovellum dev              # while writing — keep running

npx ovellum check            # before committing
npx ovellum build            # once, before pushing — confirms a cold build works

git add . && git commit -m 'docs: explain how the merger works'
git push                     # CI runs `ovellum build` and deploys
```

One terminal for the dev loop, no juggling.

## Working with multiple sites in one repo

If your repo hosts both code and docs (a monorepo, for example), pass
`--cwd` to scope each Ovellum command to a sub-directory:

```bash
npx ovellum dev   --cwd ./website
npx ovellum build --cwd ./website
npx ovellum check --cwd ./website
```

Every path in `ovellum.config.json` resolves relative to that `--cwd`,
so you can keep the docs entirely self-contained while sharing the
repo.

## What's next

- [Deploy guide](/guides/deploy/) — GitHub Pages, Netlify, Vercel,
  Cloudflare, Nginx, S3, anywhere.
- [Themes](/guides/themes/) — what's bundled, what to customise, and
  how the icon registry works.
- [Configuration reference](/reference/config/) — every field, every
  default.
