---
title: Import Extractor
sidebar_position: 1
description: How Structura extracts ES module and CommonJS imports and how to run the extractor.
---

## Import extractor
The import extractor scans JavaScript and TypeScript source files and produces a normalized view of their import relationships. It is a lightweight dependency signal that other parts of the system can consume for graph building, metrics, and navigation. The description here is layout-agnostic and applies to any ingestion pipeline that consumes the extractor’s output.

At a high level, the extractor:
- Walks supported source files
- Parses each file and identifies import-style statements
- Normalizes the result into a consistent JSON structure
- Records enough information to map imports back to the original text

It does not resolve modules on disk or through Node resolution rules; it is purely syntax based.

## Supported import styles
ES module syntax:
- Default import: `import axios from "axios";`
- Named import: `import { AxiosError, AxiosHeaders } from "./core/index.js";`
- Namespace import: `import * as fetchAdapter from "./fetch.js";`
- Mixed default plus named import: `import axios, { AxiosError } from "axios";`
- Side effect only import: `import "./setup-env.js";`

CommonJS patterns:
- Bare require: `require("axios");`
- Require assigned to a variable: `const axios = require("axios");`
- Require with object destructuring: `const { readFile, writeFile } = require("fs");`

Any other usage that does not match the supported patterns is ignored.

## Output shape
The extractor returns an array of file-level records:

```ts
type ExtractorResult = Array<{
  filePath: string;
  imports: ImportRecord[];
}>;

type ImportKind = 'es6' | 'commonjs';

type ImportRecord = {
  kind: ImportKind;
  module: string;
  importedNames: string[];
  line: number; // 1 based
  raw: string;  // original source snippet for this import
};
```

Field semantics:
- `filePath`: absolute or project-relative path of the source file.
- `imports`: normalized import records for that file (empty if none).
- `kind`: `"es6"` for `import` syntax, `"commonjs"` for `require(...)`.
- `module`: string literal of the imported module as written in source.
- `importedNames`: local binding names introduced by the import. Examples:
  - `import axios from "axios";` → `["axios"]`
  - `import { AxiosError, AxiosHeaders } from "./core/index.js";` → `["AxiosError", "AxiosHeaders"]`
  - `import * as fetchAdapter from "./fetch.js";` → `["fetchAdapter"]`
  - `import "./setup-env.js";` → `[]`
  - `const axios = require("axios");` → `["axios"]`
  - `const { readFile, writeFile } = require("fs");` → `["readFile", "writeFile"]`
  - `require("axios");` → `[]`
- `line`: one-based line number where the import starts.
- `raw`: exact source snippet for the import, including quotes, whitespace, and semicolon if present.

## Example
Source:
```js
import axios, { AxiosError } from "axios";
import "./setup-env.js";

const { readFile } = require("fs");
require("path");
```

Output:
```json
{
  "filePath": "/path/to/file.js",
  "imports": [
    {
      "kind": "es6",
      "module": "axios",
      "importedNames": ["axios", "AxiosError"],
      "line": 1,
      "raw": "import axios, { AxiosError } from \"axios\";"
    },
    {
      "kind": "es6",
      "module": "./setup-env.js",
      "importedNames": [],
      "line": 2,
      "raw": "import \"./setup-env.js\";"
    },
    {
      "kind": "commonjs",
      "module": "fs",
      "importedNames": ["readFile"],
      "line": 4,
      "raw": "const { readFile } = require(\"fs\");"
    },
    {
      "kind": "commonjs",
      "module": "path",
      "importedNames": [],
      "line": 5,
      "raw": "require(\"path\");"
    }
  ]
}
```

## Running the extractor script
Use the helper script to parse, normalize, and extract imports for a codebase:

```bash
npx ts-node scripts/collect-imports.ts [path/to/root default=./src]
```

Outputs are written to `output/collect-imports/`:
- `normalized-asts.json` – normalized ASTs plus imports
- `imports-summary.json` – imports only

The script uses:
- `ingestion/crawler` to find JS/TS files
- `ingestion/parser/js/parseFile` to parse
- `core/utils/normalize` to normalize
- `core/imports/extractor` to collect imports

## Typical usage pattern
1. Run the extractor over a repository or selected roots.  
2. Persist or stream the resulting `ExtractorResult`.  
3. Feed `module` and `importedNames` into graph building or other analysis stages.  
4. Use `filePath`, `line`, and `raw` to link back to the original code for visualization or debugging.

## Testing
Unit tests live in `tests/imports/extractor.test.ts` and cover ES6 and CommonJS patterns (default, named, namespace, mixed, side-effect imports, and require variants). Run Vitest:

```bash
npm run test:vitest
```

To avoid cached transforms, clear Vitest cache first:

```bash
rm -rf node_modules/.vitest && npm run test:vitest
```
