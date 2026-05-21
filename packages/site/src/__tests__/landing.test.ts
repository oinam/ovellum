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
    expect(html.match(/class="ov-feature-card"/g)?.length).toBe(2);
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
});
