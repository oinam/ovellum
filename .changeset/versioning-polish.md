---
'ovellum': minor
---

Versioned docs, finished (B6 slice 2). Non-latest versions now behave the way
readers and crawlers expect: every non-latest page carries an unobtrusive
banner — "This is documentation for **v1**, not the latest version. Switch to
the latest" — linking to the same page in the latest version (localized,
en + ja), plus a `noindex` robots meta, and `sitemap.xml` lists only the
latest version. All automatic from `site.versions`; the latest version and
unversioned sites are byte-identical.

And cutting a version is now one command: **`ovellum snapshot <id>`** copies
the latest content tree into `<input>/<id>/` and prints the `site.versions`
entry to add (it never edits your config — that change stays yours to review).
Works on both versioned projects and first-time migrations.
