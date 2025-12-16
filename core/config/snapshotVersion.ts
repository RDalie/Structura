// Global snapshot version for AST normalization and analysis.
// Bump when normalized AST schema or extraction semantics change and ids should intentionally
// shift. Keep stable across runs otherwise. See docs/ast-system/snapshot-versioning.md and
// README.md ("Snapshot Versioning and Semantic Changes") for guidance.
export const SNAPSHOT_VERSION = 'v1';
