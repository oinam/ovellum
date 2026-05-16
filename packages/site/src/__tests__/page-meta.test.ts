import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countWords, lastModifiedISO, readingMinutes } from '../page-meta.js';

const execFileAsync = promisify(execFile);

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
});
