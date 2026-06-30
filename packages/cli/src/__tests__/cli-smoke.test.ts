import { execFile, spawn } from 'node:child_process';
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
    expect(existsSync(path.join(dir, 'AGENTS.md'))).toBe(true);

    // AGENTS.md (manual mode) points agents at the content dir, not the output.
    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('AGENTS.md');
    expect(agents).toContain('manual');
    expect(agents).toContain('ovellum check');

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

  it('--json emits a parseable machine summary and nothing else on stdout', async () => {
    const { code, stdout } = await runCli(['build', '--json'], { cwd: dir });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toMatchObject({ ok: true, command: 'build', mode: 'manual' });
    expect(parsed.pages.length).toBe(1);
    expect(parsed.pages[0]).toHaveProperty('url');
    // B8: warnings are severity-tagged objects, not bare strings.
    expect(Array.isArray(parsed.warnings)).toBe(true);
    for (const w of parsed.warnings) {
      expect(typeof w.message).toBe('string');
      expect(['info', 'warning']).toContain(w.severity);
    }
  });

  it('--verbose logs stage detail to stderr, leaving stdout the normal summary', async () => {
    const { code, stdout, stderr } = await runCli(['build', '--verbose'], { cwd: dir });
    expect(code).toBe(0);
    expect(stderr).toContain('verbose: config');
    expect(stderr).toMatch(/verbose: mode manual/);
    expect(stdout).toContain('ovellum build complete'); // summary still on stdout
    expect(stdout).not.toContain('verbose:');
  });

  it('--json --verbose keeps stdout pure JSON (verbose on stderr)', async () => {
    const { code, stdout, stderr } = await runCli(['build', '--json', '--verbose'], { cwd: dir });
    expect(code).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    expect(stderr).toContain('verbose:');
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

  it('--json emits structured findings and keeps exit code 1 on issues', async () => {
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Home\n\n[gone](/does-not-exist/)\n');
    const { code, stdout } = await runCli(['check', '--json'], { cwd: dir, expectFail: true });
    expect(code).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed).toMatchObject({ ok: false, command: 'check' });
    expect(parsed.counts.brokenLinks).toBe(1);
    expect(parsed.issues[0]).toMatchObject({ kind: 'broken-link' });
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

describe('ovellum orphans', () => {
  let dir: string;

  function writeOrphanFile(name: string, anchorId: string, orphanedAt: string): void {
    const orphanDir = path.join(dir, '.ovellum', 'orphans');
    mkdirSync(orphanDir, { recursive: true });
    const body = `---\norphaned: '${orphanedAt}'\nsource_file: docs/format.md\nanchor_id: '${anchorId}'\n---\n\nHand-written rationale to keep.\n`;
    writeFileSync(path.join(orphanDir, name), body, 'utf8');
  }

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-orphans-cli-'));
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', input: './src', output: './docs' }),
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reports an empty archive cleanly', async () => {
    const { code, stdout } = await runCli(['orphans'], { cwd: dir });
    expect(code).toBe(0);
    expect(stdout).toContain('none quarantined');
  });

  // "today" so the recent fixture is always fresh whenever the suite runs.
  const todayIso = new Date().toISOString();

  it('lists quarantined orphans as JSON', async () => {
    writeOrphanFile('2020-01-01_src-format.ts-old.md', 'src/format.ts::old', '2020-01-01T00:00:00.000Z');
    writeOrphanFile('recent_src-format.ts-recent.md', 'src/format.ts::recent', todayIso);

    const { code, stdout } = await runCli(['orphans', '--json'], { cwd: dir });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.count).toBe(2);
    expect(parsed.hasSnapshot).toBe(false);
    // Sorted oldest-first by orphaned timestamp.
    expect(parsed.orphans.map((o: { anchorId: string }) => o.anchorId)).toEqual([
      'src/format.ts::old',
      'src/format.ts::recent',
    ]);
    // No IR snapshot yet → anchor status is unknown.
    expect(parsed.orphans[0].anchor).toBe('unknown');
  });

  it('--stale filters to entries past the retention window', async () => {
    writeOrphanFile('2020-01-01_src-format.ts-old.md', 'src/format.ts::old', '2020-01-01T00:00:00.000Z');
    writeOrphanFile('recent_src-format.ts-recent.md', 'src/format.ts::recent', todayIso);

    const { code, stdout } = await runCli(['orphans', '--stale', '--json'], { cwd: dir });
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    // Default retention is 90 days; only the 2020 orphan qualifies.
    expect(parsed.count).toBe(1);
    expect(parsed.orphans[0].anchorId).toBe('src/format.ts::old');
    expect(parsed.orphans[0].stale).toBe(true);
  });
});

describe('ovellum mcp', () => {
  let dir: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-mcp-cli-'));
    mkdirSync(path.join(dir, 'src'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', input: './src', output: './docs' }),
    );
    writeFileSync(
      path.join(dir, 'src', 'math.ts'),
      '/** Add. */\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n',
    );
    await runCli(['build'], { cwd: dir });
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('speaks JSON-RPC over stdio: initialize + tools/list + tools/call', async () => {
    const lines = [
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}',
      '{"jsonrpc":"2.0","method":"notifications/initialized"}',
      '{"jsonrpc":"2.0","id":2,"method":"tools/list"}',
      '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ovellum_query_symbol","arguments":{"id":"src/math.ts::add"}}}',
      '',
    ].join('\n');

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn('node', [CLI, 'mcp', '--cwd', dir], {
        cwd: dir,
        env: { ...process.env, NO_COLOR: '1' },
      });
      let out = '';
      child.stdout.on('data', (d: Buffer) => (out += d.toString()));
      child.on('error', reject);
      child.on('close', () => resolve(out));
      child.stdin.write(lines);
      child.stdin.end();
    });

    const responses = stdout
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { id?: number; result?: Record<string, unknown> });

    const init = responses.find((r) => r.id === 1);
    expect((init?.result as { serverInfo: { name: string } }).serverInfo.name).toBe('ovellum');

    const list = responses.find((r) => r.id === 2);
    const names = (list?.result as { tools: Array<{ name: string }> }).tools.map((t) => t.name);
    expect(names).toContain('ovellum_write_zone');

    const call = responses.find((r) => r.id === 3);
    const payload = JSON.parse((call?.result as { content: Array<{ text: string }> }).content[0].text);
    expect(payload.symbols[0].id).toBe('src/math.ts::add');
  });
});

/**
 * B9 image optimization, exercised through the COMPILED CLI (`dist/index.js`).
 * This is the regression guard the unit tests can't be: it catches a packaging
 * bug (sharp bundled instead of left external) that only manifests in the
 * bundle — a source-level test would pass while the shipped binary is broken.
 */
describe('ovellum build — image optimization (site.images)', () => {
  let dir: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let sharp: any = null;
  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-img-'));
    try {
      sharp = (await import('sharp' as string)).default;
    } catch {
      sharp = null;
    }
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('optimizes a JPEG through the compiled CLI (sharp loads from the external import)', async () => {
    if (!sharp) return; // sharp not installed — skip
    mkdirSync(path.join(dir, 'content', 'public'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Hi\n\n![x](/noise.jpg)\n');
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', input: './content', output: './dist', site: { images: { quality: 40 } } }),
    );
    const srcImg = path.join(dir, 'content', 'public', 'noise.jpg');
    // Incompressible noise → a big q100 JPEG that visibly shrinks at q40.
    const raw = Buffer.alloc(384 * 384 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) & 0xff; // cheap deterministic noise
    await sharp(raw, { raw: { width: 384, height: 384, channels: 3 } }).jpeg({ quality: 100 }).toFile(srcImg);

    const { code, stderr } = await runCli(['build'], { cwd: dir });
    expect(code).toBe(0);
    // The real failure mode this guards: a bundled sharp can't load, so the build
    // would warn "needs the optional `sharp`" and copy the original as-is.
    expect(stderr).not.toMatch(/needs the optional .?sharp/);
    expect(stderr).toMatch(/Optimized 1 image/);

    const srcSize = (await readFile(srcImg)).byteLength;
    const outSize = (await readFile(path.join(dir, 'dist', 'noise.jpg'))).byteLength;
    expect(outSize).toBeLessThan(srcSize);
  });
});

/**
 * `site.minify` through the COMPILED CLI — the regression guard for the same
 * bundling trap as the image test: esbuild must stay external, or the bundled
 * copy can't load and minification silently no-ops.
 */
describe('ovellum build — asset minification (site.minify)', () => {
  let dir: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let esbuild: any = null;
  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-min-'));
    try {
      esbuild = await import('esbuild' as string);
    } catch {
      esbuild = null;
    }
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('minifies a content CSS asset through the compiled CLI', async () => {
    if (!esbuild) return; // esbuild not installed — skip
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Hi\n\nBody.\n');
    const srcCss = path.join(dir, 'content', 'style.css');
    writeFileSync(
      srcCss,
      '/* a long comment that minification removes */\n.a {\n  color: rebeccapurple;\n  padding: 8px   16px;\n}\n.b { margin: 0; }\n',
    );
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', input: './content', output: './dist', site: { minify: true } }),
    );

    const { code, stderr } = await runCli(['build'], { cwd: dir });
    expect(code).toBe(0);
    // The bundling-trap failure mode: a bundled esbuild can't load → warns
    // "needs the optional `esbuild`" and copies the CSS unminified.
    expect(stderr).not.toMatch(/needs the optional .?esbuild/);
    expect(stderr).toMatch(/Minified 1 asset/);

    const out = await readFile(path.join(dir, 'dist', 'style.css'), 'utf8');
    expect(out).not.toContain('a long comment');
    expect(Buffer.byteLength(out)).toBeLessThan((await readFile(srcCss)).byteLength);
  });
});

describe('ovellum build — OpenGraph cards (site.ogImage)', () => {
  let dir: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let sharp: any = null;
  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-og-'));
    try {
      sharp = await import('sharp' as string);
    } catch {
      sharp = null;
    }
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('generates per-page cards + og:image meta through the compiled CLI', async () => {
    if (!sharp) return; // sharp not installed — skip
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Home\n\nWelcome.\n');
    writeFileSync(path.join(dir, 'content', 'guide.md'), '# A Guide Page\n\nBody.\n');
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({
        mode: 'manual',
        input: './content',
        output: './dist',
        site: { title: 'My Docs', baseUrl: 'https://docs.example.com', ogImage: true },
      }),
    );

    const { code, stderr } = await runCli(['build'], { cwd: dir });
    expect(code).toBe(0);
    expect(stderr).not.toMatch(/needs the optional .?sharp/);
    expect(stderr).toMatch(/Generated 2 OpenGraph image/);

    // Cards written + valid PNGs.
    expect(existsSync(path.join(dir, 'dist', 'og', 'index.png'))).toBe(true);
    expect(existsSync(path.join(dir, 'dist', 'og', 'guide.png'))).toBe(true);
    const png = await readFile(path.join(dir, 'dist', 'og', 'guide.png'));
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');

    // Absolute og:image + twitter meta in the page head.
    const home = await readFile(path.join(dir, 'dist', 'index.html'), 'utf8');
    expect(home).toContain('<meta property="og:image" content="https://docs.example.com/og/index.png">');
    expect(home).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it('warns and generates nothing when baseUrl is unset', async () => {
    mkdirSync(path.join(dir, 'content'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'index.md'), '# Home\n\nHi.\n');
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', input: './content', output: './dist', site: { ogImage: true } }),
    );
    const { code, stderr } = await runCli(['build'], { cwd: dir });
    expect(code).toBe(0);
    expect(stderr).toMatch(/ogImage.*baseUrl|baseUrl.*absolute/i);
    expect(existsSync(path.join(dir, 'dist', 'og'))).toBe(false);
    const home = await readFile(path.join(dir, 'dist', 'index.html'), 'utf8');
    expect(home).not.toContain('og:image');
  });
});

describe('ovellum clean', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-clean-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('hybrid: removes generated files, preserves @manual-prose files, hand-written files, and orphans', async () => {
    mkdirSync(path.join(dir, 'docs'), { recursive: true });
    mkdirSync(path.join(dir, '.ovellum', 'orphans'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'hybrid', input: './src', output: './docs' }),
    );
    // Purely generated → removable.
    writeFileSync(path.join(dir, 'docs', 'gen.md'), '---\ntitle: A\novellum: true\n---\n\n## A\n\nGenerated.\n');
    // Generated but carries hand-written prose → must be preserved.
    writeFileSync(
      path.join(dir, 'docs', 'withzone.md'),
      '---\ntitle: B\novellum: true\n---\n\n<!-- @manual:start id="n" -->\nKeep me.\n<!-- @manual:end -->\n',
    );
    // Hand-authored (no generator marker) → preserved.
    writeFileSync(path.join(dir, 'docs', 'manual.md'), '# Hand-written\n\nKeep me too.\n');
    writeFileSync(path.join(dir, '.ovellum', 'orphans', 'x.md'), 'orphaned prose\n');

    // Dry run by default — lists but deletes nothing.
    const dry = await runCli(['clean'], { cwd: dir });
    expect(dry.code).toBe(0);
    expect(dry.stdout).toMatch(/dry run/);
    expect(dry.stdout).toMatch(/would remove .*docs\/gen\.md/);
    expect(existsSync(path.join(dir, 'docs', 'gen.md'))).toBe(true); // untouched

    // --confirm actually deletes — only the purely-generated file.
    const run = await runCli(['clean', '--confirm'], { cwd: dir });
    expect(run.code).toBe(0);
    expect(existsSync(path.join(dir, 'docs', 'gen.md'))).toBe(false);
    expect(existsSync(path.join(dir, 'docs', 'withzone.md'))).toBe(true);
    expect(existsSync(path.join(dir, 'docs', 'manual.md'))).toBe(true);
    expect(existsSync(path.join(dir, '.ovellum', 'orphans', 'x.md'))).toBe(true);
  });

  it('manual: removes the whole output dir; --orphans also removes the archive', async () => {
    mkdirSync(path.join(dir, 'dist', 'assets'), { recursive: true });
    mkdirSync(path.join(dir, '.ovellum', 'orphans'), { recursive: true });
    writeFileSync(
      path.join(dir, 'ovellum.config.json'),
      JSON.stringify({ mode: 'manual', input: './content', output: './dist' }),
    );
    writeFileSync(path.join(dir, 'dist', 'index.html'), '<html></html>');
    writeFileSync(path.join(dir, 'dist', 'assets', 'ovellum.css'), 'body{}');
    writeFileSync(path.join(dir, '.ovellum', 'orphans', 'x.md'), 'orphan\n');

    const run = await runCli(['clean', '--confirm', '--orphans'], { cwd: dir });
    expect(run.code).toBe(0);
    expect(existsSync(path.join(dir, 'dist'))).toBe(false); // whole output gone
    expect(existsSync(path.join(dir, '.ovellum', 'orphans'))).toBe(false); // archive removed with the flag
  });
});
