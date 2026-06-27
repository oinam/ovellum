---
'ovellum': minor
---

Composable landing pages. `site.landing.sections` takes an ordered array of typed blocks — `hero`, `install`, `features`, `trust`, `scene`, `prose`, and `custom-html` — so you can arrange the landing in any order, repeat blocks, and drop in free-form prose or raw HTML wherever you like. The existing flat config (`hero`, `features`, `install`, `trustStrip`) stays the data source for those block types and the default order, so it doubles as shorthand: leave `sections` unset and nothing changes. `prose` renders inline `html` or the `_landing.md` body; `custom-html` injects an author-trusted raw section.
