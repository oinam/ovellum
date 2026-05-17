---
title: Security
description: Threat model, sanitization policy, and the protections Ovellum applies by default.
---

# Security

Ovellum is a build-time tool that turns Markdown into HTML. This page
documents what we defend against, how, and where we explicitly don't.

## Threat model

Three parties interact with an Ovellum-built site:

| Party                  | Trust                              | Notes                                                                                              |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Author**             | trusted                            | Writes `ovellum.config.*` and `.md` content. We trust their source files but defend against typos. |
| **Build environment**  | trusted                            | `ovellum build` runs locally or in CI with the author's permissions.                               |
| **Reader of the site** | untrusted (from the site's PoV)    | Visits the rendered HTML in a browser. We must not let attacker-controlled content reach them.    |

The interesting attacker is the **third-party contributor**: someone
who can submit a PR that adds Markdown to a repo that builds with
Ovellum. A malicious `<script>` tag, an `onclick` handler, or a
`javascript:` href in such a PR must not survive into the rendered HTML
that visitors load after the PR merges.

We do **not** defend against authors who can already run arbitrary code
on the build host. If you control `ovellum.config.ts`, you control the
build — the entire config-load path is power equivalent to running the
file as a Node script.

## HTML sanitization

Every Markdown source runs through
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) before
any output is produced. The pipeline:

```
remark-parse → remark-rehype (allowDangerousHtml)
             → rehype-raw            ← parses literal HTML strings into HAST
             → rehype-sanitize       ← strips dangerous elements/attrs
             → rehype-slug
             → rehype-autolink-headings
             → custom (collect headings + shiki highlight)
             → rehype-stringify
```

### What's stripped

- `<script>`, `<iframe>`, `<object>`, `<embed>`
- `on*` event-handler attributes (`onclick`, `onload`, etc.)
- URL schemes other than the allowlist on `href`, `src`, `cite`,
  `longDesc`. Today the allowlist is `http`, `https`, `irc`, `ircs`,
  `mailto`, `xmpp` for `href`; `http`, `https` for `src` and `cite`.

`data:` URLs are **not** allowed anywhere, including `<img src>` —
because `data:image/svg+xml` can carry an `<svg onload="…">` payload
that browsers execute.

### What's kept

The default schema permits the HTML elements authors actually use:
`<details>`, `<summary>`, `<kbd>`, `<sup>`, `<sub>`, `<mark>`, `<abbr>`,
tables, etc.

### Order matters

Sanitization runs **before** shiki highlighting. Shiki emits inline
`style="…"` attributes that the sanitizer would otherwise strip — by
running shiki second, its generated output stays intact while
author-authored HTML is locked down.

## Shell-injection resistance

Whenever Ovellum invokes an external binary (today: `git` for the
last-modified timestamp on each page), arguments are passed via
`execFile` as an array. We never build a command string and hand it to
a shell.

The practical consequence: a path containing `$(...)`, backticks,
`;cmd`, or any other shell metacharacters is treated as a literal
filename argument to `git`, never interpreted by sh/zsh. Tests in
`@ovellum/site` pin this behaviour by writing fixture files named
`inject;touch PWNED;x.md` and `$(touch PWNED).md` and asserting the
canary never appears.

## URL scheme allowlist in `ovellum check`

Beyond render-time stripping, `ovellum check` flags links whose scheme
is on a deny list (`javascript:`, `vbscript:`, `data:`, `file:`) as
`[SECURITY]` issues so the author notices them in source and removes
them. This is defense in depth: the sanitizer keeps the rendered HTML
safe regardless, but flagging them at lint time means they don't ship
silently stripped.

Detection normalises HTML-numeric entities (`&#x09;` → tab) and
zero-width / BiDi / whitespace characters before matching, so attempts
like `javas&#x09;cript:` or `\tjavascript:` are caught.

See [CLI → `ovellum check`](/reference/cli/#ovellum-check) for the
output format and exit codes.

## What's out of scope today

- **Supply-chain pinning.** `package.json` uses caret ranges (the npm
  default); we don't pin to exact versions. Acceptable for a dev tool
  but worth revisiting once Ovellum is widely installed.
- **Symlink traversal in `input/`.** If an author's content directory
  contains a symlink to `/etc/passwd`, Ovellum will read and
  (depending on the file extension) potentially render its contents.
  The mitigation is to trust the content directory; we don't try to
  detect this today.
- **Prototype pollution from config files.** A malicious config with
  `"__proto__": {…}` could in theory pollute prototypes, but the
  `Object.keys`-based merge in strict mode doesn't write to
  `Object.prototype`. We rely on this behaviour rather than explicitly
  filtering keys.
- **Resource exhaustion from giant Markdown files.** No size limits on
  `.md` inputs. A multi-GB Markdown file would slow the build but not
  compromise the output.

## Reporting

Found a security issue? For anything that could be used to execute
code on a reader's browser, email the maintainer directly (contact in
the project README). For non-exploitable concerns, a public GitHub
issue is fine.
