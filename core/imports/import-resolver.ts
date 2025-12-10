import fs from 'node:fs';
import path from 'node:path';
import { inferDirectoryIndexFiles, inferFileExtensions } from './resolution-helpers';
import { resolveRelativeImport, RelativeImportResolution } from './relative-resolver';
import { resolveNodePackageImport, NodePackageResolutionResult } from './node-package-resolver';

const RELATIVE_SPECIFIER = /^\.{1,2}\//;

type FsAbstraction = {
  readFile: (filePath: string) => string;
  exists: (filePath: string) => boolean;
  isDirectory: (filePath: string) => boolean;
  join: (...parts: string[]) => string;
  dirname: (filePath: string) => string;
};

type TryExtensionsResult =
  | { ok: true; resolvedPath: string; tried: string[] }
  | { ok: false; tried: string[] };

export type ImportResolution = RelativeImportResolution | NodePackageResolutionResult;

// Generic resolver entry point: handles relative specifiers and bare packages.
export function resolveImport(importerFilePath: string, specifier: string): ImportResolution {
  if (RELATIVE_SPECIFIER.test(specifier)) {
    return resolveRelativeImport(importerFilePath, specifier);
  }
  return resolveNodePackageImport(specifier, importerFilePath, fsAbstraction, tryExtensions);
}

// Apply extension and index inference with deterministic ordering.
function tryExtensions(basePath: string): TryExtensionsResult {
  const tried: string[] = [];

  for (const candidate of inferFileExtensions(basePath)) {
    tried.push(candidate);
    if (fs.existsSync(candidate) && safeIsFile(candidate)) {
      return { ok: true, resolvedPath: candidate, tried };
    }
  }

  for (const candidate of inferDirectoryIndexFiles(basePath)) {
    tried.push(candidate);
    if (fs.existsSync(candidate) && safeIsFile(candidate)) {
      return { ok: true, resolvedPath: candidate, tried };
    }
  }

  return { ok: false, tried };
}

// Filesystem abstraction used by the package resolver; avoids throwing on missing paths.
const fsAbstraction: FsAbstraction = {
  readFile: (filePath: string) => fs.readFileSync(filePath, 'utf8'),
  exists: (filePath: string) => fs.existsSync(filePath),
  isDirectory: (filePath: string) => {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  },
  join: (...parts: string[]) => path.join(...parts),
  dirname: (filePath: string) => path.dirname(filePath),
};

function safeIsFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}
