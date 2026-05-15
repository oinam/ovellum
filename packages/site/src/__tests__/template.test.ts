import { describe, expect, it } from 'vitest';
import { renderPage } from '../template.js';
import type { NavNode } from '../nav.js';

const NAV: NavNode = {
  title: 'Home',
  url: '/',
  sourcePath: 'content/index.md',
  children: [
    {
      title: 'Getting started',
      url: '/getting-started/',
      sourcePath: 'content/getting-started.md',
      children: [],
    },
    {
      title: 'Guides',
      url: '/guides/',
      children: [
        {
          title: 'Deploy',
          url: '/guides/deploy/',
          sourcePath: 'content/guides/deploy.md',
          children: [],
        },
      ],
    },
  ],
};

describe('renderPage', () => {
  it('produces a full HTML document with the resolved title', () => {
    const html = renderPage({
      site: { title: 'My site', defaultTheme: 'auto', footer: 'fin' },
      nav: NAV,
      url: '/getting-started/',
      title: 'Getting started',
      bodyHtml: '<p>hi</p>',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Getting started · My site</title>');
    expect(html).toContain('data-theme="auto"');
    expect(html).toContain('<p>hi</p>');
    expect(html).toContain('fin');
  });

  it('marks the active sidebar link', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/getting-started/',
      title: 'Getting started',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(html).toMatch(
      /<a class="ov-nav-link is-active" href="\/getting-started\/">Getting started<\/a>/,
    );
  });

  it('omits the canonical link when baseUrl is absent', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(html).not.toContain('rel="canonical"');
  });

  it('renders the ToC when headings are present, and omits it when empty', () => {
    const withToc = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [
        { depth: 2, text: 'Intro', id: 'intro' },
        { depth: 3, text: 'Detail', id: 'detail' },
      ],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withToc).toContain('On this page');
    expect(withToc).toContain('href="#intro"');
    expect(withToc).toContain('href="#detail"');

    const withoutToc = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withoutToc).not.toContain('ov-toc-title');
    expect(withoutToc).not.toContain('ov-toc-inner');
  });
});
