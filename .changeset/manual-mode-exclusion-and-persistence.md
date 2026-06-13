---
'ovellum': minor
---

Manual-mode fixes from dogfooding an `input: "."` site: consistent file/folder
exclusion across `build` and `check`, and a theme-persistence fix.

- **`check` now honours the same exclusions as `build`.** Previously `ovellum
  check` walked `node_modules` and reported bogus "broken links" inside
  dependency READMEs. Exclusion logic is now centralised (`content-filter.ts`)
  and shared by `build`, the nav builder, and `check`.
- **`site.ignoreFiles` (globs)** — exclude individual files (Markdown pages and
  passthrough assets), e.g. `["README.md", "drafts/**"]`. Supports `*`, `**`,
  `?` with gitignore-style basename-vs-path matching.
- **Auto-excludes for `input: "."`** — dotfiles, `node_modules`, package
  manifests/lockfiles, the `ovellum.config.*`, and the **output dir itself**
  are always skipped, so project files no longer leak into the build and the
  output dir can't recurse into itself on rebuild. No config needed.
- **Theme persistence:** picking the default ("Ovellum") palette now persists
  across navigation. It was stored as "no override", which reverted to a
  configured non-default `site.palette` (e.g. `"eink"`) on the next page.
