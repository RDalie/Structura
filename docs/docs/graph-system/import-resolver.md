---
title: Import Resolver
sidebar_position: 2
description: Resolves JS/TS imports using deterministic rules for relative specifiers and bare Node packages.
---

## Overview
The Import Resolver turns module specifiers into concrete file paths so downstream stages can build dependency graphs. It handles both relative specifiers (`./`, `../`) and bare packages (e.g., `react`, `lodash/debounce`). When nothing matches it returns structured error objects instead of throwing, keeping ingestion resilient.

## How Resolution Works
**Relative specifiers**
1) Identify the importer directory.  
2) Join the directory with the specifier via `path.resolve`.  
3) Apply extension inference in order: raw path, then `.js`, `.ts`, `.jsx`, `.tsx`, `.cjs`, `.mjs`.  
4) If the path is a directory, try `index.js`, `index.ts`, `index.jsx`, `index.tsx`, `index.cjs`, `index.mjs`.  
5) Use synchronous existence checks; on hit return `{ ok: true, resolvedPath }`; otherwise `{ ok: false, reason: "FILE_NOT_FOUND", tried: [...] }`.

**Bare packages (Node-style subset)**
1) Split package name and optional subpath (supports scoped packages).  
2) Walk upward from the importer to find `node_modules/<packageName>`. If none, return `{ ok: false, reason: "PACKAGE_NOT_FOUND", searched: [...] }`.  
3) Inside the package root, read `package.json` if present. Honor `module` first, then `main` (ignore `exports`/`browser` for now). Use the same extension/index inference via the shared helper. If the entry cannot be resolved, return `{ ok: false, reason: "INVALID_PACKAGE_ENTRY", tried: [...] }`.  
4) If a subpath was specified, resolve `<packageRoot>/<subpath>` with extension/index inference. If missing, return `{ ok: false, reason: "SUBPATH_NOT_FOUND" }`.  
5) On success return `{ ok: true, resolvedPath }`.

All steps are deterministic and avoid Node’s runtime resolver to keep behavior predictable across environments.

## Public API
`resolveImport(importerFilePath, specifier)`

- `importerFilePath`: Absolute path to the file that declares the import.
- `specifier`: The module specifier string (relative or bare package).

Returns:
- Success: `{ ok: true, resolvedPath: "<absolute path>" }`.
- Relative failures: `{ ok: false, reason: "FILE_NOT_FOUND", importer, specifier, tried: [...] }`.
- Package failures:  
  - `{ ok: false, reason: "PACKAGE_NOT_FOUND", specifier, importer, searched: [...] }`  
  - `{ ok: false, reason: "INVALID_PACKAGE_ENTRY", packageRoot, specifier, tried: [...] }`  
  - `{ ok: false, reason: "SUBPATH_NOT_FOUND", specifier, packageRoot, subpath }`

Underlying helpers remain exportable (`resolveRelativeImport`, `resolveNodePackageImport`) for specialized callers.

## Example Resolution Scenarios
- Relative file  
  Importer: `/src/utils/math/add.js`  
  Specifier: `../core/parser`  
  Resolved path: `/src/utils/core/parser.js`

- Relative directory index  
  Importer: `/project/lib/index.ts`  
  Specifier: `./helpers`  
  Resolved path: `/project/lib/helpers/index.ts`

- Bare package  
  Importer: `/workspace/app/pages/home.tsx`  
  Specifier: `react/jsx-runtime`  
  Resolved path: `/workspace/app/node_modules/react/jsx-runtime.js` (after extension inference)

- Unresolved package entry  
  Returns an object like:  
  ```json
  {
    "ok": false,
    "reason": "INVALID_PACKAGE_ENTRY",
    "packageRoot": "/workspace/app/node_modules/pkg",
    "specifier": "pkg",
    "tried": ["/workspace/app/node_modules/pkg/missing.js", "..."]
  }
  ```

## Using the Test Script
A companion script resolves imports across a codebase. Run:

```bash
npx ts-node scripts/resolveImports.ts [root] [--out file.json]
```

It crawls JS/TS files, extracts imports, resolves both relative and bare package specifiers, and writes JSON under `output/resolve-imports/`. The summary includes files scanned, imports collected, attempted resolutions, resolved count, and unresolved count. Each entry lists importer, specifier, and the resolution result. Unresolved imports in build outputs or missing dependencies appear as structured errors rather than crashes.

## Integrating in the Ingestion Pipeline
Use the resolver after import extraction and before constructing dependency graphs. It consumes the import records produced by the [Import Extractor](import-extractor) and supplies concrete file paths for graph building. The design stays minimal and deterministic so more advanced resolvers (TypeScript path aliases, full Node exports maps) can layer on later.

## Notes and Limitations
- Does not interpret TypeScript path mappings or Node `exports`/`browser` fields yet.  
- Treats missing built-in modules (e.g., `fs`, `path` when not present on disk) as `PACKAGE_NOT_FOUND` because this resolver is filesystem-only.  
- Resolution order and extension checks are fixed for reproducibility.  
- Always returns structured results; it never throws.
