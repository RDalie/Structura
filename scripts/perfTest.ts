import { parseJSFile } from '../ingestion/parser/js/parseFile';
import { crawlJsFiles } from '../ingestion/crawler';

async function main() {
  const rootDir = process.argv[2];
  if (!rootDir) {
    console.error('Usage: npx ts-node scripts/perfTest.ts <projectRoot>');
    process.exit(1);
  }

  console.log('Crawling project...');
  const filePaths = await crawlJsFiles(rootDir);

  console.log(`Found ${filePaths.length} JS files`);
  console.log('Starting parse performance test...\n');

  const start = Date.now();

  for (const filePath of filePaths) {
    await parseJSFile(filePath);
  }

  const end = Date.now();
  const durationMs = end - start;
  const avgMs = durationMs / filePaths.length;

  console.log(`Parsed ${filePaths.length} files in ${durationMs} ms`);
  console.log(`Average: ${avgMs.toFixed(2)} ms per file`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
