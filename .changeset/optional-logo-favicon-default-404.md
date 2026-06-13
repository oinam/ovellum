---
'ovellum': minor
---

Optional brand logo, configurable favicon, and an always-generated 404.

- **`site.logo` is now optional and no longer hardcoded.** Earlier builds
  embedded Ovellum's own brand mark into every site's topbar; that's gone.
  Set `site.logo` to a path/URL for a brand mark (rendered as a theme-flipping
  monochrome silhouette via a CSS mask) — leave it unset and the site title
  stands alone.
- **`site.favicon`** — a `<link rel="icon">` is emitted on every page,
  defaulting to a root `/favicon.ico` (drop one at your project root and it
  works) and overridable to any path/URL. basePath-aware.
- **Every build now ships a 404 page.** If you don't write `content/404.md`,
  Ovellum generates a default "Page not found" that matches the template. Both
  `dist/404/index.html` and a root `dist/404.html` are emitted (the default 404
  is infrastructure, so it isn't counted in the build's page total).
