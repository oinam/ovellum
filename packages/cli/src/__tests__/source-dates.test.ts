import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveSourceDates } from '../dev/source-dates.js';

const execFileAsync = promisify(execFile);

describe('resolveSourceDates', () => {
  let workDir: string;

  const initRepo = async (cwd: string): Promise<void> => {
    await execFileAsync('git', ['init', '-q', '-b', 'main'], { cwd });
    await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd });
    await execFileAsync('git', ['config', 'user.name', 'Test'], { cwd });
    await execFileAsync('git', ['config', 'commit.gpgsign', 'false'], { cwd });
  };

  const commit = async (cwd: string, message: string, authorDate: string): Promise<void> => {
    await execFileAsync('git', ['add', '-A'], { cwd });
    await execFileAsync('git', ['commit', '-q', '-m', message, '--date', authorDate], {
      cwd,
      // Keep author and committer date distinct so the test proves we read the
      // AUTHOR date (%aI), which is rebase-proof, not the committer date.
      env: { ...process.env, GIT_COMMITTER_DATE: '2026-12-31T00:00:00Z' },
    });
  };

  beforeEach(async () => {
    workDir = mkdtempSync(path.join(tmpdir(), 'ovellum-srcdate-'));
    await initRepo(workDir);
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('returns the author date of each tracked source file', async () => {
    writeFileSync(path.join(workDir, 'a.ts'), 'export const a = 1;\n');
    await commit(workDir, 'add a', '2026-02-10T09:00:00Z');
    writeFileSync(path.join(workDir, 'b.ts'), 'export const b = 2;\n');
    await commit(workDir, 'add b', '2026-04-20T09:00:00Z');

    const dates = await resolveSourceDates(workDir, ['a.ts', 'b.ts']);
    expect(dates.get('a.ts')?.slice(0, 10)).toBe('2026-02-10');
    // Author date, not the 2026-12-31 committer date.
    expect(dates.get('b.ts')?.slice(0, 10)).toBe('2026-04-20');
  });

  it('follows renames — a move does not reset the date to the move commit', async () => {
    writeFileSync(path.join(workDir, 'old.ts'), 'export const x = 1;\n');
    await commit(workDir, 'create', '2026-02-10T09:00:00Z');
    await execFileAsync('git', ['mv', 'old.ts', 'new.ts'], { cwd: workDir });
    await commit(workDir, 'rename', '2026-08-01T09:00:00Z');

    const dates = await resolveSourceDates(workDir, ['new.ts']);
    expect(dates.get('new.ts')?.slice(0, 10)).toBe('2026-02-10');
  });

  it('omits files that are untracked or otherwise unresolvable', async () => {
    writeFileSync(path.join(workDir, 'tracked.ts'), 'export const t = 1;\n');
    await commit(workDir, 'add tracked', '2026-02-10T09:00:00Z');
    writeFileSync(path.join(workDir, 'untracked.ts'), 'export const u = 1;\n');

    const dates = await resolveSourceDates(workDir, ['tracked.ts', 'untracked.ts', 'missing.ts']);
    expect(dates.has('tracked.ts')).toBe(true);
    expect(dates.has('untracked.ts')).toBe(false);
    expect(dates.has('missing.ts')).toBe(false);
  });

  it('never throws outside a git repo — returns an empty map', async () => {
    const nonRepo = mkdtempSync(path.join(tmpdir(), 'ovellum-nonrepo-'));
    try {
      const dates = await resolveSourceDates(nonRepo, ['whatever.ts']);
      expect(dates.size).toBe(0);
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});
