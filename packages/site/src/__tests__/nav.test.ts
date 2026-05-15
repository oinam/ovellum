import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildNav } from '../nav.js';

describe('buildNav', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'ovellum-nav-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('walks a flat directory and produces page nodes', async () => {
    const content = path.join(tmp, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, 'about.md'), '---\ntitle: About us\n---\n');
    writeFileSync(path.join(content, 'contact.md'), '# Get in touch\n');

    const nav = await buildNav('./content', tmp);
    expect(nav.url).toBe('/');
    expect(nav.title).toBe('Home');
    expect(nav.children.map((c) => c.url)).toEqual(['/about/', '/contact/']);
    expect(nav.children[0]!.title).toBe('About us'); // frontmatter title
    expect(nav.children[1]!.title).toBe('Get in touch'); // h1 fallback
  });

  it('nests subdirectories and honors _meta.json order + title', async () => {
    const content = path.join(tmp, 'content');
    const sub = path.join(content, 'guides');
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(sub, 'install.md'), '# Install\n');
    writeFileSync(path.join(sub, 'deploy.md'), '# Deploy\n');
    writeFileSync(
      path.join(sub, '_meta.json'),
      JSON.stringify({ title: 'Guides', order: ['deploy', 'install'] }),
    );

    const nav = await buildNav('./content', tmp);
    const guides = nav.children.find((c) => c.url === '/guides/');
    expect(guides).toBeDefined();
    expect(guides!.title).toBe('Guides');
    expect(guides!.children.map((c) => c.url)).toEqual(['/guides/deploy/', '/guides/install/']);
  });

  it('skips files prefixed with `_`', async () => {
    const content = path.join(tmp, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, '_draft.md'), '# Hidden\n');
    const nav = await buildNav('./content', tmp);
    expect(nav.children.map((c) => c.url)).toEqual([]);
  });
});
