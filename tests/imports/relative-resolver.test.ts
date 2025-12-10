import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveRelativeImport } from '../../core/imports/relative-resolver';

const tmpDirs: string[] = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relative-resolver-'));
  tmpDirs.push(dir);
  return dir;
}

function makeImporter(root: string, relPath = 'src/app.ts') {
  const importerPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(importerPath), { recursive: true });
  fs.writeFileSync(importerPath, '// importer', 'utf8');
  return importerPath;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('resolveRelativeImport', () => {
  it('skips non-relative specifiers', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const result = resolveRelativeImport(importer, 'lodash');
    expect(result).toEqual({
      ok: false,
      reason: 'NON_RELATIVE_SPECIFIER',
      importer,
      specifier: 'lodash',
    });
  });

  it('resolves via extension inference', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const targetDir = path.join(root, 'src/utils');
    const targetFile = path.join(targetDir, 'helper.ts');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, 'export const helper = true;', 'utf8');

    const result = resolveRelativeImport(importer, './utils/helper');
    expect(result).toEqual({ ok: true, resolvedPath: targetFile });
  });

  it('resolves directory specifiers to index files', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const libDir = path.join(root, 'src/lib');
    const indexFile = path.join(libDir, 'index.jsx');
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(indexFile, 'export const value = 1;', 'utf8');

    const result = resolveRelativeImport(importer, './lib');
    expect(result).toEqual({ ok: true, resolvedPath: indexFile });
  });

  it('returns structured error with tried paths when nothing matches', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const importerDir = path.dirname(importer);
    const base = path.join(importerDir, 'missing/module');

    const result = resolveRelativeImport(importer, './missing/module');
    expect(result).toEqual({
      ok: false,
      reason: 'FILE_NOT_FOUND',
      importer,
      specifier: './missing/module',
      tried: [base, `${base}.js`, `${base}.ts`, `${base}.jsx`, `${base}.tsx`],
    });
  });
});
