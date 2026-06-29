---
'ovellum': minor
---

Theme inheritance, slice 2 — `site.appearance`. A new `site.appearance` config
lets the docs **follow a host project's light/dark switch** instead of carrying
their own. `appearance: 'inherit'` removes Ovellum's Mode toggle from the
appearance panel, stops persisting its own choice, and resolves light/dark from
`prefers-color-scheme` — which an OS-driven host already follows. For a host
whose toggle is a JS choice in same-origin `localStorage` (next-themes, a
Tailwind `class` strategy), use the object form
`{ mode: 'inherit', storageKey: 'theme', darkValue?, lightValue? }`: Ovellum
reads that key on load and live-updates on cross-tab `storage` events. Pairs
with `site.css`, which inherits the colors — `appearance` decides which mode is
active. Unset (`'control'`) keeps today's behavior with byte-identical output.
