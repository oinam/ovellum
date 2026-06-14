---
'ovellum': minor
---

Add **multiple-language (i18n) support** to the manual-mode site builder.

Declare your languages with `site.locales` (and optional `site.defaultLocale`)
and Ovellum publishes the same site in each:

```ts
site: {
  defaultLocale: 'en-US',
  locales: [
    { code: 'en-US', label: 'English' },
    { code: 'ja', label: '日本語' },
  ],
}
```

- **Opt-in, zero breakage** — a single-language site (no `site.locales`) behaves
  exactly as before; no locale folders, no migration.
- **Per-locale content** in `content/<code>/` subtrees, named by BCP 47 tag
  (`en-US`, `ja`, `zh-Hans`). The default locale serves at the **root**
  (`/guide/`); others serve under their code (`/ja/guide/`). Pages map across
  languages by identical relative path.
- **Language picker** in the topbar (a globe dropdown of each language's
  autonym). Switching takes the reader to the same page in that language, or
  falls back to that locale's home when it isn't translated yet — so partial
  translations are fine.
- Each page gets `<html lang>`, `hreflang` alternates (+ `x-default`), and a
  per-locale entry in the sitemap. The reserved `publicDir` stays shared across
  locales.

UI/chrome strings (the appearance-panel labels, "Edited", the landing hero) are
still English for now — translating those is a planned follow-up. See the new
**"Multiple languages (i18n)"** guide.
