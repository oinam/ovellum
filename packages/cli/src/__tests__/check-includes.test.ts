import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type OvellumConfig } from '@ovellum/core';
import { runCheck } from '../commands/check.js';

/** `ovellum check` validates `::include` targets (W1 snippets). */
describe('check — broken includes (manual mode)', () => {
  let dir: string;
  const config: OvellumConfig = {
    ...DEFAULT_CONFIG,
    input: './content',
    output: './dist',
    mode: 'manual',
  };

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'ovellum-chk-inc-'));
    mkdirSync(path.join(dir, 'content', '_snippets'), { recursive: true });
    writeFileSync(path.join(dir, 'content', '_snippets', 'ok.md'), 'Fine.\n');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('passes when every include resolves (and snippets are not pages)', async () => {
    writeFileSync(
      path.join(dir, 'content', 'index.md'),
      '# Home\n\n::include[/_snippets/ok.md]\n',
    );
    const { issues, files } = await runCheck({ config, cwd: dir });
    expect(issues).toEqual([]);
    // The _snippets file itself is not walked as a page.
    expect(files.some((f) => f.includes('_snippets'))).toBe(false);
  });

  it('flags a missing target and a traversal escape', async () => {
    writeFileSync(
      path.join(dir, 'content', 'index.md'),
      '# Home\n\n::include[/_snippets/gone.md]\n\n::include[../../etc/hosts]\n',
    );
    const { issues } = await runCheck({ config, cwd: dir });
    const kinds = issues.map((i) => i.kind);
    expect(kinds).toEqual(['broken-include', 'broken-include']);
    expect(issues[0]!.message).toContain('file not found');
    expect(issues[0]!.line).toBe(3);
    expect(issues[1]!.message).toContain('escapes the content directory');
  });

  it('i18n: a locale page may include the default locale’s snippet (fallback)', async () => {
    const i18n: OvellumConfig = {
      ...config,
      site: {
        ...config.site,
        defaultLocale: 'en-US',
        locales: [
          { code: 'en-US', label: 'English' },
          { code: 'ja', label: '日本語' },
        ],
      },
    };
    mkdirSync(path.join(dir, 'content', 'en-US', '_snippets'), { recursive: true });
    mkdirSync(path.join(dir, 'content', 'ja'), { recursive: true });
    writeFileSync(path.join(dir, 'content', 'en-US', '_snippets', 'shared.md'), 'Shared.\n');
    writeFileSync(path.join(dir, 'content', 'en-US', 'index.md'), '# Home\n');
    writeFileSync(
      path.join(dir, 'content', 'ja', 'index.md'),
      '# ホーム\n\n::include[/_snippets/shared.md]\n',
    );
    const { issues } = await runCheck({ config: i18n, cwd: dir });
    expect(issues.filter((i) => i.kind === 'broken-include')).toEqual([]);
  });
});
