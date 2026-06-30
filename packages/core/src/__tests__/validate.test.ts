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

  it('accepts every named site.font and rejects an unknown one', () => {
    for (const font of ['sans', 'serif', 'inter', 'geist']) {
      expect(validateUserConfig({ site: { font } })).toEqual({ site: { font } });
    }
    expect(() => validateUserConfig({ site: { font: 'comic-sans' } })).toThrow(/site\.font/);
  });

  it('accepts a custom site.font object and rejects malformed ones', () => {
    const ok = { site: { font: { body: "'Brand', system-ui", mono: 'Menlo', source: ['/f.css'], label: 'Brand' } } };
    expect(validateUserConfig(ok)).toEqual(ok);
    expect(validateUserConfig({ site: { font: { body: 'Brand' } } })).toEqual({ site: { font: { body: 'Brand' } } });
    // body is required and non-empty.
    expect(() => validateUserConfig({ site: { font: {} } })).toThrow(/site\.font\.body/);
    expect(() => validateUserConfig({ site: { font: { body: '  ' } } })).toThrow(/site\.font\.body/);
    // CSS-breaking characters in family values are rejected.
    expect(() => validateUserConfig({ site: { font: { body: 'Brand}x' } } })).toThrow(/< > \{ \} ;/);
    // Dangerous source schemes are rejected.
    expect(() => validateUserConfig({ site: { font: { body: 'Brand', source: 'javascript:alert(1)' } } })).toThrow(
      /site\.font\.source/,
    );
  });

  it('accepts site.appearance control/inherit/object and rejects malformed', () => {
    expect(validateUserConfig({ site: { appearance: 'control' } })).toEqual({
      site: { appearance: 'control' },
    });
    expect(validateUserConfig({ site: { appearance: 'inherit' } })).toEqual({
      site: { appearance: 'inherit' },
    });
    const obj = {
      site: { appearance: { mode: 'inherit', storageKey: 'theme', darkValue: 'dark', lightValue: 'light' } },
    };
    expect(validateUserConfig(obj)).toEqual(obj);
    // `{ mode: 'inherit' }` alone is valid (prefers-color-scheme only).
    expect(validateUserConfig({ site: { appearance: { mode: 'inherit' } } })).toEqual({
      site: { appearance: { mode: 'inherit' } },
    });
    // Unknown string, wrong object mode, and blank sub-fields are rejected.
    expect(() => validateUserConfig({ site: { appearance: 'follow' } })).toThrow(/site\.appearance/);
    expect(() => validateUserConfig({ site: { appearance: { mode: 'control' } } })).toThrow(
      /site\.appearance\.mode/,
    );
    expect(() =>
      validateUserConfig({ site: { appearance: { mode: 'inherit', storageKey: '  ' } } }),
    ).toThrow(/site\.appearance\.storageKey/);
    expect(() => validateUserConfig({ site: { appearance: 42 } })).toThrow(/site\.appearance/);
  });

  it('accepts a valid plugins array and rejects malformed plugins', () => {
    const ok = { plugins: [{ name: 'a', onBuildComplete: () => {} }, { name: 'b' }] };
    expect(validateUserConfig(ok)).toEqual(ok);
    // Not an array.
    expect(() => validateUserConfig({ plugins: {} })).toThrow(/`plugins`/);
    // Missing / empty name.
    expect(() => validateUserConfig({ plugins: [{ onBuildStart: () => {} }] })).toThrow(
      /plugins\[0\]\.name/,
    );
    expect(() => validateUserConfig({ plugins: [{ name: '  ' }] })).toThrow(/plugins\[0\]\.name/);
    // A hook that isn't a function.
    expect(() => validateUserConfig({ plugins: [{ name: 'x', transformPage: 'no' }] })).toThrow(
      /plugins\[0\] \(x\)\.transformPage/,
    );
    // remark/rehype plugin lists: arrays accepted, non-arrays rejected.
    const md = { plugins: [{ name: 'm', remarkPlugins: [() => {}], rehypePlugins: [] }] };
    expect(validateUserConfig(md)).toEqual(md);
    expect(() => validateUserConfig({ plugins: [{ name: 'm', remarkPlugins: {} }] })).toThrow(
      /plugins\[0\] \(m\)\.remarkPlugins/,
    );
  });

  it('accepts site.dateFormat humanized/iso and rejects an unknown one', () => {
    for (const dateFormat of ['humanized', 'iso']) {
      expect(validateUserConfig({ site: { dateFormat } })).toEqual({ site: { dateFormat } });
    }
    expect(() => validateUserConfig({ site: { dateFormat: 'relative' } })).toThrow(
      /site\.dateFormat/,
    );
  });

  it('accepts site.locales + defaultLocale and rejects bad shapes', () => {
    const ok = {
      site: {
        defaultLocale: 'en-US',
        locales: [
          { code: 'en-US', label: 'English' },
          { code: 'ja', label: '日本語' },
          { code: 'zh-Hans', label: '简体中文' },
        ],
      },
    };
    expect(validateUserConfig(ok)).toEqual(ok);
    expect(() => validateUserConfig({ site: { locales: [] } })).toThrow(/site\.locales/);
    expect(() =>
      validateUserConfig({ site: { locales: [{ code: 'en_US!', label: 'x' }] } }),
    ).toThrow(/locales\[0\]\.code/);
    expect(() => validateUserConfig({ site: { locales: [{ code: 'ja' }] } })).toThrow(
      /locales\[0\]\.label/,
    );
    expect(() =>
      validateUserConfig({
        site: {
          locales: [
            { code: 'ja', label: 'a' },
            { code: 'ja', label: 'b' },
          ],
        },
      }),
    ).toThrow(/duplicate code/);
    expect(() =>
      validateUserConfig({ site: { locales: [{ code: 'ja', label: 'a' }], defaultLocale: 'en' } }),
    ).toThrow(/site\.defaultLocale/);
    expect(() => validateUserConfig({ site: { defaultLocale: 'en' } })).toThrow(
      /site\.defaultLocale/,
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

  it('accepts a site.templateDir path and rejects empty / non-string', () => {
    expect(validateUserConfig({ site: { templateDir: './theme' } })).toEqual({
      site: { templateDir: './theme' },
    });
    expect(() => validateUserConfig({ site: { templateDir: '' } })).toThrow(/templateDir/);
    expect(() => validateUserConfig({ site: { templateDir: 42 } })).toThrow(/templateDir/);
  });

  it('accepts site.images config and rejects a bad quality', () => {
    expect(validateUserConfig({ site: { images: {} } })).toEqual({ site: { images: {} } });
    expect(validateUserConfig({ site: { images: { quality: 70 } } })).toEqual({
      site: { images: { quality: 70 } },
    });
    expect(() => validateUserConfig({ site: { images: 'yes' } })).toThrow(/site\.images/);
    expect(() => validateUserConfig({ site: { images: { quality: 0 } } })).toThrow(/quality/);
    expect(() => validateUserConfig({ site: { images: { quality: 101 } } })).toThrow(/quality/);
    expect(() => validateUserConfig({ site: { images: { quality: 75.5 } } })).toThrow(/quality/);
  });

  it('accepts a boolean site.minify and rejects a non-boolean', () => {
    expect(validateUserConfig({ site: { minify: true } })).toEqual({ site: { minify: true } });
    expect(validateUserConfig({ site: { minify: false } })).toEqual({ site: { minify: false } });
    expect(() => validateUserConfig({ site: { minify: 'yes' } })).toThrow(/site\.minify/);
  });

  it('accepts site.css as a URL or array of URLs, rejects empties and script schemes', () => {
    expect(validateUserConfig({ site: { css: '/theme.css' } })).toEqual({
      site: { css: '/theme.css' },
    });
    const many = { site: { css: ['/tokens.css', 'https://cdn.example.com/brand.css'] } };
    expect(validateUserConfig(many)).toEqual(many);
    // Empty string, empty array, and non-string entries are rejected.
    expect(() => validateUserConfig({ site: { css: '' } })).toThrow(/site\.css/);
    expect(() => validateUserConfig({ site: { css: [] } })).toThrow(/site\.css/);
    expect(() => validateUserConfig({ site: { css: ['/ok.css', '  '] } })).toThrow(/site\.css/);
    // Dangerous schemes are rejected (same guard as `site.font.source`).
    expect(() => validateUserConfig({ site: { css: 'javascript:alert(1)' } })).toThrow(/site\.css/);
    expect(() => validateUserConfig({ site: { css: ['data:text/css,body{}'] } })).toThrow(
      /site\.css/,
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

  it('accepts a valid site.ai block and rejects bad shapes', () => {
    const input = {
      site: { ai: { enabled: true, llmsTxt: true, fullText: false, mdMirror: true } },
    };
    expect(validateUserConfig(input)).toEqual(input);
    expect(() => validateUserConfig({ site: { ai: 'on' } })).toThrow(/site\.ai/);
    expect(() => validateUserConfig({ site: { ai: { fullText: 'yes' } } })).toThrow(
      /site\.ai\.fullText/,
    );
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

  it('accepts every named site.palette and a CSS-color accent', () => {
    for (const palette of ['default', 'nord', 'flexoki', 'solarized', 'eink', 'bare']) {
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

  it('accepts site.versions and rejects malformed ones', () => {
    const ok = {
      site: { versions: [{ id: 'v2', label: 'v2 (latest)', latest: true }, { id: 'v1' }] },
    };
    expect(validateUserConfig(ok)).toEqual(ok);
    // must be a non-empty array.
    expect(() => validateUserConfig({ site: { versions: [] } })).toThrow(/site\.versions/);
    // id must be URL/folder-safe.
    expect(() => validateUserConfig({ site: { versions: [{ id: 'v 1' }] } })).toThrow(/\.id/);
    expect(() => validateUserConfig({ site: { versions: [{ id: 'a/b' }] } })).toThrow(/\.id/);
    // duplicate ids.
    expect(() => validateUserConfig({ site: { versions: [{ id: 'v1' }, { id: 'v1' }] } })).toThrow(
      /duplicate/,
    );
    // at most one latest.
    expect(() =>
      validateUserConfig({ site: { versions: [{ id: 'a', latest: true }, { id: 'b', latest: true }] } }),
    ).toThrow(/at most one/);
  });

  it('accepts composable landing.sections and rejects malformed ones', () => {
    const ok = {
      site: {
        landing: {
          sections: [
            { type: 'hero' },
            { type: 'prose', html: '<p>x</p>' },
            { type: 'prose' },
            { type: 'custom-html', html: '<div></div>' },
            { type: 'scene', scene: { light: '/s.svg' } },
          ],
        },
      },
    };
    expect(validateUserConfig(ok)).toEqual(ok);
    // sections must be an array.
    expect(() => validateUserConfig({ site: { landing: { sections: {} } } })).toThrow(
      /site\.landing\.sections/,
    );
    // unknown type.
    expect(() => validateUserConfig({ site: { landing: { sections: [{ type: 'nope' }] } } })).toThrow(
      /\.type/,
    );
    // custom-html requires a non-empty html string.
    expect(() => validateUserConfig({ site: { landing: { sections: [{ type: 'custom-html' }] } } })).toThrow(
      /\.html/,
    );
    // scene requires a scene object.
    expect(() => validateUserConfig({ site: { landing: { sections: [{ type: 'scene' }] } } })).toThrow(
      /\.scene/,
    );
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
