import fs from 'node:fs';
import path from 'node:path';
import { crawlJsFiles } from '../ingestion/crawler';
import { parseJSFile } from '../ingestion/parser/js/parseFile';
import { normalize } from '../core/utils/normalize';
import { SNAPSHOT_VERSION } from '../core/config/snapshotVersion';
import type { ModuleNode, NormalizedNode } from '../core/types/ast';
import { extractImportsFromModule } from '../core/imports/extractor';

type Options = {
  roots: string[];
  outDir: string;
  outFile: string;
  importsFile: string;
};

async function parseAndNormalize(filePath: string): Promise<ModuleNode | null> {
  const parseResult = await parseJSFile(filePath);
  if (parseResult.hasErrors || !parseResult.tree) {
    console.warn(`Skipping ${filePath}: ${parseResult.errorMessage ?? 'parse error'}`);
    return null;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const root: NormalizedNode = normalize(
    parseResult.tree.rootNode,
    source,
    filePath,
    SNAPSHOT_VERSION
  );
  if (root.type !== 'Module') {
    console.warn(`Skipping ${filePath}: expected Module root, got ${root.type}`);
    return null;
  }
  return root;
}

async function run(opts: Options) {
  const allFiles = (
    await Promise.all(opts.roots.map((root) => crawlJsFiles(root)))
  ).flat();

  const normalized: ModuleNode[] = [];
  const importsSummary: any[] = [];

  for (const file of allFiles) {
    const mod = await parseAndNormalize(file);
    if (!mod) continue;
    normalized.push(mod);
    const source = fs.readFileSync(file, 'utf8');
    importsSummary.push(extractImportsFromModule(mod, source));
  }

  const output = {
    normalized,
    imports: importsSummary,
  };

  fs.mkdirSync(opts.outDir, { recursive: true });
  fs.writeFileSync(opts.outFile, JSON.stringify(output, null, 2), 'utf8');
  fs.writeFileSync(opts.importsFile, JSON.stringify(importsSummary, null, 2), 'utf8');
  console.log(
    `Normalized ${normalized.length} files. Output -> ${opts.outFile} (full) and ${opts.importsFile} (imports only)`
  );
}

async function main() {
  const roots = process.argv.slice(2);
  const outDir = path.resolve('output/collect-imports');
  const opts: Options = {
    roots: roots.length ? roots.map((p) => path.resolve(p)) : [path.resolve('src')],
    outDir,
    outFile: path.join(outDir, 'normalized-asts.json'),
    importsFile: path.join(outDir, 'imports-summary.json'),
  };
  await run(opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
