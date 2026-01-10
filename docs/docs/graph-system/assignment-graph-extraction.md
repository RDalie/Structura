---
title: Assignment Extraction
sidebar_position: 5
description: How Structura captures ASSIGNMENT edges for local value propagation.
---

# Assignment extraction

## Purpose and intent
`ASSIGNMENT` edges exist to make value propagation explicit in the graph.
- Models directed value flow from a value expression into a storage location.
- Makes state changes queryable without re-walking raw ASTs.
- Provides a foundation for local data-flow analysis and derived insights.

## Semantic definition
An `ASSIGNMENT` edge represents directed value propagation from a right-hand side expression into a left-hand side storage location within a local scope.

It does **not** imply:
- Execution order.
- Alias resolution.
- Mutability classification.

## Edge direction and fields
- `fromId`: AST node representing the assignment target (LHS).
- `toId`: AST node representing the assigned value expression (RHS).
- `kind`: `ASSIGNMENT`.
- `snapshotId`: snapshot that produced the edge.
- `filePath`: source file for the assignment.
- `version`: extraction compatibility version.

All nodes must belong to the same `snapshotId`.

## What is considered an assignment (v1)
Edges are produced for:
- Variable initialization with an initializer.
- Direct assignment expressions.
- Augmented assignments treated as assignments.

## What is explicitly not covered
- Cross-function data flow.
- Cross-file data flow.
- Destructuring assignments.
- Alias analysis.
- Control-flow-dependent propagation.
- Implicit mutations.

## Determinism guarantees
- Deterministic across runs for the same snapshot.
- Snapshot-scoped; no cross-snapshot edges.
- Idempotent extraction.
- Duplicate edges are prevented.

## Example mappings
`let a = b`

Produces:
`ASSIGNMENT(a → b)`

`a = b`

Produces:
`ASSIGNMENT(a → b)`

`obj.x = y`

Produces:
`ASSIGNMENT(obj.x → y)`

`a += b`

Produces:
`ASSIGNMENT(a → b)`

## Relationship to other graph edges
- `ASSIGNMENT` models data flow.
- `CALL` models invocation.
- `MEMBER_ACCESS` models structural access.

No overlap, no replacement.
