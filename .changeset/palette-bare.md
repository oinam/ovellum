---
'ovellum': minor
---

Theme inheritance, slice 3 — `palette: 'bare'`. A new `site.palette` value ships
**no baked palette**: Ovellum's color and `--font-body` tokens are emitted as
`var(--ov-host-*, <Ovellum default>)`, so a host stylesheet (via `site.css`)
that defines the `--ov-host-*` names becomes the sole source of color — and
defining none leaves the default look intact (light and dark). The published
surface is a small fixed set: `--ov-host-bg`, `--ov-host-surface`,
`--ov-host-fg`, `--ov-host-fg-muted`, `--ov-host-border`(`-strong`),
`--ov-host-primary`(`-fg`/`-hover`), `--ov-host-accent`(`-fg`/`-hover`), and
`--ov-host-font-body`; derived tokens (links, callouts, border tints) follow
automatically. The Theme picker is dropped in bare mode. This is the cleanest
"drop into a host app and match" path, and pairs with `appearance: 'inherit'`
(host owns light/dark) for full host ownership of the look.
