---
title: Drafts
description: Work-in-progress pages that you preview locally but never publish — marked with frontmatter or per-folder, shown in dev with a ribbon, excluded from production.
tags: [drafts, authoring, dev, preview]
---

# Drafts

A **draft** is a page you're still working on: visible while you write and
preview locally, but **never published** to production. Mark a page (or a whole
folder) as a draft, and Ovellum shows it in `ovellum dev` with a clear ribbon
and a sidebar badge — then drops it from `ovellum build`.

## Mark a draft

**A single page** — frontmatter `draft: true`:

```markdown
---
title: New feature guide
draft: true
---

# New feature guide

Still writing this…
```

**A whole folder** — `_meta.json "draft": true` (cascades to everything inside,
so you can draft an entire new section at once):

```json
{
  "title": "Upcoming",
  "draft": true
}
```

That's it — co-located with your content, toggled with one line, and tracked in
git. (No separate `_drafts/` folder to move files in and out of.)

## What happens

| | `ovellum dev` / `watch` | `ovellum build` (production) |
| --- | --- | --- |
| Draft pages | **Shown** — with a ribbon + sidebar badge | **Excluded** |
| Sitemap / RSS | Excluded | Excluded |
| Build output | — | Prints *"Excluded N draft page(s)…"* |

It's **automatic by command** — no flag to remember. Overrides when you need
them:

- `ovellum build --drafts` — include drafts in a build (e.g. to preview a
  production build with them).
- `ovellum dev --no-drafts` — hide drafts locally to see exactly what
  production will publish.

A draft page in dev shows a band across the top — *"Draft — visible locally
only, never published"* — and every draft gets a **Draft** badge in the sidebar,
so there's no mistaking work-in-progress for live content.

## Drafts are unpublished, not secret

A draft lives in your source, so anyone with access to the repository sees it —
that's the point: it's backed up, reviewable in a pull request, and visible to
your team. The draft system controls **what gets published**, not **who can read
the source**. If a page must be truly private, don't commit it (add it to
`.gitignore`) — but then you lose the backup and sharing.

## `draft` vs `ignoreFiles`

Two different tools:

- **`draft`** — the page *is* content: parsed, rendered, and previewable in dev;
  just held back from production until you publish it.
- **[`site.ignoreFiles`](/docs/reference/config/)** — full exclusion. The file
  is **never parsed or rendered**, in any environment. Use it for content
  Ovellum shouldn't touch at all.

Reach for `draft` when you're writing something you intend to ship; reach for
`ignoreFiles` when you want Ovellum to leave a file alone entirely.
