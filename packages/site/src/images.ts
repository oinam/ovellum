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
  resize(opts: { width: number; withoutEnlargement: boolean }): SharpInstance;
  metadata(): Promise<{ width?: number }>;
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

/** Raster formats converted under `site.images.format` (`'webp'` / `'avif'`). */
const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png']);
export function isFormatConvertible(filePath: string): boolean {
  return CONVERTIBLE.has(path.extname(filePath).toLowerCase());
}
/** The converted output path for a convertible image (`/img/x.png` → `/img/x.webp`). */
export function convertDest(destAbs: string, format: 'webp' | 'avif'): string {
  return destAbs.replace(/\.(?:png|jpe?g)$/i, '.' + format);
}

export interface OptimizeResult {
  /** True if the re-encoded image was smaller and written; false if the original was kept. */
  optimized: boolean;
  /** Bytes saved (original − optimized); 0 when the original was kept. */
  savedBytes: number;
}

export interface OptimizeOptions {
  /** Encoder quality 1–100 for lossy formats. */
  quality: number;
  /** Convert png/jpg/jpeg to this format (`destAbs` already carries the new extension). */
  format?: 'webp' | 'avif';
  /** Downscale images wider than this many px (aspect kept; never enlarges). */
  maxWidth?: number;
}

/**
 * Re-encode a raster image, writing to `destAbs`. Without `format` this is an
 * in-place re-encode (same path + format) that keeps whichever of the optimized
 * or original bytes is smaller, so optimization never makes a file bigger —
 * EXCEPT when `maxWidth` actually downscaled the image: then the resized encode
 * is the wanted artifact and is always written. With `format`, convertible
 * sources are always written too (the HTML refs were rewritten to the new
 * extension, so the reference is committed). Format-appropriate encoding: lossy
 * `quality` for jpeg/webp/avif, lossless max-deflate for png. Throws if sharp
 * is missing (the caller decides whether to fail the build) or the encode fails.
 */
export async function optimizeImageFile(
  srcAbs: string,
  destAbs: string,
  opts: OptimizeOptions,
): Promise<OptimizeResult> {
  const sharp = await loadSharp();
  const ext = path.extname(srcAbs).toLowerCase();
  const original = await readFile(srcAbs);
  const quality = opts.quality;

  // Downscale only when the intrinsic width exceeds the cap (metadata read is
  // cheap — header only). `withoutEnlargement` is belt-and-braces.
  let resized = false;
  if (opts.maxWidth) {
    const meta = await sharp(srcAbs).metadata();
    resized = (meta.width ?? 0) > opts.maxWidth;
  }
  const pipelineFor = (): SharpInstance => {
    let p = sharp(srcAbs);
    if (resized && opts.maxWidth) p = p.resize({ width: opts.maxWidth, withoutEnlargement: true });
    return p;
  };

  if (opts.format && isFormatConvertible(srcAbs)) {
    const p = pipelineFor();
    const out = await (opts.format === 'avif' ? p.avif({ quality }) : p.webp({ quality })).toBuffer();
    await writeFile(destAbs, out);
    return { optimized: true, savedBytes: Math.max(0, original.byteLength - out.byteLength) };
  }

  let pipeline = pipelineFor();
  if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality });
  else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipeline = pipeline.webp({ quality });
  else if (ext === '.avif') pipeline = pipeline.avif({ quality });

  const out = await pipeline.toBuffer();
  if (resized || out.byteLength < original.byteLength) {
    await writeFile(destAbs, out);
    return { optimized: true, savedBytes: Math.max(0, original.byteLength - out.byteLength) };
  }
  // Re-encode wasn't smaller (already-optimized image) — keep the original bytes.
  await copyFile(srcAbs, destAbs);
  return { optimized: false, savedBytes: 0 };
}
