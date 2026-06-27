---
'ovellum': minor
---

Custom fonts via config. `site.font` now accepts a `{ body, mono?, source?, label? }` object (alongside the `'sans' | 'serif' | 'inter' | 'geist'` keywords) to use your own self-hosted typeface in the default template — no `headExtra` hacking. The build makes it the default, links your `@font-face` stylesheet, maps `--font-body` (and `--font-mono` when given), and adds it to the reader's Font picker (previewed in its own family) so visitors can still switch to the built-ins. Use `font-display` in your `@font-face` to control FOUT.
