import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveNodePackageImport } from '../../core/imports/node-package-resolver';
import { inferDirectoryIndexFiles, inferFileExtensions } from '../../core/imports/resolution-helpers';

const tmpDirs: string[] = [];

function makeTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-resolver-'));
  tmpDirs.push(dir);
  return dir;
}

function makeFs(): {
  readFile: (filePath: string) => string;
  exists: (filePath: string) => boolean;
  isDirectory: (filePath: string) => boolean;
  join: (...parts: string[]) => string;
  dirname: (filePath: string) => string;
} {
  return {
    readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
    exists: (filePath) => fs.existsSync(filePath),
    isDirectory: (filePath) => {
      try {
        return fs.statSync(filePath).isDirectory();
      } catch {
        return false;
      }
    },
    join: (...parts) => path.join(...parts),
    dirname: (filePath) => path.dirname(filePath),
  };
}

function tryExtensions(basePath: string) {
  const tried: string[] = [];

  for (const candidate of inferFileExtensions(basePath)) {
    tried.push(candidate);
    if (fs.existsSync(candidate) && safeIsFile(candidate)) {
      return { ok: true as const, resolvedPath: candidate, tried };
    }
  }
  for (const candidate of inferDirectoryIndexFiles(basePath)) {
    tried.push(candidate);
    if (fs.existsSync(candidate) && safeIsFile(candidate)) {
      return { ok: true as const, resolvedPath: candidate, tried };
    }
  }
  return { ok: false as const, tried };
}

function safeIsFile(p: string) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveNodePackageImport', () => {
  it('resolves module field before main', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
    const moduleEntry = path.join(pkgRoot, 'esm.mjs');
    const mainEntry = path.join(pkgRoot, 'cjs.js');
    fs.writeFileSync(moduleEntry, 'export {}');
    fs.writeFileSync(mainEntry, 'module.exports = {}');
    fs.writeFileSync(
      path.join(pkgRoot, 'package.json'),
      JSON.stringify({ module: './esm.mjs', main: './cjs.js' }),
      'utf8'
    );

    const res = resolveNodePackageImport('pkg', importer, makeFs(), tryExtensions);
    expect(res).toEqual({ ok: true, resolvedPath: moduleEntry });
  });

  it('falls back to main when module is absent', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
    const mainEntry = path.join(pkgRoot, 'cjs.js');
    fs.writeFileSync(mainEntry, 'module.exports = {}');
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ main: './cjs.js' }), 'utf8');

    const res = resolveNodePackageImport('pkg', importer, makeFs(), tryExtensions);
    expect(res).toEqual({ ok: true, resolvedPath: mainEntry });
  });

  it('resolves package root index when package.json is missing', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
    const index = path.join(pkgRoot, 'index.js');
    fs.writeFileSync(index, 'module.exports = {}');

    const res = resolveNodePackageImport('pkg', importer, makeFs(), tryExtensions);
    expect(res).toEqual({ ok: true, resolvedPath: index });
  });

  it('resolves package subpaths', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(path.join(pkgRoot, 'lib'), { recursive: true });
    const sub = path.join(pkgRoot, 'lib', 'util.js');
    fs.writeFileSync(sub, 'module.exports = {}');
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ main: './index.js' }), 'utf8');

    const res = resolveNodePackageImport('pkg/lib/util', importer, makeFs(), tryExtensions);
    expect(res).toEqual({ ok: true, resolvedPath: sub });
  });

  it('reports PACKAGE_NOT_FOUND when walking up fails', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const res = resolveNodePackageImport('missing-pkg', importer, makeFs(), tryExtensions);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('PACKAGE_NOT_FOUND');
    expect(res.searched.length).toBeGreaterThan(0);
    expect(res.searched.every((p) => p.endsWith(path.join('node_modules', 'missing-pkg')))).toBe(true);
  });

  it('reports INVALID_PACKAGE_ENTRY when entry cannot be resolved', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ main: './missing.js' }), 'utf8');

    const res = resolveNodePackageImport('pkg', importer, makeFs(), tryExtensions);
    expect(res).toEqual({
      ok: false,
      reason: 'INVALID_PACKAGE_ENTRY',
      packageRoot: pkgRoot,
      specifier: 'pkg',
      tried: [
        path.join(pkgRoot, 'missing.js'),
        path.join(pkgRoot, 'missing.js.js'),
        path.join(pkgRoot, 'missing.js.ts'),
        path.join(pkgRoot, 'missing.js.jsx'),
        path.join(pkgRoot, 'missing.js.tsx'),
        path.join(pkgRoot, 'missing.js.cjs'),
        path.join(pkgRoot, 'missing.js.mjs'),
        path.join(pkgRoot, 'missing.js', 'index.js'),
        path.join(pkgRoot, 'missing.js', 'index.ts'),
        path.join(pkgRoot, 'missing.js', 'index.jsx'),
        path.join(pkgRoot, 'missing.js', 'index.tsx'),
        path.join(pkgRoot, 'missing.js', 'index.cjs'),
        path.join(pkgRoot, 'missing.js', 'index.mjs'),
      ],
    });
  });

  it('reports SUBPATH_NOT_FOUND when subpath is missing', () => {
    const root = makeTmp();
    const importer = path.join(root, 'src', 'file.ts');
    fs.mkdirSync(path.dirname(importer), { recursive: true });
    fs.writeFileSync(importer, '// importer');

    const pkgRoot = path.join(root, 'node_modules', 'pkg');
    fs.mkdirSync(pkgRoot, { recursive: true });
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ main: './index.js' }), 'utf8');
    fs.writeFileSync(path.join(pkgRoot, 'index.js'), 'module.exports = {}');

    const res = resolveNodePackageImport('pkg/missing', importer, makeFs(), tryExtensions);
    expect(res).toEqual({
      ok: false,
      reason: 'SUBPATH_NOT_FOUND',
      specifier: 'pkg/missing',
      packageRoot: pkgRoot,
      subpath: 'missing',
    });
  });
});
