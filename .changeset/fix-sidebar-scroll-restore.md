---
'ovellum': patch
---

Fix the sidebar scroll-restore (shipped in 0.5.0 but inert). It read
`.offsetHeight` off a `getBoundingClientRect()` result (a `DOMRect`, which only
has `.height`), so the scroll offset computed to `NaN` and the sidebar never
moved — long nav menus still snapped back to the top on navigation. Now the
active link is centered in the sidebar viewport on load as intended.
