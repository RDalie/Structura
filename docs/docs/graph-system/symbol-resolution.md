---
title: Symbol Resolution
sidebar_position: 5
description: How Structura resolves identifiers to declarations and persists ResolvesTo/Declares edges.
---

# Symbol resolution

Single-file lexical resolution that links identifier usages to the declarations they refer to. Produces `ResolvesTo` edges (and optional `Declares` edges for debugging) in the graph for a snapshot.

## High-level flow

1. `IngestionPipelineService` (`backend/src/ingestion/ingestion-pipeline.service.ts`) parses files and builds a `NormalizedModulesContext`.
2. `SymbolGraphExtractor` (`backend/src/ingestion/symbol-graph-extractor.ts`) iterates normalized modules, calls `resolveSymbols`, normalizes paths/ids, dedupes, clears prior symbol edges, and persists via `GraphEdgesService`.
3. `resolveSymbols` (`core/symbols/resolver.ts`) walks a module with a scope stack to emit edges.

## Scope model

- Scopes: Module → Function → Block (innermost wins).
- Scope owners: ModuleNode, FunctionNode, BlockNode.
- Bindings: VariableNode, FunctionNode, ParameterNode (imports/class members later).
- `var` binds to the nearest Function/Module scope; `let`/`const` bind to the current scope.
- Function names are declared in the parent scope first, then in their own function scope (enables self-reference).
- Identifier nodes in declaration positions are not created; only identifier *uses* are resolved.

## Edges emitted

- `ResolvesTo`: fromId = IdentifierNode.id, toId = declaration node id; represents a use-site binding.
- `Declares` (optional): fromId = scope owner id, toId = declaration node id; useful for debugging scope contents.
- Both edges store `filePath` (snapshot-relative when persisted), `snapshotId`, and `version` for determinism.

## Normalization and persistence

- Resolver emits deterministic ids from normalized AST nodes.
- Extractor converts ids to UUID-like values with `toUuid`, maps file paths via `relativePaths`, dedupes by `(fromId, toId, kind)`, deletes existing symbol edges for the snapshot, then inserts the new set through `GraphEdgesService`.

## Current limitations

- Single-file only; no import/export or member-access resolution yet.
- No type-aware resolution or class member handling.
- `Declares` edges may include self-loops for functions (function name in its own scope); can be filtered if undesired.
