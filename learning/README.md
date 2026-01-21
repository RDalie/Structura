# Learning

This directory is the boundary for immutable graph snapshots used by ML and
analysis workflows. Snapshot materialization pulls from SQL storage and
produces a frozen, read-only graph to keep downstream processing deterministic.

Exports default to `learning/data/<UUID>.pkl` and are produced via
`python learning/src/pipeline/run_export.py --snapshot_id <UUID>`.
