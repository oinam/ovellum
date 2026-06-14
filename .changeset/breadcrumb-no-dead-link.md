---
'ovellum': patch
---

Fix: a breadcrumb crumb for a section folder with no index page now renders as
plain text instead of a dead link. Previously "Docs › Guides › Page" linked the
"Guides" crumb to `/docs/guides/`, which isn't generated when the folder has no
`index.md`/`README.md` — a 404. Real (linkable) section crumbs are unaffected.
