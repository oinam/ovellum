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

  it('excludes node_modules, dotfiles/dirs, manifests, and ignoreFiles globs from the nav', async () => {
    const content = path.join(tmp, 'site');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, 'guide.md'), '# Guide\n');
    // Noise that must NOT become pages:
    writeFileSync(path.join(content, 'README.md'), '# Repo readme\n');
    writeFileSync(path.join(content, 'package.json'), '{}');
    writeFileSync(path.join(content, '.gitignore'), 'dist\n');
    mkdirSync(path.join(content, 'node_modules', 'dep'), { recursive: true });
    writeFileSync(path.join(content, 'node_modules', 'dep', 'README.md'), '# dep\n');
    mkdirSync(path.join(content, '.git'));
    writeFileSync(path.join(content, '.git', 'notes.md'), '# git\n');

    const nav = await buildNav('./site', tmp, [], ['README.md']);
    expect(nav.children.map((c) => c.url)).toEqual(['/guide/']);
    // README (ignoreFiles), package.json/.gitignore (auto), node_modules + .git
    // (structural dirs) are all gone.
    expect(JSON.stringify(nav)).not.toContain('README');
    expect(JSON.stringify(nav)).not.toContain('node_modules');
  });

  it('uses a root README as the home index when homeBasename is given', async () => {
    const content = path.join(tmp, 'site');
    mkdirSync(content);
    writeFileSync(path.join(content, 'README.md'), '# Welcome\n');
    writeFileSync(path.join(content, 'guide.md'), '# Guide\n');

    const nav = await buildNav('./site', tmp, [], [], undefined, 'README.md');
    // README becomes the root's own page (url '/'), not a separate child.
    expect(nav.url).toBe('/');
    expect(nav.sourcePath).toBe(path.join('site', 'README.md').replace(/\\/g, '/'));
    expect(nav.title).toBe('Welcome');
    expect(nav.children.map((c) => c.url)).toEqual(['/guide/']);
  });

  it('uses a subfolder README as that folder index (index.* wins when both exist)', async () => {
    const content = path.join(tmp, 'content');
    const readmeOnly = path.join(content, 'readme-only');
    const both = path.join(content, 'both');
    mkdirSync(readmeOnly, { recursive: true });
    mkdirSync(both, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(readmeOnly, 'README.md'), '# Readme Section\n');
    writeFileSync(path.join(readmeOnly, 'page.md'), '# Page\n');
    writeFileSync(path.join(both, 'index.md'), '# The Index\n');
    writeFileSync(path.join(both, 'README.md'), '# The Readme\n');

    const nav = await buildNav('./content', tmp);
    const byUrl = Object.fromEntries(nav.children.map((c) => [c.url, c]));
    // README is the section page → folder node has a sourcePath, no /readme/ child.
    const ro = byUrl['/readme-only/']!;
    expect(ro.sourcePath).toContain('README.md');
    expect(ro.children.map((c) => c.url)).toEqual(['/readme-only/page/']);
    // When both exist, index.* wins.
    expect(byUrl['/both/']!.sourcePath).toContain('index.md');
  });

  it('honors a frontmatter permalink as the page URL', async () => {
    const content = path.join(tmp, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(content, 'deep-slug.md'), '---\npermalink: /custom/\n---\n# Custom\n');
    writeFileSync(path.join(content, 'bare.md'), '---\npermalink: bare-path\n---\n# Bare\n');

    const nav = await buildNav('./content', tmp);
    const urls = nav.children.map((c) => c.url).sort();
    expect(urls).toContain('/custom/'); // not /deep-slug/
    expect(urls).toContain('/bare-path/'); // normalized: leading + trailing slash
    expect(urls).not.toContain('/deep-slug/');
  });

  it('captures a folder _meta.json collapse override on the nav node', async () => {
    const content = path.join(tmp, 'content');
    const open = path.join(content, 'always-open');
    const shut = path.join(content, 'always-shut');
    mkdirSync(open, { recursive: true });
    mkdirSync(shut, { recursive: true });
    writeFileSync(path.join(content, 'index.md'), '# Root\n');
    writeFileSync(path.join(open, 'a.md'), '# A\n');
    writeFileSync(path.join(open, '_meta.json'), JSON.stringify({ collapse: false }));
    writeFileSync(path.join(shut, 'b.md'), '# B\n');
    writeFileSync(path.join(shut, '_meta.json'), JSON.stringify({ collapse: true }));

    const nav = await buildNav('./content', tmp);
    const byUrl = Object.fromEntries(nav.children.map((c) => [c.url, c]));
    expect(byUrl['/always-open/']!.collapse).toBe(false);
    expect(byUrl['/always-shut/']!.collapse).toBe(true);
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

  it('findAdjacent skips the 404 page so it never becomes a neighbor', () => {
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

  it('omits pages with frontmatter draft: true (production default)', async () => {
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

  it('includes & flags drafts when includeDrafts; cascades _meta draft + counts', async () => {
    const content = path.join(tmp, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'index.md'), '# Home\n');
    writeFileSync(path.join(content, 'live.md'), '# Live page\n');
    writeFileSync(path.join(content, 'wip.md'), '---\ndraft: true\n---\n# Draft page\n');
    const section = path.join(content, 'wip-section');
    mkdirSync(section);
    writeFileSync(path.join(section, '_meta.json'), '{ "draft": true }');
    writeFileSync(path.join(section, 'page.md'), '# Section page\n');

    // Production: drafts excluded; stats count the page + the section.
    const prodStats = { draftPages: 0, draftSections: 0 };
    const prod = await buildNav('./content', tmp, [], [], undefined, undefined, undefined, false, prodStats);
    const prodUrls = prod.children.map((c) => c.url);
    expect(prodUrls).not.toContain('/wip/');
    expect(prodUrls).not.toContain('/wip-section/');
    expect(prodStats).toEqual({ draftPages: 1, draftSections: 1 });

    // Dev (includeDrafts): drafts present and flagged; folder cascades to child.
    const dev = await buildNav('./content', tmp, [], [], undefined, undefined, undefined, true);
    const wip = dev.children.find((c) => c.url === '/wip/');
    expect(wip?.draft).toBe(true);
    const live = dev.children.find((c) => c.url === '/live/');
    expect(live?.draft).toBeUndefined(); // a live page carries no draft flag
    const sectionNode = dev.children.find((c) => c.url === '/wip-section/');
    expect(sectionNode?.draft).toBe(true);
    expect(sectionNode?.children.every((ch) => ch.draft === true)).toBe(true); // cascade
  });
});
