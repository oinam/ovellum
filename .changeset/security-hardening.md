---
'ovellum': patch
---

Security hardening (defense-in-depth; none were exploitable).

- **Upgrade spawn** — `ovellum upgrade` now runs the package-manager command as
  an argv array **without a shell** on macOS/Linux (the command was already
  built from a fixed allowlist; this removes the shell entirely so a future
  refactor can't reintroduce injection). Windows keeps a shell because its
  `.cmd` shims require one.
- **Dev/serve server** — `resolveFilePath` now resolves symlinks and re-verifies
  the result stays under the served root (closes a symlink escape on top of the
  existing `..` containment check). Added request/headers timeouts; binding
  stays localhost-only by default.
- **Site build** — passthrough asset copy skips any path containing `..` or a
  symlink that resolves outside the content directory, with a warning.
- **`site.headExtra`** — documented as a trust boundary (it's injected verbatim
  by design): admin-only, never derived from untrusted input. Strengthened the
  type JSDoc and the security reference page.
- **`ovellum init`** — validates prompted content/output directories, rejecting
  absolute paths and `..` segments.
- **Update check** — the version cache is written with `0o600`; the registry
  fetch uses `redirect: 'error'` and bails on an unexpectedly large response.
