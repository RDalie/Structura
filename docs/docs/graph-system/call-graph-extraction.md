---
title: Call Extractor
sidebar_position: 3
description: How Structura extracts calls.
---

# Call graph extraction

This is the ingestion side flow that produces `Call` edges in the graph for a snapshot. Files referenced below are workspace-relative.

## High-level flow

1. `backend/src/ingestion/ingestion-pipeline.service.ts` kicks off parsing for a root and then builds a `NormalizedModulesContext` via `NormalizedModulesBuilderService`.
2. `NormalizedModulesBuilderService` (`backend/src/ingestion/normalized-modules-builder.service.ts`) parses files with Tree-sitter, normalizes them, and returns:
   - `normalizedModules`: `Map<absolutePosixPath, ModuleNode>` for each parsed file.
   - `rootIds`: `Map<absolutePosixPath, uuid>` where each module’s root `id` is hashed with `toUuid` to produce the graph node id for the file.
   - `relativePaths`: `Map<absolutePosixPath, snapshotRelative>` built from `buildSnapshotFileMap`, so graph edges store paths relative to the snapshot root.
   - `snapshotFiles`/`sources`/`snapshotId` (other helpers used by extractors).
3. `CallGraphExtractorService` (`backend/src/ingestion/call-graph-extractor.service.ts`) consumes that context to build and persist call edges for the snapshot.

## How call edges are built

- For each module in `normalizedModules`, a `nodeMap` with parent links is constructed via `buildNodeMapWithParents` (`backend/src/ingestion/ingestion-utils.ts`). This lets us walk up the tree from any node.
- `buildCallEdges` (`core/calls/call-graph.ts`) traverses the module:
  - Collects every `Call` node while visiting the full AST.
  - For each call, grabs the callee’s `id` and finds the nearest enclosing callable (the caller) using `findEnclosingCallable` and the provided `nodeMap`.
  - Emits a candidate edge `{ fromId: callerId, toId: calleeId, filePath, snapshotId, kind: 'Call', version }`, deduping duplicate caller→callee pairs in the same module.
- Back in `CallGraphExtractorService`, each candidate is normalized:
  - `filePath` is converted to snapshot-relative using `relativePaths` (falls back to the normalized absolute path if missing).
  - `fromId`/`toId` are hashed to UUID-like values with `toUuid` for storage.
  - A de-duplication key `${fromId}:${toId}:Call` prevents cross-module duplicates in the same run.
- Before persisting, existing `Call` edges for the snapshot are deleted, then the new edges are inserted via `GraphEdgesService`.

## File path handling

- Paths are normalized to POSIX (`toPosix`) throughout ingestion.
- `buildSnapshotFileMap` enforces that every crawled file is under the snapshot root and gives both absolute and snapshot-relative paths. The call extractor uses the relative path when persisting so edges are stable regardless of absolute location on disk.

## Where to adjust behavior

- Change traversal/dedupe logic: `core/calls/call-graph.ts`.
- Change caller resolution rules: `core/calls/findEnclosingCallable.ts`.
- Change hashing/path normalization: `backend/src/ingestion/ingestion-utils.ts`.
- Change which files participate: crawler configuration or `NormalizedModulesBuilderService`.
