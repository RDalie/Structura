# Snapshot and AST Persistence Model

## Overview
Snapshot is the first-class record of a single analysis execution. It owns every persisted AST artifact produced in that run and defines the boundary for scoping, cleanup, and later retrieval. Snapshot does not represent source control history or wall-clock time; it is the unit of ownership for one invocation of the analysis pipeline.

### Snapshot vs snapshotVersion
`snapshotVersion` is the semantic version of the normalized AST schema and extraction rules applied during analysis. It is not tied to git commits or timestamps and is included in deterministic identity generation. `Snapshot` is the stored instance of a run. Multiple snapshots can share the same `snapshotVersion`; the version remains stable while individual snapshots track distinct executions.

## Snapshot Model
The `Snapshot` table stores one row per analysis execution and scopes all dependent AST rows.
- `id`: Primary key UUID generated at creation; used as the foreign key for all scoped data.
- `snapshotVersion`: Normalization and schema version used for the run; kept stable until an intentional schema change.
- `rootPath`: Root of the analyzed workspace used for path normalization and reproducibility.
- `createdAt`: Timestamp of snapshot creation; records when the analysis was persisted.

`snapshotVersion` is stored once on the `Snapshot` row so all contained AST data inherits the same semantic version. Keeping it off `AstNode` rows avoids duplication and prevents mixed-version data from sharing a snapshot boundary. Because `snapshotVersion` threads into deterministic identity generation, every node in the snapshot shares the same semantic context.

## AstNode Model
`AstNode` persists normalized AST nodes for analysis. Every `AstNode` belongs to exactly one `Snapshot`, ensuring scoping and cleanup align with the owning analysis run.
- `id`: Deterministic hash derived from `snapshotVersion`, `filePath`, normalized node type, and source span to keep identities stable across re-runs with the same inputs.
- `filePath`: Repository-relative path to the source file containing the node.
- `type`: Normalized node classification used by analysis consumers.
- `parentId`: Optional UUID of the enclosing `AstNode`.
- `parent` / `children`: Self-referential relation capturing tree structure; child sets are derived from `parentId`, so no `childIds` column is stored.
- `snapshotId`: UUID pointing to the owning `Snapshot`.
- `snapshot`: Relation to the `Snapshot` row used for joins and cascading deletion.
- `data`: JSON payload holding normalized node properties defined by the normalization schema.
- `location`: JSON object storing zero-based start/end line and column offsets for reproducible spans.
- `originalType`: Raw parser node type preserved for traceability.
- `createdAt`: Timestamp set when the node row is created.
- `updatedAt`: Timestamp automatically updated when the node row changes.

Parent-child relationships rely on the `parentId` foreign key and the `children` back-reference. This keeps the tree normalized, avoids redundant child arrays, and enforces referential integrity via relational constraints.

## Snapshot Scoping and Data Isolation
The `snapshotId` foreign key on `AstNode` ensures nodes from different runs never mix. Queries join through `snapshotId`, so analyses operate on a consistent, isolated set of AST rows. Multiple snapshots for the same project and `snapshotVersion` can coexist because each snapshot has its own `id`, preventing cross-run contamination while allowing comparisons.

## Determinism and Re-runs
Running analysis on the same codebase with the same `snapshotVersion` produces identical `AstNode.id` values, enabling reproducible references and stable downstream joins across stored AST data. All nodes in a run share the same `snapshotVersion`, so identity reflects both source shape and the semantics applied during extraction. When the code evolves or normalization rules change, a new `Snapshot` is created; the resulting AST rows remain comparable through structure and paths but have distinct identities when spans or versions differ.

## Contributor Responsibilities
- Bump `snapshotVersion` when normalized AST shape or semantics change (new node kinds, different child assignment, altered location rules, or identity generation inputs).
- Do not bump `snapshotVersion` for refactors, performance changes, logging, or other changes that leave normalized structure and location semantics intact.
- Manage `snapshotVersion` manually and keep it stable to preserve determinism across routine runs.

## Summary
Snapshot is the ownership boundary for persisted AST data. It isolates each analysis run, anchors deterministic node identities, and couples stored artifacts to the normalization version that produced them, ensuring Structura’s persistence layer remains reproducible, evolvable, and safe for long-lived storage.
