---
'ovellum': minor
---

Versioned docs. Set `site.versions: [{ id, label?, latest? }]` to publish multiple versions of your docs side by side — each version is a `content/<id>/` subtree, the one marked `latest` (or the first) serves at the root and the rest under `/<id>/`, and a version picker appears in the topbar that keeps readers on the same page when they switch. Versions compose with i18n (`content/<id>/<locale>/`), and sitemap, RSS, and `llms.txt` are emitted per version. Unversioned sites are unchanged — no `content/<id>/` folder needed.
