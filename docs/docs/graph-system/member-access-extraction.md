---
title: Member Access Extraction
sidebar_position: 4
description: How Structura captures direct member access edges from normalized ASTs.
---

# Member access extraction

`MemberAccess` edges capture direct, static property access in the normalized AST. They describe *what object is accessed* and *which identifier is accessed* without implying a call or module dependency.

## What MEMBER_ACCESS means

An edge is emitted when the normalized AST contains a `MemberExpression` node (static dot access):
- `fromId`: the object expression node id.
- `toId`: the property `Identifier` node id.
- `filePath`: snapshot-relative path to the source file.
- `snapshotId`/`version`: scope the edge to the ingestion run.

Examples that produce `MemberAccess` edges:
- `user.profile`
- `user?.profile`
- `user.#privateField`
- Chaining like `user.profile.name` (emits two edges: `user -> profile`, then `(user.profile) -> name`).

## What it intentionally excludes

No `MemberAccess` edge is emitted for:
- Computed/dynamic access: `obj["name"]`, `obj[prop]`, `obj?.[prop]`.
- Non-member expressions (identifiers, literals, calls, or unknown nodes).
- Resolution to declarations, types, or class members across files.

Computed access is normalized as `Unknown`, so it is ignored by the extractor.

## How it differs from calls and imports

- **Calls** (`Call` edges) connect an enclosing callable to its callee expression. A call like `obj.method()` can create *both* a `MemberAccess` edge (`obj -> method`) and a `Call` edge (caller -> `MemberExpression` callee).
- **Imports** (`Import` edges) connect one module to another and can span files.
- **MemberAccess** edges are intra-file, syntactic signals about property access and do not imply invocation or module dependency.
