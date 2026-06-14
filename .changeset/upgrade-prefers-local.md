---
'ovellum': patch
---

`ovellum upgrade` now prefers the project's local dependency. When the current
directory's `package.json` declares `ovellum` (in `dependencies`,
`devDependencies`, or `optionalDependencies`) — or it's already in
`node_modules` — the upgrade targets the project (`… add -D ovellum@latest`)
even when you invoke the global binary, instead of silently bumping the
unrelated global install. For a local upgrade the package manager is taken from
the project's lockfile (`pnpm-lock.yaml`, `yarn.lock`, …), so a pnpm/yarn
project upgrades with its own manager even from a bare global binary. The
"Update available" line now names which install it will touch.
