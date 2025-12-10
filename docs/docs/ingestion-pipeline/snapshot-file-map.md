---
title: Snapshot File Map
sidebar_position: 6
description: How Structura builds and inspects the snapshot file map for module resolution.
---

The snapshot file map converts crawler output (absolute paths) into a normalized lookup keyed by paths relative to the snapshot root. This is used by the module resolver to translate between relative identifiers and concrete files captured in a snapshot.

## Inputs

- `snapshotRoot`: absolute path to the snapshot directory (e.g., where a repo snapshot is stored)
- `crawlerOutput`: array of absolute file paths returned by the crawler

### Relation to the crawler

1. The crawler (`ingestion/crawler`) discovers files under a root and returns absolute paths.
2. The snapshot file map consumes that array and rewrites it to `relative -> absolute` keys rooted at the snapshot directory.
3. Downstream module resolution uses the relative keys to locate files within a snapshot without re-crawling.

If a crawler entry is outside `snapshotRoot`, the file map builder warns/throws (depending on the caller’s handling) to avoid mixing paths from multiple roots.

See also: [Crawler](./crawler.md) for how files are discovered before building the snapshot map.

## Behavior

- Validates every path begins with `snapshotRoot`; throws if not
- Skips directory-like entries (paths ending in `/`)
- Normalizes all separators to POSIX (`/`) for cross-platform consistency
- Builds a map: `relativePathFromRoot -> absolutePath`
- Helpers:
  - `getAbsolute(relativePath)` → absolute path or `undefined`
  - `getBaseDir(absolutePath)` → containing directory (POSIX separators)

## Usage (code)

```ts
import { buildSnapshotFileMap } from '../../ingestion/snapshots/buildSnapshotFileMap';

const snapshotRoot = '/abs/path/to/snapshot';
const crawlerOutput = [
  '/abs/path/to/snapshot/src/index.ts',
  '/abs/path/to/snapshot/lib/utils.js',
];

const { fileMap, getAbsolute, getBaseDir } = buildSnapshotFileMap(snapshotRoot, crawlerOutput);

// Map lookups
fileMap.get('src/index.ts');           // -> '/abs/path/to/snapshot/src/index.ts'
getAbsolute('/lib/utils.js');          // -> '/abs/path/to/snapshot/lib/utils.js'
getBaseDir('/abs/path/to/snapshot/lib/utils.js'); // -> '/abs/path/to/snapshot/lib'
```

## Inspecting the map via script

Use the helper script to crawl a snapshot root, build the map, and dump a report to `output/test-snapshot-file-map/report.txt`:

```bash
npx ts-node scripts/testSnapshotFileMap.ts --root "/absolute/path/to/snapshot"
```

The report includes:
- Snapshot root used
- Total files discovered
- First 10 map entries (relative ⇒ absolute)
- Sample lookups using `getAbsolute` and `getBaseDir`

Warnings are printed (and entries skipped) if any crawler path lies outside the provided snapshot root.
