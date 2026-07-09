import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractIncludes, resolveInclude } from '../includes.js';
import { renderMarkdown } from '../markdown.js';

describe('snippet includes (W1)', () => {
  let root: string;
  const page = () => path.join(root, 'guides', 'page.md');
  const render = (md: string, roots?: string[]) =>
    renderMarkdown(md, { include: { sourceAbs: page(), roots: roots ?? [root] } });

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ovellum-inc-'));
    mkdirSync(path.join(root, '_snippets'), { recursive: true });
    mkdirSync(path.join(root, 'guides'), { recursive: true });
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('splices a root-absolute snippet (label form)', async () => {
    writeFileSync(path.join(root, '_snippets', 'note.md'), 'Shared **prose**.\n');
    const { html, warnings } = await render('Before.\n\n::include[/_snippets/note.md]\n\nAfter.');
    expect(html).toContain('Shared <strong>prose</strong>.');
    expect(html).toContain('Before.');
    expect(html).toContain('After.');
    expect(warnings).toEqual([]);
  });

  it('accepts the file= attribute form', async () => {
    writeFileSync(path.join(root, '_snippets', 'note.md'), 'Attr form works.\n');
    const { html } = await render('::include{file="/_snippets/note.md"}');
    expect(html).toContain('Attr form works.');
  });

  it('resolves a relative path against the including file', async () => {
    writeFileSync(path.join(root, 'guides', 'aside.md'), 'Relative sibling.\n');
    const { html, warnings } = await render('::include[aside.md]');
    expect(html).toContain('Relative sibling.');
    expect(warnings).toEqual([]);
  });

  it('strips snippet frontmatter and renders directives inside snippets', async () => {
    writeFileSync(
      path.join(root, '_snippets', 'warn.md'),
      '---\ntitle: Never shown\n---\n:::warning\nCareful now.\n:::\n',
    );
    const { html } = await render('::include[/_snippets/warn.md]');
    expect(html).toContain('Careful now.');
    expect(html).toContain('ov-callout'); // directive inside the snippet was transformed
    expect(html).not.toContain('Never shown');
  });

  it('expands nested includes', async () => {
    writeFileSync(path.join(root, '_snippets', 'outer.md'), 'Outer.\n\n::include[inner.md]\n');
    writeFileSync(path.join(root, '_snippets', 'inner.md'), 'Inner.\n');
    const { html, warnings } = await render('::include[/_snippets/outer.md]');
    expect(html).toContain('Outer.');
    expect(html).toContain('Inner.');
    expect(warnings).toEqual([]);
  });

  it('missing target → warning + omitted, page still renders', async () => {
    const { html, warnings } = await render('Intro.\n\n::include[/_snippets/nope.md]');
    expect(html).toContain('Intro.');
    expect(html).not.toContain('include');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('file not found');
  });

  it('a path escaping the content root → warning, never read', async () => {
    const { warnings } = await render('::include[../../etc/hosts]');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('escapes the content directory');
  });

  it('circular includes → warning, no infinite loop', async () => {
    writeFileSync(path.join(root, '_snippets', 'a.md'), '::include[/_snippets/b.md]\n');
    writeFileSync(path.join(root, '_snippets', 'b.md'), '::include[/_snippets/a.md]\n');
    const { warnings } = await render('::include[/_snippets/a.md]');
    expect(warnings.some((w) => w.includes('circular include'))).toBe(true);
  });

  it('falls back to the second root when the first lacks the snippet (i18n)', async () => {
    const jaRoot = path.join(root, 'ja-tree');
    mkdirSync(path.join(jaRoot, 'guides'), { recursive: true });
    writeFileSync(path.join(root, '_snippets', 'shared.md'), 'Default-locale snippet.\n');
    const { html, warnings } = await renderMarkdown('::include[/_snippets/shared.md]', {
      include: { sourceAbs: path.join(jaRoot, 'guides', 'page.md'), roots: [jaRoot, root] },
    });
    expect(html).toContain('Default-locale snippet.');
    expect(warnings).toEqual([]);
  });

  it('an ::include inside a code fence is literal, not expanded', async () => {
    const { html, warnings } = await render('```md\n::include[/_snippets/nope.md]\n```');
    expect(html).toContain('::include');
    expect(warnings).toEqual([]);
  });

  it('without an include context, directives are dropped (no leakage)', async () => {
    const { html } = await renderMarkdown('Before.\n\n::include[/x.md]\n\nAfter.');
    expect(html).toContain('Before.');
    expect(html).toContain('After.');
    expect(html).not.toContain('include');
  });

  it('headings from a snippet flow into the page ToC', async () => {
    writeFileSync(path.join(root, '_snippets', 'sec.md'), '## Included section\n\nBody.\n');
    const { headings } = await render('# Page\n\n::include[/_snippets/sec.md]');
    expect(headings.some((h) => h.text === 'Included section')).toBe(true);
  });
});

describe('extractIncludes', () => {
  it('reports targets with line numbers, skipping code fences', () => {
    const md = [
      '# Title',
      '',
      '::include[/_snippets/a.md]',
      '',
      '```md',
      '::include[/_snippets/fenced.md]',
      '```',
      '',
      '::include{file="/b.md"}',
      '::include[]',
    ].join('\n');
    const refs = extractIncludes(md);
    expect(refs).toEqual([
      { file: '/_snippets/a.md', line: 3 },
      { file: '/b.md', line: 9 },
      { file: null, line: 10 },
    ]);
  });
});

describe('resolveInclude', () => {
  const exists = (abs: string) => existsSync(abs);
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ovellum-res-'));
    writeFileSync(path.join(root, 'x.md'), 'x');
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('resolves root-absolute inside a root', () => {
    expect(resolveInclude('/x.md', root, [root], exists)).toEqual({
      abs: path.join(root, 'x.md'),
    });
  });

  it('rejects traversal out of every root', () => {
    expect(resolveInclude('../x.md', root, [root], exists)).toEqual({
      error: 'path escapes the content directory',
    });
    expect(resolveInclude('/../x.md', root, [root], exists)).toEqual({
      error: 'path escapes the content directory',
    });
  });

  it('reports a contained miss as file not found', () => {
    expect(resolveInclude('/missing.md', root, [root], exists)).toEqual({
      error: 'file not found',
    });
  });
});
