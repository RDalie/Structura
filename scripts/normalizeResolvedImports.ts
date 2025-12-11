// Usage: npx ts-node scripts/normalizeResolvedImports.ts <resolved-imports.json> [--out output.json]
// Example: npx ts-node scripts/normalizeResolvedImports.ts output/resolve-imports/resolved-imports.json --out output/resolve-imports/normalized-graph.json
import fs from 'node:fs';
import path from 'node:path';
import { normalizeResolvedImports, ResolverSnapshot } from '../core/imports/dependency-normalizer';

type CliArgs = {
  input: string;
  output: string;
};

function printUsage() {
  console.log(`Normalize a resolved imports snapshot into a dependency graph.

Usage:
  npx ts-node scripts/normalizeResolvedImports.ts <resolved-imports.json> [--out output.json]

Options:
  --out/-o   Optional output path (default: <input dir>/normalized-graph.json)
`);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let input = '';
  let output = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--out' || arg === '-o') {
      output = args[++i];
      continue;
    }
    if (arg.startsWith('--out=')) {
      output = arg.split('=')[1];
      continue;
    }
    if (!arg.startsWith('-') && !input) {
      input = arg;
      continue;
    }
    console.warn(`Ignoring unknown argument: ${arg}`);
  }

  if (!input) {
    printUsage();
    process.exit(1);
  }

  const absInput = path.resolve(input);
  const defaultOut = path.join(path.dirname(absInput), 'normalized-graph.json');
  const absOutput = output ? path.resolve(output) : defaultOut;

  return { input: absInput, output: absOutput };
}

function readSnapshot(filePath: string): ResolverSnapshot {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as ResolverSnapshot;
}

function main() {
  const args = parseArgs();
  if (!fs.existsSync(args.input)) {
    console.error(`Input file not found: ${args.input}`);
    process.exit(1);
  }

  const snapshot = readSnapshot(args.input);
  const normalized = normalizeResolvedImports(snapshot);

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, JSON.stringify(normalized, null, 2), 'utf8');

  console.log(`Normalized graph written to ${args.output}`);
  console.log(`Version: ${normalized.version}, nodes: ${normalized.nodes.length}, edges: ${normalized.edges.length}, unresolved: ${normalized.unresolved.length}`);
}

main();
