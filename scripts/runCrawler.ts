import fs from 'node:fs';
import path from 'node:path';
import { crawlFiles, LANGUAGE_EXTENSION_MAP } from '../ingestion/crawler';

type SupportedLanguage = keyof typeof LANGUAGE_EXTENSION_MAP;
const SCRIPT_OUT_DIR = path.resolve('output/run-crawler');

type CliArgs = {
  root: string;
  languages?: SupportedLanguage[];
  extensions?: string[];
  outPath?: string;
};

function printUsage() {
  console.log(`Usage:
  npx ts-node scripts/runCrawler.ts [root] [--languages js,ts] [--extensions .js,.ts] [--out file.json]

Options:
  root            Directory to crawl (default: ./src)
  --languages/-l  Comma-separated list of languages (javascript, typescript, python, go, java, ruby, php, rust, csharp)
  --extensions/-x Comma-separated list of file extensions; overrides languages when provided
  --out/-o        Write results to a JSON file instead of stdout
  --help/-h       Show this help text

Examples:
  npx ts-node scripts/runCrawler.ts
  npx ts-node scripts/runCrawler.ts ../some-project --languages javascript,typescript
  npx ts-node scripts/runCrawler.ts . --extensions .js,.ts --out output/crawl-files.json
`);
}

function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeExtensions(exts: string[]): string[] {
  return exts.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
}

function parseLanguages(value?: string): SupportedLanguage[] | undefined {
  if (!value) return undefined;
  const requested = parseList(value).map((lang) => lang.toLowerCase());
  const valid: SupportedLanguage[] = [];

  for (const lang of requested) {
    if (lang in LANGUAGE_EXTENSION_MAP) {
      valid.push(lang as SupportedLanguage);
    } else {
      console.warn(`Ignoring unsupported language: ${lang}`);
    }
  }

  return valid.length ? valid : undefined;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let root: string | undefined;
  let languages: SupportedLanguage[] | undefined;
  let extensions: string[] | undefined;
  let outFileName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--root' || arg === '-r') {
      root = args[++i];
      continue;
    }
    if (arg.startsWith('--root=')) {
      root = arg.split('=')[1];
      continue;
    }

    if (arg === '--languages' || arg === '-l') {
      languages = parseLanguages(args[++i]);
      continue;
    }
    if (arg.startsWith('--languages=')) {
      languages = parseLanguages(arg.split('=')[1]);
      continue;
    }

    if (arg === '--extensions' || arg === '-x') {
      extensions = normalizeExtensions(parseList(args[++i]));
      continue;
    }
    if (arg.startsWith('--extensions=')) {
      extensions = normalizeExtensions(parseList(arg.split('=')[1]));
      continue;
    }

    if (arg === '--out' || arg === '-o') {
      outFileName = args[++i];
      continue;
    }
    if (arg.startsWith('--out=')) {
      outFileName = arg.split('=')[1];
      continue;
    }

    if (!arg.startsWith('-') && !root) {
      root = arg;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    printUsage();
    process.exit(1);
  }

  const resolvedRoot = path.resolve(root ?? 'src');
  const resolvedOut = outFileName
    ? path.join(SCRIPT_OUT_DIR, path.basename(outFileName))
    : undefined;

  return {
    root: resolvedRoot,
    languages,
    extensions,
    outPath: resolvedOut,
  };
}

async function main() {
  const args = parseArgs();

  const crawlOptions =
    args.extensions && args.extensions.length
      ? { extensions: args.extensions }
      : args.languages && args.languages.length
        ? { languages: args.languages }
        : undefined;

  console.log(`Crawling ${args.root}...`);
  const files = await crawlFiles(args.root, crawlOptions);
  console.log(`Found ${files.length} files`);

  if (args.outPath) {
    fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
    fs.writeFileSync(args.outPath, JSON.stringify(files, null, 2), 'utf8');
    console.log(`Wrote file list to ${args.outPath}`);
    return;
  }

  if (files.length === 0) {
    console.log('No matching files found.');
    return;
  }

  console.log(files.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
