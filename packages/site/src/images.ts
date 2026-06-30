import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Raster formats sharp re-encodes. SVG (vector) and GIF (animation) pass through. */
const OPTIMIZABLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/** Minimal slice of the sharp API we use — avoids a hard type dependency. */
interface SharpInstance {
  jpeg(opts: { quality: number }): SharpInstance;
  png(opts: { compressionLevel: number }): SharpInstance;
  webp(opts: { quality: number }): SharpInstance;
  avif(opts: { quality: number }): SharpInstance;
  toBuffer(): Promise<Buffer>;
}
type SharpFactory = (input: string) => SharpInstance;

let sharpPromise: Promise<SharpFactory> | null = null;

/**
 * Lazily load the optional `sharp` peer dependency. Imported via a non-literal
 * specifier so the typecheck never depends on sharp being installed; a missing
 * package surfaces as an actionable build error instead of an opaque crash.
 */
async function loadSharp(): Promise<SharpFactory> {
  if (!sharpPromise) {
    sharpPromise = import('sharp' as string)
      .then((m) => (m.default ?? m) as SharpFactory)
      .catch((err: unknown) => {
        const code = (err as { code?: string } | undefined)?.code;
        // Truly not installed → an actionable install hint. Any OTHER load error
        // (e.g. a packaging regression that bundled sharp) is surfaced as-is, so
        // it can't masquerade as a missing dependency.
        if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
          throw new Error(
            '`site.images` needs the optional `sharp` package. Install it: `npm i sharp` (or remove `site.images`).',
          );
        }
        throw err instanceof Error ? err : new Error(String(err));
      });
  }
  return sharpPromise;
}

export function isOptimizableImage(filePath: string): boolean {
  return OPTIMIZABLE.has(path.extname(filePath).toLowerCase());
}

/** Raster formats converted to webp under `site.images.format: 'webp'`. */
const WEBP_CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png']);
export function isConvertibleToWebp(filePath: string): boolean {
  return WEBP_CONVERTIBLE.has(path.extname(filePath).toLowerCase());
}
/** The webp output path for a convertible image (`/img/x.png` → `/img/x.webp`). */
export function webpDest(destAbs: string): string {
  return destAbs.replace(/\.(?:png|jpe?g)$/i, '.webp');
}

export interface OptimizeResult {
  /** True if the re-encoded image was smaller and written; false if the original was kept. */
  optimized: boolean;
  /** Bytes saved (original − optimized); 0 when the original was kept. */
  savedBytes: number;
}

/**
 * Re-encode a raster image **in place** (same path + format), writing whichever
 * of the optimized or original bytes is smaller to `destAbs`, so optimization
 * never makes a file bigger. Format-appropriate: lossy `quality` for
 * jpeg/webp/avif, lossless max-deflate for png. Throws if sharp is missing (the
 * caller decides whether to fail the build) or the encode fails.
 */
export async function optimizeImageFile(
  srcAbs: string,
  destAbs: string,
  quality: number,
  format?: 'webp',
): Promise<OptimizeResult> {
  const sharp = await loadSharp();
  const ext = path.extname(srcAbs).toLowerCase();
  const original = await readFile(srcAbs);

  // Format conversion (png/jpg → webp). `destAbs` already carries the `.webp`
  // extension and the HTML `<img src>` refs have been rewritten to it, so we
  // ALWAYS write the converted file — even if marginally larger, the reference
  // is committed (unlike in-place re-encoding, which can keep the original).
  if (format === 'webp' && isConvertibleToWebp(srcAbs)) {
    const out = await sharp(srcAbs).webp({ quality }).toBuffer();
    await writeFile(destAbs, out);
    return { optimized: true, savedBytes: Math.max(0, original.byteLength - out.byteLength) };
  }

  let pipeline = sharp(srcAbs);
  if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality });
  else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipeline = pipeline.webp({ quality });
  else if (ext === '.avif') pipeline = pipeline.avif({ quality });

  const out = await pipeline.toBuffer();
  if (out.byteLength < original.byteLength) {
    await writeFile(destAbs, out);
    return { optimized: true, savedBytes: original.byteLength - out.byteLength };
  }
  // Re-encode wasn't smaller (already-optimized image) — keep the original bytes.
  await copyFile(srcAbs, destAbs);
  return { optimized: false, savedBytes: 0 };
}
