---
'ovellum': minor
---

`ovellum check --strict` — opt-in stricter validation.

`--strict` adds three checks on top of the defaults (broken links, unsafe URL
schemes, stale translations):

- **Positional protected zones** — a `<!-- @manual:start -->` with no `id=`.
  Id-less zones fall back to positional matching, so reordering can lose them.
- **Stale anchors** — a generated-doc anchor whose symbol no longer exists in the
  source (a delete, or a rename you haven't rebuilt). Rebuild, or reattach the
  prose with `ovellum orphans --reattach`.
- **Title-less pages** — a page with neither a frontmatter `title:` nor a
  top-level `# heading`.

Strict issues are tagged `[STRICT]` and counted under `strict issues:` (and
`counts.strictIssues` in `--json`); they exit `1` like any other issue. It's off
by default, so existing `ovellum check` behavior is unchanged. The MCP
`ovellum_check` tool also gains a `strict` option.
