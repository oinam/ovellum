---
'ovellum': patch
---

Fix: the "Edited" date now follows file renames and ignores pure moves, so a
`git mv` no longer resets every page to "Edited today". The last-modified
lookup changed from `git log -1` to `git log --follow --diff-filter=AM`, which
tracks a file across renames and counts only commits that changed its content.
(Symptom: after reorganizing content — e.g. moving everything into a locale
folder for i18n — every page read "Edited today" even when unchanged.)
