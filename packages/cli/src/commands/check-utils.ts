/**
 * URL schemes that have no legitimate use inside a documentation site and
 * are common XSS vectors. We surface these as `[SECURITY]` issues in
 * `ovellum check` even though `renderMarkdown` already strips them at render
 * time — defense in depth, and authors should learn about the link so they
 * can remove it from source.
 *
 * `file:` is included because it can probe local files when the site is
 * opened via `file://` in a desktop context (e.g. an Electron-wrapped docs
 * viewer). Not strictly XSS but still surprising.
 */
const UNSAFE_SCHEMES = ['javascript', 'vbscript', 'data', 'file'] as const;

/**
 * Strip ASCII C0 controls, space, and the zero-width / BiDi / BOM
 * characters a browser would silently ignore between scheme bytes.
 *
 * Built via `new RegExp()` on purpose: a regex literal containing the
 * U+0000–U+0020 range trips eslint's `no-control-regex` and
 * `no-irregular-whitespace`, both of which exist for good reasons in
 * other contexts. Spelling the ranges out in a normal string keeps
 * the source linter-clean while producing exactly the same regex at
 * runtime.
 *
 *   U+0000–U+0020   NUL through SPACE
 *   U+200B–U+200D   ZWSP / ZWNJ / ZWJ
 *   U+200E–U+200F   LTR / RTL marks
 *   U+202F          NARROW NO-BREAK SPACE
 *   U+FEFF          BOM / ZWNBSP
 */
const STRIP_CONTROLS = new RegExp(
  '[' +
    '\\u0000-\\u0020' +
    '\\u200B-\\u200D' +
    '\\u200E-\\u200F' +
    '\\u202F' +
    '\\uFEFF' +
    ']',
  'g',
);

/**
 * Return the lowercased scheme name if `target` uses one we consider unsafe;
 * otherwise `undefined`. Leading whitespace and HTML-numeric-entity-decoded
 * characters are normalized first so attempts like `\tjavascript:` or
 * `javas&#x09;cript:` don't slip through.
 */
export function detectUnsafeScheme(target: string): string | undefined {
  if (!target) return undefined;
  // Order matters: decode entities FIRST, then strip controls. If we stripped
  // controls first, `javas&#x09;cript:` would still have an entity-encoded tab
  // hiding between the letters.
  const normalised = target
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
    .replace(STRIP_CONTROLS, '')
    .toLowerCase();
  const match = normalised.match(/^([a-z][a-z0-9+.-]*):/);
  if (!match || !match[1]) return undefined;
  const scheme = match[1];
  return (UNSAFE_SCHEMES as readonly string[]).includes(scheme) ? scheme : undefined;
}
