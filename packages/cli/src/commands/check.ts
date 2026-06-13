import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import matter from 'gray-matter';
import { ConfigError, loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import {
  buildNav,
  extractMarkdownLinks,
  flattenNav,
  resolveHomeRel,
  walkContent,
  type NavNode,
} from '@ovellum/site';
import { detectUnsafeScheme } from './check-utils.js';

interface Issue {
  file: string;
  line: number;
  message: string;
  kind: 'broken-link' | 'unsafe-scheme';
}

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

    const startedAt = Date.now();
    let issues: Issue[];
    let files: string[];
    try {
      if (config.mode === 'manual') {
        ({ issues, files } = await checkManual({ config, cwd }));
      } else {
        ({ issues, files } = await checkGenerated({ config, cwd }));
      }
    } catch (err) {
      if (err instanceof ConfigError) {
        process.stderr.write(`check error: ${err.message}\n`);
        if (err.hint) process.stderr.write(`hint: ${err.hint}\n`);
        process.exit(1);
      }
      throw err;
    }

    const elapsed = Date.now() - startedAt;
    const unsafeCount = issues.filter((i) => i.kind === 'unsafe-scheme').length;
    const brokenCount = issues.length - unsafeCount;
    const lines = [
      `ovellum check complete in ${elapsed}ms`,
      `  config:    ${configFile ?? '(defaults)'}`,
      `  mode:      ${config.mode}`,
      `  pages:     ${files.length}`,
      `  broken links:    ${brokenCount}`,
      `  unsafe schemes:  ${unsafeCount}`,
    ];
    if (issues.length > 0) {
      lines.push('  details:');
      for (const it of issues) {
        const tag = it.kind === 'unsafe-scheme' ? '[SECURITY] ' : '';
        lines.push(`    ${it.file}:${it.line}  ${tag}${it.message}`);
      }
    }
    process.stdout.write(lines.join('\n') + '\n');

    process.exit(issues.length === 0 ? 0 : 1);
  },
});

function collectValidUrls(nav: NavNode, config: OvellumConfig): Set<string> {
  const urls = new Set<string>();
  for (const page of flattenNav(nav)) urls.add(page.url);
  // Landing replaces `/` when enabled.
  if (config.site.landing.enabled) urls.add('/');
  return urls;
}

interface CheckRun {
  issues: Issue[];
  files: string[];
}

interface CheckInput {
  config: OvellumConfig;
  cwd: string;
}

/**
 * Manual mode: walk `input/`, validate every internal link against the
 * sidebar nav. This is the original behaviour.
 */
async function checkManual({ config, cwd }: CheckInput): Promise<CheckRun> {
  const inputAbs = path.resolve(cwd, config.input);
  const outputAbs = path.resolve(cwd, config.output);
  // Honour the same exclusions as `build` (ignoreFolders / ignoreFiles, the
  // structural auto-excludes, and the output dir) so `check` lints only real
  // content — never `node_modules`, dotfiles, dependency READMEs, or a nested
  // output dir under `input: '.'`.
  // Resolve the home file the same way `build` does, so a README/site.home home
  // maps to `/` in the nav — otherwise `check` would flag `/` links as broken.
  const homeRel = resolveHomeRel(inputAbs, config.site);
  const homeBasename = homeRel && !homeRel.includes('/') ? homeRel : undefined;
  const nav = await buildNav(
    config.input,
    cwd,
    config.site.ignoreFolders,
    config.site.ignoreFiles,
    outputAbs,
    homeBasename,
  );
  const validUrls = collectValidUrls(nav, config);

  const issues: Issue[] = [];
  const files: string[] = [];
  for await (const file of walkContent(inputAbs, {
    inputAbs,
    ignoreFolders: config.site.ignoreFolders,
    ignoreFiles: config.site.ignoreFiles ?? [],
    outputAbs,
  })) {
    if (!/\.(md|markdown)$/i.test(file)) continue;
    files.push(file);
    const rel = path.relative(cwd, file).replace(/\\/g, '/');
    const raw = await readFile(file, 'utf8');
    const { content } = matter(raw);
    const url = urlForPage(file, inputAbs);
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
async function checkGenerated({ config, cwd }: CheckInput): Promise<CheckRun> {
  const outputAbs = path.resolve(cwd, config.output);
  if (!existsSync(outputAbs)) {
    throw new ConfigError(
      `output directory does not exist: ${path.relative(cwd, outputAbs)}`,
      { hint: 'Run `ovellum build` first; `ovellum check` validates the generated Markdown.' },
    );
  }

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
