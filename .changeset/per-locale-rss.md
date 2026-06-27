---
'ovellum': minor
---

Per-locale RSS feeds. On a multi-language site each locale now gets its own feed — `/feed.xml` for the default language and `/<code>/feed.xml` for the rest — scoped to that locale's pages, with the channel and self links prefixed accordingly. The sitemap stays a single combined file, and single-language sites are unchanged. Requires `site.baseUrl`.
