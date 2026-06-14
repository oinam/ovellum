import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

// Path to the locally-built CLI. Tests run *after* tsup has produced
// dist/index.js (turbo's task graph ensures `build` runs before `test`).
const CLI = path.resolve(__dirname, '..', '..', 'dist', 'index.js');

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn the locally-built CLI in a clean working directory. We capture stdout,
 * stderr, and the exit code so individual assertions can stay focused.
 *
 * `expectFail`: pass `true` when the command is expected to exit non-zero.
 * Without this, execFile rejects the promise on non-zero exit and the test
 * blows up before we can inspect anything.
 */
async function runCli(
  args: string[],
  options: { cwd: string; expectFail?: boolean } = { cwd: process.cwd() },
): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
      cwd: options.cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
    };
    if (!options.expectFail) throw err;
    return {
      code: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    };
  }
}

describe('ovellum init', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-init-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('--yes scaffolds config + starter content + .gitignore', async () => {
    const { code, stdout } = await runCli(['init', '--yes'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toContain('ovellum project initialized');
    expect(existsSync(path.join(dir, 'ovellum.config.ts'))).toBe(true);
    expect(existsSync(path.join(dir, 'content', 'index.md'))).toBe(true);
    expect(existsSync(path.join(dir, '.gitignore'))).toBe(true);

    // The generated config is annotated TypeScript: active options set, the
    // rest commented with defaults so users can tinker in-file.
    const cfg = await readFile(path.join(dir, 'ovellum.config.ts'), 'utf8');
    expect(cfg).toContain("mode: 'manual'");
    expect(cfg).toContain('satisfies OvellumUserConfig');
    expect(cfg).toContain('// backToTop:'); // a commented, documented option
    expect(cfg).toContain('// search:');

    const gi = await readFile(path.join(dir, '.gitignore'), 'utf8');
    expect(gi).toContain('dist/');
    expect(gi).toContain('.orphans/');
  });

  it('refuses to clobber an existing config (exit 2)', async () => {
    await runCli(['init', '--yes'], { cwd: dir });
    const { code, stderr } = await runCli(['init', '--yes'], {
      cwd: dir,
      expectFail: true,
    });
    expect(code).toBe(2);
    expect(stderr).toContain('already exists');
  });

  it('--force overrides the refuse-to-clobber guard', async () => {
    await runCli(['init', '--yes'], { cwd: dir });
    const { code } = await runCli(['init', '--yes', '--force'], { cwd: dir });
    expect(code).toBe(0);
  });
});

describe('ovellum build (manual)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-build-'));
    await runCli(['init', '--yes'], { cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('produces dist/index.html and reports a page count', async () => {
    const { code, stdout } = await runCli(['build'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toContain('ovellum build complete');
    expect(stdout).toMatch(/pages:\s+1/);
    expect(existsSync(path.join(dir, 'dist', 'index.html'))).toBe(true);
    expect(existsSync(path.join(dir, 'dist', 'assets', 'ovellum.css'))).toBe(true);
  });
});

describe('ovellum check', () => {
  let dir: string;
  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-check-'));
    await runCli(['init', '--yes'], { cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('exits 0 on a clean site', async () => {
    const { code, stdout } = await runCli(['check'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toMatch(/broken links:\s+0/);
    expect(stdout).toMatch(/unsafe schemes:\s+0/);
  });

  it('reports a broken internal link as a broken-link issue (exit 1)', async () => {
    // Add a second page and link from index.md to a non-existent one.
    writeFileSync(
      path.join(dir, 'content', 'index.md'),
      '# Home\n\n[gone](/does-not-exist/)\n',
    );
    const { code, stdout } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stdout).toMatch(/broken links:\s+1/);
    expect(stdout).toContain('/does-not-exist/');
  });

  it('flags a javascript: URL as a [SECURITY] issue', async () => {
    writeFileSync(
      path.join(dir, 'content', 'index.md'),
      '# Home\n\n[evil](javascript:alert(1))\n',
    );
    const { code, stdout } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stdout).toMatch(/unsafe schemes:\s+1/);
    expect(stdout).toContain('[SECURITY]');
    expect(stdout.toLowerCase()).toContain('javascript:');
  });

  it('errors out cleanly when an output dir is missing in hybrid/auto mode', async () => {
    // Replace the scaffolded manual config with a hybrid one (skip the build).
    await rm(path.join(dir, 'ovellum.config.ts'), { force: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ name: 'x', mode: 'hybrid', tsconfig: 'tsconfig.json', output: 'docs' }, null, 2),
    );
    // Tiny TS file to keep parser happy.
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;\n');
    writeFileSync(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'es2020' }, include: ['src/**/*'] }, null, 2),
    );

    const { code, stderr } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stderr).toContain('output directory does not exist');
    expect(stderr).toContain('Run `ovellum build` first');
  });
});
