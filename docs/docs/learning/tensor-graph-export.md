---
title: Tensor Graph Export
---

## Overview

The tensor graph export pipeline transforms immutable graph snapshots stored in PostgreSQL into machine learning-ready tensor representations compatible with PyTorch Geometric. This enables code structure graphs to be used in graph neural network (GNN) workflows.

Source: `learning/src/pipeline/export_pipeline.py`, `learning/src/components/exporter.py`.

## Architecture

The export pipeline consists of four main stages:

```
Snapshot Materialization → Node Mapping → Edge Index Creation → Feature Engineering → TensorBundle
```

### 1. Snapshot Materialization

Loads nodes and edges from PostgreSQL into a frozen NetworkX graph:

```python
snapshot = materialize_snapshot(snapshot_id="abc123-...")
# Returns: SnapshotGraph with graph, nodes, and edges
```

See [Snapshot Materializer](./snapshot-materializer.md) for details.

### 2. Node Mapping

Creates a deterministic mapping from node IDs to tensor indices:

```python
node_to_idx = create_node_mapping(snapshot.graph)
# Returns: Dict[str, int] mapping node_id -> index
```

Nodes are sorted alphabetically by ID to ensure reproducibility across multiple exports of the same snapshot.

### 3. Edge Index Creation

Converts NetworkX edges into PyTorch Geometric COO (coordinate) format:

```python
edge_index = create_edge_index(snapshot.graph, node_to_idx)
# Returns: torch.Tensor with shape [2, num_edges]
```

The edge index tensor has two rows:
- Row 0: Source node indices
- Row 1: Target node indices

Example:
```python
edge_index = torch.tensor([
    [0, 1, 2],  # source nodes
    [1, 2, 0]   # target nodes
])
# Represents edges: 0→1, 1→2, 2→0
```

### 4. Feature Engineering

Generates node features based on AST node kinds:

```python
x = create_feature_matrix_v1(snapshot.nodes, node_to_idx)
# Returns: torch.Tensor with shape [num_nodes, 6]
```

See [Feature Engineering](./feature-engineering.md) for the complete feature specification.

## TensorBundle Format

The export pipeline produces a `TensorBundle` (TypedDict) with three fields:

```python
{
    "x": torch.Tensor,              # Node features [num_nodes, 6]
    "edge_index": torch.Tensor,      # Edge connections [2, num_edges]
    "node_mapping": Dict[str, int]   # Node ID to index mapping
}
```

This format is directly compatible with PyTorch Geometric `Data` objects:

```python
from torch_geometric.data import Data

bundle = load_tensor_bundle("path/to/bundle.pkl")
data = Data(
    x=bundle["x"],
    edge_index=bundle["edge_index"]
)
```

## CLI Usage

### Export Snapshot

```bash
python learning/src/pipeline/run_export.py --snapshot_id <UUID>
```

Defaults:
- Output path: `learning/data/<UUID>.pkl`
- Output format: Pickled `SnapshotGraph`

Override output path:
```bash
python learning/src/pipeline/run_export.py \
    --snapshot_id <UUID> \
    --output_path /tmp/snapshot.pkl
```

### Python API

For programmatic tensor bundle creation:

```python
from pipeline.export_pipeline import run_export_pipeline

# Complete export pipeline
bundle = run_export_pipeline(
    snapshot_id="abc123-...",
    output_path="output/bundle.pkl"
)

# Access components
print(f"Nodes: {bundle['x'].shape[0]}")
print(f"Edges: {bundle['edge_index'].shape[1]}")
print(f"Feature dimensions: {bundle['x'].shape[1]}")
```

## Environment Setup

### Install Dependencies

From repository root:

```bash
python -m pip install -r learning/requirements.txt
```

Key dependencies:
- PyTorch 2.4.0
- PyTorch Geometric (torch_geometric)
- NetworkX (graph operations)
- psycopg2 (PostgreSQL connection)

### Configure Database Connection

Load environment variables before running export:

```bash
set -a
source learning/.env
set +a
```

Or use backend environment:

```bash
set -a
source backend/.env
set +a
```

The pipeline reads from `DATABASE_URL` or individual `DB_*` variables. Schema specification via `?schema=public` is supported.

## Bundle Validation

Use the audit tool to validate exported tensor bundles:

```bash
python learning/src/pipeline/audit_bundle.py path/to/bundle.pkl
```

The audit checks:
- **One-hot encoding**: Each row in feature matrix sums to 1.0
- **Feature dimensions**: Matrix has exactly 6 columns
- **Mapping alignment**: All nodes properly classified (not all in "Other")
- **Tensor shapes**: Consistent dimensions across components

Example output:
```
Bundle audit for: learning/data/abc123.pkl
✓ Feature matrix shape: [1234, 6]
✓ Edge index shape: [2, 5678]
✓ All rows sum to 1.0 (valid one-hot encoding)
✓ Node kind distribution:
  - Container: 12 nodes
  - Logic: 234 nodes
  - Data: 456 nodes
  - Reference: 345 nodes
  - Statement: 123 nodes
  - Other: 64 nodes
```

## Design Principles

### Determinism

All components use sorted ordering to ensure reproducible exports:
- Nodes sorted alphabetically by ID before indexing
- Edges sorted by (source, target) before tensor creation
- Properties canonicalized (recursively sorted dicts)

Multiple exports of the same snapshot produce byte-identical outputs.

### Immutability

Graphs are frozen (`nx.freeze`) after materialization to prevent accidental mutations:

```python
snapshot.graph.add_node("new")  # Raises FrozenGraphError
```

### Efficient Serialization

Bundles are serialized using Python's `pickle` protocol:
- Fast serialization/deserialization
- Preserves PyTorch tensor types
- Typical compression: ~10x (4MB graph → 500KB bundle)

### SQL Scoping

All database queries are scoped to a single `snapshotId`, ensuring complete isolation between snapshots.

## Example Workflow

Complete workflow from snapshot ID to trained model:

```python
# 1. Export tensor bundle
from pipeline.export_pipeline import run_export_pipeline

bundle = run_export_pipeline(
    snapshot_id="abc123-...",
    output_path="data/snapshot.pkl"
)

# 2. Load into PyTorch Geometric
from torch_geometric.data import Data
import torch

data = Data(
    x=bundle["x"],
    edge_index=bundle["edge_index"]
)

# 3. Create dataset loader
from torch_geometric.loader import DataLoader

loader = DataLoader([data], batch_size=1, shuffle=False)

# 4. Define and train GNN model
from torch_geometric.nn import GCNConv

class CodeGNN(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super().__init__()
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, out_channels)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        x = self.conv2(x, edge_index)
        return x

model = CodeGNN(in_channels=6, hidden_channels=64, out_channels=32)
# ... training loop
```

## Extending the Pipeline

To customize the export pipeline:

### Add Custom Features

Create a new feature function in `node_features.py`:

```python
def create_feature_matrix_v2(nodes, node_to_idx):
    # Your custom feature extraction
    pass
```

Update `export_pipeline.py` to use the new function:

```python
x = create_feature_matrix_v2(snapshot.nodes, node_to_idx)
```

### Add Edge Features

Extend `TensorBundle` to include edge attributes:

```python
def create_edge_features(edges, edge_to_idx):
    """Extract edge kind, file path, or other edge attributes."""
    edge_attr = torch.zeros((len(edges), num_features))
    # ... populate edge features
    return edge_attr
```

### Multi-Snapshot Batching

For training on multiple snapshots:

```python
from torch_geometric.data import Data, Batch

# Export multiple snapshots
bundles = [
    run_export_pipeline(snapshot_id=sid)
    for sid in snapshot_ids
]

# Create Data objects
data_list = [
    Data(x=b["x"], edge_index=b["edge_index"])
    for b in bundles
]

# Batch for training
batch = Batch.from_data_list(data_list)
```

## Troubleshooting

### Graph Too Large

If the snapshot graph exceeds memory limits:

1. **Filter nodes**: Only include nodes of specific kinds
2. **Sample subgraphs**: Extract connected components or k-hop neighborhoods
3. **Increase batch size**: Process in chunks during training

### Feature Misalignment

If most nodes fall into "Other" category:

1. **Check node kinds**: Verify AST normalization produces expected kinds
2. **Update KIND_TO_BUCKET**: Add new node kinds to the mapping
3. **Run audit**: Use `audit_bundle.py` to diagnose classification issues

### Connection Errors

If database connection fails:

1. **Verify environment**: Check `DATABASE_URL` or `DB_*` variables are set
2. **Test connection**: Run a simple psycopg2 connection test
3. **Check schema**: Ensure `?schema=...` parameter matches target schema

## Related Components

- [Snapshot Materializer](./snapshot-materializer.md): Creates immutable graph snapshots
- [Feature Engineering](./feature-engineering.md): Node feature extraction details
- [Postgres Schema](../databases/postgres-schema.md): Database structure for snapshots
