---
title: Dependency Graph Normalizer
sidebar_position: 4
description: Converts resolver snapshots into a canonical dependency graph for Structura’s analyses and Feature Flow.
---

## Purpose
- Converts a resolver snapshot into a canonical dependency graph.
- Feeds later analyses, UI features, and the Feature Flow engine with a clean, deterministic representation.

## Input Format (Resolver Snapshot)
```json
{
  "summary": {
    "generatedAt": "2025-12-10T23:21:09.876Z"
  },
  "entries": [
    {
      "importer": "path/to/file.js",
      "specifier": "./module",
      "resolution": {
        "ok": true,
        "resolvedPath": "path/to/module.js",
        "reason": "FILE_NOT_FOUND"
      }
    }
  ]
}
```
- `importer`: Absolute path of the file declaring the import.
- `specifier`: The raw module specifier string.
- `resolution.ok`: `true` if the specifier was resolved; `false` otherwise.
- `resolution.resolvedPath`: Absolute path of the resolved target (present when `ok` is `true`).
- `resolution.reason`: Failure reason (present when `ok` is `false`).

## Output Format (Normalized Graph)
```json
{
  "version": "2025-12-10T23:21:09.876Z",
  "nodes": [{ "id": "...", "type": "file" }],
  "edges": [{ "from": "...", "to": "...", "kind": "import" }],
  "unresolved": [{ "importer": "...", "specifier": "...", "reason": "..." }]
}
```
- `Node = { id: string, type: "file" }`
- `Edge = { from: string, to: string, kind: "import" }`
- `UnresolvedEntry = { importer: string, specifier: string, reason: string }`

## Node Generation Rules
- Include every `importer`.
- Include every `resolvedPath` when `resolution.ok` is `true`.
- Include nodes even if no edges reference them (complete project view and dead-file detection).
- Deduplicate by `id`.
- Sort alphabetically.
- All nodes use `{ id, type: "file" }`.

## Edge Generation Rules
- Only include entries where `resolution.ok` is `true`.
- Shape: `{ from: importer, to: resolvedPath, kind: "import" }`.
- Deduplicate edges (by `from` + `to`).
- Sort alphabetically by `from`, then by `to`.
- Unresolved imports are not added as edges.
- Resulting edges are ready for graph storage (e.g., Neo4j) and Feature Flow.

## Unresolved Import Rules
- Capture every failed resolution as `{ importer, specifier, reason }`.
- Preserve the original order from the snapshot.
- Excluded from the graph itself to keep edges clean.

## Versioning
- `version` is set to `summary.generatedAt` from the resolver snapshot.
- Keeps all downstream stages aligned with the snapshot version.

## Stability and Determinism
- Sorting nodes and edges guarantees deterministic output across runs.
- Deduplication removes duplicate signals, yielding a clean graph.
- Determinism supports stable snapshots and repeatable analyses.

## Example Output (Minimal)
```json
{
  "version": "2025-01-01T00:00:00.000Z",
  "nodes": [
    { "id": "/app/src/index.js", "type": "file" },
    { "id": "/app/src/lib/util.js", "type": "file" }
  ],
  "edges": [
    { "from": "/app/src/index.js", "to": "/app/src/lib/util.js", "kind": "import" }
  ],
  "unresolved": [
    { "importer": "/app/src/index.js", "specifier": "fs", "reason": "PACKAGE_NOT_FOUND" }
  ]
}
```

## Using the Normalization Script
- Script: `scripts/normalizeResolvedImports.ts`
- Usage:
  ```bash
  npx ts-node scripts/normalizeResolvedImports.ts <resolved-imports.json> [--out output.json]
  ```
- Behavior:
  - Reads a resolver snapshot JSON.
  - Produces `normalized-graph.json` in the same directory by default (or `--out` target).
  - Logs summary counts (version, nodes, edges, unresolved).

## Summary
- Produces a clean, complete dependency graph and unresolved list from resolver snapshots.
- Deterministic: sorted and deduplicated nodes/edges.
- Ready for storage, graph queries, and Feature Flow consumption.
