---
title: Cloud Storage Layout
sidebar_position: 6
description: Versioned, hashed artifact layout for Structura on S3 or MinIO.
---

By Rabya Tayal · ~2 min read

## 1. Overview
This document defines the unified cloud storage layout used by Structura for environments backed by S3 compatible systems such as AWS S3 or MinIO. It introduces stable bucket naming, project-level prefixes, schema versioning, and a hashed artifact storage strategy. All backend components (ingestion, AST extraction, graph pipelines, metadata systems) must reference these paths through helper utilities instead of direct file system paths. Scope is structure definition only—no SDK integrations or file operations.

## 2. Bucket Naming Convention
Structura uses one bucket per environment (names configured via env):

- structura-dev
- structura-staging
- structura-prod

All folder layouts and prefixes described here apply within each bucket.

## 3. Project Prefix Structure
Each project is stored under a versioned prefix:

```
projects/{projectId}/v1/
```

Versioning allows future schema changes without disrupting existing data. Example:

```
projects/8f12aabc/v1/
```

## 4. Storage Strategy
Structura uses hashed artifact storage for ASTs, graphs, and derived analysis outputs to avoid deep folder nesting in object storage. The original file path is not encoded into the folder structure; a metadata mapping is maintained separately.

## 5. Directory Structure (High Level)
Under each versioned project prefix:

```
projects/{projectId}/v1/
    source/
        uploads/        raw ZIP files uploaded by the user
        extracted/      extracted file tree from ZIP
        git/            Git repository snapshot if sourceType = git
    asts/               AST JSON artifacts stored by hash
    graphs/             graph artifacts stored by hash
    metadata/           metadata files for ingestion, mapping, project status
```

## 6. Hashed Artifact Layout
AST and graph outputs use content or path hash based filenames:

```
asts/{hash}.json
graphs/{hash}.json
```

No nested folder structure is created for derived artifacts. A mapping table stored in metadata or Postgres links original file paths to hash values.

## 7. Metadata Requirements
Metadata links original file paths to artifact hashes. At minimum:

`metadata/files.json`

```json
{
  "files": [
    { "path": "src/utils/helpers.ts", "hash": "9af4c3e5" },
    { "path": "frontend/App.tsx", "hash": "188be29a" }
  ]
}
```

This enables lookup from file path to AST/graph artifact and back.

## 8. Responsibilities of Backend Services
All backend services must reference storage locations using a shared helper module (for example, `StoragePaths`). No direct references to local disk paths are allowed in ingestion or analysis services after this structure is adopted.

## 9. Out of Scope
- S3 or MinIO SDK integration
- File upload or download logic
- Git clone to cloud storage
- Automatic bucket creation
- Workspace cleanup utilities
- Ingestion logic that already reads from cloud storage

## 10. Snapshot Model for Project Evolution
Structura separates schema versioning from project evolution.

### Schema versioning
The version folder (`v1`, `v2`, ...) represents changes in Structura's storage schema. New schema versions are created only when Structura changes the format of ASTs, graphs, or metadata.

### Project snapshots
Each ingestion of the project source (new ZIP upload, new commit, or new extraction run) is stored as a snapshot inside the schema version folder. Snapshots capture the full state of the project at a point in time using a timestamp-based identifier, e.g. `20250108T142307Z`.

Layout:

```
projects/{projectId}/v1/snapshots/{snapshotId}/
    source/
        extracted/
    asts/
    graphs/
    metadata/
```

Example full snapshot path:

```
projects/8f12aabc/v1/snapshots/20250108T142307Z/asts/9af4c3e5.json
```

Benefits:
- Enables history analysis and diffing over time
- Avoids collisions between ingestion runs
- Prevents overwriting previous AST or graph data
- Cleanly separates schema changes from project changes
