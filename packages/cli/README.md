# ovellum

> Write what matters, generate the rest — open-source documentation where both live together.

Ovellum is a documentation tool for TypeScript and JavaScript projects.
It bridges auto-generated API documentation and hand-written narrative
prose — letting both live in the same files, without conflict.

- Docs: <https://ovellum.oss.oinam.com>
- Source: <https://github.com/oinam/ovellum>

## Install

No global install needed — `npx ovellum <command>` downloads and caches
on first run.

```bash
npx ovellum init       # scaffold a new project
```

Or add as a dev dependency:

```bash
npm install --save-dev ovellum
pnpm add -D ovellum
yarn add -D ovellum
```

Requires **Node 20** or newer.

## What it does

Documentation tools today force a choice: auto-generate from code and
lose the human voice, or hand-write everything and watch it drift from
reality. Ovellum lets you tag sections of a Markdown file as
human-owned. On every rebuild, the tool updates the auto-generated
parts around them and leaves the prose untouched. Renamed or deleted
symbols don't silently drop the writing — orphaned sections are
quarantined under `.ovellum/orphans/` for review.

Three modes:

- **`hybrid`** (default) — auto-generation and manual prose in the same
  files, with tagged protected zones preserved across rebuilds.
- **`manual`** — Markdown-first static site builder. No source parsing.
  Authors own everything.
- **`auto`** — pure auto-generation from TS/JS source. No manual layer.

## Commands

```bash
ovellum init        # scaffold a new project (config + content + .gitignore)
ovellum build       # one-shot production build
ovellum dev         # build + watch + serve + live-reload (manual mode)
ovellum watch       # rebuild on every change (all modes)
ovellum serve       # serve the built dist/ over HTTP
ovellum check       # broken-link + unsafe-URL lint
```

Full reference: <https://ovellum.oss.oinam.com/reference/cli/>.

## A minute-long manual-mode demo

```bash
mkdir my-docs && cd my-docs
npx ovellum init           # answer prompts, or use --yes for defaults
npx ovellum dev            # browser auto-refreshes on save
```

Edit anything under `content/` and the open browser tab refreshes via
SSE live-reload. Build for production with `npx ovellum build`, then
deploy `dist/` to any static host:
<https://ovellum.oss.oinam.com/guides/deploy/>.

## What ships in the box

- Markdown + frontmatter via `gray-matter`.
- Syntax highlighting with `shiki` (dual light/dark via CSS variables;
  themes: github, nord, solarized).
- Sidebar nav built from your file tree.
- "On this page" ToC, breadcrumbs, prev/next page navigation.
- Per-page reading-time + last-modified line (uses `git log`, falls
  back to filesystem mtime).
- Static search via Pagefind (opt-in).
- Sitemap.xml, custom 404, print stylesheet.
- Auto + light + dark themes; OKLCH palette; Utopia type and space
  scales.
- HTML sanitization via `rehype-sanitize` (script tags, event handlers,
  and dangerous URL schemes are stripped).
- Optional Mintlify-style landing page with hero + feature grid + trust
  strip.

## Status

`v0.1.x` — public, early. The shipped feature set works end-to-end
(this very README is rendered by Ovellum at
<https://ovellum.oss.oinam.com/>), but APIs may shift before `v1.0`.
Open issues happily welcomed at
<https://github.com/oinam/ovellum/issues>.

## License

MIT © Brajeshwar Oinam. See [`LICENSE`](./LICENSE).
