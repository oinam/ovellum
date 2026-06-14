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

- `<script>`, `<object>`, `<embed>`
- `<iframe>` from any host **other than** the video-embed allowlist
  (see "What's kept" below) — and every iframe with a relative or
  non-`http(s)` `src`
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

Ovellum also allows native media players — **`<video>`, `<audio>`, and their
`<source>`/`<track>` children** — so you can embed an mp4/webm/mp3 inline (see
[Assets & downloads](/docs/guides/assets/)). Only presentational/playback
attributes are kept (`controls`, `width`, `height`, `poster`, `preload`,
`loop`, `muted`, `autoplay`, `playsinline`); `src`/`poster` go through the same
`http(s)`-only scheme check, and event handlers are still stripped — so a media
embed can't carry script.

For **video embeds**, `<iframe>` is allowed — but narrowed twice. The sanitizer
keeps it with a fixed attribute set (`src`, `title`, `width`, `height`,
`loading`, `referrerpolicy`, `allow`, `allowfullscreen`), then a second pass
**removes any iframe whose `src` host isn't a known player** — today
`youtube.com`, `youtube-nocookie.com`, and `vimeo.com` (with their `www.`/
`player.` subdomains). Survivors are hardened automatically: `loading="lazy"`,
`referrerpolicy="strict-origin-when-cross-origin"`, and a responsive wrapper. A
relative or arbitrary-host iframe is dropped wholesale, so an embed can't point
at an attacker's page.

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
`@ovellum/site` pin this behavior by writing fixture files named
`inject;touch PWNED;x.md` and `$(touch PWNED).md` and asserting the
canary never appears.

## URL scheme allowlist in `ovellum check`

Beyond render-time stripping, `ovellum check` flags links whose scheme
is on a deny list (`javascript:`, `vbscript:`, `data:`, `file:`) as
`[SECURITY]` issues so the author notices them in source and removes
them. This is defense in depth: the sanitizer keeps the rendered HTML
safe regardless, but flagging them at lint time means they don't ship
silently stripped.

Detection normalizes HTML-numeric entities (`&#x09;` → tab) and
zero-width / BiDi / whitespace characters before matching, so attempts
like `javas&#x09;cript:` or `\tjavascript:` are caught.

See [CLI → `ovellum check`](/docs/reference/cli/#ovellum-check) for the
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
  `Object.prototype`. We rely on this behavior rather than explicitly
  filtering keys.
- **Resource exhaustion from giant Markdown files.** No size limits on
  `.md` inputs. A multi-GB Markdown file would slow the build but not
  compromise the output.

## Reporting

Found a security issue? For anything that could be used to execute
code on a reader's browser, email the maintainer directly (contact in
the project README). For non-exploitable concerns, a public GitHub
issue is fine.
