---
title: Migrating to Ovellum
description: Moving from TypeDoc, from a hand-written Markdown site, or from a hosted docs platform — what changes, what Ovellum adds, and how to bring your content across.
---

# Migrating to Ovellum

Whether your docs are generated from source, hand-written Markdown, or living on
a hosted platform, this is the map for moving them to Ovellum — and what you gain
by doing it.

## The core idea

Ovellum has three modes, and the right one depends on where your docs come from:

| Mode | What it does | Replaces |
| ---- | ------------ | -------- |
| **`auto`** | Generates Markdown from your TS/JS source every build. | A source-driven API-doc generator. |
| **`hybrid`** | Generates, then **merges your hand-written prose back in** — protected zones survive every rebuild. | The gap between generated and hand-written docs. |
| **`manual`** | You write Markdown by hand; Ovellum builds a static site. | A plain Markdown static-site generator. |

The one Ovellum is built around is **hybrid**: generated reference and
hand-written narrative in the *same file*, where your prose is never overwritten
and never silently lost. That's the capability the others don't have.

## From a source-driven API generator (e.g. TypeDoc)

If you generate API docs from TypeScript today, Ovellum's `auto` mode is the
direct equivalent — it parses your source with
[ts-morph](https://ts-morph.com/) and reads the JSDoc/TSDoc tags you already
write (`@param`, `@returns`, `@throws`, `@example`, `@deprecated`, `@since`,
`@see`, `@remarks`, `@internal`, …), emitting one Markdown file per source file.

The reason to switch is **hybrid mode**. A pure generator forces a choice: hand
edits get blown away on the next run, so all your prose lives in separate files
that drift out of sync. Ovellum lets you write narrative *inside* the generated
file, in a `@manual` zone:

```markdown
<!-- @manual:start id="src/client.ts::Client" -->
The `Client` is long-lived — create one per process and share it. See the
[connection guide](/guides/connections/) for pooling.
<!-- @manual:end -->
```

The generator updates the reference *around* that zone, never *over* it. And if
you rename or delete the symbol, the prose isn't dropped — it's
[quarantined](/docs/guides/troubleshooting/#my-prose-disappeared-after-a-rebuild-orphans)
to `.ovellum/orphans/` so you can reattach it. That "docs that never fall out of
sync" guarantee is the whole point.

**Bringing it across:** point `input` at your source, set `mode: 'hybrid'`, run
`ovellum build`. Your first build produces the generated reference; add `@manual`
zones where you want narrative. (Use `mode: 'auto'` if you only want generated
output with no hand edits.)

## From a hand-written Markdown site

If your docs are already Markdown built by a static-site generator, Ovellum's
`manual` mode is a full static-site builder — drop your `.md` files in and you
get, out of the box:

- **Navigation** from the file tree (folders → sections), with `_meta.json` for
  ordering, titles, and collapse behavior; pretty URLs; an auto right-side
  table of contents.
- **Theming** — light/dark with no flash, five palettes plus a
  [host-inheriting](/docs/guides/themes/#inheriting-a-host-projects-design)
  `bare` mode, configurable accent, system or bundled fonts.
- **Authoring** — GitHub-style callouts, footnotes,
  [component directives](/docs/guides/components/) (tabs/steps/cards),
  [reusable snippets](/docs/guides/snippets/), Mermaid diagrams, and Shiki
  syntax highlighting with copy buttons.
- **[Search](/docs/guides/search/)** (Pagefind, ⌘K), **[i18n](/docs/guides/i18n/)**
  (per-locale subtrees + language picker), **[versioned docs](/docs/guides/versioning/)**,
  **[drafts](/docs/guides/drafts/)**, a landing page, a themed 404, `sitemap.xml`
  + RSS, and per-page reading-time / "Edited" dates.
- **[AI-friendly output](/docs/guides/automation/)** — `llms.txt`, `llms-full.txt`,
  and per-page `.md` mirrors, emitted alongside the HTML.

See [Manual mode](/docs/guides/manual-mode/) for the full tour.

**Bringing it across** (see [the steps](#bringing-your-content-across) below):
copy your Markdown into the content directory, translate your old nav config to
per-folder `_meta.json`, keep or add frontmatter (`title`, `description`,
`tags`, `permalink`), and run `ovellum check` to catch broken links.

## From an agent-generated wiki

A newer breed of tool (OpenWiki, for example) has an LLM agent write a Markdown
wiki *about* your codebase into a folder in your repo — architecture notes,
workflows, a quickstart. Useful prose, but it's plain files: no renderer, no
link checking, no search, no publishing story.

Ovellum's manual mode turns that folder into a real docs site without touching
the generator's workflow:

```ts
// ovellum.config.ts
export default {
  name: 'wiki',
  mode: 'manual',
  input: 'openwiki', // point at the generated wiki as-is
  output: 'dist',
  site: { title: 'Project wiki' },
} satisfies OvellumUserConfig;
```

`ovellum build` gives you navigation from the folder structure, search, themes,
`llms.txt` + per-page `.md` mirrors — and `ovellum check` validates the wiki's
internal links (agents write broken links too). The wiki tool keeps refreshing
the Markdown; Ovellum keeps rendering it.

Going further: if the *reference* half of your docs should come from your
source rather than an agent's description of it, switch to
[hybrid mode](/docs/guides/hybrid-mode/) and let agents write through the MCP
server's protected zones instead — see
[letting an agent write your docs](/docs/guides/automation/#letting-an-agent-write-your-docs).

## From a hosted docs platform

If your docs live on a hosted platform, the migration is as much about
**ownership** as features. Ovellum builds a **portable static folder** — plain
HTML/CSS and a little JS — that you deploy anywhere: GitHub Pages, Netlify,
Vercel, Cloudflare, an S3 bucket, or a host tool's own pipeline. There's no
server-side runtime to keep alive and nothing proprietary in the output.

What you keep — or gain:

- **Your content stays plain Markdown** in your repo. No export step, no
  proprietary format to escape later.
- **[AI-native by default](/docs/guides/automation/)** — a built-in
  [MCP server](/docs/guides/automation/#mcp-server) (`ovellum mcp`, listed on the
  MCP Registry) lets agents search, read, diff, and even **write into protected
  zones that survive regeneration** — not just read. Plus machine-readable
  `--json` and stable exit codes for CI.
- **No lock-in** — the build is the product; the host is your choice. (Ovellum
  builds; the host deploys.)

**Bringing it across:** export your pages to Markdown, drop them into `content/`,
and follow the steps below. Most hosted platforms export close-enough Markdown
that the main work is nav (`_meta.json`) and fixing asset paths to be
[root-absolute](/docs/guides/troubleshooting/#images-or-links-are-broken-on-the-built-site).

## Bringing your content across

The same handful of steps regardless of where you're coming from:

1. **Scaffold** — `ovellum init` writes a commented `ovellum.config.ts`, a
   starter `content/index.md`, an `AGENTS.md`, and `.gitignore` entries. `--yes`
   accepts the defaults.
2. **Drop in your Markdown** — put your `.md` files under the configured `input`
   (default `content/`). Subfolders become sidebar sections; each file becomes a
   page at `<slug>/index.html`. An existing `README.md` at the root becomes the
   home page automatically.
3. **Order the nav** — add a `_meta.json` per directory where you want a specific
   order or titles: `{ "title": "Guides", "order": ["install", "configure"] }`.
   Unlisted pages sort alphabetically after. It's optional everywhere.
4. **Frontmatter** (all optional) — `title`, `description`, `tags`, `permalink`
   (a custom URL like `/faq/`), `draft: true` (visible in `dev`, excluded from
   `build`), `updated` (pins the "Edited" date). Title falls back to the first
   `# H1`, then the filename.
5. **Fix asset paths** — make image/download links **root-absolute**
   (`/img/x.png`, not `img/x.png`) so they survive pretty URLs; put root-served
   files (favicon, `robots.txt`) in `public/`.
6. **Validate** — `ovellum check` reports broken internal links (exit `1` on
   issues; `--strict` adds more; `--json` for CI). Then `ovellum build` and
   deploy `dist/`.

For anything that goes wrong along the way, the
[Troubleshooting guide](/docs/guides/troubleshooting/) covers the common snags.
