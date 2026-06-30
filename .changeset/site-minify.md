---
'ovellum': minor
---

CSS/JS minification — `site.minify`. Set `site.minify: true` to minify your own
`.css` / `.js` during the build: files in your content folder and a custom
`site.templateDir`'s `style.css` / `script.js`. The bundled default theme is
already minified and HTML pages aren't touched, so this only affects assets you
supply. A minified output larger than the original is discarded (the original is
kept), and a file that fails to minify is copied as-is with a warning; the build
reports how many assets it minified and the bytes saved.

Minification uses [esbuild](https://esbuild.github.io) as an **optional peer
dependency**, lazy-loaded only when `site.minify` is `true` — install it with
`npm i esbuild`. Default installs stay lean. (HTML-page minification is a
separate future item — esbuild only minifies CSS/JS.)
