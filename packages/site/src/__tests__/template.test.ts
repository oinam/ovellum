import { describe, expect, it } from 'vitest';
import { renderPage } from '../template.js';
import { resolveStrings } from '../strings.js';
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

  it('collapses sidebar folders by default, opening only the active branch', () => {
    // Active page is inside "Guides" → that folder opens; it's the only folder.
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/guides/deploy/',
      title: 'Deploy',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    // Folder is a <details> with a chevron, and it's open (holds the active page).
    expect(html).toContain('<details class="ov-nav-section" open>');
    expect(html).toContain('class="ov-nav-chevron"');

    // On an unrelated page, the same folder collapses (no `open`).
    const collapsed = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/getting-started/',
      title: 'Getting started',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(collapsed).toContain('<details class="ov-nav-section">');
    expect(collapsed).not.toContain('<details class="ov-nav-section" open>');
  });

  it('emits <meta name="keywords"> from page tags', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      tags: ['howto', 'setup'],
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(html).toContain('<meta name="keywords" content="howto, setup">');
  });

  it('renders the back-to-top button with the default threshold, and honors config', () => {
    const def = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(def).toContain('data-ov-to-top="360"'); // default threshold

    const custom = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', backToTop: { enabled: true, threshold: 200 } },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(custom).toContain('data-ov-to-top="200"');

    const off = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', backToTop: { enabled: false, threshold: 360 } },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(off).not.toContain('ov-to-top');
  });

  it('shows a "Built with Ovellum" credit by default, and omits it when credit is false', () => {
    const withCredit = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: 'My copyright' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(withCredit).toContain('class="ov-footer-credit" href="https://ovellum.oss.oinam.com"');
    expect(withCredit).toContain('Built with Ovellum');
    expect(withCredit).toContain('My copyright');

    const noCredit = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: 'My copyright', credit: false },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(noCredit).not.toContain('ov-footer-credit');
    expect(noCredit).toContain('My copyright');
  });

  it('renders a footer with just the credit when there is no footer text', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    // Default credit:true means the footer still renders (just the credit link).
    expect(html).toContain('<footer class="ov-footer">');
    expect(html).toContain('ov-footer-credit');
  });

  it('renders a folder with its own index page as a bold category heading link', () => {
    const navWithSectionIndex: NavNode = {
      title: 'Home',
      url: '/',
      sourcePath: 'content/index.md',
      children: [
        {
          title: 'Guides',
          url: '/guides/',
          sourcePath: 'content/guides/index.md', // folder HAS an index.md
          children: [
            { title: 'Install', url: '/guides/install/', sourcePath: 'content/guides/install.md', children: [] },
          ],
        },
      ],
    };
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: navWithSectionIndex,
      url: '/guides/install/',
      title: 'Install',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    // The folder heading is a group-styled (bold) link, not a plain nav-link.
    expect(html).toContain('class="ov-nav-group ov-nav-group--link" href="/guides/"');
    expect(html).not.toContain('class="ov-nav-link" href="/guides/"');
    // The leaf child stays a normal link.
    expect(html).toContain('class="ov-nav-link is-active" href="/guides/install/"');
  });

  it('lets a folder _meta collapse override the global default', () => {
    // node.collapse === false forces the folder open even when the global
    // default collapses; node.collapse === true collapses it even when the
    // global default expands.
    const navWithOverride: NavNode = {
      title: 'Home',
      url: '/',
      sourcePath: 'content/index.md',
      children: [
        {
          title: 'Pinned open',
          url: '/pinned/',
          collapse: false,
          children: [
            { title: 'Child', url: '/pinned/child/', sourcePath: 'content/pinned/child.md', children: [] },
          ],
        },
      ],
    };
    // Global collapse=true, but the folder's override (false) keeps it open.
    const collapsedGlobal = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', sidebar: { collapse: true } },
      nav: navWithOverride,
      url: '/somewhere-else/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(collapsedGlobal).toContain('<details class="ov-nav-section" open>');
  });

  it('auto-expands every folder when site.sidebar.collapse is false', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', sidebar: { collapse: false } },
      nav: NAV,
      url: '/getting-started/',
      title: 'Getting started',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(html).toContain('<details class="ov-nav-section" open>');
    expect(html).not.toContain('<details class="ov-nav-section">');
  });

  it('omits the brand mark when site.logo is unset, keeping just the title', () => {
    const html = renderPage({
      site: { title: 'My site', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(html).not.toContain('ov-brand-mark');
    expect(html).toContain('<span class="ov-brand-name">My site</span>');
    // Favicon defaults to /favicon.ico.
    expect(html).toContain('<link rel="icon" href="/favicon.ico">');
  });

  it('renders a masked, theme-flipping brand mark when site.logo is set', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', logo: '/public/logo.svg' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(html).toContain('class="ov-brand-mark"');
    expect(html).toContain('mask-image:url(/public/logo.svg)');
  });

  it('respects a custom favicon and basePath-prefixes it', () => {
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        favicon: '/icon.svg',
        basePath: '/docs',
        logo: '/public/logo.svg',
      },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-13T00:00:00.000Z',
    });
    expect(html).toContain('<link rel="icon" href="/docs/icon.svg">');
    // The logo path is basePath-prefixed inside the mask too.
    expect(html).toContain('mask-image:url(/docs/public/logo.svg)');
  });

  it('renders the appearance control with mode, palette, and accent groups', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    // Unconfigured palette falls back to default on <html>.
    expect(html).toContain('data-palette="default"');
    expect(html).toContain('data-ov-appearance-toggle');
    // Two panel instances: desktop popover + mobile sheet.
    expect(html.match(/data-ov-appearance-panel/g)).toHaveLength(2);
    for (const mode of ['auto', 'light', 'dark']) {
      expect(html).toContain(`data-ov-mode="${mode}"`);
    }
    for (const palette of ['default', 'nord', 'flexoki', 'solarized', 'eink']) {
      expect(html).toContain(`data-ov-palette="${palette}"`);
    }
    // macOS was removed; the "Default" palette displays as "Ovellum".
    expect(html).not.toContain('data-ov-palette="macos"');
    expect(html).toContain('Ovellum');
    expect(html).toContain('data-ov-accent=""'); // "theme default" clear swatch
    expect(html).toContain('data-ov-accent-custom');
    // No accent configured → no server-rendered override on <html>.
    expect(html).not.toContain('data-accent="custom"');
    // Text-size scale: five steps, default in the middle.
    for (const size of ['xs', 's', 'm', 'l', 'xl']) {
      expect(html).toContain(`data-ov-text-size="${size}"`);
    }
    // Font picker: the four families, with the system option labeled clearly.
    for (const font of ['sans', 'serif', 'inter', 'geist']) {
      expect(html).toContain(`data-ov-font="${font}"`);
    }
    expect(html).toContain('Sans-Serif (Default)');
    // Unconfigured font falls back to system sans on <html>.
    expect(html).toContain('data-font="sans"');
  });

  it('supports a custom site.font object (B4): source link, scoped vars, picker entry', () => {
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        font: {
          body: "'Brand Sans', system-ui",
          mono: 'Menlo, monospace',
          source: '/fonts.css',
          label: 'Brand',
        },
      },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    // Default font is the custom one; readers can still switch via the picker.
    expect(html).toContain('data-font="custom"');
    expect(html).toContain('<link rel="stylesheet" href="/fonts.css">');
    expect(html).toContain(
      `[data-font="custom"]{ --font-body: 'Brand Sans', system-ui; --font-mono: Menlo, monospace; }`,
    );
    // Picker gains a "Brand"-labelled custom entry, previewed in its own family.
    expect(html).toContain('data-ov-font="custom"');
    expect(html).toContain('style="font-family:&#39;Brand Sans&#39;, system-ui"');
    expect(html).toContain('Brand');
  });

  it('sanitizes CSS-breaking characters; absolute source URLs pass through', () => {
    // Belt-and-braces: even if validation were bypassed, the family is sanitized.
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        font: { body: 'Brand} body{display:none', source: 'http://cdn.test/f.css' },
      },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    expect(html).not.toContain('body{display:none');
    expect(html).toContain('<link rel="stylesheet" href="http://cdn.test/f.css">');
  });

  it('renders a version picker from versionAlternates (B6)', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/guides/install/',
      title: 'Install',
      bodyHtml: '',
      headings: [],
      versionAlternates: [
        { id: 'v2', label: 'v2 (latest)', url: '/guides/install/', current: true, isLatest: true },
        { id: 'v1', label: 'v1', url: '/v1/guides/install/', current: false, isLatest: false },
      ],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    expect(html).toContain('ov-version');
    // Current version marked; the other links to the same page in v1.
    expect(html).toContain('class="ov-lang-option is-current" href="/guides/install/"');
    expect(html).toContain('href="/v1/guides/install/"');
    expect(html).toContain('v2 (latest)');
  });

  it('omits the version picker when there is only one version', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      versionAlternates: [{ id: 'v1', label: 'v1', url: '/', current: true, isLatest: true }],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    expect(html).not.toContain('ov-version');
  });

  it('renders the language picker, <html lang>, and hreflang for i18n pages', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', baseUrl: 'https://x.test' },
      nav: NAV,
      url: '/ja/guides/install/',
      title: 'Install',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
      lang: 'ja',
      localeAlternates: [
        {
          code: 'en-US',
          label: 'English',
          url: '/guides/install/',
          current: false,
          translated: true,
          isDefault: true,
        },
        {
          code: 'ja',
          label: '日本語',
          url: '/ja/guides/install/',
          current: true,
          translated: true,
          isDefault: false,
        },
      ],
    });
    expect(html).toContain('<html lang="ja"');
    expect(html).toContain('ov-lang-toggle');
    expect(html).toContain('English');
    expect(html).toContain('日本語');
    expect(html).toContain('href="/guides/install/"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('hreflang="en-US" href="https://x.test/guides/install/"');
    expect(html).toContain('hreflang="ja" href="https://x.test/ja/guides/install/"');
    expect(html).toContain('hreflang="x-default" href="https://x.test/guides/install/"');
  });

  it('renders a section breadcrumb with no index page as text, not a dead link', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/docs/guides/themes/',
      title: 'Themes',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
      breadcrumbs: [
        { title: 'Home', url: '/', page: true },
        { title: 'Docs', url: '/docs/', page: true }, // has an index page → link
        { title: 'Guides', url: '/docs/guides/', page: false }, // no index → text
        { title: 'Themes', url: '/docs/guides/themes/', page: true }, // current → text
      ],
    });
    // The linkable section ("Docs") is an anchor…
    expect(html).toContain('<a href="/docs/">Docs</a>');
    // …but the page-less "Guides" crumb is plain text, NOT a link to /docs/guides/.
    expect(html).not.toContain('href="/docs/guides/"');
    expect(html).toContain('>Guides</li>');
  });

  it('localizes config nav links and de-dupes the auto-Docs link on i18n pages', () => {
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        topbarNav: [{ label: 'Docs', href: '/docs/' }],
        footerNav: [
          { label: 'Security', href: '/docs/reference/security/' },
          { label: 'RSS', href: '/feed.xml', icon: 'rss' },
        ],
      },
      nav: NAV,
      url: '/ja/docs/install/',
      title: 'Install',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
      docsHref: '/ja/docs/', // build resolves landing.docsHref + locale prefix
      localePrefix: '/ja',
    });
    // The config "Docs" link is locale-prefixed → /ja/docs/ (NOT the English /docs/).
    expect(html).toContain('href="/ja/docs/"');
    expect(html).not.toContain('href="/docs/"');
    // And it de-dupes against the auto-Docs link: exactly one "Docs" text link
    // per topbar instance (desktop + mobile sheet = 2), not four.
    expect((html.match(/>Docs</g) ?? []).length).toBe(2);
    // Footer page links are localized; asset links (feed.xml) stay root-served.
    expect(html).toContain('href="/ja/docs/reference/security/"');
    expect(html).toContain('href="/feed.xml"');
    expect(html).not.toContain('href="/ja/feed.xml"');
  });

  it('renders the draft ribbon only when the page is a draft', () => {
    const base = {
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
    } as const;
    const draft = renderPage({ ...base, draft: true });
    expect(draft).toContain('ov-draft-ribbon');
    expect(draft).toContain('never published');
    expect(draft).toContain('ov-has-draft');
    expect(renderPage({ ...base, draft: false })).not.toContain('ov-draft-ribbon');
  });

  it('renders a "Draft" badge in the sidebar for draft nav nodes', () => {
    const nav = {
      title: '',
      url: '/',
      children: [
        { title: 'Live', url: '/live/', sourcePath: 'live.md', children: [] },
        { title: 'WIP', url: '/wip/', sourcePath: 'wip.md', children: [], draft: true },
      ],
    };
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav,
      url: '/live/',
      title: 'Live',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
    });
    expect(html).toContain('ov-nav-draft');
    // The live page link carries no badge.
    expect(html).toContain('>Live</a>');
  });

  it('renders NO language picker for a single-language site', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
    });
    expect(html).toContain('<html lang="en"');
    expect(html).not.toContain('ov-lang-toggle');
    expect(html).not.toContain('hreflang');
  });

  it('renders the "Edited" page-meta line, humanized by default', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      readingMinutes: 2,
      lastModified: '2026-06-12T09:00:00.000Z',
      generatedAt: '2026-06-14T00:00:00.000Z',
    });
    // Renamed from "Updated"; humanized format → "Jun 12, 2026".
    expect(html).toContain('ov-page-meta-edited');
    expect(html).toContain('Edited');
    expect(html).not.toContain('Updated');
    expect(html).toContain('Jun 12, 2026');
    // The machine-readable date stays in the <time datetime> attribute.
    expect(html).toContain('datetime="2026-06-12T09:00:00.000Z"');
  });

  it('honors site.dateFormat: iso for the Edited line', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', dateFormat: 'iso' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      lastModified: '2026-06-12T09:00:00.000Z',
      generatedAt: '2026-06-14T00:00:00.000Z',
    });
    expect(html).toContain('Edited');
    expect(html).toContain('2026-06-12');
    expect(html).not.toContain('Jun 12, 2026');
  });

  it('renders site.font as the initial data-font (e.g. a bundled webfont)', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', font: 'geist' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    expect(html).toContain('data-font="geist"');
  });

  it('server-renders site.palette and site.accent onto <html>', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', palette: 'nord', accent: '#a02f6f' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-12T00:00:00.000Z',
    });
    expect(html).toContain('data-palette="nord"');
    expect(html).toContain('data-accent="custom"');
    expect(html).toContain('style="--ov-accent: #a02f6f"');
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

  it('renders an "Edit this page" link when editUrl is set, omits otherwise', () => {
    const withLink = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-16T00:00:00.000Z',
      editUrl: 'https://example.com/edit/main/content/index.md',
    });
    expect(withLink).toContain('class="ov-edit-link"');
    expect(withLink).toContain('href="https://example.com/edit/main/content/index.md"');
    expect(withLink).toContain('Edit this page');

    const withoutLink = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(withoutLink).not.toContain('ov-edit-link');
  });

  it('renders prev/next nav when adjacent pages are passed', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/getting-started/',
      title: 'Getting started',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-16T00:00:00.000Z',
      prev: { title: 'Home', url: '/' },
      next: { title: 'Deploy', url: '/guides/deploy/' },
    });
    expect(html).toContain('class="ov-prevnext"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/guides/deploy/"');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
  });

  it('renders the version badge next to the brand when site.version is set, omits otherwise', () => {
    const withVersion = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', version: 'v0.2.0' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withVersion).toContain('class="ov-brand-version"');
    expect(withVersion).toContain('>v0.2.0<');

    const withoutVersion = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withoutVersion).not.toContain('ov-brand-version');
  });

  it('injects site.headExtra into <head> verbatim, omits when unset', () => {
    const snippet =
      '<script defer src="https://analytics.example.com/script.js" data-website-id="abc"></script>';
    const withHead = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', headExtra: snippet },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withHead).toContain(snippet);

    const withoutHead = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-05-15T00:00:00.000Z',
    });
    expect(withoutHead).not.toContain(snippet);
  });

  it('injects site.css stylesheet links after the base theme CSS, omits when unset', () => {
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        css: ['/theme.css', 'https://cdn.example.com/brand.css'],
      },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(html).toContain('<link rel="stylesheet" href="/theme.css">');
    expect(html).toContain('<link rel="stylesheet" href="https://cdn.example.com/brand.css">');
    // Must come AFTER the base theme stylesheet so token overrides win the cascade.
    expect(html.indexOf('href="/theme.css"')).toBeGreaterThan(
      html.indexOf('assets/ovellum.css'),
    );

    // Single string form.
    const single = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', css: '/one.css' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(single).toContain('<link rel="stylesheet" href="/one.css">');

    // Unset → no extra stylesheet link.
    const none = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(none).not.toContain('href="/theme.css"');
  });

  it('appearance: inherit follows the host — drops the mode toggle, exposes config, no ovellum-theme read', () => {
    const html = renderPage({
      site: {
        title: 'X',
        defaultTheme: 'auto',
        footer: '',
        appearance: { mode: 'inherit', storageKey: 'theme', darkValue: 'dark', lightValue: 'light' },
      },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    // The mode segment is gone from the appearance panel (palette/font remain).
    expect(html).not.toContain('data-ov-mode');
    expect(html).toContain('data-ov-palette');
    // The boot script resolves from the host key, not Ovellum's own mode key.
    expect(html).toContain('window.__OV_APPEARANCE__');
    expect(html).toContain('"storageKey":"theme"');
    expect(html).not.toContain("localStorage.getItem('ovellum-theme')");

    // String shorthand → prefers-color-scheme only (no storageKey in config).
    const osOnly = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '', appearance: 'inherit' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(osOnly).toContain('window.__OV_APPEARANCE__');
    expect(osOnly).not.toContain('"storageKey"');
    expect(osOnly).not.toContain('data-ov-mode');
  });

  it('appearance unset / control keeps the mode toggle and the default boot script', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(html).toContain('data-ov-mode');
    expect(html).toContain("localStorage.getItem('ovellum-theme')");
    expect(html).not.toContain('window.__OV_APPEARANCE__');
  });

  it('localizes UI chrome from a resolved string table (ja)', () => {
    const html = renderPage({
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [{ depth: 2, text: 'Intro', id: 'intro' }],
      lastModified: '2026-06-12T09:00:00.000Z',
      generatedAt: '2026-06-14T00:00:00.000Z',
      lang: 'ja',
      strings: resolveStrings('ja'),
    });
    // ToC title + "Edited" label come from the ja table.
    expect(html).toContain('このページの内容');
    expect(html).toContain('最終更新');
    // English chrome is gone.
    expect(html).not.toContain('On this page');
    expect(html).not.toContain('>Edited ');
  });

  it('adds dir="rtl" only when dir:rtl is passed', () => {
    const base = {
      site: { title: 'X', defaultTheme: 'auto', footer: '' },
      nav: NAV,
      url: '/',
      title: 'X',
      bodyHtml: '',
      headings: [],
      generatedAt: '2026-06-14T00:00:00.000Z',
    } as const;
    const rtl = renderPage({ ...base, strings: resolveStrings('ar'), dir: 'rtl' });
    expect(rtl).toContain('dir="rtl"');
    const ltr = renderPage({ ...base, dir: 'ltr' });
    expect(ltr).not.toContain('dir="rtl"');
    // Default (no dir) emits nothing extra.
    expect(renderPage(base)).not.toContain(' dir=');
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
