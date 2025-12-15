# Snapshot versioning and deterministic IDs

Structura captures code snapshots (parsed sources, normalized ASTs, and derived graphs) so analysis can be repeated, compared, and evolved safely. Every normalized AST node gets a deterministic, hash-based `id` that is scoped by a manually managed `SNAPSHOT_VERSION`.

## What snapshot version means

- Represents the semantics of the normalized AST schema and extraction rules (how we parse, normalize, and interpret nodes and edges).
- **Not** tied to time, git commits, or runtime state.
- Included in `makeDeterministicId` so the same source + file path yields different ids when semantics change.

## Why it matters

- **Persistence:** Stored ASTs and graphs rely on stable ids to join data across runs.
- **Graph edges:** Import/call/dependency edges reference node ids; changing semantics without a version bump corrupts relationships.
- **Evolution analysis:** Comparing snapshots over time depends on ids being stable for unchanged semantics and intentionally different when semantics shift.

## When to bump `SNAPSHOT_VERSION`

Bump the version when semantics change, including:

- AST normalization shape or interpretation changes (e.g., new node kinds, different child assignment, location rules).
- Identity generation inputs change (hash key fields, file path handling, snapshot scoping).
- Extraction logic that affects graph construction (e.g., import/require detection, edge creation rules).
- Any change that would alter persisted AST/graph meaning even if the code text is identical.

## When **not** to bump

Do **not** bump for:

- Pure refactors (no shape/meaning change).
- Performance optimizations.
- Formatting, logging, or comments.
- Internal code moves that preserve observable normalization/extraction behavior.

## How it’s used

- `SNAPSHOT_VERSION` lives in `core/config/snapshotVersion.ts`.
- `normalize` threads the version into `makeDeterministicId`, scoping every node id in a run.
- Snapshot creation and downstream analyses must pass the same version for all files in a run.

Keep the version stable across runs until you intentionally change semantics; bump it exactly when those semantics shift to avoid silent corruption and to make evolution analysis trustworthy.
