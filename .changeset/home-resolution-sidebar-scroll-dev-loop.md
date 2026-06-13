---
'ovellum': minor
---

More manual-mode dogfooding fixes:

- **Home page resolution.** `/` now resolves automatically to `site.home`
  (explicit), else root `index.md`, else a root **`README.md`** — so an
  existing repo README becomes the docs home with no config. The file renders
  at `/` (not `/README/`); opt out by adding `README.md` to `ignoreFiles` or
  pointing `site.home` elsewhere.
- **`ovellum dev`/`watch` rebuild loop fixed.** The watcher no longer watches
  the output dir, `node_modules`, dot-dirs, or `ignoreFolders` — under
  `input: "."` it was rebuilding endlessly (each build wrote `dist/`, which
  re-triggered the watch).
- **Sidebar keeps its place.** On navigation the sidebar now scrolls the active
  link into view instead of resetting to the top (matters with a long nav).
- **Per-folder sidebar collapse.** A folder's `_meta.json "collapse"` overrides
  the global `site.sidebar.collapse` (`false` = always open, `true` = always
  collapsed).
