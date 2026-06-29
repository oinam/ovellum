---
'ovellum': minor
---

Bring your own template directory — `site.templateDir` (B1 slice 3). Point it at
a directory whose assets replace the bundled theme's, per file with fallback:
`style.css` → `/assets/ovellum.css`, `script.js` → `/assets/ovellum.js`, and a
`fonts/` folder → `/assets/fonts/`. Provide only some and the rest fall back to
the default, so you can take over just the CSS or just the client script. This
gives full control of the styling/behavior layer without forking the package.

The page HTML is generated in code, so `templateDir` overrides the CSS/JS layer
(your `style.css` targets the same `ov-*` class names), not the markup — for
color/font tweaks rather than a ground-up rewrite, prefer `site.css` or
`palette: 'bare'`. This completes the plugin/extension API (B1): lifecycle hooks,
markdown plugins, and template overrides.
