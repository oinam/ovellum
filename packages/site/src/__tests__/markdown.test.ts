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

  it('prepends a clickable anchor link to each heading', async () => {
    const { html } = await renderMarkdown('## Hello\nbody');
    expect(html).toMatch(
      /<h2 id="hello"><a class="heading-anchor"[^>]*href="#hello">#<\/a>Hello<\/h2>/,
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
