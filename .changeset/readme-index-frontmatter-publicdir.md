---
'ovellum': minor
---

README-as-index everywhere, more frontmatter, and a reserved `public/` assets dir.

- **`README.md` is the folder index at every level** (was root-only). A folder
  resolves its page to `index.*` first, then `README.md` — the GitHub norm. To
  keep this consistent, `build` now derives page URLs from the nav, so the
  emitted files always match the sidebar/links.
- **Frontmatter `permalink`** overrides a page's URL (normalised to a
  root-absolute, trailing-slash path); **`tags`** become `<meta name="keywords">`.
  (`title` and `description` were already respected.)
- **`site.publicDir`** (default `'public'`) — a **reserved** static-assets folder
  copied to the **output root**, the SSG convention (Next/Astro/Vite/Hugo):
  `public/favicon.ico` → `/favicon.ico`. Use it for root-served files (favicon,
  `robots.txt`, `CNAME`, OG images) and other static assets. Nothing inside is
  processed (no pages, no sidebar; even a `.md` is copied as-is). Renamable via
  config; static files outside it still pass through keeping their path.

  **Breaking:** previously `content/public/` was copied to `dist/public/`; it now
  copies to the output **root**. Drop the `/public` prefix from any references
  (e.g. `/public/logo.svg` → `/logo.svg`), or set `site.publicDir` to a different
  folder name to keep path-preserving passthrough behaviour for that folder.
