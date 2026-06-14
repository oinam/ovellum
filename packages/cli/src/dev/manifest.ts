import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Replaced at build time by tsup `define` (see tsup.config.ts).
declare const __OVELLUM_VERSION__: string;

export interface ManifestFile {
  /** Path relative to the output directory, POSIX-separated. */
  path: string;
  bytes: number;
  sha256: string;
}

export interface DeployManifest {
  generator: 'ovellum';
  version: string;
  generatedAt: string;
  /** The output directory's basename (e.g. `dist`, `docs`). */
  output: string;
  fileCount: number;
  totalBytes: number;
  files: ManifestFile[];
}

const MANIFEST_DIR = '.ovellum';
const MANIFEST_FILE = 'manifest.json';

/** OS metadata files that are never part of a deploy and shouldn't be hashed. */
const OS_JUNK = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

/**
 * Walk a built output directory, hash every file, and write
 * `<outputAbs>/.ovellum/manifest.json` — a deterministic inventory a deploy
 * tool can use for atomic / incremental uploads (push only changed hashes,
 * verify completeness, cache-bust) so deploying Ovellum's output never depends
 * on any specific host. The `.ovellum/` directory is skipped so the manifest
 * never lists or hashes itself.
 *
 * Returns the absolute path of the written manifest.
 */
export async function writeDeployManifest(opts: {
  outputAbs: string;
  generatedAt: Date;
}): Promise<string> {
  const files: ManifestFile[] = [];
  await walk(opts.outputAbs, opts.outputAbs, files);
  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: DeployManifest = {
    generator: 'ovellum',
    version: typeof __OVELLUM_VERSION__ === 'string' ? __OVELLUM_VERSION__ : '0.0.0',
    generatedAt: opts.generatedAt.toISOString(),
    output: path.basename(opts.outputAbs),
    fileCount: files.length,
    totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
    files,
  };

  const dir = path.join(opts.outputAbs, MANIFEST_DIR);
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, MANIFEST_FILE);
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return out;
}

async function walk(rootAbs: string, dirAbs: string, acc: ManifestFile[]): Promise<void> {
  for (const entry of await readdir(dirAbs, { withFileTypes: true })) {
    // Never descend into our own metadata dir at the output root.
    if (entry.name === MANIFEST_DIR && dirAbs === rootAbs) continue;
    if (OS_JUNK.has(entry.name)) continue;
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      await walk(rootAbs, abs, acc);
    } else if (entry.isFile()) {
      const buf = await readFile(abs);
      acc.push({
        path: path.relative(rootAbs, abs).replace(/\\/g, '/'),
        bytes: buf.byteLength,
        sha256: createHash('sha256').update(buf).digest('hex'),
      });
    }
  }
}
