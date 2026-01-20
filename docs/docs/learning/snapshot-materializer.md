---
title: Snapshot Materializer
---

## Overview

The snapshot materializer builds an immutable NetworkX graph from Postgres data
scoped to a single snapshot. It reads from `AstNode` and `GraphEdge` and freezes
the graph (`nx.freeze`) so downstream ML code cannot mutate it accidentally.

Source: `learning/snapshot_graph/materializer.py`.

## What It Produces

- Nodes: one per `AstNode` in the requested snapshot (including isolated nodes).
- Edges: one per `GraphEdge` in the requested snapshot.
- Properties: node metadata (`filePath`, `data`, `location`, `snapshotId`,
  `createdAt`, `updatedAt`) and edge metadata (`id`, `filePath`, `snapshotId`,
  `version`, `createdAt`) are stored as `properties` on the graph.

## Python Requirements

From repo root:

```bash
python -m pip install -r learning/requirements.txt
```

## Environment Variables

The materializer reads connection info from the process environment. Use one of
these env files before running the CLI:

```bash
set -a
source learning/.env
set +a
```

Or:

```bash
set -a
source backend/.env
set +a
```

If `DATABASE_URL` includes `?schema=public`, it is translated into libpq
`options=-c search_path=public` for psycopg2 compatibility.

## CLI: Create Snapshot

```bash
python learning/scripts/create_snapshot.py --snapshot_id <UUID>
```

Defaults:
- Output path: `learning/snapshots/<UUID>.pkl`
- Nodes include isolated `AstNode` rows.

You can override the output path:

```bash
python learning/scripts/create_snapshot.py --snapshot_id <UUID> --output_path /tmp/snapshot.pkl
```
