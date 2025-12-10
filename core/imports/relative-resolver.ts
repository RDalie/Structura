import fs from 'node:fs';
import path from 'node:path';

type ResolveSuccess = {
  ok: true;
  resolvedPath: string;
};

type ResolveNotAttempted = {
  ok: false;
  reason: 'NON_RELATIVE_SPECIFIER';
  importer: string;
  specifier: string;
};

type ResolveFileNotFound = {
  ok: false;
  reason: 'FILE_NOT_FOUND';
  importer: string;
  specifier: string;
  tried: string[];
};

export type RelativeImportResolution = ResolveSuccess | ResolveNotAttempted | ResolveFileNotFound;

const RELATIVE_SPECIFIER = /^\.{1,2}\//;

// Resolve a relative import specifier to a concrete file path.
// Example: resolveRelativeImport('/repo/src/app.ts', './utils/math')
// -> tries /repo/src/utils/math, then .js/.ts/.jsx/.tsx, then index files if math/ is a dir.
export function resolveRelativeImport(importerFilePath: string, specifier: string): RelativeImportResolution {
  // check if the specifier isnt a relative specifier
  if (!RELATIVE_SPECIFIER.test(specifier)) {
    return {
      ok: false,
      reason: 'NON_RELATIVE_SPECIFIER',
      importer: importerFilePath,
      specifier,
    };
  }

  const importerDir = path.dirname(path.resolve(importerFilePath));
  const basePath = path.resolve(importerDir, specifier);
  const tried: string[] = [];

  const baseStat = fs.existsSync(basePath) ? fs.statSync(basePath) : undefined;
  const baseIsDir = baseStat?.isDirectory() ?? false;

  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.ts`,
    `${basePath}.jsx`,
    `${basePath}.tsx`,
    ...(baseIsDir
      ? [
          path.join(basePath, 'index.js'),
          path.join(basePath, 'index.ts'),
          path.join(basePath, 'index.jsx'),
          path.join(basePath, 'index.tsx'),
        ]
      : []),
  ];

  for (const candidate of candidates) {
    tried.push(candidate);
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        return { ok: true, resolvedPath: candidate };
      }
    }
  }

  return {
    ok: false,
    reason: 'FILE_NOT_FOUND',
    importer: importerFilePath,
    specifier,
    tried,
  };
}
