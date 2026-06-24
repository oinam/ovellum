import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DocProject } from '@ovellum/core';

// Replaced at build time by tsup `define` (see tsup.config.ts).
declare const __OVELLUM_VERSION__: string;

/**
 * IR schema version. Bump when `DocProject`'s shape changes in a way a reader
 * (`ovellum diff`, rename detection) can't transparently tolerate, so those
 * tools can refuse or migrate a stale snapshot instead of misreading it.
 */
export const IR_FORMAT = 1;

export interface PersistedIR {
  generator: 'ovellum';
  /** IR schema version — see {@link IR_FORMAT}. */
  format: number;
  /** Ovellum version that wrote this snapshot. */
  version: string;
  /** The parsed project IR for this build. */
  project: DocProject;
}

const IR_DIR = '.ovellum';
const IR_FILE = 'ir.json';

/**
 * Persist the parsed `DocProject` to `<cwd>/.ovellum/ir.json` after an
 * auto/hybrid build. Unlike the deploy manifest (which lives inside the built
 * output and travels with it), the IR is build *state*: a snapshot of the
 * parsed source kept at the project root, beside `.ovellum/orphans/`, so the
 * next build can compare against it. This is the foundation for `ovellum diff`,
 * rename detection, and anchor last-seen tracking. It's written at the project
 * root regardless of `--out` so the canonical snapshot isn't relocated by a
 * throwaway preview build.
 *
 * Returns the absolute path of the written file.
 */
export async function writeProjectIR(
  project: DocProject,
  opts: { cwd: string },
): Promise<string> {
  const payload: PersistedIR = {
    generator: 'ovellum',
    format: IR_FORMAT,
    version: typeof __OVELLUM_VERSION__ === 'string' ? __OVELLUM_VERSION__ : '0.0.0',
    project,
  };

  const dir = path.resolve(opts.cwd, IR_DIR);
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, IR_FILE);
  await writeFile(out, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return out;
}
