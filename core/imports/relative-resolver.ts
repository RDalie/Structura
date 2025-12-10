import fs from 'node:fs';
import path from 'node:path';
import { inferDirectoryIndexFiles, inferFileExtensions } from './resolution-helpers';

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

// Resolve a relative import specifier to a concrete file path using deterministic extension inference.
// Structured errors mean callers can log or continue without throwing.
export function resolveRelativeImport(importerFilePath: string, specifier: string): RelativeImportResolution {
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
  const tried: string[] = []; // capture every attempted path for structured error reporting.

  // First try the base path with the full extension order (source-first, then build artifacts).
  for (const candidate of inferFileExtensions(basePath)) {
    tried.push(candidate);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { ok: true, resolvedPath: candidate };
    }
  }

  // If the base path is a directory, try known index file names inside it.
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const candidate of inferDirectoryIndexFiles(basePath)) {
      tried.push(candidate);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
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
