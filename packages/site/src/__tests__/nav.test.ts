import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildNav, findAdjacent, flattenNav, type NavNode } from '../nav.js';

const NAV: NavNode = {
  title: 'Home',
  url: '/',
  sourcePath: 'content/index.md',
  children: [
    {
      title: 'Getting started',
      url: '/getting-started/',
      sourcePath: 'content/getting-started.md',
      children: [],
    },
    {
      title: 'Guides',
      url: '/guides/',
      children: [
        {
          title: 'Install',
          url: '/guides/install/',
          sourcePath: 'content/guides/install.md',
          children: [],
        },
        {
          title: 'Deploy',
          url: '/guides/deploy/',
          sourcePath: 'content/guides/deploy.md',
          children: [],
        },
      ],
    },
  ],
};

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

  it('flattenNav returns pages in depth-first order, skipping group nodes', () => {
    const flat = flattenNav(NAV);
    expect(flat.map((n) => n.url)).toEqual([
      '/',
      '/getting-started/',
      '/guides/install/',
      '/guides/deploy/',
    ]);
  });

  it('findAdjacent returns prev/next around a page', () => {
    expect(findAdjacent(NAV, '/').prev).toBeUndefined();
    expect(findAdjacent(NAV, '/').next?.url).toBe('/getting-started/');
    expect(findAdjacent(NAV, '/getting-started/').prev?.url).toBe('/');
    expect(findAdjacent(NAV, '/getting-started/').next?.url).toBe('/guides/install/');
    expect(findAdjacent(NAV, '/guides/deploy/').next).toBeUndefined();
  });

  it('findAdjacent returns empty when the URL is not in the nav', () => {
    expect(findAdjacent(NAV, '/nowhere/')).toEqual({});
  });

  it('uses _meta.json title for directories with no index.md', async () => {
    // The live website relies on this: content/guides/ etc. have no
    // index.md, only sibling .md files plus a _meta.json. The sidebar
    // group label comes from _meta.json.title.
    const content = path.join(tmp, 'content');
    const sub = path.join(content, 'guides');
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(sub, 'install.md'), '# Install\n');
    writeFileSync(path.join(sub, '_meta.json'), JSON.stringify({ title: 'User Guides' }));

    const nav = await buildNav('./content', tmp);
    const guides = nav.children.find((c) => c.url === '/guides/');
    expect(guides!.title).toBe('User Guides');
    expect(guides!.sourcePath).toBeUndefined();
  });

  it('falls back to a kebab-segment title for index-less, meta-less directories', async () => {
    const content = path.join(tmp, 'content');
    const sub = path.join(content, 'getting-started');
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(sub, 'install.md'), '# Install\n');

    const nav = await buildNav('./content', tmp);
    const dir = nav.children.find((c) => c.url === '/getting-started/');
    expect(dir!.title).toBe('Getting Started');
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
