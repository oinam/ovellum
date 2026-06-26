---
'ovellum': minor
---

Landing feature cards can link to a page.

Each `site.landing.features[]` entry now accepts an optional `href`. When set,
the whole card becomes a link — a site-relative path (locale-prefixed
automatically on i18n sites) or an absolute URL (opens in a new tab). Cards
without `href` render exactly as before.
