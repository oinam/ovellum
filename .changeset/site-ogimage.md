---
'ovellum': minor
---

OpenGraph social cards — `site.ogImage`. Set `site.ogImage: true` (or a
`{ background, foreground }` object for colors) to generate a 1200×630
social-share image per page — its title and your site name on a flat
background — and emit `og:image` / `twitter:image` (plus `og:title`, `og:url`,
and `twitter:card`) meta. Cards are written to `og/<slug>.png`; drafts and the
404 page are excluded. Requires `site.baseUrl` (social tags are absolute URLs) —
set without it, the build warns and generates nothing. Uses the optional `sharp`
peer dependency.
