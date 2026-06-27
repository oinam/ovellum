---
'ovellum': minor
---

Clearer CLI messages and an opt-in dev request log.

- `ovellum dev --verbose` logs each request it serves as `METHOD path → status`
  — handy when debugging routing or 404s.
- `ovellum upgrade` now suggests the manual `npm install -D ovellum@latest` path
  when it can't reach the npm registry.
- The `ovellum dev` "manual mode only" error points you at `ovellum watch` /
  `ovellum build` for auto/hybrid (no more internal tracker reference).
- `ovellum init`'s "config already exists" error prints a relative path.
