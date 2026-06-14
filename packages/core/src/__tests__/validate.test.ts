import { describe, expect, it } from 'vitest';
import { ConfigError } from '../errors.js';
import { validateUserConfig } from '../config/validate.js';

describe('validateUserConfig', () => {
  it('accepts an empty object', () => {
    expect(validateUserConfig({})).toEqual({});
  });

  it('accepts a full valid config', () => {
    const input = {
      name: 'my-pkg',
      version: '1.0.0',
      mode: 'hybrid',
      input: './src',
      output: './docs',
      include: ['**/*.ts'],
      exclude: ['**/*.test.ts'],
      includeInternal: false,
      includePrivate: false,
      defaultFormat: 'mdx',
      protect: {
        blockTag: '@manual',
        inlineTag: '@preserve',
        orphanStrategy: 'quarantine',
        orphanDir: '.ovellum/orphans',
        orphanRetention: 30,
      },
    };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects non-object input', () => {
    expect(() => validateUserConfig(null)).toThrow(ConfigError);
    expect(() => validateUserConfig('hello')).toThrow(ConfigError);
    expect(() => validateUserConfig([])).toThrow(ConfigError);
  });

  it('rejects invalid mode', () => {
    expect(() => validateUserConfig({ mode: 'preview' })).toThrow(/mode/);
  });

  it('rejects invalid defaultFormat', () => {
    expect(() => validateUserConfig({ defaultFormat: 'html' })).toThrow(/defaultFormat/);
  });

  it('rejects non-string include entries', () => {
    expect(() => validateUserConfig({ include: ['ok', 5] })).toThrow(/include/);
  });

  it('rejects negative orphanRetention', () => {
    expect(() => validateUserConfig({ protect: { orphanRetention: -1 } })).toThrow(
      /orphanRetention/,
    );
  });

  it('rejects non-numeric orphanRetention', () => {
    expect(() => validateUserConfig({ protect: { orphanRetention: 'forever' } })).toThrow(
      /orphanRetention/,
    );
  });

  it('rejects invalid orphanStrategy', () => {
    expect(() => validateUserConfig({ protect: { orphanStrategy: 'delete' } })).toThrow(
      /orphanStrategy/,
    );
  });

  it('rejects non-object protect', () => {
    expect(() => validateUserConfig({ protect: 'on' })).toThrow(/protect/);
  });

  it('accepts site.ignoreFiles as a string array and rejects non-arrays', () => {
    const input = { site: { ignoreFiles: ['README.md', 'drafts/**'] } };
    expect(validateUserConfig(input)).toEqual(input);
    expect(() => validateUserConfig({ site: { ignoreFiles: 'README.md' } })).toThrow(
      /site\.ignoreFiles/,
    );
  });

  it('accepts a site.assetBaseUrl and rejects empty / whitespace', () => {
    expect(validateUserConfig({ site: { assetBaseUrl: 'https://cdn.example.com/x' } })).toEqual({
      site: { assetBaseUrl: 'https://cdn.example.com/x' },
    });
    expect(() => validateUserConfig({ site: { assetBaseUrl: '' } })).toThrow(/assetBaseUrl/);
    expect(() => validateUserConfig({ site: { assetBaseUrl: 'has space' } })).toThrow(
      /assetBaseUrl/,
    );
  });

  it('accepts a plain site.publicDir and rejects slashes / traversal', () => {
    expect(validateUserConfig({ site: { publicDir: 'static' } })).toEqual({
      site: { publicDir: 'static' },
    });
    expect(() => validateUserConfig({ site: { publicDir: '' } })).toThrow(/site\.publicDir/);
    expect(() => validateUserConfig({ site: { publicDir: 'a/b' } })).toThrow(/site\.publicDir/);
    expect(() => validateUserConfig({ site: { publicDir: '../up' } })).toThrow(/site\.publicDir/);
  });

  it('accepts site.backToTop and rejects bad shapes', () => {
    expect(validateUserConfig({ site: { backToTop: { enabled: false, threshold: 200 } } })).toEqual(
      { site: { backToTop: { enabled: false, threshold: 200 } } },
    );
    expect(() => validateUserConfig({ site: { backToTop: { threshold: -1 } } })).toThrow(
      /backToTop\.threshold/,
    );
    expect(() => validateUserConfig({ site: { backToTop: { enabled: 'yes' } } })).toThrow(
      /backToTop\.enabled/,
    );
  });

  it('accepts site.credit boolean and rejects non-boolean', () => {
    expect(validateUserConfig({ site: { credit: false } })).toEqual({ site: { credit: false } });
    expect(() => validateUserConfig({ site: { credit: 'no' } })).toThrow(/site\.credit/);
  });

  it('accepts site.home and rejects empty/non-string', () => {
    expect(validateUserConfig({ site: { home: 'overview.md' } })).toEqual({
      site: { home: 'overview.md' },
    });
    expect(() => validateUserConfig({ site: { home: '' } })).toThrow(/site\.home/);
    expect(() => validateUserConfig({ site: { home: 5 } })).toThrow(/site\.home/);
  });

  it('accepts site.sidebar.collapse and rejects a non-boolean', () => {
    expect(validateUserConfig({ site: { sidebar: { collapse: false } } })).toEqual({
      site: { sidebar: { collapse: false } },
    });
    expect(() => validateUserConfig({ site: { sidebar: { collapse: 'yes' } } })).toThrow(
      /site\.sidebar\.collapse/,
    );
    expect(() => validateUserConfig({ site: { sidebar: true } })).toThrow(/site\.sidebar/);
  });

  it('accepts string site.logo and site.favicon', () => {
    const input = { site: { logo: '/public/logo.svg', favicon: '/favicon.ico' } };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects a site.logo with characters that would break the CSS mask url()', () => {
    expect(() => validateUserConfig({ site: { logo: '' } })).toThrow(/site\.logo/);
    expect(() => validateUserConfig({ site: { logo: "/a'b.svg" } })).toThrow(/site\.logo/);
    expect(() => validateUserConfig({ site: { logo: '/a (1).svg' } })).toThrow(/site\.logo/);
    expect(() => validateUserConfig({ site: { favicon: 42 } })).toThrow(/site\.favicon/);
  });

  it('accepts every named site.palette and a CSS-colour accent', () => {
    for (const palette of ['default', 'nord', 'flexoki', 'solarized', 'eink']) {
      expect(validateUserConfig({ site: { palette } })).toEqual({ site: { palette } });
    }
    const input = { site: { accent: 'oklch(57% 0.16 255)' } };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects unknown site.palette and non-string / empty site.accent', () => {
    expect(() => validateUserConfig({ site: { palette: 'dracula' } })).toThrow(/site\.palette/);
    // macOS was removed as a bundled palette.
    expect(() => validateUserConfig({ site: { palette: 'macos' } })).toThrow(/site\.palette/);
    expect(() => validateUserConfig({ site: { accent: 7 } })).toThrow(/site\.accent/);
    expect(() => validateUserConfig({ site: { accent: '  ' } })).toThrow(/site\.accent/);
  });

  it('accepts site.landing.hero.media with light + dark + alt', () => {
    const input = {
      site: {
        landing: {
          hero: {
            ctas: [],
            media: { light: '/hero.svg', dark: '/hero-dark.svg', alt: 'Scene' },
          },
        },
      },
    };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('accepts site.landing.hero.media with only the required light field', () => {
    const input = { site: { landing: { hero: { ctas: [], media: { light: '/hero.svg' } } } } };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects site.landing.hero.media without a light path', () => {
    expect(() =>
      validateUserConfig({ site: { landing: { hero: { ctas: [], media: { dark: '/x.svg' } } } } }),
    ).toThrow(/site\.landing\.hero\.media\.light/);
  });

  it('rejects empty-string light path on hero.media', () => {
    expect(() =>
      validateUserConfig({ site: { landing: { hero: { ctas: [], media: { light: '' } } } } }),
    ).toThrow(/site\.landing\.hero\.media\.light/);
  });

  it('rejects non-string alt on hero.media', () => {
    expect(() =>
      validateUserConfig({
        site: { landing: { hero: { ctas: [], media: { light: '/a.svg', alt: 12 } } } },
      }),
    ).toThrow(/site\.landing\.hero\.media\.alt/);
  });

  it('accepts site.landing.scenes as an array of light/dark/alt entries', () => {
    const input = {
      site: {
        landing: {
          scenes: [
            { light: '/public/a.png', dark: '/public/a-dark.png', alt: 'A' },
            { light: '/public/b.png' },
          ],
        },
      },
    };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects site.landing.scenes that is not an array', () => {
    expect(() =>
      validateUserConfig({ site: { landing: { scenes: { light: '/a.png' } } } }),
    ).toThrow(/site\.landing\.scenes/);
  });

  it('rejects a scene without a light path', () => {
    expect(() =>
      validateUserConfig({ site: { landing: { scenes: [{ dark: '/x.png' }] } } }),
    ).toThrow(/site\.landing\.scenes\[0\]\.light/);
  });

  it('rejects an empty-string light path on a scene', () => {
    expect(() =>
      validateUserConfig({ site: { landing: { scenes: [{ light: '' }] } } }),
    ).toThrow(/site\.landing\.scenes\[0\]\.light/);
  });

  it('rejects non-string alt on a scene', () => {
    expect(() =>
      validateUserConfig({
        site: { landing: { scenes: [{ light: '/a.png', alt: 42 }] } },
      }),
    ).toThrow(/site\.landing\.scenes\[0\]\.alt/);
  });

  it('accepts a valid update block', () => {
    const input = { update: { check: false, intervalHours: 12 } };
    expect(validateUserConfig(input)).toEqual(input);
  });

  it('rejects a non-object update', () => {
    expect(() => validateUserConfig({ update: 'on' })).toThrow(/update/);
  });

  it('rejects non-boolean update.check', () => {
    expect(() => validateUserConfig({ update: { check: 'yes' } })).toThrow(/update\.check/);
  });

  it('rejects non-numeric update.intervalHours', () => {
    expect(() => validateUserConfig({ update: { intervalHours: 'daily' } })).toThrow(
      /update\.intervalHours/,
    );
  });

  it('rejects negative update.intervalHours', () => {
    expect(() => validateUserConfig({ update: { intervalHours: -1 } })).toThrow(
      /update\.intervalHours/,
    );
  });
});
