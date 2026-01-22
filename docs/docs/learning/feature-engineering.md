---
title: Feature Engineering
---

## Overview

Feature engineering transforms raw graph snapshots into numerical representations suitable for machine learning models. The current implementation extracts node features based on AST node kinds, encoding them as one-hot vectors that capture semantic categories of code structures.

Source: `learning/src/components/node_features.py`.

## Feature Matrix Structure

The feature matrix is a fixed 6-column tensor where each row represents one node in the graph. Each column corresponds to a semantic category of AST nodes:

| Column | Category | Node Kinds |
|--------|----------|------------|
| 0 | Container | Module, Block |
| 1 | Logic | Function, Conditional, Loop, Return |
| 2 | Data | Variable, Parameter, Assignment, Literal |
| 3 | Reference | Call, MemberExpression, Identifier |
| 4 | Statement | ExpressionStatement, Import |
| 5 | Other | Unknown or unclassified kinds |

Each node receives a 1.0 in exactly one column based on its `kind` attribute, creating a one-hot encoding.

## Feature Creation

### Function Signature

```python
def create_feature_matrix_v1(
    nodes: Iterable,
    node_to_idx: Dict[str, int]
) -> torch.Tensor
```

### Parameters

- `nodes`: Iterable of `SnapshotNode` objects from a materialized snapshot
- `node_to_idx`: Mapping from node ID strings to matrix row indices (created by `create_node_mapping`)

### Returns

PyTorch tensor with shape `[num_nodes, 6]` and dtype `float32`.

### Example Usage

```python
from components.materializer import materialize_snapshot
from components.exporter import create_node_mapping
from components.node_features import create_feature_matrix_v1

# Load snapshot from database
snapshot = materialize_snapshot(snapshot_id="abc123-...")

# Create deterministic node-to-index mapping
node_to_idx = create_node_mapping(snapshot.graph)

# Generate feature matrix
x = create_feature_matrix_v1(snapshot.nodes, node_to_idx)

print(x.shape)  # [num_nodes, 6]
print(x.sum(dim=1))  # Each row sums to 1.0 (one-hot encoding)
```

## Kind-to-Bucket Mapping

The mapping from AST node kinds to feature buckets is defined in `KIND_TO_BUCKET`:

```python
KIND_TO_BUCKET = {
    # Container: structural grouping
    "Module": 0,
    "Block": 0,

    # Logic: control flow and functions
    "Function": 1,
    "Conditional": 1,
    "Loop": 1,
    "Return": 1,

    # Data: variables and values
    "Variable": 2,
    "Parameter": 2,
    "Assignment": 2,
    "Literal": 2,

    # Reference: name usage and calls
    "Call": 3,
    "MemberExpression": 3,
    "Identifier": 3,

    # Statement: top-level statements
    "ExpressionStatement": 4,
    "Import": 4,

    # Unknown/Other
    "Unknown": 5,
}
```

Any node kind not explicitly listed defaults to bucket 5 (Other).

## Validation

The feature engineering module includes validation to ensure consistency between the provided nodes and the node-to-index mapping:

- **Missing nodes**: If `node_to_idx` contains IDs not present in the nodes iterable, validation fails
- **Extra nodes**: If the nodes iterable contains IDs not in `node_to_idx`, validation fails
- **Error reporting**: Detailed error messages specify how many IDs are missing or extra

This prevents silent data corruption when node sets become desynchronized.

## Extending the Feature Set

To add new features or create alternative feature extractors:

1. **Create a new function** (e.g., `create_feature_matrix_v2`) in `node_features.py`
2. **Define new columns** representing additional semantic categories or attributes
3. **Update the export pipeline** to call your new feature function
4. **Update the audit tool** (`learning/src/pipeline/audit_bundle.py`) to validate the new feature structure

Example structure for a new feature extractor:

```python
def create_feature_matrix_v2(
    nodes: Iterable,
    node_to_idx: Dict[str, int]
) -> torch.Tensor:
    """
    Extended feature matrix with 10 columns including depth and complexity metrics.
    """
    x = torch.zeros((len(node_to_idx), 10), dtype=torch.float32)

    for node in nodes:
        node_id = str(node.id)
        idx = node_to_idx[node_id]

        # One-hot encoding (columns 0-5)
        bucket = KIND_TO_BUCKET.get(str(node.kind), 5)
        x[idx, bucket] = 1.0

        # Additional features (columns 6-9)
        # ... extract depth, complexity, etc.

    return x
```

## Related Components

- [Snapshot Materializer](./snapshot-materializer.md): Creates the immutable graph snapshots
- [Tensor Graph Export](./tensor-graph-export.md): Full pipeline from snapshot to ML-ready tensors
