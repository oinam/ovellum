---
'ovellum': minor
---

Humanize the page meta date and tidy two appearance details.

- The last-modified line is relabelled **"Edited"** (from "Updated"), and its
  date is now humanized by default: `today` / `yesterday` for recent edits,
  otherwise a friendly `Jun 14, 2026`. A new **`site.dateFormat`** config
  controls this — `'humanized'` (default) or `'iso'` for the raw `2026-06-14`.
  The machine-readable ISO date always stays in the `<time datetime>` attribute.
- The **search box** gets a subtle background fill so it reads as a distinct
  field against the page/topbar background, in both light and dark.
- The font picker's system option is now labelled **"Sans-Serif (Default)"**
  instead of just "Default", so it's clear what the default is.
