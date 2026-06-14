---
'ovellum': minor
---

Add an i18n **translation-staleness check** to `ovellum check`. On sites with
two or more `site.locales`, each translated page carries a `sourceHash` in its
frontmatter — a fingerprint of the default-locale page it mirrors (matched by
identical path across the `content/<code>/` folders). `check` recomputes the
source's fingerprint and flags, tagged `[i18n]`, any translation whose source
changed since it was stamped (stale), is missing its hash, or has no matching
source page (orphan). Any of these exits `1`, so CI catches translation drift.

Run `ovellum check --update-translations` to stamp (or re-stamp) every
translation's `sourceHash` to the current source after syncing — it touches only
that one frontmatter line. The fingerprint covers the page body (frontmatter
excluded) with normalized line endings, so reformatting won't trip a false
"stale".
