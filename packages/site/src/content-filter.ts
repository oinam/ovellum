/**
 * Shared content-exclusion rules for the manual-mode site.
 *
 * One source of truth for "what is NOT site content", used by the build walk,
 * the nav builder, AND `ovellum check`, so the three can never drift (a `check`
 * that walked `node_modules` while `build` skipped it was the original bug).
 *
 * Three layers stack on top of the caller's own `ignoreFolders` (exact dir
 * names) and `_meta.json "hidden"`:
 *   1. Structural skips — `_`-prefixed (meta/partials), dot-prefixed
 *      (`.git`, `.gitignore`, …), and `node_modules`. Never content.
 *   2. Project files that live at the input root when `input: '.'` — the
 *      Ovellum config and package manifests/lockfiles. Never content.
 *   3. User `site.ignoreFiles` globs — per-file/glob excludes for everything
 *      else (e.g. a repo `README.md` you don't want emitted).
 */

const AUTO_EXCLUDED_DIRS = new Set(['node_modules']);
const AUTO_EXCLUDED_FILES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'npm-shrinkwrap.json',
]);

/** Directory names that are never walked as content. */
export function isExcludedDirName(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.') || AUTO_EXCLUDED_DIRS.has(name);
}

/** File names auto-excluded regardless of config — structural + project files. */
export function isAutoExcludedFileName(name: string): boolean {
  if (name.startsWith('_') || name.startsWith('.')) return true; // _meta.json, .gitignore, …
  if (AUTO_EXCLUDED_FILES.has(name)) return true; // manifests / lockfiles
  if (/^ovellum\.config\.(c?[jt]s|mjs|json)$/i.test(name)) return true; // the config itself
  return false;
}

/**
 * Translate a glob to an anchored RegExp. Supports `*` (any run of non-slash
 * chars), `**` (any run including slashes), and `?` (single non-slash char);
 * every other regex metacharacter is escaped. Deliberately small — enough for
 * patterns like `README.md`, `*.txt`, `drafts/**`, and `*.draft.md` at any depth.
 */
function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (c === '*') {
      if (glob.charAt(i + 1) === '*') {
        re += '.*';
        i++;
        if (glob.charAt(i + 1) === '/') i++; // collapse `**/` so it can match zero dirs
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+.()|[]{}'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

/**
 * gitignore-flavoured matching: a pattern without `/` matches the file's
 * basename at any depth (`README.md`, `*.txt`); a pattern with `/` matches the
 * full path relative to the input root (`drafts/notes.md`).
 */
export function matchesIgnoreFiles(
  relPathPosix: string,
  name: string,
  patterns: string[],
): boolean {
  for (const p of patterns) {
    if (!p) continue;
    const target = p.includes('/') ? relPathPosix : name;
    if (globToRegExp(p).test(target)) return true;
  }
  return false;
}

/** A content file is excluded if it's auto-excluded or matches `ignoreFiles`. */
export function isExcludedContentFile(
  relPathPosix: string,
  name: string,
  ignoreFiles: string[] = [],
): boolean {
  return isAutoExcludedFileName(name) || matchesIgnoreFiles(relPathPosix, name, ignoreFiles);
}
