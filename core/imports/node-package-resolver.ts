// A deterministic, self-contained resolver for bare package specifiers using a subset of Node's rules.
// - Handles specifiers like "express", "lodash/debounce", "@types/node/fs".
// - Walks upward to find node_modules/<package>, reads package.json, and applies extension/index inference
//   via the provided tryExtensions helper (source-first ordering).
// - Produces structured results instead of throwing, so callers can log or continue safely.

type FsAbstraction = {
  readFile: (filePath: string) => string;
  exists: (filePath: string) => boolean;
  isDirectory: (filePath: string) => boolean;
  join: (...parts: string[]) => string;
  dirname: (filePath: string) => string;
};

type TryExtensionsResult =
  | { ok: true; resolvedPath: string; tried?: string[] }
  | { ok: false; tried: string[] };

export type NodePackageResolutionResult =
  | { ok: true; resolvedPath: string }
  | { ok: false; reason: 'PACKAGE_NOT_FOUND'; specifier: string; importer: string; searched: string[] }
  | { ok: false; reason: 'INVALID_PACKAGE_ENTRY'; packageRoot: string; specifier: string; tried: string[] }
  | { ok: false; reason: 'SUBPATH_NOT_FOUND'; specifier: string; packageRoot: string; subpath: string };

type PackageSpecifierParts = {
  packageName: string;
  packageSubpath: string | null;
};

// Resolve a bare package import using deterministic filesystem checks.
export function resolveNodePackageImport(
  specifier: string,
  importerFilePath: string,
  fs: FsAbstraction,
  tryExtensions: (basePath: string) => TryExtensionsResult
): NodePackageResolutionResult {
  const { packageName, packageSubpath } = splitPackageSpecifier(specifier);

  const searchResult = findPackageRoot(importerFilePath, packageName, fs);
  if (!searchResult.found) {
    return {
      ok: false,
      reason: 'PACKAGE_NOT_FOUND',
      specifier,
      importer: importerFilePath,
      searched: searchResult.searched,
    };
  }

  const packageRoot = searchResult.packageRoot;

  // Step 3: read and interpret package.json if present; fallback to index resolution when absent.
  const packageJsonPath = fs.join(packageRoot, 'package.json');
  const pkgJson = fs.exists(packageJsonPath) ? safeParsePackageJson(packageJsonPath, fs) : null;
  if (pkgJson === 'invalid') {
    return {
      ok: false,
      reason: 'INVALID_PACKAGE_ENTRY',
      packageRoot,
      specifier,
      tried: [],
    };
  }

  if (!packageSubpath) {
    let tried: string[] = [];

    const entryField = pkgJson?.module ?? pkgJson?.main;
    if (typeof entryField === 'string' && entryField.trim().length > 0) {
      const normalizedEntry = stripLeadingDot(entryField.trim());
      const entryBase = fs.join(packageRoot, normalizedEntry);
      const result = tryExtensions(entryBase);
      if (result.ok) {
        return { ok: true, resolvedPath: result.resolvedPath };
      }
      tried = result.tried;
      // If an explicit entry is provided but cannot be resolved, treat as invalid.
      return {
        ok: false,
        reason: 'INVALID_PACKAGE_ENTRY',
        packageRoot,
        specifier,
        tried,
      };
    }

    // No explicit entry: attempt index resolution from package root.
    const fallback = tryExtensions(packageRoot);
    if (fallback.ok) {
      return { ok: true, resolvedPath: fallback.resolvedPath };
    }
    return {
      ok: false,
      reason: 'INVALID_PACKAGE_ENTRY',
      packageRoot,
      specifier,
      tried: fallback.tried,
    };
  }

  // Step 4: subpath resolution (<package>/<subpath>).
  const subpathBase = fs.join(packageRoot, packageSubpath);
  const subpathResult = tryExtensions(subpathBase);
  if (subpathResult.ok) {
    return { ok: true, resolvedPath: subpathResult.resolvedPath };
  }

  return {
    ok: false,
    reason: 'SUBPATH_NOT_FOUND',
    specifier,
    packageRoot,
    subpath: packageSubpath,
  };
}

// Extract package name and optional subpath from a bare specifier.
function splitPackageSpecifier(specifier: string): PackageSpecifierParts {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    const packageName = parts.slice(0, 2).join('/');
    const packageSubpath = parts.length > 2 ? parts.slice(2).join('/') : null;
    return { packageName, packageSubpath };
  }

  const packageName = parts[0] ?? specifier;
  const packageSubpath = parts.length > 1 ? parts.slice(1).join('/') : null;
  return { packageName, packageSubpath };
}

// Walk upward from the importer directory to find node_modules/<package>.
function findPackageRoot(importerFilePath: string, packageName: string, fs: FsAbstraction): {
  found: boolean;
  packageRoot: string;
  searched: string[];
} {
  let currentDir = fs.dirname(importerFilePath);
  const searched: string[] = [];

  while (true) {
    const candidate = fs.join(currentDir, 'node_modules', packageName);
    searched.push(candidate);
    if (fs.exists(candidate) && fs.isDirectory(candidate)) {
      return { found: true, packageRoot: candidate, searched };
    }

    const parent = fs.dirname(currentDir);
    if (parent === currentDir) {
      return { found: false, packageRoot: '', searched };
    }
    currentDir = parent;
  }
}

// Safely parse package.json without throwing.
function safeParsePackageJson(packageJsonPath: string, fs: FsAbstraction): Record<string, any> | 'invalid' {
  try {
    const raw = fs.readFile(packageJsonPath);
    return JSON.parse(raw);
  } catch {
    return 'invalid';
  }
}

function stripLeadingDot(entry: string): string {
  return entry.startsWith('./') ? entry.slice(2) : entry;
}
