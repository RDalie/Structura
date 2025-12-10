// Usage: npx ts-node scripts/testSnapshotFileMap.ts --root "/absolute/path/to/snapshot"
// Writes a human-readable report to output/test-snapshot-file-map/report.txt showing:
// - The snapshot root used
// - How many files the crawler discovered under that root
// - The first ten entries of the snapshot file map (relative -> absolute)
// - Sample lookups using getAbsolute and getBaseDir from buildSnapshotFileMap

import fs from 'node:fs';
import path from 'node:path';
import { crawlFiles } from '../ingestion/crawler';
import { buildSnapshotFileMap } from '../ingestion/snapshots/buildSnapshotFileMap';

const OUTPUT_DIR = path.resolve('output/test-snapshot-file-map');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'report.txt');

function usageAndExit() {
  console.error('Usage: npx ts-node scripts/testSnapshotFileMap.ts --root "/absolute/path/to/snapshot"');
  process.exit(1);
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function normalizeRoot(root: string): string {
  const normalized = toPosix(root).replace(/\/+$/, '');
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

async function main() {
  const args = process.argv.slice(2);
  const rootFlagIndex = args.findIndex((arg) => arg === '--root' || arg.startsWith('--root='));
  if (rootFlagIndex === -1) {
    usageAndExit();
  }

  let snapshotRoot = '';
  const flag = args[rootFlagIndex];
  if (flag === '--root') {
    snapshotRoot = args[rootFlagIndex + 1] ?? '';
  } else {
    snapshotRoot = flag.split('=')[1] ?? '';
  }

  if (!snapshotRoot) {
    usageAndExit();
  }

  const resolvedRoot = path.resolve(snapshotRoot);
  if (!fs.existsSync(resolvedRoot)) {
    console.error(`Root does not exist: ${resolvedRoot}`);
    usageAndExit();
  }

  const stat = fs.statSync(resolvedRoot);
  if (!stat.isDirectory()) {
    console.error(`Root is not a directory: ${resolvedRoot}`);
    usageAndExit();
  }

  console.log('Running snapshot file map test...');
  console.log(`Snapshot root: ${resolvedRoot}`);

  const crawled = await crawlFiles(resolvedRoot);
  const normalizedRoot = normalizeRoot(resolvedRoot);

  const filtered: string[] = [];
  for (const entry of crawled) {
    const posixEntry = toPosix(entry);
    if (!posixEntry.startsWith(normalizedRoot)) {
      console.warn(`Warning: path outside snapshot root, skipping -> ${posixEntry}`);
      continue;
    }
    filtered.push(posixEntry);
  }

  const { fileMap, getAbsolute, getBaseDir } = buildSnapshotFileMap(resolvedRoot, filtered);

  const lines: string[] = [];
  lines.push('Snapshot File Map Report');
  lines.push('========================');
  lines.push(`Snapshot root: ${resolvedRoot}`);
  lines.push(`Total files discovered: ${filtered.length}`);

  lines.push('\nFirst 10 entries (relative => absolute):');
  let count = 0;
  for (const [relative, absolute] of fileMap) {
    if (count >= 10) break;
    lines.push(`- ${relative} => ${absolute}`);
    count += 1;
  }
  if (count === 0) {
    lines.push('- (no files found)');
  }

  // Use the first entry for sample lookups if available.
  const firstEntry = fileMap.entries().next().value as [string, string] | undefined;
  if (firstEntry) {
    const [sampleRelative, sampleAbsolute] = firstEntry;
    lines.push('\nSample lookups:');
    lines.push(`getAbsolute("${sampleRelative}") => ${getAbsolute(sampleRelative)}`);
    lines.push(`getBaseDir("${sampleAbsolute}") => ${getBaseDir(sampleAbsolute)}`);
  } else {
    lines.push('\nSample lookups: (no entries to sample)');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');

  console.log(`Report written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
