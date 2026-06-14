---
'ovellum': minor
---

Add **drafts** — work-in-progress pages you preview locally but never publish.

Mark a page with frontmatter `draft: true`, or a whole folder with
`_meta.json "draft": true` (cascades to everything inside). Drafts are:

- **shown in `ovellum dev` / `watch`** with a ribbon across the top
  (*"Draft — visible locally only, never published"*) and a **Draft** badge in
  the sidebar, so work-in-progress is never mistaken for live content, and
- **excluded from `ovellum build`** (production), which prints how many drafts
  it dropped. They're also kept out of the sitemap and RSS.

It's automatic by command — no flag to remember — with overrides when you want
them: `ovellum build --drafts` (include them) and `ovellum dev --no-drafts`
(preview exactly what production publishes).

**Behavior change:** previously `draft: true` excluded a page *everywhere*
(including dev). It now means dev-visible / production-excluded — the standard
draft model. To exclude a file entirely (never parsed or rendered), use
`site.ignoreFiles`. See the new **Drafts** guide.
