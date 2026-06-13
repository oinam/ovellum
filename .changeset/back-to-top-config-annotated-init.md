---
'ovellum': minor
---

Configurable back-to-top, and a fully-commented config from `ovellum init`.

- **`site.backToTop`** — `{ enabled, threshold }`, default `{ enabled: true,
  threshold: 360 }` (was a hardcoded 600px). Lower the threshold so the button
  appears sooner on short-page sites, or set `enabled: false` to remove it.
- **`ovellum init` now scaffolds a fully-annotated `ovellum.config.ts`** (was a
  minimal `.json`): every option is present — the ones you chose are set, the
  rest are commented with their defaults and allowed values — so you can tinker
  entirely in that file without opening the docs. It uses
  `import type { OvellumUserConfig } from 'ovellum'` + `satisfies` (erased at
  load, so no runtime dependency). The existing-config guard now recognises any
  `ovellum.config.{ts,js,mjs,cjs,json}`.
