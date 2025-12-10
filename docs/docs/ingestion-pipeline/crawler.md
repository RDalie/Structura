# Crawler

The crawler walks a repository, skips ignored folders, and returns files that match the requested languages or extensions. It is the first step of the ingestion pipeline before parsing or normalization.

## Running the crawler

- Default JS/TS crawl of `./src`:
  ```bash
  npx ts-node scripts/runCrawler.ts
  ```
- Crawl a custom root with selected languages:
  ```bash
  npx ts-node scripts/runCrawler.ts ../some-project --languages javascript,typescript
  ```
- Crawl with explicit extensions and save results to disk (writes under `output/run-crawler/`):
  ```bash
  npx ts-node scripts/runCrawler.ts . --extensions .js,.ts --out crawl-files.json
  ```

Output: prints the file list to stdout. If `--out` is provided, writes a JSON array of file paths to `output/run-crawler/<your-file-name>`.

## Options

- `root` (positional): directory to crawl (default `./src`)
- `--languages` / `-l`: comma-separated languages (javascript, typescript, python, go, java, ruby, php, rust, csharp)
- `--extensions` / `-x`: comma-separated extensions; overrides languages when present
- `--out` / `-o`: write JSON results to a file instead of stdout
- `--help` / `-h`: show usage

## Ignore rules

The crawler always skips `node_modules`, `dist`, `build`, `coverage`, `.git`, plus any folder names listed in `ingestion/crawler/ignore-folders.txt`. Add entries there to ignore additional directories.

## Where it is used

Other ingestion scripts (e.g., `scripts/collect-imports.ts`) call the crawler to discover source files before parsing and extracting imports.
