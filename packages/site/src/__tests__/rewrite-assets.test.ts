import { describe, expect, it } from 'vitest';
import { rewriteAssetUrls } from '../build.js';

describe('rewriteAssetUrls', () => {
  const base = 'https://cdn.example.com/site';
  const paths = ['/img/logo.svg', '/media/talk.mp3', '/report.pdf'];

  it('rewrites matching src/href/poster attribute values to the CDN', () => {
    const html = [
      '<img src="/img/logo.svg" alt="">',
      '<a href="/report.pdf">PDF</a>',
      '<video poster="/img/logo.svg"><source src="/media/talk.mp3"></video>',
    ].join('\n');
    const out = rewriteAssetUrls(html, base, paths);
    expect(out).toContain('src="https://cdn.example.com/site/img/logo.svg"');
    expect(out).toContain('href="https://cdn.example.com/site/report.pdf"');
    expect(out).toContain('src="https://cdn.example.com/site/media/talk.mp3"');
  });

  it('leaves non-public and unrelated URLs untouched', () => {
    const html =
      '<img src="/guides/diagram.png"><a href="/getting-started/">x</a><a href="https://x.test/report.pdf">y</a>';
    const out = rewriteAssetUrls(html, base, paths);
    expect(out).toBe(html); // none are public assets → unchanged
  });

  it('does not partial-match a longer path', () => {
    const html = '<img src="/img/logo.svg.bak">';
    // '/img/logo.svg' is a public path, but the quoted value is a different file.
    expect(rewriteAssetUrls(html, base, paths)).toBe(html);
  });

  it('rewrites a CSS url() reference', () => {
    const html = '<div style="background:url(/img/logo.svg)"></div>';
    expect(rewriteAssetUrls(html, base, paths)).toContain(
      'url(https://cdn.example.com/site/img/logo.svg)',
    );
  });
});
