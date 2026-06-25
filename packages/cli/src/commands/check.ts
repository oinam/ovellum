import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import matter from 'gray-matter';
import { ConfigError, loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import { parseProject } from '@ovellum/parser';
import { findAnchors } from '@ovellum/merger';
import { parseManualDoc } from '@ovellum/reader';
import {
  buildNav,
  extractMarkdownLinks,
  flattenNav,
  resolveHomeRel,
  walkContent,
} from '@ovellum/site';
import { collectAnchorIds } from '../dev/ir.js';
import { detectUnsafeScheme } from './check-utils.js';

interface Issue {
  file: string;
  line: number;
  message: string;
  kind:
    | 'broken-link'
    | 'unsafe-scheme'
    | 'stale-translation'
    | 'orphan-translation'
    | 'positional-zone'
    | 'stale-anchor'
    | 'missing-frontmatter';
}

/** The strict-only issue kinds (added by `--strict`). */
const STRICT_KINDS: ReadonlySet<Issue['kind']> = new Set([
  'positional-zone',
  'stale-anchor',
  'missing-frontmatter',
]);

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description:
      'Validate config and check for broken internal links without writing any output.',
  },
  args: {
    config: {
      type: 'string',
      description: 'Path to ovellum.config.{ts,js,json}',
    },
    cwd: {
      type: 'string',
      description: 'Project root (defaults to current directory)',
    },
    'update-translations': {
      type: 'boolean',
      description:
        "Stamp each translated page's frontmatter with the current source hash (run after re-syncing a translation), then exit.",
    },
    json: {
      type: 'boolean',
      description: 'Emit results as JSON (for CI / tooling); no decorative output.',
    },
    strict: {
      type: 'boolean',
      description:
        'Add stricter validations: positional (id-less) protected zones, doc anchors pointing at gone symbols, and pages with no resolvable title.',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    let loaded;
    try {
      loaded = await loadOvellumConfig({ cwd, configFile: args.config });
    } catch (err) {
      if (err instanceof ConfigError) {
        process.stderr.write(`config error: ${err.message}\n`);
        if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        process.exit(3);
      }
      throw err;
    }
    const { config, configFile } = loaded;

    const asJson = args.json === true;

    // Stamping mode is a dedicated, write-only path: refresh the stored source
    // hashes and exit, rather than reporting staleness.
    if (args['update-translations']) {
      const { stamped, skipped } = await stampTranslations({ config, cwd });
      if (asJson) {
        process.stdout.write(
          JSON.stringify({ ok: true, command: 'check', action: 'update-translations', stamped, skipped }, null, 2) + '\n',
        );
        process.exit(0);
      }
      const out = ['ovellum check: stamped translation source hashes', `  updated:  ${stamped.length}`];
      for (const f of stamped) out.push(`    ${f}`);
      if (skipped.length > 0) {
        out.push(`  skipped (no source page): ${skipped.length}`);
        for (const f of skipped) out.push(`    ${f}`);
      }
      if (stamped.length === 0 && skipped.length === 0) {
        out.push('  (no translated pages found — set two or more site.locales to use this)');
      }
      process.stdout.write(out.join('\n') + '\n');
      process.exit(0);
    }

    const strict = args.strict === true;
    const startedAt = Date.now();
    let run: CheckRun;
    try {
      run = await runCheck({ config, cwd, strict });
    } catch (err) {
      if (err instanceof ConfigError) {
        if (asJson) {
          process.stdout.write(
            JSON.stringify({ ok: false, command: 'check', error: err.message, hint: err.hint ?? null }, null, 2) + '\n',
          );
        } else {
          process.stderr.write(`check error: ${err.message}\n`);
          if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        }
        process.exit(1);
      }
      throw err;
    }
    const { issues, files } = run;

    const elapsed = Date.now() - startedAt;
    const counts = countIssues(issues);
    const showStale = (config.site.locales?.length ?? 0) > 1;

    if (asJson) {
      process.stdout.write(
        JSON.stringify(
          {
            ok: issues.length === 0,
            command: 'check',
            mode: config.mode,
            durationMs: elapsed,
            config: configFile ?? null,
            pages: files.length,
            counts: {
              brokenLinks: counts.broken,
              unsafeSchemes: counts.unsafe,
              ...(showStale ? { staleTranslations: counts.stale } : {}),
              ...(strict ? { strictIssues: counts.strict } : {}),
            },
            issues: issues.map((it) => ({ file: it.file, line: it.line, kind: it.kind, message: it.message })),
          },
          null,
          2,
        ) + '\n',
      );
      process.exit(issues.length === 0 ? 0 : 1);
    }

    const lines = [
      `ovellum check complete in ${elapsed}ms`,
      `  config:    ${configFile ?? '(defaults)'}`,
      `  mode:      ${config.mode}`,
      `  pages:     ${files.length}`,
      `  broken links:    ${counts.broken}`,
      `  unsafe schemes:  ${counts.unsafe}`,
    ];
    if (showStale) {
      lines.push(`  stale translations: ${counts.stale}`);
    }
    if (strict) {
      lines.push(`  strict issues:   ${counts.strict}`);
    }
    if (issues.length > 0) {
      lines.push('  details:');
      for (const it of issues) {
        const tag =
          it.kind === 'unsafe-scheme'
            ? '[SECURITY] '
            : it.kind === 'stale-translation' || it.kind === 'orphan-translation'
              ? '[i18n] '
              : STRICT_KINDS.has(it.kind)
                ? '[STRICT] '
                : '';
        lines.push(`    ${it.file}:${it.line}  ${tag}${it.message}`);
      }
    }
    process.stdout.write(lines.join('\n') + '\n');

    process.exit(issues.length === 0 ? 0 : 1);
  },
});

interface CheckRun {
  issues: Issue[];
  files: string[];
}

interface CheckInput {
  config: OvellumConfig;
  cwd: string;
  /** Run the stricter validations (see `--strict`). */
  strict?: boolean;
}

function countIssues(issues: Issue[]): { broken: number; unsafe: number; stale: number; strict: number } {
  const by = (k: Issue['kind']) => issues.filter((i) => i.kind === k).length;
  return {
    broken: by('broken-link'),
    unsafe: by('unsafe-scheme'),
    stale: by('stale-translation') + by('orphan-translation'),
    strict: issues.filter((i) => STRICT_KINDS.has(i.kind)).length,
  };
}

/** A page has a resolvable title if frontmatter sets one or the body has an H1. */
function hasResolvableTitle(data: Record<string, unknown>, content: string): boolean {
  if (typeof data.title === 'string' && data.title.trim().length > 0) return true;
  return /^#\s+\S/m.test(content);
}

/** 1-based line number of a byte offset in `text`. */
function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Run all checks for a project and return the raw issues + page count. Shared
 * by the `ovellum check` command and the `ovellum_check` MCP tool so they can't
 * drift. Throws `ConfigError` on a config problem; callers decide how to report.
 */
export async function runCheck({ config, cwd, strict }: CheckInput): Promise<CheckRun> {
  let issues: Issue[];
  let files: string[];
  if (config.mode === 'manual') {
    ({ issues, files } = await checkManual({ config, cwd, strict }));
  } else {
    ({ issues, files } = await checkGenerated({ config, cwd, strict }));
  }
  // Translation staleness is additive and independent of mode — it only
  // fires when the site opts into i18n with two or more locales.
  issues.push(...(await checkTranslations({ config, cwd })));
  return { issues, files };
}

/** One content tree to lint: the whole `content/` for a single-language site, or
 *  one `content/<code>/` subtree per locale with its URL prefix (`''` for the
 *  default locale, `'/ja'` for others) — mirroring how `build` lays out i18n
 *  sites so link validation sees the same URLs the build emits. */
interface LocaleView {
  relInput: string;
  inputAbs: string;
  urlPrefix: string;
}

function localeViews(config: OvellumConfig, cwd: string): LocaleView[] {
  const inputAbs = path.resolve(cwd, config.input);
  const locales = config.site.locales ?? [];
  // No i18n → one unprefixed view over the content root (original behavior).
  if (locales.length === 0) {
    return [{ relInput: config.input, inputAbs, urlPrefix: '' }];
  }
  const def = config.site.defaultLocale ?? locales[0]!.code;
  return locales.map((l) => {
    const dir = path.join(inputAbs, l.code);
    return {
      relInput: path.relative(cwd, dir).replace(/\\/g, '/') || '.',
      inputAbs: dir,
      urlPrefix: l.code === def ? '' : '/' + l.code,
    };
  });
}

/**
 * Manual mode: validate every internal link against the sidebar nav. On i18n
 * sites this runs per-locale — each `content/<code>/` subtree builds its own
 * locale-prefixed nav, and links are checked against the union of all locales'
 * URLs (so a `/ja/…` link, a cross-locale `/docs/…` link to the default locale,
 * and a relative link all resolve correctly). Single-language sites take one
 * unprefixed pass — identical to the original behavior.
 */
async function checkManual({ config, cwd, strict }: CheckInput): Promise<CheckRun> {
  const outputAbs = path.resolve(cwd, config.output);
  const inputRootAbs = path.resolve(cwd, config.input);
  const publicAbs = path.join(inputRootAbs, config.site.publicDir);
  const views = localeViews(config, cwd);

  // Honor the same exclusions as `build` (ignoreFolders / ignoreFiles, the
  // structural auto-excludes, and the output dir) so `check` lints only real
  // content. Resolve each locale's home the same way `build` does, so a
  // README/site.home home maps to `/` (prefixed) in the nav.
  const validUrls = new Set<string>();
  for (const v of views) {
    const homeRel = resolveHomeRel(v.inputAbs, config.site);
    const homeBasename = homeRel && !homeRel.includes('/') ? homeRel : undefined;
    const nav = await buildNav(
      v.relInput,
      cwd,
      config.site.ignoreFolders,
      config.site.ignoreFiles,
      outputAbs,
      homeBasename,
      publicAbs,
    );
    for (const page of flattenNav(nav)) validUrls.add(v.urlPrefix + page.url);
    // Landing replaces `/` (per-locale home) when enabled.
    if (config.site.landing.enabled) validUrls.add(v.urlPrefix + '/');
  }

  const issues: Issue[] = [];
  const files: string[] = [];
  for (const v of views) {
    for await (const file of walkContent(v.inputAbs, {
      inputAbs: v.inputAbs,
      ignoreFolders: config.site.ignoreFolders,
      ignoreFiles: config.site.ignoreFiles ?? [],
      outputAbs,
      publicAbs,
    })) {
      if (!/\.(md|markdown)$/i.test(file)) continue;
      files.push(file);
      const rel = path.relative(cwd, file).replace(/\\/g, '/');
      const raw = await readFile(file, 'utf8');
      const { content, data } = matter(raw);
      if (strict && !hasResolvableTitle(data, content)) {
        issues.push({
          file: rel,
          line: 1,
          kind: 'missing-frontmatter',
          message: 'page has no title — add a frontmatter `title:` or a top-level `# heading`.',
        });
      }
      const url = v.urlPrefix + urlForPage(file, v.inputAbs);
      for (const { target, line } of extractMarkdownLinks(content)) {
        const unsafe = detectUnsafeScheme(target);
        if (unsafe) {
          issues.push({
            file: rel,
            line,
            kind: 'unsafe-scheme',
            message: `unsafe URL scheme '${unsafe}:' — link will be stripped by the HTML sanitizer (raw: ${target})`,
          });
          continue;
        }
        const resolved = resolveLink(target, url);
        if (resolved === undefined) continue; // external / mailto / fragment / unparseable
        if (!validUrls.has(resolved)) {
          issues.push({
            file: rel,
            line,
            kind: 'broken-link',
            message: `broken internal link to ${resolved} (raw: ${target})`,
          });
        }
      }
    }
  }
  return { issues, files };
}

/**
 * Hybrid / auto modes: the .md files we want to validate are the
 * *generated* ones in `config.output`. Internal links are resolved
 * against the actual files present on disk, since there's no
 * sidebar nav in auto-generated docs.
 *
 * Exits early with a clear message when the output directory doesn't
 * exist — usually because the user hasn't run `ovellum build` yet.
 */
async function checkGenerated({ config, cwd, strict }: CheckInput): Promise<CheckRun> {
  const outputAbs = path.resolve(cwd, config.output);
  if (!existsSync(outputAbs)) {
    throw new ConfigError(
      `output directory does not exist: ${path.relative(cwd, outputAbs)}`,
      { hint: 'Run `ovellum build` first; `ovellum check` validates the generated Markdown.' },
    );
  }

  // Strict mode cross-references doc anchors against the *current* source, so a
  // doc anchor whose symbol was deleted/renamed surfaces as stale. Parse once.
  const currentAnchorIds = strict ? collectAnchorIds(parseProject({ config, cwd })) : null;

  // Collect every .md path in the output dir so we can check links against
  // real files. Keys are stored both with and without the `.md` suffix so a
  // link to `./foo` and a link to `./foo.md` both resolve.
  const fileSet = new Set<string>();
  for await (const file of walkMarkdown(outputAbs)) {
    const rel = path.relative(outputAbs, file).replace(/\\/g, '/');
    fileSet.add('/' + rel);
    fileSet.add('/' + rel.replace(/\.md$/i, ''));
  }

  const issues: Issue[] = [];
  const files: string[] = [];
  for await (const file of walkMarkdown(outputAbs)) {
    files.push(file);
    const rel = path.relative(cwd, file).replace(/\\/g, '/');
    const raw = await readFile(file, 'utf8');
    const { content } = matter(raw);
    const pageRel = '/' + path.relative(outputAbs, file).replace(/\\/g, '/');

    if (strict) {
      // Positional (id-less) protected zones — fragile across reordering.
      const doc = parseManualDoc(raw, file);
      for (const block of doc.protectedBlocks) {
        if (!block.hasExplicitId) {
          issues.push({
            file: rel,
            line: block.startLine,
            kind: 'positional-zone',
            message:
              'protected zone has no id — add id="..." on the <!-- @manual:start --> tag so it survives reordering.',
          });
        }
      }
      // Anchors pointing at symbols that no longer exist in the source.
      if (currentAnchorIds) {
        for (const anchor of findAnchors(content)) {
          if (!currentAnchorIds.has(anchor.id)) {
            issues.push({
              file: rel,
              line: lineAt(content, anchor.index),
              kind: 'stale-anchor',
              message: `anchor "${anchor.id}" points at a symbol no longer in the source — rebuild, or reattach its prose (\`ovellum orphans\`).`,
            });
          }
        }
      }
    }

    for (const { target, line } of extractMarkdownLinks(content)) {
      const unsafe = detectUnsafeScheme(target);
      if (unsafe) {
        issues.push({
          file: rel,
          line,
          kind: 'unsafe-scheme',
          message: `unsafe URL scheme '${unsafe}:' — link will be stripped by the HTML sanitizer (raw: ${target})`,
        });
        continue;
      }
      const resolved = resolveGeneratedLink(target, pageRel);
      if (resolved === undefined) continue;
      if (!fileSet.has(resolved)) {
        issues.push({
          file: rel,
          line,
          kind: 'broken-link',
          message: `broken internal link to ${resolved} (raw: ${target})`,
        });
      }
    }
  }
  return { issues, files };
}

/**
 * Resolve a link in a generated Markdown file to a path within the output
 * dir (rooted at `/`). Returns undefined for external / fragment / unparseable
 * links — those are not validated.
 */
function resolveGeneratedLink(target: string, pageRel: string): string | undefined {
  if (!target) return undefined;
  if (/^(https?:|mailto:|tel:|data:|ftp:|ssh:)/i.test(target)) return undefined;
  if (target.startsWith('#')) return undefined;
  const cleaned = target.replace(/[?#].*$/, '');
  if (!cleaned) return undefined;
  if (cleaned.startsWith('/')) return cleaned;
  // Relative: resolve against the directory of pageRel.
  const baseDir = pageRel.slice(0, pageRel.lastIndexOf('/') + 1);
  const joined = new URL(cleaned, `https://x.test${baseDir}`).pathname;
  return joined;
}

async function* walkMarkdown(dirAbs: string): AsyncGenerator<string> {
  const entries = await readdir(dirAbs);
  for (const name of entries) {
    if (name.startsWith('_')) continue;
    const abs = path.join(dirAbs, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      yield* walkMarkdown(abs);
    } else if (/\.(md|markdown)$/i.test(name)) {
      yield abs;
    }
  }
}

function urlForPage(absFile: string, inputAbs: string): string {
  const rel = path.relative(inputAbs, absFile).replace(/\\/g, '/');
  const noExt = rel.replace(/\.(md|markdown)$/i, '');
  const parts = noExt.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts[parts.length - 1] === 'index') parts.pop();
  if (parts.length === 0) return '/';
  return '/' + parts.join('/') + '/';
}

function resolveLink(target: string, pageUrl: string): string | undefined {
  if (!target) return undefined;
  if (/^(https?:|mailto:|tel:|data:|ftp:|ssh:)/i.test(target)) return undefined;
  if (target.startsWith('#')) return undefined; // fragment-only — could be checked but defer
  // Strip query and fragment for the resolution check
  const cleaned = target.replace(/[?#].*$/, '');
  if (!cleaned) return undefined;
  if (cleaned.startsWith('/')) {
    return ensureTrailingSlash(cleaned);
  }
  // Relative — resolve against pageUrl's directory
  const base = pageUrl.endsWith('/') ? pageUrl : pageUrl + '/';
  const joined = new URL(cleaned, `https://x.test${base}`).pathname;
  return ensureTrailingSlash(joined);
}

function ensureTrailingSlash(p: string): string {
  if (/\.[a-z0-9]+$/i.test(p)) return p; // looks like a file path (image, etc.) — leave as is
  return p.endsWith('/') ? p : p + '/';
}

// --- Translation staleness (i18n) -----------------------------------------
//
// When a site uses two or more `site.locales`, each non-default locale lives in
// its own `content/<code>/` subtree mirroring the default locale by identical
// relative path. We stamp a hash of the *source* (default-locale) page body
// into the translation's `sourceHash` frontmatter; `check` then warns when the
// source has changed since (the translation is stale) or was never stamped. The
// hash is content-only (frontmatter excluded), with EOL + edge whitespace
// normalized so trivial reformatting doesn't trip a false "stale".

/** Short content hash used to detect that a source page changed. */
function hashBody(body: string): string {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/** Insert or replace a single scalar frontmatter field in `raw`, touching only
 *  that one line so stamping doesn't churn the rest of the frontmatter. */
function upsertFrontmatterField(raw: string, key: string, value: string): string {
  const line = `${key}: '${value}'`;
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!fm) return `---\n${line}\n---\n\n${raw}`;
  const block = fm[1]!;
  const keyRe = new RegExp(`^${key}:.*$`, 'm');
  const newBlock = keyRe.test(block) ? block.replace(keyRe, line) : `${block}\n${line}`;
  return `${raw.slice(0, fm.index)}---\n${newBlock}\n---${raw.slice(fm.index + fm[0].length)}`;
}

/** The non-default locale subtrees that exist on disk, with their default-locale
 *  source dir. Empty when the site isn't an opted-in, subtree-laid-out i18n
 *  site, so the caller becomes a no-op. */
function localeSubtrees(config: OvellumConfig, cwd: string): {
  defaultCode: string;
  defaultDir: string;
  locales: { code: string; dir: string }[];
} | null {
  const locales = config.site.locales ?? [];
  if (locales.length < 2) return null;
  const inputAbs = path.resolve(cwd, config.input);
  const defaultCode = config.site.defaultLocale ?? locales[0]!.code;
  const defaultDir = path.join(inputAbs, defaultCode);
  if (!existsSync(defaultDir)) return null;
  const others = locales
    .filter((l) => l.code !== defaultCode)
    .map((l) => ({ code: l.code, dir: path.join(inputAbs, l.code) }))
    .filter((l) => existsSync(l.dir));
  return { defaultCode, defaultDir, locales: others };
}

function localeWalkOptions(config: OvellumConfig, cwd: string, localeDir: string) {
  return {
    inputAbs: localeDir,
    ignoreFolders: config.site.ignoreFolders,
    ignoreFiles: config.site.ignoreFiles ?? [],
    outputAbs: path.resolve(cwd, config.output),
    publicAbs: path.join(path.resolve(cwd, config.input), config.site.publicDir),
  };
}

async function checkTranslations({ config, cwd }: CheckInput): Promise<Issue[]> {
  const tree = localeSubtrees(config, cwd);
  if (!tree) return [];
  const issues: Issue[] = [];
  for (const loc of tree.locales) {
    for await (const file of walkContent(loc.dir, localeWalkOptions(config, cwd, loc.dir))) {
      if (!/\.(md|markdown)$/i.test(file)) continue;
      const relFromLocale = path.relative(loc.dir, file).replace(/\\/g, '/');
      const rel = path.relative(cwd, file).replace(/\\/g, '/');
      const sourceFile = path.join(tree.defaultDir, relFromLocale);
      if (!existsSync(sourceFile)) {
        issues.push({
          file: rel,
          line: 1,
          kind: 'orphan-translation',
          message: `no source page at ${tree.defaultCode}/${relFromLocale} — this translation tracks nothing`,
        });
        continue;
      }
      const srcHash = hashBody(matter(await readFile(sourceFile, 'utf8')).content);
      const stored = matter(await readFile(file, 'utf8')).data.sourceHash;
      if (typeof stored !== 'string' || stored.length === 0) {
        issues.push({
          file: rel,
          line: 1,
          kind: 'stale-translation',
          message: `no sourceHash — sync with ${tree.defaultCode}/${relFromLocale}, then run \`ovellum check --update-translations\``,
        });
      } else if (stored !== srcHash) {
        issues.push({
          file: rel,
          line: 1,
          kind: 'stale-translation',
          message: `source ${tree.defaultCode}/${relFromLocale} changed since this translation was stamped — review, then \`ovellum check --update-translations\``,
        });
      }
    }
  }
  return issues;
}

async function stampTranslations({
  config,
  cwd,
}: CheckInput): Promise<{ stamped: string[]; skipped: string[] }> {
  const stamped: string[] = [];
  const skipped: string[] = [];
  const tree = localeSubtrees(config, cwd);
  if (!tree) return { stamped, skipped };
  for (const loc of tree.locales) {
    for await (const file of walkContent(loc.dir, localeWalkOptions(config, cwd, loc.dir))) {
      if (!/\.(md|markdown)$/i.test(file)) continue;
      const relFromLocale = path.relative(loc.dir, file).replace(/\\/g, '/');
      const rel = path.relative(cwd, file).replace(/\\/g, '/');
      const sourceFile = path.join(tree.defaultDir, relFromLocale);
      if (!existsSync(sourceFile)) {
        skipped.push(rel);
        continue;
      }
      const srcHash = hashBody(matter(await readFile(sourceFile, 'utf8')).content);
      const raw = await readFile(file, 'utf8');
      if (matter(raw).data.sourceHash === srcHash) continue; // already current — no write
      await writeFile(file, upsertFrontmatterField(raw, 'sourceHash', srcHash));
      stamped.push(rel);
    }
  }
  return { stamped, skipped };
}
