---
'ovellum': patch
---

Fix `ovellum check` reporting false broken internal links on i18n sites. It now
validates links **per-locale**: each `content/<code>/` subtree builds its own
locale-prefixed nav, and links are checked against the union of all locales'
URLs — so locale-prefixed (`/ja/…`), cross-locale (`/docs/…` to the default
locale), and relative links all resolve correctly. Single-language sites are
unaffected.
