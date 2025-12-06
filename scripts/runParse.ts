import { parseJSFile } from '../ingestion/parser/js/parseFile';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx ts-node scripts/runParse.ts <file>');
    process.exit(1);
  }

  const result = await parseJSFile(filePath);
  console.log(result);
}

main();
