import { describe, expect, it } from 'vitest';
import { localize } from '../strings.js';

describe('localize', () => {
  it('passes plain strings through unchanged', () => {
    expect(localize('Docs', 'ja', 'en-US')).toBe('Docs');
    // The single-language invariant: no locale info, plain string in, same out.
    expect(localize('Docs', undefined, undefined)).toBe('Docs');
  });

  it('resolves to the current locale when present', () => {
    expect(localize({ 'en-US': 'Docs', ja: 'ドキュメント' }, 'ja', 'en-US')).toBe('ドキュメント');
    expect(localize({ 'en-US': 'Docs', ja: 'ドキュメント' }, 'en-US', 'en-US')).toBe('Docs');
  });

  it('falls back to the default locale when the current locale is missing', () => {
    expect(localize({ 'en-US': 'Docs', ja: 'ドキュメント' }, 'de', 'en-US')).toBe('Docs');
  });

  it('falls back to the first entry when neither current nor default match', () => {
    expect(localize({ ja: 'ドキュメント', de: 'Dokumente' }, 'fr', 'en-US')).toBe('ドキュメント');
    expect(localize({ ja: 'ドキュメント' }, undefined, undefined)).toBe('ドキュメント');
  });

  it('returns an empty string for undefined', () => {
    expect(localize(undefined, 'ja', 'en-US')).toBe('');
  });
});
