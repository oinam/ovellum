---
'ovellum': minor
---

Localize config-driven landing + navigation text for i18n sites. Any
user-facing label or copy string in the config — `topbarNav`/`footerNav`
labels, and the `landing` hero title/subtitle, CTA labels, feature
titles/descriptions, install titles, and trust-strip text — now accepts a
per-locale map (`{ 'en-US': '…', ja: '…' }`) in place of a plain string,
resolved to the current locale (falling back to the default locale). A plain
string still works and shows in every locale, so you only translate the strings
you want to. Combined with the chrome-string localization, an i18n site's
`/ja/` pages can now be fully Japanese end to end.
