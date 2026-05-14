import { describe, expect, it } from 'vitest';
import { ConfigError } from '../errors.js';
import { parseFrontmatterOverride } from '../config/frontmatter.js';

describe('parseFrontmatterOverride', () => {
  it('returns empty when frontmatter is undefined', () => {
    expect(parseFrontmatterOverride(undefined)).toEqual({});
  });

  it('returns empty when no ovellum block present', () => {
    expect(parseFrontmatterOverride({ title: 'Hello' })).toEqual({});
  });

  it('treats `ovellum: true` (auto-generated marker) as no-override', () => {
    expect(parseFrontmatterOverride({ ovellum: true })).toEqual({});
  });

  it('extracts mode override', () => {
    expect(parseFrontmatterOverride({ ovellum: { mode: 'manual' } })).toEqual({ mode: 'manual' });
  });

  it('extracts defaultFormat override', () => {
    expect(parseFrontmatterOverride({ ovellum: { defaultFormat: 'mdx' } })).toEqual({
      defaultFormat: 'mdx',
    });
  });

  it('rejects invalid mode', () => {
    expect(() => parseFrontmatterOverride({ ovellum: { mode: 'draft' } })).toThrow(ConfigError);
  });

  it('rejects non-object ovellum block', () => {
    expect(() => parseFrontmatterOverride({ ovellum: 'manual' })).toThrow(ConfigError);
  });
});
