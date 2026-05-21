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
});
