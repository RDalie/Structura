// Usage: npx ts-node scripts/resolveRelativeImports.ts [root] [--out file.json] [--include-non-relative]
// Example: npx ts-node scripts/resolveRelativeImports.ts ../some/project --out project-imports.json
import fs from 'node:fs';
import path from 'node:path';
import { crawlJsFiles } from '../ingestion/crawler';
import { parseJSFile } from '../ingestion/parser/js/parseFile';
import { normalize } from '../core/utils/normalize';
import type { ModuleNode, NormalizedNode } from '../core/types/ast';
import { extractImportsFromModule } from '../core/imports/extractor';
import { resolveRelativeImport, RelativeImportResolution } from '../core/imports/relative-resolver';

const OUTPUT_DIR = path.resolve('output/resolve-relative-imports');
const DEFAULT_OUTPUT = path.join(OUTPUT_DIR, 'relative-import-resolutions.json');

type CliArgs = {
  root: string;
  outFile: string;
  includeNonRelative: boolean;
};

type ResolutionEntry = {
  importer: string;
  specifier: string;
  kind: 'es6' | 'commonjs';
  importedNames: string[];
  line: number;
  resolution: RelativeImportResolution;
};

function printUsage() {
  console.log(`Resolve relative imports for JS/TS files.

Usage:
  npx ts-node scripts/resolveRelativeImports.ts [root] [--out file.json] [--include-non-relative]

Options:
  root                    Directory to crawl (default: ./src)
  --out/-o <file>         Optional output file name (written under output/resolve-relative-imports)
  --include-non-relative  Include bare/absolute specifiers in the output (skipped by default)
`);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let root: string | undefined;
  let out: string | undefined;
  let includeNonRelative = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--out' || arg === '-o') {
      out = args[++i];
      continue;
    }
    if (arg.startsWith('--out=')) {
      out = arg.split('=')[1];
      continue;
    }
    if (arg === '--include-non-relative') {
      includeNonRelative = true;
      continue;
    }
    if (!arg.startsWith('-') && !root) {
      root = arg;
      continue;
    }
    console.warn(`Ignoring unknown argument: ${arg}`);
  }

  const resolvedRoot = path.resolve(root ?? 'src');
  const resolvedOut = out ? path.join(OUTPUT_DIR, path.basename(out)) : DEFAULT_OUTPUT;

  return {
    root: resolvedRoot,
    outFile: resolvedOut,
    includeNonRelative,
  };
}

async function parseAndNormalize(filePath: string): Promise<ModuleNode | null> {
  const parseResult = await parseJSFile(filePath);
  if (parseResult.hasErrors || !parseResult.tree) {
    console.warn(`Skipping ${filePath}: ${parseResult.errorMessage ?? 'parse error'}`);
    return null;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  const root: NormalizedNode = normalize(parseResult.tree.rootNode, source, filePath);
  if (root.type !== 'Module') {
    console.warn(`Skipping ${filePath}: expected Module root, got ${root.type}`);
    return null;
  }
  return root;
}

async function main() {
  const args = parseArgs();

  if (!fs.existsSync(args.root)) {
    console.error(`Root does not exist: ${args.root}`);
    process.exit(1);
  }

  const files = await crawlJsFiles(args.root);
  console.log(`Found ${files.length} JS/TS files under ${args.root}`);

  const entries: ResolutionEntry[] = [];
  let attempted = 0;
  let resolved = 0;

  for (const file of files) {
    const module = await parseAndNormalize(file);
    if (!module) continue;
    const source = fs.readFileSync(file, 'utf8');
    const imports = extractImportsFromModule(module, source);

    for (const imp of imports.imports) {
      const res = resolveRelativeImport(file, imp.module);
      if (!args.includeNonRelative && res.ok === false && res.reason === 'NON_RELATIVE_SPECIFIER') {
        continue;
      }
      if (res.ok || res.reason !== 'NON_RELATIVE_SPECIFIER') {
        attempted += 1;
      }
      if (res.ok) {
        resolved += 1;
      }
      entries.push({
        importer: file,
        specifier: imp.module,
        kind: imp.kind,
        importedNames: imp.importedNames ?? [],
        line: imp.line,
        resolution: res,
      });
    }
  }

  const summary = {
    root: args.root,
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    importsCollected: entries.length,
    attemptedResolutions: attempted,
    resolvedCount: resolved,
    unresolvedCount: attempted - resolved,
  };

  const output = {
    summary,
    entries,
  };

  fs.mkdirSync(path.dirname(args.outFile), { recursive: true });
  fs.writeFileSync(args.outFile, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Wrote ${entries.length} import records to ${args.outFile}`);
  console.log(
    `Resolutions: ${resolved}/${attempted} successful` +
      (args.includeNonRelative ? ' (including non-relative entries)' : '')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
