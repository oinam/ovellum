import { mkdtempSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { convertDest, isFormatConvertible, isOptimizableImage, optimizeImageFile } from '../images.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
// sharp is an optional peer; load it dynamically and skip the encode tests when
// it isn't installed so the suite stays green on environments without it.
let sharp: any = null;
beforeAll(async () => {
  try {
    sharp = (await import('sharp' as string)).default;
  } catch {
    sharp = null;
  }
});

describe('isOptimizableImage', () => {
  it('matches raster formats (case-insensitive), skips svg/gif/other', () => {
    for (const f of ['a.png', 'a.jpg', 'a.jpeg', 'a.webp', 'a.avif', 'IMG.PNG']) {
      expect(isOptimizableImage(f)).toBe(true);
    }
    for (const f of ['a.svg', 'a.gif', 'a.txt', 'a.md', 'noext']) {
      expect(isOptimizableImage(f)).toBe(false);
    }
  });
});

describe('optimizeImageFile', () => {
  it('re-encodes a high-quality JPEG smaller at lower quality', async () => {
    if (!sharp) return; // sharp not installed — skip
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-img-'));
    const src = path.join(dir, 'noise.jpg');
    const dest = path.join(dir, 'out.jpg');
    // Incompressible noise → a large q100 JPEG that shrinks at low quality.
    const raw = randomBytes(256 * 256 * 3);
    await sharp(raw, { raw: { width: 256, height: 256, channels: 3 } })
      .jpeg({ quality: 100 })
      .toFile(src);

    const res = await optimizeImageFile(src, dest, { quality: 30 });
    expect(res.optimized).toBe(true);
    expect(res.savedBytes).toBeGreaterThan(0);
    expect((await stat(dest)).size).toBeLessThan((await stat(src)).size);
  });

  it('keeps the original bytes when a re-encode would not be smaller', async () => {
    if (!sharp) return;
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-img2-'));
    const src = path.join(dir, 'tiny.png');
    const dest = path.join(dir, 'out.png');
    // A 1×1 PNG is already minimal — the re-encode can't beat it.
    await sharp({ create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .png()
      .toFile(src);

    const res = await optimizeImageFile(src, dest, { quality: 80 });
    if (!res.optimized) {
      expect((await readFile(dest)).equals(await readFile(src))).toBe(true);
    }
  });

  it('converts png -> avif under format: avif', async () => {
    if (!sharp) return;
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-img3-'));
    const src = path.join(dir, 'a.png');
    const dest = path.join(dir, 'a.avif');
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 9, g: 9, b: 9 } } })
      .png()
      .toFile(src);

    const res = await optimizeImageFile(src, dest, { quality: 60, format: 'avif' });
    expect(res.optimized).toBe(true);
    const meta = await sharp(dest).metadata();
    expect(meta.format).toBe('heif'); // sharp reports avif inside its heif container
  });

  it('downscales an image wider than maxWidth, keeping aspect', async () => {
    if (!sharp) return;
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-img4-'));
    const src = path.join(dir, 'wide.jpg');
    const dest = path.join(dir, 'wide-out.jpg');
    const raw = randomBytes(400 * 100 * 3);
    await sharp(raw, { raw: { width: 400, height: 100, channels: 3 } })
      .jpeg({ quality: 100 })
      .toFile(src);

    const res = await optimizeImageFile(src, dest, { quality: 80, maxWidth: 200 });
    expect(res.optimized).toBe(true);
    const meta = await sharp(dest).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(50);
  });

  it('never enlarges: an image at or under maxWidth is not resized', async () => {
    if (!sharp) return;
    const dir = mkdtempSync(path.join(tmpdir(), 'ov-img5-'));
    const src = path.join(dir, 'small.png');
    const dest = path.join(dir, 'small-out.png');
    await sharp({ create: { width: 50, height: 20, channels: 3, background: { r: 1, g: 2, b: 3 } } })
      .png()
      .toFile(src);

    await optimizeImageFile(src, dest, { quality: 80, maxWidth: 200 });
    const meta = await sharp(dest).metadata();
    expect(meta.width).toBe(50);
    expect(meta.height).toBe(20);
  });
});

describe('convertDest / isFormatConvertible', () => {
  it('maps convertible extensions to the target format', () => {
    expect(convertDest('/img/x.png', 'webp')).toBe('/img/x.webp');
    expect(convertDest('/img/x.JPG', 'avif')).toBe('/img/x.avif');
    expect(isFormatConvertible('/img/x.jpeg')).toBe(true);
    expect(isFormatConvertible('/img/x.gif')).toBe(false);
  });
});
