import { describe, expect, it } from 'vitest';
import type { OvellumLandingConfig } from '@ovellum/core';
import { renderLanding } from '../template.js';

const SITE = {
  title: 'Demo',
  description: 'A demo site',
  defaultTheme: 'auto' as const,
  footer: '',
  landing: {} as OvellumLandingConfig, // unused by renderLanding directly
};

function landingConfig(over: Partial<OvellumLandingConfig> = {}): OvellumLandingConfig {
  return {
    enabled: true,
    hero: { ctas: [] },
    features: [],
    scenes: [],
    ...over,
  };
}

describe('renderLanding', () => {
  it('renders a hero with title, subtitle, and two CTAs by default style', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: {
          title: 'Welcome',
          subtitle: 'A short pitch.',
          ctas: [
            { label: 'Get started', href: '/start/' },
            { label: 'GitHub', href: 'https://example' },
          ],
        },
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).toContain('class="ov-hero"');
    expect(html).toContain('Welcome');
    expect(html).toContain('A short pitch.');
    expect(html).toContain('class="ov-cta ov-cta--primary" href="/start/"');
    expect(html).toContain('class="ov-cta ov-cta--secondary" href="https://example"');
  });

  it('falls back to site.title when hero.title is omitted', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: { ctas: [{ label: 'Read docs', href: '/docs/' }] },
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).toMatch(/<h1 class="ov-hero-title">\s*Demo\s*<\/h1>/);
  });

  it('renders a feature card for each entry, with optional icon', () => {
    // The `icon` field accepts arbitrary HTML/SVG/text — when set, the
    // template wraps it in `.ov-feature-icon`. When omitted, the card
    // renders without the icon slot. Examples should leave it empty per the
    // no-emoji style rule; if a project wants an icon they can pass a
    // monochrome inline SVG.
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        features: [
          {
            icon: '<svg viewBox="0 0 24 24" aria-hidden="true"></svg>',
            title: 'Fast',
            description: 'Builds in seconds.',
          },
          { title: 'No icon', description: 'No icon variant.' },
        ],
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html.match(/class="ov-card ov-feature-card"/g)?.length).toBe(2);
    expect(html).toContain('<svg viewBox="0 0 24 24"');
    expect(html).toContain('Builds in seconds.');
    expect(html).toContain('No icon variant.');
    // The second card has no icon: <div class="ov-feature-icon"> appears only once.
    expect(html.match(/class="ov-feature-icon"/g)?.length).toBe(1);
  });

  it('includes the pitch section when pitchHtml is provided, omits it otherwise', () => {
    const withPitch = renderLanding({
      site: SITE,
      landing: landingConfig(),
      pitchHtml: '<p>Why we built this.</p>',
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(withPitch).toContain('class="ov-pitch"');
    expect(withPitch).toContain('Why we built this.');

    const noPitch = renderLanding({
      site: SITE,
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(noPitch).not.toContain('class="ov-pitch"');
  });

  it('renders install snippets after the hero, omits the section when absent', () => {
    // The title is folded upstream (build.ts) into the code as a leading
    // comment; renderLanding receives the already-highlighted snippet html.
    const snippet =
      '<pre class="shiki" data-language="bash" data-copy="true"><code># Install Ovellum globally\nnpm install -g ovellum</code></pre>';
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: { ctas: [{ label: 'Get started', href: '/start/' }] },
        features: [{ title: 'F', description: 'D' }],
      }),
      install: [{ html: snippet }],
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    // Section wrapper, prose wrapper, and the pre-rendered snippet (with the
    // title as a comment inside the code — no separate heading).
    expect(html).toContain('class="ov-install"');
    expect(html).toContain('ov-install-inner ov-prose');
    expect(html).toContain(snippet);
    // Order: install sits after the hero CTAs and before the feature grid.
    const ctaIdx = html.indexOf('ov-cta-row');
    const installIdx = html.indexOf('class="ov-install"');
    const featuresIdx = html.indexOf('ov-feature-grid');
    expect(ctaIdx).toBeGreaterThan(-1);
    expect(installIdx).toBeGreaterThan(ctaIdx);
    expect(featuresIdx).toBeGreaterThan(installIdx);

    // When install is omitted, the section does not appear.
    const noInstall = renderLanding({
      site: SITE,
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(noInstall).not.toContain('ov-install');
  });

  it('renders the trust strip when items are provided', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        trustStrip: {
          label: 'Powered by',
          items: [{ name: 'TypeScript', href: 'https://ts.example' }, { name: 'shiki' }],
        },
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).toContain('class="ov-trust"');
    expect(html).toContain('Powered by');
    expect(html).toContain('href="https://ts.example"');
    expect(html).toContain('TypeScript');
    expect(html).toContain('shiki');
  });

  it('adds the Docs link to the topbar when docsHref is provided', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
      docsHref: '/start/',
    });
    expect(html).toContain(
      '<a class="ov-topbar-link ov-topbar-link--docs" href="/start/">Docs</a>',
    );
  });

  it('omits the implicit Docs link when a topbarNav item already points there', () => {
    const html = renderLanding({
      site: { ...SITE, topbarNav: [{ label: 'Docs', href: '/start/' }] },
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
      docsHref: '/start/',
    });
    // The configured item is present, the auto `--docs` link is not duplicated.
    expect(html).toContain('<a class="ov-topbar-link" href="/start/">Docs</a>');
    expect(html).not.toContain('ov-topbar-link--docs');
  });

  it('renders icon topbar items icon-only on desktop and labeled in the mobile sheet', () => {
    const html = renderLanding({
      site: {
        ...SITE,
        topbarNav: [
          { label: 'GitHub', href: 'https://gh.example', icon: 'github', external: true },
        ],
      },
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    // Desktop cluster: icon-only with the label kept for screen readers.
    expect(html).toContain('class="ov-topbar-link ov-topbar-link--icon"');
    expect(html).toContain('aria-label="GitHub"');
    expect(html).toContain('<span class="ov-sr-only">GitHub</span>');
    // Mobile sheet: a plain text link carrying the same label + glyph.
    expect(html).toContain('<a class="ov-topbar-link" href="https://gh.example"');
    // External icon items open in a new tab.
    expect(html).toContain('rel="noopener" target="_blank"');
  });

  it('shows the wordmark, and a brand mark only when site.logo is set', () => {
    // Default: no logo configured → just the wordmark, no mark.
    const plain = renderLanding({
      site: SITE,
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(plain).toContain('<span class="ov-brand-name">Demo</span>');
    expect(plain).not.toContain('ov-brand-mark');

    // With a logo → the masked mark appears in the landing topbar too.
    const withLogo = renderLanding({
      site: { ...SITE, logo: '/public/logo.svg' },
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(withLogo).toContain('class="ov-brand-mark"');
    expect(withLogo).toContain('mask-image:url(/public/logo.svg)');
  });

  it('uses the landing body class on <body>', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig(),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).toContain('<body class="ov-body-landing">');
  });

  it('renders the imagery hero variant when hero.media is configured', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: {
          title: 'Welcome',
          ctas: [],
          media: { light: '/hero-light.svg', dark: '/hero-dark.svg', alt: 'Backdrop' },
        },
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    // Section opts into the imagery variant via `data-media`.
    expect(html).toMatch(/<section class="ov-hero" data-media>/);
    // Both stacked images are emitted so CSS can flip between them per theme.
    expect(html).toContain('class="ov-hero-art-img ov-hero-art-img--light"');
    expect(html).toContain('class="ov-hero-art-img ov-hero-art-img--dark"');
    expect(html).toContain('src="/hero-light.svg"');
    expect(html).toContain('src="/hero-dark.svg"');
    // Alt text reaches the user-facing (light) image; dark image is purely decorative.
    expect(html).toContain('alt="Backdrop"');
    // Title/subtitle/CTAs now live inside the inner wrapper.
    expect(html).toContain('class="ov-hero-inner"');
  });

  it('falls back to the light asset for both <img>s when hero.media.dark is omitted', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: { ctas: [], media: { light: '/hero.svg' } },
      }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    // Two img tags, both pointing at the light asset.
    const matches = html.match(/src="\/hero\.svg"/g);
    expect(matches?.length).toBe(2);
  });

  it('omits the imagery markup entirely when hero.media is unset', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({ hero: { ctas: [] } }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).not.toContain('data-media');
    expect(html).not.toContain('ov-hero-art');
  });

  it('interleaves scenes between rendered landing sections in order', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({
        hero: { ctas: [{ label: 'Go', href: '/g/' }] },
        features: [{ title: 'F', description: 'D' }],
        trustStrip: { items: [{ name: 'A' }] },
        scenes: [
          { light: '/public/a.png', alt: 'A' },
          { light: '/public/b.png', dark: '/public/b-dark.png' },
          { light: '/public/c.png' },
        ],
      }),
      pitchHtml: '<p>Pitch.</p>',
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html.match(/class="ov-scene"/g)?.length).toBe(3);
    // Order check: hero must appear before first scene; trust after the last.
    const heroIdx = html.indexOf('class="ov-hero"');
    const firstSceneIdx = html.indexOf('class="ov-scene"');
    const trustIdx = html.indexOf('class="ov-trust"');
    expect(heroIdx).toBeGreaterThan(-1);
    expect(firstSceneIdx).toBeGreaterThan(heroIdx);
    expect(trustIdx).toBeGreaterThan(firstSceneIdx);
    // Each scene gets an animation-delay anchor index inlined as a CSS var.
    expect(html).toContain('--ov-scene-i: 0');
    expect(html).toContain('--ov-scene-i: 2');
    // Dark fallback to light when scene.dark is omitted.
    expect(html.match(/src="\/public\/a\.png"/g)?.length).toBe(2);
    // Alt reaches the light image; dark stays decorative.
    expect(html).toContain('alt="A"');
  });

  it('omits scene markup when scenes is empty', () => {
    const html = renderLanding({
      site: SITE,
      landing: landingConfig({ scenes: [] }),
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).not.toContain('class="ov-scene"');
  });

  it('resolves per-locale landing + nav labels to the current locale', () => {
    const i18nSite = {
      ...SITE,
      defaultLocale: 'en-US',
      topbarNav: [{ label: { 'en-US': 'Docs', ja: 'ドキュメント' }, href: '/docs/' }],
    };
    const landing = landingConfig({
      hero: {
        title: { 'en-US': 'Welcome', ja: 'ようこそ' },
        subtitle: { 'en-US': 'A short pitch.', ja: '短い紹介。' },
        ctas: [{ label: { 'en-US': 'Get started', ja: 'はじめる' }, href: '/start/' }],
      },
      features: [
        {
          title: { 'en-US': 'A Merge Engine', ja: 'マージエンジン' },
          description: { 'en-US': 'Merges docs.', ja: 'ドキュメントをマージします。' },
        },
      ],
    });

    const ja = renderLanding({
      site: i18nSite,
      landing,
      lang: 'ja',
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(ja).toContain('ようこそ');
    expect(ja).toContain('短い紹介。');
    expect(ja).toContain('はじめる');
    expect(ja).toContain('マージエンジン');
    expect(ja).toContain('ドキュメント'); // topbar nav label
    expect(ja).not.toContain('>Welcome<');

    const en = renderLanding({
      site: i18nSite,
      landing,
      lang: 'en-US',
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(en).toContain('Welcome');
    expect(en).toContain('Get started');
    expect(en).toContain('A Merge Engine');
    expect(en).not.toContain('ようこそ');
  });

  it('renders a plain-string label unchanged regardless of locale', () => {
    const html = renderLanding({
      site: { ...SITE, defaultLocale: 'en-US' },
      landing: landingConfig({
        hero: { title: 'Plain Title', ctas: [{ label: 'Click', href: '/x/' }] },
      }),
      lang: 'ja',
      generatedAt: '2026-05-16T00:00:00.000Z',
    });
    expect(html).toContain('Plain Title');
    expect(html).toContain('Click');
  });
});
