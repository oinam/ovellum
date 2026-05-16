import { describe, expect, it } from 'vitest';
import { assetsPrefix, normaliseBasePath, siteUrl } from '../url.js';

describe('normaliseBasePath', () => {
  it('returns empty string for empty / undefined / "/"', () => {
    expect(normaliseBasePath(undefined)).toBe('');
    expect(normaliseBasePath('')).toBe('');
    expect(normaliseBasePath('/')).toBe('');
  });

  it('preserves a valid path unchanged', () => {
    expect(normaliseBasePath('/ovellum')).toBe('/ovellum');
    expect(normaliseBasePath('/docs/site')).toBe('/docs/site');
  });

  it('prepends a leading slash if missing', () => {
    expect(normaliseBasePath('ovellum')).toBe('/ovellum');
  });

  it('strips trailing slashes', () => {
    expect(normaliseBasePath('/ovellum/')).toBe('/ovellum');
    expect(normaliseBasePath('/ovellum///')).toBe('/ovellum');
  });

  it('is idempotent', () => {
    const first = normaliseBasePath('ovellum/');
    expect(normaliseBasePath(first)).toBe(first);
  });
});

describe('siteUrl', () => {
  it('passes external URLs through unchanged', () => {
    expect(siteUrl('https://x.test/y', '/ov')).toBe('https://x.test/y');
    expect(siteUrl('http://x.test', '/ov')).toBe('http://x.test');
    expect(siteUrl('mailto:hi@x.test', '/ov')).toBe('mailto:hi@x.test');
    expect(siteUrl('//cdn.example.com/a', '/ov')).toBe('//cdn.example.com/a');
  });

  it('passes fragment-only URLs through unchanged', () => {
    expect(siteUrl('#hash', '/ov')).toBe('#hash');
  });

  it('passes relative URLs through unchanged', () => {
    expect(siteUrl('foo.md', '/ov')).toBe('foo.md');
    expect(siteUrl('./bar', '/ov')).toBe('./bar');
  });

  it('prepends basePath to site-absolute URLs', () => {
    expect(siteUrl('/foo/', '/ovellum')).toBe('/ovellum/foo/');
    expect(siteUrl('/', '/ovellum')).toBe('/ovellum/');
  });

  it('is a no-op when basePath is empty', () => {
    expect(siteUrl('/foo/', '')).toBe('/foo/');
    expect(siteUrl('/', '')).toBe('/');
  });

  it("doesn't double-prefix already-prefixed URLs", () => {
    expect(siteUrl('/ovellum/foo/', '/ovellum')).toBe('/ovellum/foo/');
    expect(siteUrl('/ovellum', '/ovellum')).toBe('/ovellum');
  });
});

describe('assetsPrefix', () => {
  it("returns '/' for empty basePath", () => {
    expect(assetsPrefix('')).toBe('/');
  });

  it('returns basePath + / otherwise', () => {
    expect(assetsPrefix('/ovellum')).toBe('/ovellum/');
  });
});
