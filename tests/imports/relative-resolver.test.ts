import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveRelativeImport } from '../../core/imports/relative-resolver';
import { inferDirectoryIndexFiles, inferFileExtensions } from '../../core/imports/resolution-helpers';

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

  it('resolves .cjs and .mjs extensions using stable order', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const targetDir = path.join(root, 'src/utils');
    fs.mkdirSync(targetDir, { recursive: true });

    const cjsTarget = path.join(targetDir, 'compat.cjs');
    const mjsTarget = path.join(targetDir, 'module.mjs');
    fs.writeFileSync(cjsTarget, 'module.exports = {}', 'utf8');
    fs.writeFileSync(mjsTarget, 'export default {}', 'utf8');

    const cjsResult = resolveRelativeImport(importer, './utils/compat');
    expect(cjsResult).toEqual({ ok: true, resolvedPath: cjsTarget });

    const mjsResult = resolveRelativeImport(importer, './utils/module');
    expect(mjsResult).toEqual({ ok: true, resolvedPath: mjsTarget });
  });

  it('resolves directory specifiers to index files', () => {
    const root = makeTmpDir();
    const importer = makeImporter(root);
    const libDir = path.join(root, 'src/lib');
    const indexFile = path.join(libDir, 'index.mjs');
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
      tried: [
        base,
        `${base}.js`,
        `${base}.ts`,
        `${base}.jsx`,
        `${base}.tsx`,
        `${base}.cjs`,
        `${base}.mjs`,
      ],
    });
  });
});

describe('inference helpers', () => {
  it('produces deterministic extension order', () => {
    const base = '/project/src/main';
    expect(inferFileExtensions(base)).toEqual([
      '/project/src/main',
      '/project/src/main.js',
      '/project/src/main.ts',
      '/project/src/main.jsx',
      '/project/src/main.tsx',
      '/project/src/main.cjs',
      '/project/src/main.mjs',
    ]);
  });

  it('produces deterministic index file order', () => {
    const dir = '/project/src/lib';
    expect(inferDirectoryIndexFiles(dir)).toEqual([
      '/project/src/lib/index.js',
      '/project/src/lib/index.ts',
      '/project/src/lib/index.jsx',
      '/project/src/lib/index.tsx',
      '/project/src/lib/index.cjs',
      '/project/src/lib/index.mjs',
    ]);
  });
});
