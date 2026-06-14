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

  it('transforms `> [!NOTE]` blockquotes into ov-callout panels', async () => {
    const { html } = await renderMarkdown(['> [!NOTE]', '> Body text here.', ''].join('\n'));
    expect(html).toContain('<div class="ov-callout ov-callout--note">');
    expect(html).toContain('<div class="ov-callout-label">Note</div>');
    expect(html).toContain('Body text here.');
    expect(html).not.toContain('[!NOTE]');
    expect(html).not.toContain('<blockquote');
  });

  it('supports all five GFM alert types', async () => {
    for (const type of ['note', 'tip', 'important', 'warning', 'caution']) {
      const { html } = await renderMarkdown([`> [!${type.toUpperCase()}]`, '> Body.', ''].join('\n'));
      expect(html).toContain(`ov-callout--${type}`);
      expect(html).toContain('ov-callout-label');
    }
  });

  it('handles a callout label on its own line followed by a separate paragraph', async () => {
    const { html } = await renderMarkdown(
      ['> [!WARNING]', '>', '> Heads up — this is non-trivial.', ''].join('\n'),
    );
    expect(html).toContain('ov-callout--warning');
    expect(html).toContain('Heads up — this is non-trivial.');
    expect(html).not.toContain('[!WARNING]');
  });

  it('is case-insensitive on the alert type token', async () => {
    const { html } = await renderMarkdown(['> [!Tip]', '> Casual case.', ''].join('\n'));
    expect(html).toContain('ov-callout--tip');
  });

  it('renders GFM tables, strikethrough, and task lists', async () => {
    const { html: table } = await renderMarkdown(
      ['| H | V |', '| - | - |', '| a | 1 |', '| b | 2 |', ''].join('\n'),
    );
    expect(table).toContain('<div class="ov-table-wrap"><table>');
    expect(table).toContain('<th>H</th>');
    expect(table).toContain('<td>a</td>');

    const { html: strike } = await renderMarkdown('a ~~b~~ c\n');
    expect(strike).toContain('<del>b</del>');

    const { html: task } = await renderMarkdown(['- [x] done', '- [ ] open', ''].join('\n'));
    expect(task).toContain('type="checkbox"');
    expect(task).toMatch(/checked\b/);
  });

  it('leaves a regular blockquote alone', async () => {
    const { html } = await renderMarkdown('> just a quote\n');
    expect(html).toContain('<blockquote');
    expect(html).not.toContain('ov-callout');
  });

  it('strips the appended autolink # from collected heading text', async () => {
    const { headings } = await renderMarkdown(
      ['## Install', 'body', '', '### 1. Build', 'more', ''].join('\n'),
    );
    expect(headings.map((h) => h.text)).toEqual(['Install', '1. Build']);
    expect(headings.every((h) => !h.text.includes('#'))).toBe(true);
  });

  it('appends a clickable anchor link to each heading (heading text stays flush-left)', async () => {
    const { html } = await renderMarkdown('## Hello\nbody');
    expect(html).toMatch(
      /<h2 id="hello">Hello<a class="heading-anchor"[^>]*href="#hello">#<\/a><\/h2>/,
    );
  });

  it('tags highlighted code blocks with data-language (drives syntax highlighting + the comment prefix)', async () => {
    const { html: ts } = await renderMarkdown(['```typescript', 'let n = 1;', '```'].join('\n'));
    expect(ts).toContain('data-language="ts"');
    expect(ts).toContain('data-copy="true"');
    const { html: bash } = await renderMarkdown(['```bash', 'echo hi', '```'].join('\n'));
    expect(bash).toContain('data-language="bash"');
    const { html: text } = await renderMarkdown(['```', 'plain', '```'].join('\n'));
    expect(text).not.toContain('data-language=');
  });

  it('syntax-highlights fenced code blocks via shiki dual themes (default github)', async () => {
    const { html } = await renderMarkdown(
      ['```typescript', 'const x: number = 42;', '```'].join('\n'),
    );
    expect(html).toContain('class="shiki');
    expect(html).toContain('--shiki-light');
    expect(html).toContain('--shiki-dark');
    expect(html).toContain('const');
    // github-light's keyword color is a deep red (#d73a49 / #cf222e).
    expect(html.toLowerCase()).toMatch(/--shiki-light:#(d73a49|cf222e)/);
  });

  it('switches code-block colors when codeTheme is solarized', async () => {
    const { html } = await renderMarkdown(
      ['```typescript', 'const x = 42;', '```'].join('\n'),
      { codeTheme: 'solarized' },
    );
    // solarized-light's keyword color is the well-known cyan #859900 (green
    // in solarized's palette). Different from github-light.
    expect(html).toContain('class="shiki');
    expect(html.toLowerCase()).not.toMatch(/--shiki-light:#(d73a49|cf222e)/);
  });

  it('switches to nord + min-light when codeTheme is nord', async () => {
    const { html } = await renderMarkdown(
      ['```typescript', 'const x = 42;', '```'].join('\n'),
      { codeTheme: 'nord' },
    );
    expect(html).toContain('class="shiki');
    // Nord uses the "frost" #81a1c1-family for keywords in dark mode.
    expect(html.toLowerCase()).toMatch(/--shiki-dark:#[0-9a-f]{6}/);
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

  it('strips <iframe> from a non-allowlisted host', async () => {
    const { html } = await renderMarkdown('<iframe src="https://evil.test"></iframe>');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('evil.test');
  });

  it('strips an <iframe> with a relative / missing src (not a known player)', async () => {
    const rel = await renderMarkdown('<iframe src="/local/page"></iframe>');
    expect(rel.html).not.toContain('<iframe');
    const none = await renderMarkdown('<iframe></iframe>');
    expect(none.html).not.toContain('<iframe');
  });

  it('allows YouTube / Vimeo <iframe> embeds, scoped and hardened', async () => {
    for (const src of [
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://player.vimeo.com/video/76979871',
    ]) {
      const { html } = await renderMarkdown(`<iframe src="${src}" title="Demo"></iframe>`);
      expect(html).toContain('<iframe');
      expect(html).toContain(src);
      // Wrapped in the responsive frame, with forced privacy/perf attributes.
      expect(html).toContain('ov-embed');
      expect(html).toContain('loading="lazy"');
      expect(html.toLowerCase()).toContain('referrerpolicy="strict-origin-when-cross-origin"');
      expect(html.toLowerCase()).toContain('allowfullscreen');
    }
  });

  it("survives YouTube's verbatim copy-paste embed (width/height/frameborder/allow/?si=)", async () => {
    // The exact markup YouTube's "Share → Embed" hands you, pasted unedited.
    const yt =
      '<iframe width="560" height="315" ' +
      'src="https://www.youtube.com/embed/1Jpjw2w_0l8?si=abc123" ' +
      'title="YouTube video player" frameborder="0" ' +
      'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    const { html } = await renderMarkdown(yt);
    expect(html).toContain('<iframe');
    expect(html).toContain('1Jpjw2w_0l8'); // host match unaffected by the ?si= query
    expect(html).toContain('ov-embed');
    expect(html).toContain('allow="accelerometer'); // author's allow list preserved
    expect(html).toContain('loading="lazy"'); // hardened
  });

  it('strips a javascript: src even on an otherwise iframe-shaped tag', async () => {
    const { html } = await renderMarkdown('<iframe src="javascript:alert(1)"></iframe>');
    expect(html).not.toContain('<iframe');
    expect(html.toLowerCase()).not.toContain('javascript:');
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

  it('allows <video>/<audio> players with safe attributes', async () => {
    const video = await renderMarkdown(
      '<video src="/media/demo.mp4" controls width="640" poster="/media/cover.jpg"></video>',
    );
    expect(video.html).toContain('<video');
    expect(video.html).toContain('controls');
    expect(video.html).toContain('/media/demo.mp4');
    expect(video.html).toContain('poster="/media/cover.jpg"');

    const audio = await renderMarkdown(
      '<audio controls><source src="/media/talk.mp3" type="audio/mpeg"></audio>',
    );
    expect(audio.html).toContain('<audio');
    expect(audio.html).toContain('<source');
    expect(audio.html).toContain('/media/talk.mp3');
  });

  it('still strips dangerous bits from media elements', async () => {
    // onerror handler dropped, javascript: src dropped, but the tag survives.
    const { html } = await renderMarkdown(
      '<video src="javascript:alert(1)" onerror="alert(1)" controls></video>',
    );
    expect(html).toContain('<video');
    expect(html).toContain('controls');
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
  });

  it('keeps shiki output (inline styles) intact — sanitization runs before highlighting', async () => {
    const { html } = await renderMarkdown(['```typescript', 'const x = 1;', '```'].join('\n'));
    expect(html).toContain('style="');
    expect(html).toContain('--shiki-light');
  });
});

describe('renderMarkdown — footnotes (GFM)', () => {
  const SAMPLE = ['A claim[^1] and a named one[^note].', '', '[^1]: First.', '[^note]: Second.'].join(
    '\n',
  );

  it('renders references as superscript markers and collects a footnotes section', async () => {
    const { html } = await renderMarkdown(SAMPLE);
    expect(html).toContain('<sup>');
    expect(html).toContain('data-footnote-ref');
    expect(html).toContain('class="footnotes"');
    expect(html).toContain('data-footnote-backref');
  });

  it('keeps reference ids/hrefs in sync — no doubled clobber prefix (the jump-link regression)', async () => {
    const { html } = await renderMarkdown(SAMPLE);
    // remark-rehype prefixes once with `user-content-`; the sanitizer must not
    // prefix the ids a second time, or the href/id pairs stop matching.
    expect(html).not.toContain('user-content-user-content');
    // Forward link: the marker's href resolves to the note's id.
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fn-1"');
    // Back link: the back-ref's href resolves to the marker's id.
    expect(html).toContain('href="#user-content-fnref-1"');
    expect(html).toContain('id="user-content-fnref-1"');
  });

  it('numbers notes by order of first appearance, not definition order', async () => {
    const md = ['Later[^b] before earlier[^a].', '', '[^a]: A.', '[^b]: B.'].join('\n');
    const { html } = await renderMarkdown(md);
    // `[^b]` is referenced first, so its note leads the ordered list.
    expect(html.indexOf('id="user-content-fn-b"')).toBeLessThan(
      html.indexOf('id="user-content-fn-a"'),
    );
  });

  it('keeps the visually-hidden "Footnotes" label out of the ToC', async () => {
    const { html, headings } = await renderMarkdown(SAMPLE);
    expect(headings.some((h) => /footnote/i.test(h.text) || h.id === 'footnote-label')).toBe(false);
    // …and it carries no clickable heading anchor.
    expect(html).not.toContain('href="#footnote-label"');
  });

  it('sanitizes dangerous content inside a footnote definition', async () => {
    const md = ['See[^x].', '', '[^x]: [tap](javascript:alert(1)) <img src=x onerror=alert(1)>'].join(
      '\n',
    );
    const { html } = await renderMarkdown(md);
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
  });
});
