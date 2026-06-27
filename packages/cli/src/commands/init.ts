import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confirm, input, select } from '@inquirer/prompts';
import { defineCommand } from 'citty';

/**
 * Scaffold a new Ovellum project in the current (or given) directory.
 *
 * Writes (only what's missing — never clobbers an existing file unless
 * `--force` is passed):
 *
 *   ovellum.config.ts     — primary entry, fully commented (every option is
 *                           listed; active ones set, the rest documented inline
 *                           so users can tinker without leaving the file).
 *   content/index.md      — starter doc, manual + hybrid modes only.
 *   .gitignore            — appended with `dist/` and `.orphans/` if missing.
 *
 * Non-interactive mode (`--yes`): picks every default without prompting.
 */
export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Scaffold a new Ovellum project (config + starter content).',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Project root (defaults to current directory)',
    },
    yes: {
      type: 'boolean',
      description: 'Skip prompts; accept every default. Implies --force is false.',
      alias: 'y',
    },
    force: {
      type: 'boolean',
      description: 'Overwrite an existing ovellum.config.* if present.',
    },
  },
  async run({ args }) {
    const cwd = path.resolve(args.cwd ?? process.cwd());
    const yes = args.yes === true;
    const force = args.force === true;

    const configPath = path.join(cwd, 'ovellum.config.ts');
    // Don't clobber any existing config, whatever its extension.
    const existingConfig = ['ts', 'js', 'mjs', 'cjs', 'json']
      .map((ext) => path.join(cwd, `ovellum.config.${ext}`))
      .find((p) => existsSync(p));
    if (existingConfig && !force) {
      process.stderr.write(
        `${path.basename(existingConfig)} already exists at ${existingConfig}.\n` +
          `Pass --force to overwrite, or run \`ovellum init\` in a different directory.\n`,
      );
      process.exit(2);
    }

    const defaults = await guessDefaults(cwd);

    let answers: InitAnswers;
    if (yes) {
      answers = defaults;
    } else {
      try {
        answers = await ask(defaults);
      } catch (err) {
        // @inquirer throws ExitPromptError on Ctrl-C; treat as a clean abort.
        if (err instanceof Error && err.name === 'ExitPromptError') {
          process.stderr.write('Canceled.\n');
          process.exit(130);
        }
        throw err;
      }
    }

    const writes: string[] = [];

    await writeFile(configPath, renderConfig(answers), 'utf8');
    writes.push(path.relative(cwd, configPath));

    if (answers.mode !== 'auto') {
      const contentDir = path.join(cwd, answers.input);
      const indexMd = path.join(contentDir, 'index.md');
      if (!existsSync(indexMd)) {
        await mkdir(contentDir, { recursive: true });
        await writeFile(indexMd, renderStarterIndex(answers), 'utf8');
        writes.push(path.relative(cwd, indexMd));
      }
    }

    const gitignoreUpdated = await ensureGitignore(cwd, answers);
    if (gitignoreUpdated) writes.push('.gitignore');

    // AGENTS.md — instructions for AI coding agents (the protected-zone contract
    // + commands). Written only if absent, so we never clobber a user's own.
    const agentsPath = path.join(cwd, 'AGENTS.md');
    if (!existsSync(agentsPath)) {
      await writeFile(agentsPath, renderAgentsMd(answers), 'utf8');
      writes.push('AGENTS.md');
    }

    const lines = [
      `ovellum project initialized in ${cwd === process.cwd() ? '.' : cwd}/`,
      `  mode:      ${answers.mode}`,
      `  written:`,
      ...writes.map((w) => `    + ${w}`),
      '',
      'Next steps:',
      ...nextSteps(answers),
    ];
    process.stdout.write(lines.join('\n') + '\n');
  },
});

interface InitAnswers {
  name: string;
  mode: 'manual' | 'auto' | 'hybrid';
  title: string;
  description: string;
  input: string;
  output: string;
  tsconfig: string;
  defaultTheme: 'auto' | 'light' | 'dark';
  landing: boolean;
}

async function guessDefaults(cwd: string): Promise<InitAnswers> {
  let name = path.basename(cwd) || 'my-docs';
  // If a package.json is present, prefer its name as the default.
  try {
    const raw = await readFile(path.join(cwd, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { name?: string };
    if (typeof parsed.name === 'string' && parsed.name.length > 0) {
      name = parsed.name.replace(/^@[^/]+\//, '');
    }
  } catch {
    // no package.json or unreadable — fall back to the folder name.
  }
  return {
    name,
    mode: 'manual',
    title: titleFromName(name),
    description: '',
    input: 'content',
    output: 'dist',
    tsconfig: 'tsconfig.json',
    defaultTheme: 'auto',
    landing: false,
  };
}

async function ask(d: InitAnswers): Promise<InitAnswers> {
  const name = await input({ message: 'Project name', default: d.name });
  const mode = (await select({
    message: 'Documentation mode',
    default: d.mode,
    choices: [
      {
        name: 'manual — write Markdown by hand; Ovellum builds a static site',
        value: 'manual',
      },
      {
        name: 'auto — generate Markdown from TS/JS source on every build',
        value: 'auto',
      },
      {
        name: 'hybrid — generate, then merge with hand-written zones',
        value: 'hybrid',
      },
    ],
  })) as InitAnswers['mode'];

  const title = await input({ message: 'Site title', default: titleFromName(name) });
  const description = await input({
    message: 'Short description (used for <meta name=description>)',
    default: '',
  });

  let input_ = d.input;
  let output = d.output;
  let tsconfig = d.tsconfig;
  let landing = d.landing;
  if (mode === 'manual') {
    input_ = await input({ message: 'Content directory', default: d.input, validate: validateDir });
    output = await input({ message: 'Output directory', default: d.output, validate: validateDir });
    landing = await confirm({
      message: 'Generate a landing page at / (hero + feature grid)?',
      default: false,
    });
  } else {
    tsconfig = await input({ message: 'TypeScript config', default: d.tsconfig });
    output = await input({
      message: 'Output directory for generated Markdown',
      default: 'docs',
      validate: validateDir,
    });
  }

  const defaultTheme = (await select({
    message: 'Default theme',
    default: d.defaultTheme,
    choices: [
      { name: 'auto — follow system preference', value: 'auto' },
      { name: 'light', value: 'light' },
      { name: 'dark', value: 'dark' },
    ],
  })) as InitAnswers['defaultTheme'];

  return { name, mode, title, description, input: input_, output, tsconfig, defaultTheme, landing };
}

/**
 * Validate a prompted content/output directory: it must stay inside the
 * project. Reject absolute paths and any `..` segment before we
 * `path.join(cwd, …)` with it, so a stray answer can't write outside cwd.
 */
export function validateDir(value: string): true | string {
  const v = value.trim();
  if (v.length === 0) return 'Please enter a directory.';
  if (path.isAbsolute(v)) return 'Use a path relative to the project, not an absolute one.';
  if (v.split(/[\\/]/).includes('..')) return 'Path must stay inside the project (no `..`).';
  return true;
}

/** Single-quote a string value for embedding in the generated TS. */
function q(s: string): string {
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/**
 * Render a fully-commented `ovellum.config.ts`. Every option is present —
 * active ones set from the answers, the rest commented with their default (or
 * an example) plus the allowed values — so a user can tinker entirely in this
 * file without opening the docs. `import type` is erased at config-load time,
 * so there's no runtime dependency on `ovellum` resolving from the project.
 */
function renderConfig(a: InitAnswers): string {
  const isManual = a.mode === 'manual';

  const sourceLines = isManual
    ? `  input: ${q(a.input)}, // content directory — your .md files
  output: ${q(a.output)},`
    : `  input: ${q(a.input)}, // TS/JS source to document
  output: ${q(a.output)},
  // tsconfig: ${q(a.tsconfig)},
  // include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  // exclude: ['node_modules', 'dist', '**/*.test.*', '**/*.d.ts'],
  // includeInternal: false, // include @internal-tagged symbols
  // includePrivate: false,  // include private class members`;

  const descLine = a.description
    ? `    description: ${q(a.description)},`
    : `    // description: 'One-line summary used in <meta> and the footer.',`;

  const landingBlock =
    !isManual || !a.landing
      ? `    // landing: { enabled: false }, // homepage at / (hero + feature grid + CTAs)`
      : `    landing: {
      enabled: true,
      hero: {
        title: ${q(a.title)},
        subtitle: ${q(a.description || 'Edit this in ovellum.config.ts.')},
        ctas: [
          { label: 'Get started', href: '/getting-started/' },
          { label: 'View on GitHub', href: 'https://github.com/' },
        ],
      },
      features: [],
    },`;

  const protectBlock =
    a.mode === 'hybrid'
      ? `
  // Hybrid only — protected-zone markers + orphan handling (defaults shown):
  // protect: {
  //   blockTag: '@manual', inlineTag: '@preserve',
  //   orphanStrategy: 'quarantine', orphanDir: '.ovellum/orphans', orphanRetention: 90,
  // },`
      : '';

  return `// ovellum.config.ts — your Ovellum site configuration.
//
// Every option is listed below: active lines are set, commented lines show the
// default (or an example) plus the allowed values, so you can tinker right here
// without leaving the file. Full reference:
//   https://ovellum.oss.oinam.com/docs/reference/config/
//
// \`import type\` is erased when the config loads, so this file has no runtime
// dependency on \`ovellum\` resolving here — it's purely for editor autocomplete.
import type { OvellumUserConfig } from 'ovellum';

export default {
  name: ${q(a.name)},
  // version: 'auto', // 'auto' reads package.json#version; or a literal like '1.2.0'
  mode: ${q(a.mode)}, // 'manual' | 'auto' | 'hybrid'
${sourceLines}
  // defaultFormat: 'md', // 'md' | 'mdx'

  site: {
    title: ${q(a.title)},
${descLine}
    // logo: '/public/logo.svg', // brand mark before the title (theme-flipping monochrome); unset = title only
    // favicon: '/favicon.ico',  // default: a root-level favicon.ico
    // home: 'index.md',         // page rendered at /; auto-resolves to index.md, else a root README.md
    // baseUrl: 'https://example.com', // enables sitemap.xml, RSS, and canonical links
    // basePath: '/docs',        // serve under a subpath (e.g. GitHub project pages)
    // Multiple languages (i18n) — content moves to content/<code>/ subtrees,
    // defaultLocale serves at the root, others under /<code>/. Adds a topbar
    // language picker. Codes are BCP 47 (en-US, ja, zh-Hans). See the i18n guide.
    // defaultLocale: 'en-US',
    // locales: [{ code: 'en-US', label: 'English' }, { code: 'ja', label: '日本語' }],
    defaultTheme: ${q(a.defaultTheme)}, // 'auto' | 'light' | 'dark'
    // palette: 'default',       // 'default' | 'nord' | 'flexoki' | 'solarized' | 'eink'
    // accent: 'oklch(57% 0.16 255)', // primary color (CTA buttons, links, focus); any CSS color
    // font: 'sans',             // 'sans' | 'serif' (system) | 'inter' | 'geist' (bundled webfonts, lazy)
    // dateFormat: 'humanized',  // 'humanized' (today / Jun 14, 2026) | 'iso' (2026-06-14)
    // footer: 'Your Name',      // footer text / copyright line
    // credit: true,             // 'Built with Ovellum' footer link; set false to remove
    // codeTheme: 'github',      // 'github' | 'nord' | 'solarized'
    // editUrlPattern: 'https://github.com/you/repo/edit/main/{path}',
    // search: { enabled: false }, // true → Pagefind search box + Cmd/K (adds a build pass + client payload)
    // pageMeta: { readingTime: true, lastModified: true }, // 'N min read · Edited …' line above each article
    // sidebar: { collapse: true }, // collapse folders by default (a folder's _meta.json can override per-folder)
    // backToTop: { enabled: true, threshold: 360 }, // floating button after THRESHOLD px of scroll
    // publicDir: 'public',      // RESERVED static-assets dir → copied to the output ROOT (public/favicon.ico → /favicon.ico); never processed
    // assetBaseUrl: 'https://cdn.example.com/site', // serve publicDir from a CDN: skip the local copy + rewrite /asset refs to this base (like Vite base / Next assetPrefix)
    // ignoreFolders: [],        // folder names to exclude at any depth
    // ignoreFiles: [],          // file globs to exclude, e.g. ['README.md', 'drafts/**']
    // topbarNav: [              // right-aligned top-bar links (title + URL)
    //   { label: 'GitHub', href: 'https://github.com/you/repo', icon: 'github', external: true },
    // ],
    // footerNav: [              // footer links (icon optional: github | npm | rss | mail)
    //   { label: 'GitHub', href: 'https://github.com/you/repo', icon: 'github', external: true },
    // ],
    // headExtra: '', // raw HTML injected into <head> (analytics, fonts) — author-controlled, NOT sanitised
${landingBlock}
  },

  // update: { check: true, intervalHours: 24 }, // CLI "update available" notice (auto-off in CI / non-TTY)
${protectBlock}
} satisfies OvellumUserConfig;
`;
}

export function renderStarterIndex(a: InitAnswers): string {
  // Hybrid mode's headline promise, shown by example: a `@manual` zone whose
  // prose survives every regeneration. New users meet the moat on day one.
  const protectedZone =
    a.mode === 'hybrid'
      ? `## Your writing is safe

In hybrid mode Ovellum generates docs from your source, then merges your
hand-written prose back in. Anything inside a \`@manual\` zone survives every
rebuild — the generator updates *around* it, never *over* it:

<!-- @manual:start id="welcome-note" -->

**Add your own notes here — this block survives every rebuild.** Rename or delete
the documented symbol and Ovellum quarantines this prose to \`.ovellum/orphans/\`
instead of dropping it.

<!-- @manual:end -->

`
      : '';
  return `---
title: ${a.title}
description: ${a.description || 'Welcome to ' + a.title + '.'}
---

# ${a.title}

${a.description || `Welcome to **${a.title}**. This file is \`${a.input}/index.md\` and it becomes the home page when you run \`ovellum build\`.`}

${protectedZone}## Next steps

- Edit this file and re-run \`ovellum build\` (or \`ovellum watch\` for live rebuilds).
- Add more \`.md\` files alongside this one — they become pages automatically.
- Group pages by creating subdirectories; add \`_meta.json\` to control titles
  and ordering. See the [reference](https://ovellum.oss.oinam.com/reference/config/).

## Tips

- Code blocks are syntax-highlighted with Shiki.
- The right-side ToC is built from your h2/h3 headings.
- Drop static assets (images, etc.) in this directory; they're copied through.
`;
}

async function ensureGitignore(cwd: string, a: InitAnswers): Promise<boolean> {
  const gi = path.join(cwd, '.gitignore');
  const want = a.mode === 'auto' ? [a.output, '.orphans/'] : [a.output, '.orphans/'];
  const wantNorm = want.map((p) => stripTrailingSlash(p));

  let current = '';
  if (existsSync(gi)) current = await readFile(gi, 'utf8');
  const have = new Set(
    current
      .split(/\r?\n/)
      .map((l) => stripTrailingSlash(l.trim()))
      .filter(Boolean),
  );
  const missing = wantNorm.filter((p) => !have.has(p));
  if (missing.length === 0) return false;

  const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  const block = `${prefix}# Ovellum\n${missing.map((p) => p + '/').join('\n')}\n`;
  await writeFile(gi, current + block, 'utf8');
  return true;
}

function nextSteps(a: InitAnswers): string[] {
  if (a.mode === 'manual') {
    return [
      `  1. Edit ${a.input}/index.md and add more pages.`,
      `  2. Run \`ovellum build\` (or \`ovellum watch\`) to render the site.`,
      `  3. Run \`ovellum check\` to validate internal links.`,
      `  4. Deploy ${a.output}/ to GitHub Pages, Netlify, Vercel, or any static host.`,
    ];
  }
  return [
    `  1. Point \`tsconfig\` at the project you want to document.`,
    `  2. Run \`ovellum build\` to generate Markdown into ${a.output}/.`,
    `  3. ${a.mode === 'hybrid' ? 'Add hand-written zones inside `<!-- @manual:start id="…" --> … <!-- @manual:end -->` markers; they survive regeneration.' : 'Re-run on every source change; the output is fully regenerated each time.'}`,
  ];
}

/**
 * Render an `AGENTS.md` — the cross-tool convention for instructions to coding
 * agents. Mode-aware: the hybrid/auto variants lead with the protected-zone
 * contract (what survives regeneration), since that's the rule an agent most
 * needs to respect; manual leads with "edit the Markdown, never the output".
 */
export function renderAgentsMd(a: InitAnswers): string {
  const automation = 'https://ovellum.oss.oinam.com/docs/guides/automation/';

  if (a.mode === 'manual') {
    return `# AGENTS.md

Guidance for AI coding agents in this repository. This is an **Ovellum**
documentation project in **manual** mode: hand-written Markdown built into a
static site.

## Layout

- \`${a.input}/\` — the Markdown you edit. Each \`.md\` is a page; subfolders group
  pages; an \`_meta.json\` controls titles and ordering.
- \`${a.output}/\` — generated output. **Never edit by hand** — it is overwritten on
  every build.

## Commands

- \`ovellum build\` — render the site to \`${a.output}/\` (\`--json\` for machine output).
- \`ovellum check\` — validate internal links + flag unsafe URLs (\`--json\`; exit 1
  on issues).
- \`ovellum dev\` — build + watch + live-reload while editing.

## For agents

- Edit \`.md\` files under \`${a.input}/\`; do not touch \`${a.output}/\`.
- Run \`ovellum check\` after edits and fix any broken links it reports.
- Machine-readable \`--json\` output and an MCP server (\`ovellum mcp\`) are
  available — see ${automation}
`;
  }

  const generated = a.output;
  const zoneRules =
    a.mode === 'hybrid'
      ? `## The protected-zone contract (read this first)

- Generated Markdown lives in \`${generated}/\` and is **regenerated on every build**.
- Hand-written prose survives **only** inside a protected zone:

\`\`\`markdown
<!-- @manual:start id="rationale" -->
Your prose here — this survives regeneration.
<!-- @manual:end -->
\`\`\`

- Anything **outside** a protected zone in a generated file is overwritten on the
  next build. Edit the JSDoc in the **source** to change generated content.
- When the symbol a zone was attached to disappears (a rename/refactor), its
  prose is moved to \`.ovellum/orphans/\` rather than lost. Review with
  \`ovellum orphans\`; \`ovellum diff\` flags likely renames.
`
      : `## What's editable

- This project is **auto** mode: \`${generated}/\` is **fully regenerated from source**
  on every build. **Never edit \`${generated}/\` by hand** — change the JSDoc in the
  source instead. (Switch to \`hybrid\` mode if you need hand-written prose that
  survives regeneration.)
`;

  return `# AGENTS.md

Guidance for AI coding agents in this repository. This is an **Ovellum**
documentation project in **${a.mode}** mode: API docs generated from
TypeScript/JavaScript source${a.mode === 'hybrid' ? ', merged with hand-written prose' : ''}.

${zoneRules}
## Commands

- \`ovellum build\` — parse source, generate${a.mode === 'hybrid' ? ', merge' : ''} (\`--json\` for machine output).
- \`ovellum diff\` — preview what a rebuild would change: added / removed / changed
  / renamed symbols, and which docs (\`--json\`, \`--exit-code\`).
- \`ovellum check\` — validate internal links (\`--json\`; exit 1 on issues).${
    a.mode === 'hybrid' ? '\n- `ovellum orphans` — list quarantined prose (`--stale`, `--json`).' : ''
  }

## For agents
${
  a.mode === 'hybrid'
    ? `
- To add prose to a generated doc, wrap it in a \`@manual\` zone under the relevant
  anchor — or use the MCP \`ovellum_write_zone\` tool, which does this safely.
- Never edit generated content outside a protected zone; it won't survive.`
    : `
- Don't hand-edit \`${generated}/\`; change the source's JSDoc and rebuild.`
}
- Machine-readable \`--json\` output and an MCP server (\`ovellum mcp\`) are
  available — see ${automation}
`;
}

function titleFromName(name: string): string {
  return name
    .split(/[-_./@\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}
