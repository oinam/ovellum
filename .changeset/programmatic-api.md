---
'ovellum': minor
---

Add a programmatic API — drive Ovellum in-process.

You can now import Ovellum as a library instead of shelling out to the CLI:

```ts
import { build, watch } from 'ovellum';

const summary = await build({ cwd: 'docs', out: '../site/public/docs', base: '/docs' });
const watcher = await watch({ cwd: 'docs', onBuild: () => devServer.reload() });
```

- `build(options)` returns the same structured `BuildSummary` the CLI computes.
- `watch(options)` returns a handle with `close()`; rebuilds are incremental in
  auto/hybrid mode.
- `loadConfig(options)` returns the resolved config; `defineConfig` and the
  config / summary types are re-exported.

`import 'ovellum'` is now **side-effect-free** — the CLI is a separate binary, so
importing the package no longer runs it. This makes it clean to wire Ovellum into
a framework dev server, a monorepo task runner, or a custom build step. The
package is ESM-only (`type: module`); use a dynamic `import()` from CommonJS.
