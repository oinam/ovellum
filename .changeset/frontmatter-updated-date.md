---
'ovellum': minor
---

Add a frontmatter **`updated:`** date override for the page "Edited" line. Set
it (e.g. `updated: 2026-05-20`) to pin the displayed date explicitly, instead of
relying on git history or filesystem mtime — useful when you want the date to
reflect a meaningful edit rather than git mechanics (a move, a bulk reformat, a
fresh checkout). Resolution order is now: frontmatter `updated` → git
(`git log --follow --diff-filter=AM`) → filesystem mtime. An unparseable
`updated` value warns and falls back to git.
