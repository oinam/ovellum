import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// `execFile` does NOT spawn a shell — the path is passed verbatim as an argv
// entry, so a filename containing `$(...)`, `;`, backticks, etc. is a literal
// argument to `git`, never interpreted by sh/zsh. Same guarantee the site's
// `page-meta` git lookup relies on.
const execFileAsync = promisify(execFile);

/** How many `git log` probes to run at once. Source files are independent, so
 *  we parallelise, but with a cap so a large project doesn't fork hundreds of
 *  git processes at once. */
const CONCURRENCY = 8;

/**
 * Resolve each source file's last real content-change date, for stamping into a
 * generated doc's `updated:` frontmatter.
 *
 * Uses **author date** (`%aI`), not committer date: author date is when the edit
 * was actually written and survives rebases / amends / cherry-picks unchanged,
 * whereas committer date is reset by history rewrites. `--follow
 * --diff-filter=AM` tracks the file across renames and ignores pure moves, so a
 * `git mv` doesn't reset the date — mirroring the site's own date resolution.
 *
 * A file with no resolvable date (untracked, not a git repo, git absent) is
 * simply omitted from the map; the caller then emits no `updated:` for it and
 * the site falls back to its own git/mtime lookup. Never throws.
 *
 * @param cwd Project root — git runs with this as its working directory.
 * @param filePaths Source paths relative to the project root (`DocFile.filePath`).
 */
export async function resolveSourceDates(
  cwd: string,
  filePaths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  // Unique the inputs (a project can list the same file once, but be safe).
  const queue = [...new Set(filePaths)];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor++;
      if (index >= queue.length) return;
      const filePath = queue[index]!;
      const iso = await sourceDateISO(cwd, filePath);
      if (iso) result.set(filePath, iso);
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker);
  await Promise.all(workers);
  return result;
}

async function sourceDateISO(cwd: string, filePath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--follow', '--diff-filter=AM', '-1', '--format=%aI', '--', filePath],
      { cwd, timeout: 2000 },
    );
    const value = stdout.trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}
