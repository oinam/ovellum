import { describe, expect, it } from 'vitest';
import { ICONS, renderIcon, type IconName } from '../icons.js';

describe('ICONS registry', () => {
  it('every entry is a non-empty SVG body string', () => {
    for (const [name, body] of Object.entries(ICONS)) {
      expect(body, `icon ${name} should have an SVG body`).toBeTruthy();
      expect(body.length, `icon ${name} should not be empty`).toBeGreaterThan(0);
    }
  });

  it("every entry references currentColor implicitly (no hard-coded fills)", () => {
    for (const [name, body] of Object.entries(ICONS)) {
      expect(
        body.toLowerCase(),
        `icon ${name} must not hard-code a color`,
      ).not.toMatch(/(fill|stroke)\s*=\s*"#/);
    }
  });
});

describe('renderIcon', () => {
  it('wraps the body in a Lucide-shaped <svg>', () => {
    const svg = renderIcon('menu');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('width="20"');
    expect(svg).toContain('height="20"');
  });

  it('honors the size option', () => {
    const svg = renderIcon('menu', { size: 32 });
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="32"');
  });

  it('applies a class when given', () => {
    const svg = renderIcon('menu', { class: 'ov-icon-toggle' });
    expect(svg).toContain('class="ov-icon-toggle"');
  });

  it('is aria-hidden by default (decorative)', () => {
    const svg = renderIcon('menu');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
  });

  it('promotes to role="img" with an aria-label when labeled', () => {
    const svg = renderIcon('github', { label: 'GitHub' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="GitHub"');
    expect(svg).not.toContain('aria-hidden');
  });

  it('escapes attribute values', () => {
    const svg = renderIcon('menu', { class: '"><script>x</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('renders every registered icon without throwing', () => {
    const names = Object.keys(ICONS) as IconName[];
    for (const n of names) {
      expect(() => renderIcon(n)).not.toThrow();
    }
  });
});
