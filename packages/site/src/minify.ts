import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Asset types esbuild minifies. Anything else is copied verbatim. */
const MINIFIABLE: Record<string, 'css' | 'js'> = {
  '.css': 'css',
  '.js': 'js',
  '.mjs': 'js',
  '.cjs': 'js',
};

/** Minimal slice of the esbuild API we use — avoids a hard type dependency. */
interface EsbuildModule {
  transform(input: string, opts: { loader: 'css' | 'js'; minify: true }): Promise<{ code: string }>;
}

let esbuildPromise: Promise<EsbuildModule> | null = null;

/**
 * Lazily load the optional `esbuild` peer dependency. Imported via a non-literal
 * specifier so the typecheck never depends on esbuild being installed; a missing
 * package surfaces as an actionable build error, and any OTHER load error is
 * re-thrown as-is (it can't masquerade as "not installed").
 */
async function loadEsbuild(): Promise<EsbuildModule> {
  if (!esbuildPromise) {
    esbuildPromise = import('esbuild' as string)
      .then((m) => (m.default ?? m) as EsbuildModule)
      .catch((err: unknown) => {
        const code = (err as { code?: string } | undefined)?.code;
        if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
          throw new Error(
            '`site.minify` needs the optional `esbuild` package. Install it: `npm i esbuild` (or remove `site.minify`).',
          );
        }
        throw err instanceof Error ? err : new Error(String(err));
      });
  }
  return esbuildPromise;
}

export function isMinifiable(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() in MINIFIABLE;
}

export interface MinifyResult {
  /** True if the minified output was smaller and written; false if the original was kept. */
  minified: boolean;
  /** Bytes saved (original − minified); 0 when the original was kept. */
  savedBytes: number;
}

/**
 * Minify a `.css` / `.js` asset via esbuild, writing whichever of the minified
 * or original bytes is smaller to `destAbs` (so minification never grows a
 * file). Throws if esbuild is missing (the caller decides whether to fail the
 * build) or the transform fails (e.g. a syntax error).
 */
export async function minifyFile(srcAbs: string, destAbs: string): Promise<MinifyResult> {
  const loader = MINIFIABLE[path.extname(srcAbs).toLowerCase()];
  if (!loader) throw new Error(`not a minifiable asset (call isMinifiable first): ${srcAbs}`);
  const original = await readFile(srcAbs, 'utf8');
  const esbuild = await loadEsbuild();
  const { code } = await esbuild.transform(original, { loader, minify: true });

  const originalBytes = Buffer.byteLength(original);
  const minifiedBytes = Buffer.byteLength(code);
  if (minifiedBytes < originalBytes) {
    await writeFile(destAbs, code, 'utf8');
    return { minified: true, savedBytes: originalBytes - minifiedBytes };
  }
  await writeFile(destAbs, original, 'utf8');
  return { minified: false, savedBytes: 0 };
}
