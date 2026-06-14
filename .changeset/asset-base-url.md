---
'ovellum': minor
---

Add `site.assetBaseUrl` — serve the reserved `publicDir` from a CDN. When set
(e.g. `'https://cdn.example.com/site'`), Ovellum stops copying `publicDir` into
the build and rewrites every reference to a `public/` file in the rendered HTML
to that base, so `/report.pdf` resolves to
`https://cdn.example.com/site/report.pdf`. You keep authoring the same
root-absolute paths — the same idea as Vite's `base` / Next's `assetPrefix`.
Assets co-located with your content are part of the HTML site and are left
untouched; only `publicDir` moves to the CDN. (Query-stringed and `srcset` refs
aren't rewritten — reference those by their final CDN URL.) The "Assets &
downloads" guide and config reference document it.
