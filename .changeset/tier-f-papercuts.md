---
'ovellum': patch
---

Three long-tracked paper-cuts from the audit list: orphan archive files no
longer overwrite each other when the same anchor is orphaned twice on the same
day (a `-2`/`-3` counter suffix keeps every archived block); the dev server's
pretty-URL fallback no longer 500s when a watched build deletes a file
mid-request (stat races are treated as 404); and `--verbose` now reports when
the update notifier fell back to default settings because the project config
could not be loaded.
