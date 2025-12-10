---
title: Relative Import Resolver
sidebar_position: 2
description: Resolves relative JavaScript and TypeScript import specifiers using deterministic filesystem rules.
---

## Overview
The Relative Import Resolver turns relative module specifiers into concrete file paths so downstream stages can build dependency graphs. It only handles specifiers that begin with `./` or `../`. When no matching file is found it produces a structured error object instead of throwing, making it safe to run inside ingestion pipelines that must keep processing other files.

## How Resolution Works
The resolver follows a deterministic sequence:
1) Identify the importer file’s directory.  
2) Use `path.resolve` to join that directory with the relative specifier, producing a normalized base path.  
3) Apply extension inference by checking, in order: the raw path, then `.js`, `.ts`, `.jsx`, `.tsx`, `.cjs`, `.mjs`.  
4) If the raw path is a directory, also try `index.js`, `index.ts`, `index.jsx`, `index.tsx`, `index.cjs`, `index.mjs`.  
5) Use synchronous file existence checks to see which candidate exists.  
6) If a file is found, return `{ ok: true, resolvedPath }`.  
7) If none match, return `{ ok: false, reason: "FILE_NOT_FOUND", tried: [...] }`.  
Each step keeps the logic explicit and avoids environment-dependent behavior, which makes results reproducible across machines.

## Public API
`resolveRelativeImport(importerFilePath, specifier)`

- `importerFilePath`: Absolute path to the file that declares the import.
- `specifier`: The raw module specifier string from the import statement.

Returns:
- Success: `{ ok: true, resolvedPath: "<absolute path to file>" }`.
- Failure: `{ ok: false, reason: "FILE_NOT_FOUND", importer, specifier, tried: [...] }` when no candidate exists.
- Not attempted: `{ ok: false, reason: "NON_RELATIVE_SPECIFIER", importer, specifier }` when the specifier does not start with `./` or `../`.

## Example Resolution Scenarios
- Example 1  
  Importer: `/src/utils/math/add.js`  
  Specifier: `../core/parser`  
  Resolved path: `/src/utils/core/parser.js`

- Example 2  
  Importer: `/project/lib/index.ts`  
  Specifier: `./helpers`  
  Resolved path: `/project/lib/helpers/index.ts`

- Example 3 — Unresolved file  
  Returns an object like:  
  ```json
  {
    "ok": false,
    "reason": "FILE_NOT_FOUND",
    "importer": "/app/src/main.ts",
    "specifier": "./missing/util",
    "tried": [
      "/app/src/missing/util",
      "/app/src/missing/util.js",
      "/app/src/missing/util.ts",
      "/app/src/missing/util.jsx",
      "/app/src/missing/util.tsx"
    ]
  }
  ```

## Using the Test Script
A companion script validates the resolver against a real codebase. It accepts a root directory, extracts imports, and runs the resolver on each one. The output JSON includes a summary covering files scanned, imports collected, resolutions attempted, resolved count, and unresolved count. Each entry lists the importer, the original specifier, and the resolution result. Unresolved imports inside build or distribution folders are expected because generated artifacts may not exist in source form.

## Integrating the Resolver in the Ingestion Pipeline
Use the resolver after import extraction and before constructing dependency graphs. It consumes the import records produced by the [Import Extractor](import-extractor) and supplies the concrete file paths that later stages need. This module is intentionally simple and serves as the groundwork for more advanced resolvers that will eventually incorporate Node and TypeScript resolution rules.

## Notes and Limitations
The resolver only attempts relative specifiers; bare package imports are ignored. It does not read or interpret TypeScript path mappings, and it does not implement Node-style package resolution. All behavior is driven by explicit filesystem checks using the fixed candidate list described above.
