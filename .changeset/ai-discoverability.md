---
'ovellum': minor
---

AI output is now discoverable, not just present: every page's `<head>` links
its raw-Markdown twin via `<link rel="alternate" type="text/markdown">` (when
the `.md` mirror is enabled), and the build emits a default `/robots.txt` —
allow-all, a `Sitemap:` line when `site.baseUrl` is set, and a pointer at
`/llms.txt` — unless you ship your own via `publicDir` (yours always wins).
