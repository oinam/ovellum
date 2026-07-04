import { describe, expect, it } from 'vitest';
import {
  resolveAiConfig,
  mdMirrorPath,
  renderPageMarkdown,
  renderRobotsTxt,
  generateLlmsTxt,
  generateLlmsFullText,
  type AiDoc,
} from '../llms.js';

describe('resolveAiConfig', () => {
  it('defaults to llms.txt + mirror on, full-text off', () => {
    expect(resolveAiConfig(undefined)).toEqual({ llmsTxt: true, fullText: false, mdMirror: true });
  });

  it('enabled:false forces everything off', () => {
    expect(resolveAiConfig({ enabled: false, llmsTxt: true, mdMirror: true })).toEqual({
      llmsTxt: false,
      fullText: false,
      mdMirror: false,
    });
  });

  it('honors individual toggles', () => {
    expect(resolveAiConfig({ fullText: true, mdMirror: false })).toEqual({
      llmsTxt: true,
      fullText: true,
      mdMirror: false,
    });
  });
});

describe('mdMirrorPath', () => {
  it('appends .md to the page path, dropping the trailing slash', () => {
    expect(mdMirrorPath('/guide/intro/')).toBe('guide/intro.md');
    expect(mdMirrorPath('/ja/guide/')).toBe('ja/guide.md');
  });

  it('maps the home page to index.md', () => {
    expect(mdMirrorPath('/')).toBe('index.md');
  });

  it('returns null for any 404 page', () => {
    expect(mdMirrorPath('/404/')).toBeNull();
    expect(mdMirrorPath('/ja/404/')).toBeNull();
  });
});

describe('renderPageMarkdown', () => {
  it('prepends an H1 title when the body lacks one', () => {
    expect(renderPageMarkdown('Install', 'Some prose.')).toBe('# Install\n\nSome prose.\n');
  });

  it('leaves an existing leading H1 untouched', () => {
    expect(renderPageMarkdown('Install', '# Setup\n\nSome prose.')).toBe('# Setup\n\nSome prose.\n');
  });
});

const DOCS: AiDoc[] = [
  {
    url: '/getting-started/',
    link: '/getting-started.md',
    title: 'Getting started',
    description: 'Install and write your first page.',
    markdown: '# Getting started\n\nInstall it.',
  },
  {
    url: '/guides/deploy/',
    link: '/guides/deploy.md',
    title: 'Deploy',
    markdown: 'Ship the dist folder anywhere.',
  },
];

describe('generateLlmsTxt', () => {
  it('emits a titled, summarized link index using the link field', () => {
    const txt = generateLlmsTxt({
      siteTitle: 'Ovellum',
      siteDescription: 'Docs tool.',
      docs: DOCS,
    });
    expect(txt).toContain('# Ovellum');
    expect(txt).toContain('> Docs tool.');
    expect(txt).toContain('## Docs');
    expect(txt).toContain('- [Getting started](/getting-started.md): Install and write your first page.');
    // No description → no trailing colon.
    expect(txt).toContain('- [Deploy](/guides/deploy.md)\n');
  });
});

describe('generateLlmsFullText', () => {
  it('concatenates every page body under an H1, rule-separated', () => {
    const full = generateLlmsFullText('Ovellum', DOCS);
    expect(full.startsWith('# Ovellum\n')).toBe(true);
    expect(full).toContain('# Getting started');
    expect(full).toContain('Install it.');
    expect(full).toContain('Ship the dist folder anywhere.');
    expect(full).toContain('---');
  });
});

describe('renderRobotsTxt', () => {
  it('with a baseUrl: sitemap line + absolute llms.txt pointer', () => {
    const txt = renderRobotsTxt('https://example.com/', '');
    expect(txt).toContain('User-agent: *\nAllow: /');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
    expect(txt).toContain('# https://example.com/llms.txt');
  });

  it('without a baseUrl: no sitemap line, path-only llms.txt pointer', () => {
    const txt = renderRobotsTxt(undefined, '/docs');
    expect(txt).not.toContain('Sitemap:');
    expect(txt).toContain('# /docs/llms.txt');
  });
});
