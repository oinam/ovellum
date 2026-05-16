import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { defineCommand } from 'citty';
import matter from 'gray-matter';
import { ConfigError, loadOvellumConfig } from '@ovellum/core';
import { buildNav, extractMarkdownLinks, flattenNav, type NavNode } from '@ovellum/site';
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

    if (config.mode !== 'manual') {
      process.stderr.write(
        `'check' currently supports manual mode only. Got '${config.mode}'. ` +
          `Hybrid / auto coverage is tracked in TODO.md Phase 6.\n`,
      );
      process.exit(1);
    }

    const startedAt = Date.now();
    const inputAbs = path.resolve(cwd, config.input);
    const nav = await buildNav(config.input, cwd);
    const validUrls = collectValidUrls(nav, config);

    const issues: Issue[] = [];
    const files: string[] = [];
    for await (const file of walkMarkdown(inputAbs)) {
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

function collectValidUrls(
  nav: NavNode,
  config: import('@ovellum/core').OvellumConfig,
): Set<string> {
  const urls = new Set<string>();
  for (const page of flattenNav(nav)) urls.add(page.url);
  // Landing replaces `/` when enabled.
  if (config.site.landing.enabled) urls.add('/');
  return urls;
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
