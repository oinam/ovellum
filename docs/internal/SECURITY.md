# Ovellum - Security model

Last updated: 2026-05-16.

This file documents the threat model, the policies that follow from it, and
the concrete defenses in code. It is **internal**; the user-facing security
contract should be summarised separately when there is one to write.

---

## 1. Threat model

Ovellum is a build-time tool. Three parties interact with the output:

| Party                    | Trust                            | Notes                                                                                              |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Author**               | trusted                          | Writes `ovellum.config.*` and `.md` content. We trust their source files but defend against typos. |
| **Build environment**    | trusted                          | `ovellum build` runs locally or in CI with the author's permissions.                               |
| **Reader of the site**   | untrusted (from the site's PoV)  | Visits the rendered HTML in a browser. We must not let attacker-controlled content reach them.    |

The interesting attacker model is the **third-party contributor** — someone
who can submit a PR that adds Markdown to a repo built by Ovellum but whose
content shouldn't be able to execute JavaScript for everyone visiting the
site after the PR merges. Concretely: a malicious `<script>` tag, an
`onclick` handler, or a `javascript:` href in a docs PR must not survive
to the rendered HTML.

We do **not** defend against authors who can already run arbitrary code on
the build host. If you control `ovellum.config.ts`, you control the build.

---

## 2. Policies

### 2.1 No shell interpolation

Any time Ovellum invokes an external binary (today: `git` for last-modified
timestamps), arguments are passed via `execFile` as an array. We never
build a command string and hand it to `exec` / a shell.

The relevant code is [`packages/site/src/page-meta.ts`](../../packages/site/src/page-meta.ts).
A test in `src/__tests__/page-meta.test.ts` proves a filename containing
shell metacharacters (`;touch PWNED;`, `$(touch PWNED)`) does not run a
subcommand.

### 2.2 HTML sanitization

`renderMarkdown` runs every Markdown source through `rehype-sanitize`
before any output is produced. The pipeline is:

```
remark-parse → remark-rehype (allowDangerousHtml)
             → rehype-raw            ← parses literal HTML strings into HAST
             → rehype-sanitize       ← strips dangerous elements/attrs
             → rehype-slug
             → rehype-autolink-headings
             → custom (collect headings + shiki highlight)
             → rehype-stringify
```

Things `rehype-sanitize` strips:

- `<script>`, `<iframe>`, `<object>`, `<embed>`
- `on*` event-handler attributes
- URL schemes other than the allowlist on `href`, `src`, `cite`, `longDesc`
  (today: `http`, `https`, `irc`, `ircs`, `mailto`, `xmpp` for `href`;
  `http`, `https` for `src` and `cite`)

`data:` URLs are **not** allowed anywhere, including `<img src>` — because
`data:image/svg+xml` can carry an `<svg onload="…">` payload that browsers
execute.

Sanitization runs **before** shiki highlighting on purpose: shiki emits
inline `style="…"` attributes that the sanitizer would otherwise strip.
Since shiki's output is generated, not author-controlled, leaving it
outside the sanitization path is safe.

Tests pinning this policy live in
[`packages/site/src/__tests__/markdown.test.ts`](../../packages/site/src/__tests__/markdown.test.ts).

### 2.3 URL scheme allowlist in `ovellum check`

In addition to runtime stripping by `rehype-sanitize`, the `ovellum check`
command flags links whose scheme is on a deny list (`javascript:`,
`vbscript:`, `data:`, `file:`) as `[SECURITY]` issues so the author
notices them in source and removes them. This is defense in depth: the
sanitizer keeps the rendered HTML safe regardless, but we want the
author to learn about the link rather than ship it silently stripped.

Detection normalises HTML-numeric entities and zero-width / BiDi /
whitespace characters before matching, so attempts like
`javas&#x09;cript:` or `\tjavascript:` are caught.

Logic + tests:
[`packages/cli/src/commands/check-utils.ts`](../../packages/cli/src/commands/check-utils.ts),
[`packages/cli/src/__tests__/check-utils.test.ts`](../../packages/cli/src/__tests__/check-utils.test.ts).

---

## 3. Out of scope (today)

- **Supply-chain pinning.** `package.json` uses caret ranges; we don't pin
  to exact versions. Acceptable for a dev tool but should be revisited if
  Ovellum starts being installed widely.
- **Symlink traversal in `input/`.** If an author's content directory
  contains a symlink to `/etc/passwd`, Ovellum will read and (depending on
  the file extension) potentially render its contents. The mitigation is
  to trust the content directory; we don't try to detect this today.
- **Prototype pollution from `ovellum.config.json`.** A malicious config
  with `"__proto__": {…}` could in theory pollute, but Object.keys-based
  merging in strict mode doesn't write to `Object.prototype`. We rely on
  this behaviour rather than explicitly filtering keys.
- **Resource exhaustion from giant Markdown files.** No size limits on
  `.md` inputs. A 10 GB Markdown file would slow the build but not
  compromise the output.

---

## 4. Reporting

If you find a security issue, file an issue on the public tracker
**only** for non-exploitable concerns. For anything that could be used to
execute code on a reader's browser, email the maintainer directly (see
`README.md`).
