import { describe, expect, it } from 'vitest';
import { generateSitemap } from '../sitemap.js';
import type { PageOutput } from '../build.js';

const PAGES: PageOutput[] = [
  { url: '/', sourcePath: 'content/_landing.md', outputPath: 'dist/index.html', title: 'Home' },
  {
    url: '/getting-started/',
    sourcePath: 'content/getting-started.md',
    outputPath: 'dist/getting-started/index.html',
    title: 'Getting started',
  },
  {
    url: '/guides/deploy/',
    sourcePath: 'content/guides/deploy.md',
    outputPath: 'dist/guides/deploy/index.html',
    title: 'Deploy',
  },
  {
    url: '/404/',
    sourcePath: 'content/404.md',
    outputPath: 'dist/404/index.html',
    title: 'Not found',
  },
];

describe('generateSitemap', () => {
  it('returns undefined without a baseUrl', () => {
    expect(generateSitemap({ pages: PAGES, baseUrl: '' })).toBeUndefined();
  });

  it('emits a fully-qualified <loc> for each page', () => {
    const xml = generateSitemap({ pages: PAGES, baseUrl: 'https://docs.example.com' });
    expect(xml).toBeDefined();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://docs.example.com/</loc>');
    expect(xml).toContain('<loc>https://docs.example.com/getting-started/</loc>');
    expect(xml).toContain('<loc>https://docs.example.com/guides/deploy/</loc>');
  });

  it('excludes /404/ by default', () => {
    const xml = generateSitemap({ pages: PAGES, baseUrl: 'https://x.test' })!;
    expect(xml).not.toContain('/404/');
  });

  it('honors a custom exclude list', () => {
    const xml = generateSitemap({
      pages: PAGES,
      baseUrl: 'https://x.test',
      exclude: ['/404/', '/'],
    })!;
    expect(xml).not.toContain('https://x.test/</loc>');
    expect(xml).toContain('/getting-started/');
  });

  it('strips trailing slash from baseUrl', () => {
    const xml = generateSitemap({ pages: PAGES, baseUrl: 'https://x.test/' })!;
    expect(xml).toContain('<loc>https://x.test/</loc>');
    expect(xml).not.toContain('https://x.test//');
  });

  it('escapes XML metacharacters in URLs', () => {
    const xml = generateSitemap({
      pages: [
        { url: '/a&b/', sourcePath: 's', outputPath: 'o', title: 'AB' },
      ],
      baseUrl: 'https://x.test',
    })!;
    expect(xml).toContain('a&amp;b');
    expect(xml).not.toContain('a&b/');
  });
});
