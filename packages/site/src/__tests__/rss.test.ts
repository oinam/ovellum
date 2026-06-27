import { describe, expect, it } from 'vitest';
import { generateRss } from '../rss.js';
import type { PageOutput } from '../build.js';

const PAGES: PageOutput[] = [
  {
    url: '/',
    sourcePath: 'content/_landing.md',
    outputPath: 'dist/index.html',
    title: 'Home',
  },
  {
    url: '/getting-started/',
    sourcePath: 'content/getting-started.md',
    outputPath: 'dist/getting-started/index.html',
    title: 'Getting started',
    description: 'Install and write your first page.',
    lastModified: '2026-05-10T12:00:00.000Z',
  },
  {
    url: '/guides/deploy/',
    sourcePath: 'content/guides/deploy.md',
    outputPath: 'dist/guides/deploy/index.html',
    title: 'Deploy',
    description: 'Ship to GitHub Pages.',
    lastModified: '2026-05-17T09:00:00.000Z',
  },
  {
    url: '/404/',
    sourcePath: 'content/404.md',
    outputPath: 'dist/404/index.html',
    title: 'Not found',
    lastModified: '2026-05-01T00:00:00.000Z',
  },
];

const BUILT_AT = new Date('2026-05-18T10:00:00.000Z');

describe('generateRss', () => {
  it('returns undefined without a baseUrl', () => {
    const out = generateRss({ pages: PAGES, baseUrl: '', title: 'X' });
    expect(out).toBeUndefined();
  });

  it('emits a valid RSS 2.0 channel', () => {
    const xml = generateRss({
      pages: PAGES,
      baseUrl: 'https://docs.example.com',
      title: 'Docs',
      description: 'How to use the thing',
      generatedAt: BUILT_AT,
    })!;
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>Docs</title>');
    expect(xml).toContain('<link>https://docs.example.com/</link>');
    expect(xml).toContain('<description>How to use the thing</description>');
    expect(xml).toContain(
      '<atom:link href="https://docs.example.com/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it('excludes /404/ by default and respects custom excludes', () => {
    const xml = generateRss({
      pages: PAGES,
      baseUrl: 'https://x.test',
      title: 'X',
      exclude: ['/404/', '/'],
      generatedAt: BUILT_AT,
    })!;
    expect(xml).not.toContain('Not found');
    expect(xml).not.toContain('<title>Home</title>');
    expect(xml).toContain('<title>Getting started</title>');
  });

  it('sorts items by lastModified, newest first', () => {
    const xml = generateRss({
      pages: PAGES,
      baseUrl: 'https://x.test',
      title: 'X',
      exclude: ['/'],
      generatedAt: BUILT_AT,
    })!;
    const deployIdx = xml.indexOf('<title>Deploy</title>');
    const startedIdx = xml.indexOf('<title>Getting started</title>');
    const notFoundIdx = xml.indexOf('<title>Not found</title>');
    expect(deployIdx).toBeGreaterThan(-1);
    expect(deployIdx).toBeLessThan(startedIdx);
    expect(startedIdx).toBeLessThan(notFoundIdx);
  });

  it('emits an empty description element when frontmatter has none', () => {
    const xml = generateRss({
      pages: [
        {
          url: '/x/',
          sourcePath: 's',
          outputPath: 'o',
          title: 'X',
          lastModified: '2026-05-10T00:00:00.000Z',
        },
      ],
      baseUrl: 'https://x.test',
      title: 'Site',
      generatedAt: BUILT_AT,
    })!;
    expect(xml).toContain('<description></description>');
  });

  it('honors a basePath in channel link and item links', () => {
    const xml = generateRss({
      pages: PAGES,
      baseUrl: 'https://x.test',
      basePath: '/ovellum',
      title: 'X',
      generatedAt: BUILT_AT,
    })!;
    expect(xml).toContain('<link>https://x.test/ovellum/</link>');
    expect(xml).toContain('<link>https://x.test/ovellum/getting-started/</link>');
  });

  it('escapes XML metacharacters in titles and descriptions', () => {
    const xml = generateRss({
      pages: [
        {
          url: '/x/',
          sourcePath: 's',
          outputPath: 'o',
          title: 'A & B',
          description: '<script>nope</script>',
          lastModified: '2026-05-10T00:00:00.000Z',
        },
      ],
      baseUrl: 'https://x.test',
      title: 'Site & co',
      generatedAt: BUILT_AT,
    })!;
    expect(xml).toContain('<title>Site &amp; co</title>');
    expect(xml).toContain('<title>A &amp; B</title>');
    expect(xml).toContain('&lt;script&gt;nope&lt;/script&gt;');
    expect(xml).not.toContain('<script>nope</script>');
  });

  it('caps items via limit option', () => {
    const many: PageOutput[] = Array.from({ length: 30 }, (_, i) => ({
      url: `/p${i}/`,
      sourcePath: `s${i}`,
      outputPath: `o${i}`,
      title: `P${i}`,
      lastModified: new Date(2026, 0, i + 1).toISOString(),
    }));
    const xml = generateRss({
      pages: many,
      baseUrl: 'https://x.test',
      title: 'X',
      limit: 5,
      generatedAt: BUILT_AT,
    })!;
    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(5);
  });

  it('localePrefix scopes the channel + self link (per-locale feed)', () => {
    const xml = generateRss({
      pages: [
        {
          url: '/ja/guides/deploy/',
          sourcePath: 'content/ja/guides/deploy.md',
          outputPath: 'dist/ja/guides/deploy/index.html',
          title: 'デプロイ',
          lastModified: '2026-05-17T09:00:00.000Z',
        },
      ],
      baseUrl: 'https://ex.com',
      localePrefix: '/ja',
      title: 'X',
      generatedAt: BUILT_AT,
    })!;
    // Channel home + atom self-link carry the locale prefix.
    expect(xml).toContain('<link>https://ex.com/ja</link>');
    expect(xml).toContain('href="https://ex.com/ja/feed.xml"');
    // Item link uses the page's own (already locale-prefixed) URL — once, no doubling.
    expect(xml).toContain('https://ex.com/ja/guides/deploy/');
    expect(xml).not.toContain('/ja/ja/');
  });
});
