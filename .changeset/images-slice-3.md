---
'ovellum': minor
---

Image optimization, rounded out (B9 slice 3). `site.images.maxWidth`
downscales any raster wider than the cap (aspect kept, never enlarges) — the
one-line diet for screenshot-heavy sites; it composes with re-compression and
conversion (resize first, then encode). `site.images.format` now also accepts
`'avif'` alongside `'webp'` — same convert-and-rewrite behavior, smaller
files. And `site.ogImage` now covers the landing page too: the hero title gets
its own 1200×630 social card, not just doc pages.
