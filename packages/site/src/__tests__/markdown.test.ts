import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../markdown.js';

describe('renderMarkdown', () => {
  it('renders paragraphs + headings + collects h2/h3 for the ToC', async () => {
    const { html, headings } = await renderMarkdown(
      ['# Title', '', '## Intro', 'body', '', '### Detail', 'more', '', '## Setup', ''].join('\n'),
    );
    expect(html).toContain('<h1 id="title">');
    expect(html).toContain('<h2 id="intro">');
    expect(html).toContain('<h3 id="detail">');
    expect(html).toContain('<h2 id="setup">');
    expect(headings.map((h) => h.id)).toEqual(['intro', 'detail', 'setup']);
    expect(headings.map((h) => h.depth)).toEqual([2, 3, 2]);
  });

  it('appends a clickable anchor link to each heading (heading text stays flush-left)', async () => {
    const { html } = await renderMarkdown('## Hello\nbody');
    expect(html).toMatch(
      /<h2 id="hello">Hello<a class="heading-anchor"[^>]*href="#hello">#<\/a><\/h2>/,
    );
  });

  it('syntax-highlights fenced code blocks via shiki dual themes', async () => {
    const { html } = await renderMarkdown(
      ['```typescript', 'const x: number = 42;', '```'].join('\n'),
    );
    expect(html).toContain('class="shiki');
    expect(html).toContain('--shiki-light');
    expect(html).toContain('--shiki-dark');
    expect(html).toContain('const');
  });

  it('passes unknown / missing languages through unstyled', async () => {
    const { html } = await renderMarkdown(['```nope', 'hello', '```'].join('\n'));
    expect(html).toContain('<pre>');
    expect(html).not.toContain('class="shiki');
  });
});

// These tests pin the HTML sanitization policy. Together they're the spec for
// what Ovellum will and will NOT render from user-authored Markdown.
describe('renderMarkdown — HTML sanitization', () => {
  it('strips <script> tags', async () => {
    const { html } = await renderMarkdown('hi\n\n<script>alert(1)</script>\n\nbye');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips inline event handlers', async () => {
    const { html } = await renderMarkdown('<a href="#x" onclick="alert(1)">click</a>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('alert(1)');
  });

  it('strips javascript: URLs from anchors', async () => {
    const { html } = await renderMarkdown('[evil](javascript:alert(1))');
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html).not.toContain('alert(1)');
  });

  it('strips javascript: URLs from raw <a href>', async () => {
    const { html } = await renderMarkdown('<a href="javascript:alert(1)">click</a>');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  it('strips <iframe> tags', async () => {
    const { html } = await renderMarkdown('<iframe src="https://evil.test"></iframe>');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('evil.test');
  });

  it('strips <object> and <embed> tags', async () => {
    const { html } = await renderMarkdown(
      ['<object data="x.swf"></object>', '<embed src="x.swf">'].join('\n\n'),
    );
    expect(html).not.toContain('<object');
    expect(html).not.toContain('<embed');
  });

  it('strips data: URLs everywhere — including <img src> (svg+xml can execute JS)', async () => {
    const anchor = await renderMarkdown('<a href="data:text/html,<script>x</script>">x</a>');
    expect(anchor.html.toLowerCase()).not.toContain('data:text/html');

    const img = await renderMarkdown('![pixel](data:image/png;base64,iVBORw0KG)');
    expect(img.html.toLowerCase()).not.toContain('data:');

    const svg = await renderMarkdown(
      '<img src="data:image/svg+xml,<svg onload=alert(1)></svg>">',
    );
    expect(svg.html.toLowerCase()).not.toContain('data:');
    expect(svg.html.toLowerCase()).not.toContain('onload');
  });

  it('keeps safe HTML that authors actually use', async () => {
    const md = [
      '<details>',
      '<summary>Toggle</summary>',
      '',
      'Hidden body.',
      '',
      '</details>',
      '',
      'Press <kbd>Cmd</kbd>+<kbd>K</kbd>.',
    ].join('\n');
    const { html } = await renderMarkdown(md);
    expect(html).toContain('<details>');
    expect(html).toContain('<summary>');
    expect(html).toContain('<kbd>');
  });

  it('keeps shiki output (inline styles) intact — sanitization runs before highlighting', async () => {
    const { html } = await renderMarkdown(['```typescript', 'const x = 1;', '```'].join('\n'));
    expect(html).toContain('style="');
    expect(html).toContain('--shiki-light');
  });
});
