---
'ovellum': minor
---

Fix "Edited today" on every page after a deploy. Page dates are read from
`git log`, but a shallow CI checkout (`actions/checkout`'s default
`fetch-depth: 1`) leaves git with only the tip commit, so every page's date
collapsed onto the deploy commit. The build now detects a shallow git clone and
emits a warning pointing at the fix (`fetch-depth: 0`, or pin dates with an
`updated:` frontmatter field / disable `pageMeta.lastModified`), so this can't
regress silently. The deploy guide's sample workflow now sets `fetch-depth: 0`
and explains why.
