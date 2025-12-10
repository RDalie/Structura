import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildSnapshotFileMap } from '../../ingestion/snapshots/buildSnapshotFileMap';

const toPosix = (p: string) => p.replace(/\\/g, '/');

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'snapshot-map-test-'));
});

afterEach(async () => {
  if (tempDir) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

describe('buildSnapshotFileMap', () => {
  it('maps relative -> absolute with POSIX separators and exposes lookups', () => {
    const snapshotRoot = path.join(tempDir, 'snapshot');
    // We do not need to create files on disk; the helper only maps paths.
    const absoluteFiles = [
      path.join(snapshotRoot, 'src', 'index.ts'),
      path.join(snapshotRoot, 'README.md'),
      path.join(snapshotRoot, 'nested', 'dir', 'file.js'),
      `${path.join(snapshotRoot, 'nested')}/`, // directory-like; should be skipped
      toPosix(path.join(snapshotRoot, 'backslash', 'file.ts')).replace(/\//g, '\\'), // simulate Windows separators
    ];

    const { fileMap, getAbsolute, getBaseDir } = buildSnapshotFileMap(snapshotRoot, absoluteFiles);

    expect(fileMap.size).toBe(4);
    expect(fileMap.get('src/index.ts')).toBe(toPosix(path.join(snapshotRoot, 'src', 'index.ts')));
    expect(fileMap.get('README.md')).toBe(toPosix(path.join(snapshotRoot, 'README.md')));
    expect(fileMap.get('nested/dir/file.js')).toBe(toPosix(path.join(snapshotRoot, 'nested', 'dir', 'file.js')));
    expect(fileMap.get('backslash/file.ts')).toBe(toPosix(path.join(snapshotRoot, 'backslash', 'file.ts')));

    // Lookups normalize relative input
    expect(getAbsolute('/src/index.ts')).toBe(toPosix(path.join(snapshotRoot, 'src', 'index.ts')));

    // Base dir helper returns POSIX directory portion
    const sampleAbsolute = toPosix(path.join(snapshotRoot, 'nested', 'dir', 'file.js'));
    expect(getBaseDir(sampleAbsolute)).toBe(toPosix(path.join(snapshotRoot, 'nested', 'dir')));
  });

  it('throws when a path is outside the snapshot root', () => {
    const snapshotRoot = path.join(tempDir, 'snapshot');
    const outsidePath = path.join(tempDir, 'other', 'file.ts');

    expect(() => buildSnapshotFileMap(snapshotRoot, [outsidePath])).toThrow(
      /outside snapshot root/
    );
  });

  it('handles snapshot roots with trailing slashes', () => {
    const rootNoSlash = path.join(tempDir, 'root');
    const snapshotRoot = `${rootNoSlash}/`; // trailing slash should be normalized away
    const filePath = path.join(rootNoSlash, 'file.ts');

    const { fileMap } = buildSnapshotFileMap(snapshotRoot, [filePath]);

    expect(fileMap.get('file.ts')).toBe(toPosix(filePath));
  });
});
