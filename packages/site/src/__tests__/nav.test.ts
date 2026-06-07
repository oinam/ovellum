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

  it('findAdjacent skips the 404 page so it never becomes a neighbour', () => {
    // The 404 sorts ahead of real content, so without the exclusion it would
    // land as the "Previous" of the first page.
    const navWith404: NavNode = {
      ...NAV,
      children: [
        { title: 'Page not found', url: '/404/', sourcePath: 'content/404.md', children: [] },
        ...NAV.children,
      ],
    };
    // First real page (the root) has no prev, not the 404.
    expect(findAdjacent(navWith404, '/').prev).toBeUndefined();
    expect(findAdjacent(navWith404, '/getting-started/').prev?.url).toBe('/');
    // The 404 itself isn't part of the reading flow.
    expect(findAdjacent(navWith404, '/404/')).toEqual({});
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

  it('prunes asset-only folders (no markdown) from the nav', async () => {
    const content = path.join(tmp, 'content');
    const pub = path.join(content, 'public', 'fonts');
    mkdirSync(pub, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, 'public', 'logo.svg'), '<svg/>');
    writeFileSync(path.join(pub, 'font.woff2'), 'binary');

    const nav = await buildNav('./content', tmp);
    expect(nav.children.find((c) => c.url === '/public/')).toBeUndefined();
  });

  it('excludes folders listed in ignoreFolders (by name, any depth)', async () => {
    const content = path.join(tmp, 'content');
    const drafts = path.join(content, 'drafts');
    mkdirSync(drafts, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(drafts, 'wip.md'), '# Work in progress\n');

    const nav = await buildNav('./content', tmp, ['drafts']);
    expect(nav.children.find((c) => c.url === '/drafts/')).toBeUndefined();
  });

  it('hides a folder via _meta.json "hidden": true', async () => {
    const content = path.join(tmp, 'content');
    const secret = path.join(content, 'secret');
    mkdirSync(secret, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(secret, 'page.md'), '# Secret\n');
    writeFileSync(path.join(secret, '_meta.json'), JSON.stringify({ hidden: true }));

    const nav = await buildNav('./content', tmp);
    expect(nav.children.find((c) => c.url === '/secret/')).toBeUndefined();
  });

  it('omits pages with frontmatter draft: true', async () => {
    const content = path.join(tmp, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, 'live.md'), '# Live page\n');
    writeFileSync(path.join(content, 'wip.md'), '---\ndraft: true\n---\n# Draft page\n');

    const nav = await buildNav('./content', tmp);
    const urls = nav.children.map((c) => c.url);
    expect(urls).toContain('/live/');
    expect(urls).not.toContain('/wip/');
  });
});
