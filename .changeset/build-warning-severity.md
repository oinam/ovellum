---
'ovellum': minor
---

Build-output severity levels. Build diagnostics now carry a `severity` —
`'warning'` for real problems to act on (orphaned content, an asset skipped for
safety, an unparseable `updated:` date) and `'info'` for benign notes about what
the build did (drafts excluded, `sitemap.xml` skipped because `site.baseUrl` is
unset). The CLI prints real problems first as `warning:` / `info:` lines, and
the summary counts them separately (`warnings:` vs `notes:`), so a genuine
problem is no longer buried under routine notes.

`--json` (and the programmatic `BuildSummary.warnings`) now expose each entry as
`{ message, severity }` instead of a bare string — branch on
`severity === 'warning'` to fail CI only on real problems. The new `BuildWarning`
/ `BuildWarningSeverity` types are exported from the `ovellum` package.
