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

describe('ovellum check — translation staleness (i18n)', () => {
  let dir: string;
  const enIndex = path.join('content', 'en-US', 'index.md');
  const jaIndex = path.join('content', 'ja', 'index.md');

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-i18n-'));
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({
        name: 'x',
        mode: 'manual',
        input: 'content',
        output: 'dist',
        site: {
          locales: [
            { code: 'en-US', label: 'English' },
            { code: 'ja', label: '日本語' },
          ],
          defaultLocale: 'en-US',
        },
      }),
    );
    mkdirSync(path.join(dir, 'content', 'en-US'), { recursive: true });
    mkdirSync(path.join(dir, 'content', 'ja'), { recursive: true });
    writeFileSync(path.join(dir, enIndex), '---\ntitle: Home\n---\n\n# Home\n\nEnglish body.\n');
    writeFileSync(path.join(dir, jaIndex), '---\ntitle: ホーム\n---\n\n# ホーム\n\n日本語の本文。\n');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('flags an unstamped translation as [i18n] stale (exit 1)', async () => {
    const { code, stdout } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stdout).toMatch(/stale translations:\s+1/);
    expect(stdout).toContain('[i18n]');
    expect(stdout).toContain('no sourceHash');
  });

  it('stamps with --update-translations, then check passes', async () => {
    const stamp = await runCli(['check', '--update-translations'], { cwd: dir });
    expect(stamp.code).toBe(0);
    expect(stamp.stdout).toMatch(/updated:\s+1/);
    // The hash is now in the translation's frontmatter…
    const ja = await readFile(path.join(dir, jaIndex), 'utf8');
    expect(ja).toMatch(/sourceHash:/);
    // …and a fresh check is clean.
    const after = await runCli(['check'], { cwd: dir });
    expect(after.code).toBe(0);
    expect(after.stdout).toMatch(/stale translations:\s+0/);
  });

  it('re-flags as stale after the source page changes', async () => {
    await runCli(['check', '--update-translations'], { cwd: dir });
    writeFileSync(path.join(dir, enIndex), '---\ntitle: Home\n---\n\n# Home\n\nEnglish body, revised.\n');
    const { code, stdout } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stdout).toMatch(/stale translations:\s+1/);
    expect(stdout).toContain('changed since this translation was stamped');
  });

  it('flags a translation with no source page as an [i18n] orphan', async () => {
    writeFileSync(path.join(dir, 'content', 'ja', 'extra.md'), '---\ntitle: 余分\n---\n\n本文。\n');
    const { code, stdout } = await runCli(['check', '--update-translations'], { cwd: dir });
    // Stamping skips it (nothing to track)…
    expect(code).toBe(0);
    expect(stdout).toMatch(/skipped \(no source page\):\s+1/);
    // …and a plain check reports it as an orphan.
    const chk = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(chk.stdout).toContain('tracks nothing');
  });
});

describe('ovellum check — i18n link validation (per-locale)', () => {
  let dir: string;
  const cfg = JSON.stringify({
    name: 'x',
    mode: 'manual',
    input: 'content',
    output: 'dist',
    site: {
      locales: [
        { code: 'en-US', label: 'English' },
        { code: 'ja', label: '日本語' },
      ],
      defaultLocale: 'en-US',
    },
  });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-i18nlinks-'));
    writeFileSync(path.join(dir, 'ovellum.config.json'), cfg);
    for (const code of ['en-US', 'ja']) {
      mkdirSync(path.join(dir, 'content', code, 'docs'), { recursive: true });
      writeFileSync(path.join(dir, 'content', code, 'docs', 'guide.md'), `---\ntitle: Guide\n---\n\n# Guide\n`);
    }
    // English home links to a default-locale page; Japanese home links to BOTH
    // its own locale-prefixed page and the cross-locale default page.
    writeFileSync(path.join(dir, 'content', 'en-US', 'index.md'), '# Home\n\n[guide](/docs/guide/)\n');
    writeFileSync(
      path.join(dir, 'content', 'ja', 'index.md'),
      '# ホーム\n\n[ガイド](/ja/docs/guide/)\n[英語](/docs/guide/)\n',
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('treats locale-prefixed and cross-locale links as valid (no false broken links)', async () => {
    await runCli(['check', '--update-translations'], { cwd: dir }); // clear staleness noise
    const { code, stdout } = await runCli(['check'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toMatch(/broken links:\s+0/);
  });

  it('still flags a genuinely broken locale-prefixed link', async () => {
    await runCli(['check', '--update-translations'], { cwd: dir });
    writeFileSync(path.join(dir, 'content', 'ja', 'index.md'), '# ホーム\n\n[なし](/ja/missing/)\n');
    const { code, stdout } = await runCli(['check'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stdout).toMatch(/broken links:\s+1/);
    expect(stdout).toContain('/ja/missing/');
  });
});

describe('ovellum diff', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-diff-cli-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'auto', input: './src', output: './docs' }),
    );
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('errors with a hint when no snapshot exists yet', async () => {
    const { code, stderr } = await runCli(['diff'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    expect(stderr).toContain('ovellum build');
  });

  it('reports no changes right after a build', async () => {
    await runCli(['build'], { cwd: dir });
    const { code, stdout } = await runCli(['diff'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toContain('no changes');
  });

  it('reports an added symbol and exits 1 only with --exit-code', async () => {
    await runCli(['build'], { cwd: dir });
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n\n/** Multiply. */\nexport function mul(a: number, b: number): number {\n  return a * b;\n}\n',
    );

    // Default: prints the diff but exits 0.
    const plain = await runCli(['diff'], { cwd: dir });
    expect(plain.code).toBe(0);
    expect(plain.stdout).toContain('src/math.ts::mul');
    expect(plain.stdout).toContain('docs/math.md');

    // --exit-code: same output, exits 1 for CI gating.
    const gated = await runCli(['diff', '--exit-code'], { cwd: dir, expectFail: true });
    expect(gated.code).toBe(1);
  });

  it('emits machine-readable JSON with --json', async () => {
    await runCli(['build'], { cwd: dir });
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add three. */\nexport function add(a: number, b: number, c: number): number {\n  return a + b + c;\n}\n',
    );
    const { code, stdout } = await runCli(['diff', '--json'], { cwd: dir });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.hasChanges).toBe(true);
    expect(parsed.changed[0].id).toBe('src/math.ts::add');
    expect(parsed.changed[0].fields).toContain('signature');
    expect(parsed.docs[0].output).toBe('docs/math.md');
  });
});
