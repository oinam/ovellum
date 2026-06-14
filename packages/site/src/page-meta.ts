import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import type { OvellumDateFormat } from '@ovellum/core';

// `execFile` does NOT spawn a shell — args are passed verbatim. This is the
// security-critical difference vs. `exec`: a path containing `$(...)`, `;`,
// backticks, etc. is treated as a literal filename argument to `git`, never
// interpreted by sh/zsh.
const execFileAsync = promisify(execFile);

const WORDS_PER_MINUTE = 200;

/**
 * Count visible-prose words in a Markdown source. Strips fenced code blocks,
 * inline code, link / image syntax, and frontmatter delimiters before counting
 * so the reading-time estimate reflects what a reader actually reads.
 *
 * Conservative on purpose — it isn't trying to be a perfect linguist; it just
 * needs to be stable and roughly correct.
 */
export function countWords(markdown: string): number {
  const stripped = markdown
    // Fenced code blocks (``` … ```)
    .replace(/```[\s\S]*?```/g, ' ')
    // Indented code blocks (4-space leading)
    .replace(/^( {4}|\t).*$/gm, ' ')
    // Inline code (`foo`)
    .replace(/`[^`\n]*`/g, ' ')
    // Image markup keeps the alt text as words; just strip the URL part.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Link markup keeps the link text.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Heading / list / blockquote punctuation
    .replace(/^[#>\-*+]+\s+/gm, '');
  // Words = runs of non-whitespace.
  const matches = stripped.match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * Estimate reading time in whole minutes, rounded up. Always at least 1.
 */
export function readingMinutes(words: number): number {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export interface LastModifiedInput {
  /** Absolute path of the source file. */
  absPath: string;
  /** Project root — git commands run with this as cwd. */
  cwd: string;
}

/**
 * Resolve a page's last-modified timestamp. Prefers `git log -1 --format=%cI`
 * because mtime is unreliable in CI (every checkout sets every file to "now");
 * falls back to filesystem mtime when:
 *   - git isn't available
 *   - the directory isn't a git repo
 *   - the file isn't tracked yet
 *
 * Returns an ISO-8601 string, or `undefined` if neither source produced a value.
 */
export async function lastModifiedISO(input: LastModifiedInput): Promise<string | undefined> {
  const gitTime = await tryGitLog(input);
  if (gitTime) return gitTime;
  try {
    const s = await stat(input.absPath);
    return s.mtime.toISOString();
  } catch {
    return undefined;
  }
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Format a last-modified timestamp for the page "Edited" line.
 *
 * - `'iso'`       → the raw calendar date, `2026-06-14`.
 * - `'humanized'` → `today` / `yesterday` (relative to `nowISO`, the build
 *   time) for very recent edits, otherwise a friendly `Jun 14, 2026`.
 *
 * Both inputs are ISO-8601 strings; only their date portions matter, and the
 * day difference is computed in UTC so a machine's local timezone can't nudge
 * an edit across the today/yesterday boundary. Anything unparseable falls back
 * to the raw `YYYY-MM-DD`, so the line is always *something* sensible.
 */
export function formatEditedDate(
  lastModifiedISO: string,
  nowISO: string,
  format: OvellumDateFormat = 'humanized',
): string {
  const iso = lastModifiedISO.slice(0, 10);
  if (format === 'iso') return iso;

  const then = Date.parse(`${iso}T00:00:00Z`);
  const now = Date.parse(`${nowISO.slice(0, 10)}T00:00:00Z`);
  if (!Number.isNaN(then) && !Number.isNaN(now)) {
    const days = Math.round((now - then) / 86_400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
  }

  const [y, m, d] = iso.split('-').map(Number);
  if (y && m && d && m >= 1 && m <= 12) {
    return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
  }
  return iso;
}

async function tryGitLog(input: LastModifiedInput): Promise<string | undefined> {
  try {
    // `--follow` tracks the file across renames, and `--diff-filter=AM` keeps
    // only commits that Added or Modified its *content* — pure renames (R, e.g.
    // a `git mv` into a new folder) are skipped. So moving a file doesn't reset
    // its "Edited" date; it reflects the last real content change. (The first
    // arg after `log` is `--follow`, which requires exactly one pathspec — we
    // always pass one.)
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--follow', '--diff-filter=AM', '-1', '--format=%cI', '--', input.absPath],
      { cwd: input.cwd, timeout: 2000 },
    );
    const value = stdout.trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
