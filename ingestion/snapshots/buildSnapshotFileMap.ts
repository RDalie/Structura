import path from 'node:path';

type SnapshotFileMap = Map<string, string>;

// Normalize path separators to POSIX style so lookups are consistent across platforms.
function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

// Ensure the snapshot root ends with a trailing slash to simplify prefix checks.
function normalizeRoot(root: string): string {
  const normalized = toPosix(root).replace(/\/+$/, '');
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

// Strip leading slashes from a relative path while keeping POSIX separators.
function normalizeRelative(relativePath: string): string {
  const normalized = toPosix(relativePath).replace(/^\/+/, '');
  return normalized;
}

/**
 * Build a snapshot file map (relative -> absolute) from crawler output.
 * - Validates every entry is under the snapshot root
 * - Skips directory-like paths
 * - Exposes helpers for map lookups and base-dir retrieval
 */
export function buildSnapshotFileMap(snapshotRoot: string, crawlerOutput: string[]) {
  const root = normalizeRoot(snapshotRoot);
  const fileMap: SnapshotFileMap = new Map();

  for (const rawAbsolute of crawlerOutput) {
    const absolute = toPosix(rawAbsolute);

    // Defensive: ensure inputs are rooted under the snapshot directory.
    if (!absolute.startsWith(root)) {
      throw new Error(`Path ${absolute} is outside snapshot root ${root}`);
    }

    // Derive the relative key (e.g., src/file.ts) from the absolute path.
    const relative = absolute.slice(root.length);
    // Skip directory-like entries; we only want files.
    if (!relative || relative.endsWith('/')) {
      continue;
    }

    fileMap.set(relative, absolute);
  }

  const getAbsolute = (relativePath: string): string | undefined => {
    // Normalize caller input before lookup.
    const key = normalizeRelative(relativePath);
    return fileMap.get(key);
  };

  const getBaseDir = (absolutePath: string): string => {
    // Provides the containing directory in POSIX form; useful for resolver callers.
    const normalized = toPosix(absolutePath).replace(/\/+$/, '');
    return path.posix.dirname(normalized);
  };

  return { fileMap, getAbsolute, getBaseDir };
}
