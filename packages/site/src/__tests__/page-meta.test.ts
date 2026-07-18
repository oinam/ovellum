import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  countWords,
  formatEditedDate,
  isShallowRepository,
  lastModifiedISO,
  normalizeFrontmatterDate,
  readingMinutes,
} from '../page-meta.js';

describe('normalizeFrontmatterDate', () => {
  it('accepts a YAML Date, an ISO string, and a date-only string', () => {
    expect(normalizeFrontmatterDate(new Date('2026-05-20T00:00:00Z'))).toBe(
      '2026-05-20T00:00:00.000Z',
    );
    expect(normalizeFrontmatterDate('2026-05-20')?.slice(0, 10)).toBe('2026-05-20');
    expect(normalizeFrontmatterDate('2026-05-20T09:30:00Z')?.slice(0, 10)).toBe('2026-05-20');
  });

  it('returns undefined for absent / blank / unparseable values', () => {
    expect(normalizeFrontmatterDate(undefined)).toBeUndefined();
    expect(normalizeFrontmatterDate('')).toBeUndefined();
    expect(normalizeFrontmatterDate('not a date')).toBeUndefined();
    expect(normalizeFrontmatterDate(new Date('nope'))).toBeUndefined();
    expect(normalizeFrontmatterDate(42)).toBeUndefined();
  });
});

const execFileAsync = promisify(execFile);

describe('formatEditedDate', () => {
  const now = '2026-06-14T10:00:00.000Z';

  it("'iso' returns the raw calendar date, no relative words", () => {
    expect(formatEditedDate('2026-06-14T09:00:00Z', now, 'iso')).toBe('2026-06-14');
    expect(formatEditedDate('2026-01-02T00:00:00Z', now, 'iso')).toBe('2026-01-02');
  });

  it("'humanized' says today / yesterday for recent edits", () => {
    expect(formatEditedDate('2026-06-14T01:00:00Z', now, 'humanized')).toBe('today');
    expect(formatEditedDate('2026-06-13T23:00:00Z', now, 'humanized')).toBe('yesterday');
  });

  it("'humanized' falls back to a friendly 'Jun 14, 2026' for older edits", () => {
    expect(formatEditedDate('2026-06-12T00:00:00Z', now, 'humanized')).toBe('Jun 12, 2026');
    expect(formatEditedDate('2025-12-01T00:00:00Z', now, 'humanized')).toBe('Dec 1, 2025');
  });

  it('defaults to humanized when no format is given', () => {
    expect(formatEditedDate('2026-06-14T00:00:00Z', now)).toBe('today');
  });

  it('computes the day boundary in UTC, independent of clock time', () => {
    // Same calendar day, very different times → still "today".
    expect(formatEditedDate('2026-06-14T23:59:00Z', '2026-06-14T00:01:00Z', 'humanized')).toBe(
      'today',
    );
  });
});

describe('countWords', () => {
  it('counts plain prose', () => {
    expect(countWords('one two three four')).toBe(4);
  });

  it('ignores fenced code blocks', () => {
    const md = 'before\n\n```ts\nconst x = 1; const y = 2;\n```\n\nafter';
    expect(countWords(md)).toBe(2);
  });

  it('ignores inline code', () => {
    expect(countWords('use `foo` and `bar` for things')).toBe(4);
  });

  it('keeps link text but drops the URL', () => {
    expect(countWords('see [the docs](https://x.test/very/long) for more')).toBe(5);
  });

  it('keeps image alt text', () => {
    expect(countWords('![A diagram of the system](/img/arch.svg)')).toBe(5);
  });

  it('strips heading punctuation', () => {
    expect(countWords('# Hello world\n\n## Two\n\nbody')).toBe(4);
  });
});

describe('readingMinutes', () => {
  it('returns 0 for empty content', () => {
    expect(readingMinutes(0)).toBe(0);
  });

  it('rounds up and floors at 1 minute', () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(199)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(450)).toBe(3);
  });
});

// These tests prove that `lastModifiedISO` doesn't pass user-supplied path
// strings to a shell. If the implementation regressed to `exec(\`git log ...
// "${path}"\`)`, the assertion below would fail because the side-effect file
// would be created when `git` is invoked. We use a path containing `;`, `$()`,
// and backticks — all of which are no-ops as a literal filename but would
// execute under sh.
describe('lastModifiedISO — command-injection resistance', () => {
  let workDir: string;
  // Canary file the test watches for. The shell-injection payloads below try
  // to create this file via `touch`; if it appears, the implementation has
  // shelled out and is vulnerable. We use a bare basename (no `/`) so the
  // filename containing the payload is also a valid filesystem name.
  let canaryBasename: string;
  let canaryAbs: string;

  beforeEach(() => {
    workDir = mkdtempSync(path.join(tmpdir(), 'ovellum-secure-'));
    canaryBasename = 'PWNED';
    canaryAbs = path.join(workDir, canaryBasename);
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('treats shell metacharacters in the path as literal filename bytes', async () => {
    const evilName = `inject;touch ${canaryBasename};x.md`;
    const evilPath = path.join(workDir, evilName);
    writeFileSync(evilPath, '# hi\n');

    const result = await lastModifiedISO({ absPath: evilPath, cwd: workDir });

    // If the implementation ever shells out, the canary would exist by now.
    expect(existsSync(canaryAbs)).toBe(false);
    // The non-tracked path falls back to fs mtime, which always returns a
    // valid ISO string for an existing file.
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('does not execute commands embedded in $() or backticks', async () => {
    const evilName = `$(touch ${canaryBasename}).md`;
    const evilPath = path.join(workDir, evilName);
    writeFileSync(evilPath, '# hi\n');

    await lastModifiedISO({ absPath: evilPath, cwd: workDir });

    expect(existsSync(canaryAbs)).toBe(false);
  });

  it('reads a real commit timestamp when the file is git-tracked', async () => {
    await execFileAsync('git', ['init', '-q', '-b', 'main'], { cwd: workDir });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: workDir });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: workDir });
    await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: workDir });

    const file = path.join(workDir, 'doc.md');
    writeFileSync(file, '# hello\n');
    await execFileAsync('git', ['add', 'doc.md'], { cwd: workDir });
    await execFileAsync(
      'git',
      ['commit', '-q', '-m', 'initial', '--date', '2026-01-15T10:00:00Z'],
      { cwd: workDir, env: { ...process.env, GIT_COMMITTER_DATE: '2026-01-15T10:00:00Z' } },
    );

    const iso = await lastModifiedISO({ absPath: file, cwd: workDir });
    expect(iso).toMatch(/^2026-01-15T/);
  });

  it('follows renames — a `git mv` does not reset the date to the move commit', async () => {
    const env = { ...process.env, GIT_COMMITTER_DATE: '' };
    await execFileAsync('git', ['init', '-q', '-b', 'main'], { cwd: workDir });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: workDir });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd: workDir });
    await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd: workDir });

    // Create + commit at an old date, then move it (no content change) at a new one.
    writeFileSync(path.join(workDir, 'old.md'), '# hello\n');
    await execFileAsync('git', ['add', 'old.md'], { cwd: workDir });
    await execFileAsync('git', ['commit', '-q', '-m', 'create'], {
      cwd: workDir,
      env: { ...env, GIT_COMMITTER_DATE: '2026-01-15T10:00:00Z' },
    });
    await execFileAsync('git', ['mv', 'old.md', 'new.md'], { cwd: workDir });
    await execFileAsync('git', ['commit', '-q', '-m', 'rename'], {
      cwd: workDir,
      env: { ...env, GIT_COMMITTER_DATE: '2026-06-14T10:00:00Z' },
    });

    // The date is the original content commit, NOT the rename.
    const iso = await lastModifiedISO({ absPath: path.join(workDir, 'new.md'), cwd: workDir });
    expect(iso).toMatch(/^2026-01-15T/);
  });
});

// A shallow clone is the CI footgun behind "everything Edited today": git only
// has the tip commit, so every per-file `git log` returns it. The build uses
// this to warn instead of silently shipping wrong dates.
describe('isShallowRepository', () => {
  let dirs: string[] = [];
  const mk = (): string => {
    const d = mkdtempSync(path.join(tmpdir(), 'ovellum-shallow-'));
    dirs.push(d);
    return d;
  };

  afterEach(async () => {
    for (const d of dirs) await rm(d, { recursive: true, force: true });
    dirs = [];
  });

  const initRepo = async (cwd: string): Promise<void> => {
    await execFileAsync('git', ['init', '-q', '-b', 'main'], { cwd });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd });
    await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd });
  };

  it('returns false for a non-git directory', async () => {
    expect(await isShallowRepository(mk())).toBe(false);
  });

  it('returns false for a full repo, true for a shallow clone of it', async () => {
    const src = mk();
    await initRepo(src);
    for (const n of ['a', 'b', 'c']) {
      writeFileSync(path.join(src, `${n}.md`), `# ${n}\n`);
      await execFileAsync('git', ['add', '.'], { cwd: src });
      await execFileAsync('git', ['commit', '-q', '-m', n], {
        cwd: src,
        env: { ...process.env, GIT_COMMITTER_DATE: '2026-01-15T10:00:00Z' },
      });
    }
    expect(await isShallowRepository(src)).toBe(false);

    const shallow = mk();
    await execFileAsync('git', ['clone', '--depth', '1', '-q', `file://${src}`, shallow]);
    expect(await isShallowRepository(shallow)).toBe(true);
  });
});
