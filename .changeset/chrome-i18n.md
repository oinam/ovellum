---
'ovellum': minor
---

Localize the static-site template's **UI chrome** for i18n sites. Every
hardcoded English string the template renders — "On this page", the "Edited"
line and its dates, "min read", the appearance-panel labels, prev/next, the 404
page, back-to-top, breadcrumbs, the draft ribbon, nav aria-labels, and the
copy-code button — now resolves through a per-locale string table. Built-in
translations ship for English and Japanese; any other locale falls back to
English per string, and you can override or add any string via
`site.locales[].strings`. Dates render with `Intl.DateTimeFormat` for the
locale, and right-to-left languages get `<html dir="rtl">`.

Single-language sites are unaffected — output is byte-for-byte identical (no
`dir` attribute, no injected strings, English chrome throughout).
