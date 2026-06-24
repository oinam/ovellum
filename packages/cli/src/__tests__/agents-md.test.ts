import { describe, expect, it } from 'vitest';
import { renderAgentsMd } from '../commands/init.js';

/**
 * `AGENTS.md` scaffolding (ROADMAP C4). The hybrid/auto variants must lead with
 * the protected-zone contract — what survives regeneration vs what's
 * overwritten — since that's the rule an agent most needs to respect.
 */

const base = {
  name: 'demo',
  title: 'Demo',
  description: '',
  input: 'content',
  output: 'docs',
  tsconfig: 'tsconfig.json',
  defaultTheme: 'auto' as const,
  landing: false,
};

describe('renderAgentsMd', () => {
  it('manual: edit the content dir, never the output', () => {
    const md = renderAgentsMd({ ...base, mode: 'manual', input: 'content', output: 'dist' });
    expect(md).toContain('# AGENTS.md');
    expect(md).toContain('manual');
    expect(md).toContain('content/');
    expect(md).toContain('Never edit by hand');
    // No protected-zone marker in manual mode.
    expect(md).not.toContain('@manual:start');
  });

  it('hybrid: leads with the protected-zone contract and the real marker', () => {
    const md = renderAgentsMd({ ...base, mode: 'hybrid', output: 'docs' });
    expect(md).toContain('protected-zone contract');
    expect(md).toContain('<!-- @manual:start id="rationale" -->');
    expect(md).toContain('<!-- @manual:end -->');
    expect(md).toContain('.ovellum/orphans/');
    expect(md).toContain('ovellum orphans');
    expect(md).toContain('ovellum_write_zone');
  });

  it('auto: says the output is fully regenerated and must not be hand-edited', () => {
    const md = renderAgentsMd({ ...base, mode: 'auto', output: 'docs' });
    expect(md).toContain('auto');
    expect(md).toContain('fully regenerated');
    expect(md).toContain('Never edit');
    // Auto has no protected zones, so no orphans command.
    expect(md).not.toContain('ovellum orphans');
  });

  it('references the automation guide in every mode', () => {
    for (const mode of ['manual', 'auto', 'hybrid'] as const) {
      expect(renderAgentsMd({ ...base, mode })).toContain('/docs/guides/automation/');
    }
  });
});
