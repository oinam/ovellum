import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Persisted result of the last update check, so most invocations do zero
 * network I/O — they just read this file and decide whether the cached
 * `latest` is worth mentioning. Lives in the OS cache dir, never in the repo.
 */
export interface UpdateCache {
  /** Epoch milliseconds of the last successful registry check. */
  lastChecked: number;
  /** The `latest` dist-tag seen at that check. */
  latest: string;
}

/** Platform cache directory, honouring XDG on Linux. */
function cacheDir(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Caches');
  }
  return process.env.XDG_CACHE_HOME || path.join(home, '.cache');
}

function cacheFile(): string {
  return path.join(cacheDir(), 'ovellum', 'update-check.json');
}

export async function readUpdateCache(): Promise<UpdateCache | null> {
  try {
    const raw = await readFile(cacheFile(), 'utf8');
    const data: unknown = JSON.parse(raw);
    if (
      data &&
      typeof data === 'object' &&
      typeof (data as UpdateCache).lastChecked === 'number' &&
      typeof (data as UpdateCache).latest === 'string'
    ) {
      return data as UpdateCache;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeUpdateCache(cache: UpdateCache): Promise<void> {
  try {
    const file = cacheFile();
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(cache), 'utf8');
  } catch {
    // A non-writable cache dir is non-fatal; we just check again next time.
  }
}
