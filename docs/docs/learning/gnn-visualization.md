---
title: GNN Embeddings and t-SNE Visualization
---

## Overview

The GNN feasibility demonstration script generates node embeddings using Graph Neural Networks (GNNs) and visualizes them using t-SNE dimensionality reduction. This enables visual exploration of how GNN models learn to represent code structure.

Source: `learning/src/examples/gnn_feasibility_demo.py`, `learning/src/components/gnn_model.py`, `learning/src/components/tsne_viz.py`.

## Architecture

The visualization pipeline consists of four stages:

```
TensorBundle → GNN Model → Node Embeddings → t-SNE Projection → Visualization
```

### 1. Load TensorBundle

Load a tensor bundle from disk or create synthetic data:

```python
bundle = load_tensor_bundle("data/snapshot_bundle.pkl")
# Returns: Dict with x, edge_index, node_mapping
```

See [Tensor Graph Export](./tensor-graph-export.md) for tensor bundle creation.

### 2. Initialize GNN Model

Create a GNN model with SAGEConv layers:

```python
model = create_gnn_model(
    in_channels=6,
    out_channels=64,
    num_layers=2,
    hidden_channels=128,
    seed=42
)
```

Two model architectures are available:
- **SimpleGNN**: Single layer `6 → 64`
- **TwoLayerGNN**: Two layers `6 → 128 → 64` (with ReLU)

### 3. Generate Embeddings

Generate node embeddings using the GNN:

```python
embeddings = generate_embeddings(model, x, edge_index)
# Returns: torch.Tensor with shape [num_nodes, 64]
```

The model aggregates neighborhood information through message passing to create 64-dimensional embeddings for each node.

### 4. t-SNE Visualization

Project high-dimensional embeddings to 2D for visualization:

```python
projection, fig = visualize_embeddings(
    embeddings,
    labels=labels,
    title="t-SNE Projection of GNN Embeddings",
    save_path="output/tsne_embeddings.png"
)
```

## CLI Usage

### Basic Usage (Synthetic Data)

Run with synthetic data for quick testing:

```bash
cd learning
python src/examples/gnn_feasibility_demo.py
```

This creates 100 synthetic nodes with random edges and generates a t-SNE visualization.

### Using Real Snapshot Data

#### 1-Layer GNN Model

```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 1 \
  --output-dir output
```

Architecture: `6 → 64` (single SAGEConv layer)

Output: `output/tsne_embeddings_1layer.png`

#### 2-Layer GNN Model

```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --output-dir output
```

Architecture: `6 → 128 → 64` (two SAGEConv layers with ReLU)

Output: `output/tsne_embeddings_2layer.png`

#### Custom Hidden Channels

Adjust the intermediate layer size for 2-layer models:

```bash
# Wider hidden layer (256 dimensions)
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --hidden-channels 256 \
  --output-dir output
```

Architecture: `6 → 256 → 64`

#### Custom Output Directory

Save visualizations to a specific directory:

```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --output-dir results/experiment_01
```

#### Cosmetic Adjustments

Customize the visualization appearance:

```bash
# Smaller, more transparent points
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --alpha 0.3 \
  --point-size 15
```

```bash
# Custom t-SNE perplexity for different clustering
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --perplexity 50
```

```bash
# Subsample large graphs (visualize only 500 nodes)
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --subsample 500
```

```bash
# Combine all cosmetic options
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --alpha 0.25 \
  --point-size 10 \
  --perplexity 40 \
  --subsample 1000
```

### Command-Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--bundle-path` | `str` | `None` | Path to TensorBundle pickle file (uses synthetic data if not provided) |
| `--output-dir` | `str` | `output` | Directory to save visualization PNG files |
| `--num-layers` | `int` | `1` | Number of GNN layers (choices: 1, 2) |
| `--hidden-channels` | `int` | `128` | Hidden layer dimension for 2-layer model |
| `--seed` | `int` | `42` | Random seed for reproducibility |
| `--alpha` | `float` | `0.4` | Point transparency (0=invisible, 1=opaque) |
| `--point-size` | `int` | `20` | Size of scatter plot points |
| `--perplexity` | `float` | `auto` | t-SNE perplexity (auto-adjusts based on graph size) |
| `--subsample` | `int` | `None` | Number of nodes to randomly sample for visualization |

## Understanding Hidden Channels

**Hidden channels** refer to the dimensionality of the intermediate layer in a multi-layer GNN. This parameter controls the "width" of the hidden layer and affects model capacity.

### Architecture Examples

| Configuration | Architecture | Parameters | Use Case |
|--------------|--------------|------------|----------|
| 1-layer | `6 → 64` | ~400 | Baseline, fast |
| 2-layer, hidden=64 | `6 → 64 → 64` | ~4,480 | Compact, less memory |
| 2-layer, hidden=128 | `6 → 128 → 64` | ~8,960 | Balanced (default) |
| 2-layer, hidden=256 | `6 → 256 → 64` | ~17,920 | High capacity, slower |

### When to Use Different Sizes

**Smaller hidden channels (64, 96):**
- Faster computation
- Less memory usage
- Good for simple graph patterns
- Risk of underfitting on complex graphs

**Larger hidden channels (256, 512):**
- Can capture more complex patterns
- More expressive representations
- Slower computation
- Risk of overfitting on small graphs

**Recommended starting point:** `hidden_channels=128` for most use cases.

## Output Files

Visualizations are saved with layer-specific filenames to avoid overwriting:

| Model Configuration | Output Filename |
|---------------------|----------------|
| 1-layer | `tsne_embeddings_1layer.png` |
| 2-layer | `tsne_embeddings_2layer.png` |

Example output structure:
```
learning/output/
├── tsne_embeddings_1layer.png
└── tsne_embeddings_2layer.png
```

## GNN Model Details

### SimpleGNN (1-Layer)

Single SAGEConv layer for baseline embeddings:

```python
class SimpleGNN(nn.Module):
    def __init__(self, in_channels=6, out_channels=64):
        self.conv = SAGEConv(in_channels, out_channels)

    def forward(self, x, edge_index):
        return self.conv(x, edge_index)
```

- **Input**: 6-dimensional one-hot encoded node types
- **Output**: 64-dimensional embeddings
- **Activation**: None (raw embeddings)

### TwoLayerGNN (2-Layer)

Two SAGEConv layers with ReLU activation:

```python
class TwoLayerGNN(nn.Module):
    def __init__(self, in_channels=6, hidden_channels=128, out_channels=64):
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, out_channels)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        x = self.conv2(x, edge_index)
        return x
```

- **Input**: 6-dimensional one-hot encoded node types
- **Hidden**: Configurable (default: 128 dimensions)
- **Output**: 64-dimensional embeddings
- **Activation**: ReLU between layers, none after final layer

### SAGEConv Message Passing

Both models use SAGEConv (GraphSAGE convolution), which:
- Aggregates features from neighboring nodes
- Combines with the node's own features
- Handles orphan nodes (no edges) gracefully using self-features only

## t-SNE Visualization Details

### Algorithm Parameters

The t-SNE projection uses:
- **Perplexity**: `min(30, num_nodes - 1)` (adaptive to graph size)
- **Iterations**: `1000` (optimization steps)
- **Random state**: `42` (reproducible results)
- **Dimensions**: `2` (for 2D scatter plots)

### Visualization Features

- **Coloring**: Nodes colored by type (based on one-hot encoded features)
- **Alpha**: `0.4` (default, adjustable from 0-1)
- **Point size**: `20` (default, adjustable)
- **Resolution**: `300 DPI` (high quality for publications)
- **Subsampling**: Optional random sampling for large graphs

### Interpreting Visualizations

**Well-separated clusters:**
- GNN learned to distinguish different node types
- Clear semantic structure in embeddings

**Overlapping points:**
- Similar node types or shared structural patterns
- May indicate nodes with similar neighborhood structure

**Outliers:**
- Nodes with unique structural properties
- Potential orphan nodes or unusual patterns

## Python API

### Programmatic Usage

```python
import pickle
from pathlib import Path
from components.gnn_model import create_gnn_model, generate_embeddings
from components.tsne_viz import visualize_embeddings

# 1. Load tensor bundle
with open("data/snapshot_bundle.pkl", "rb") as f:
    bundle = pickle.load(f)

x = bundle["x"]
edge_index = bundle["edge_index"]

# 2. Create 2-layer GNN
model = create_gnn_model(
    in_channels=6,
    out_channels=64,
    num_layers=2,
    hidden_channels=128,
    seed=42,
    eval_mode=True
)

# 3. Generate embeddings
embeddings = generate_embeddings(model, x, edge_index)

# 4. Extract labels for coloring
import numpy as np
labels = np.argmax(x.numpy(), axis=1)

# 5. Create visualization with custom cosmetic parameters
projection, fig = visualize_embeddings(
    embeddings,
    labels=labels,
    title="Code Structure Embeddings",
    save_path="output/my_viz.png",
    show=False,
    alpha=0.3,           # More transparent points
    point_size=15,       # Smaller points
    perplexity=40        # Custom t-SNE perplexity
)

print(f"Projection shape: {projection.shape}")
print(f"Saved to: output/my_viz.png")
```

### Subsampling Large Graphs Programmatically

```python
# For large graphs, subsample before visualization
if embeddings.shape[0] > 1000:
    import numpy as np
    np.random.seed(42)
    subsample_indices = np.random.choice(
        embeddings.shape[0],
        1000,
        replace=False
    )
    embeddings_subset = embeddings[subsample_indices]
    labels_subset = labels[subsample_indices]

    projection, fig = visualize_embeddings(
        embeddings_subset,
        labels=labels_subset,
        title="Code Structure Embeddings (1000 nodes)",
        save_path="output/my_viz_subsampled.png",
        show=False,
        alpha=0.3,
        point_size=15,
        perplexity=40
    )
```

## Comparison Workflow

To compare 1-layer vs 2-layer models side-by-side:

```bash
# Generate both visualizations
cd learning

# 1-layer model
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 1 \
  --output-dir output

# 2-layer model
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl \
  --num-layers 2 \
  --output-dir output

# View outputs
open output/tsne_embeddings_1layer.png
open output/tsne_embeddings_2layer.png
```

Both visualizations will be saved in the same directory with distinct filenames.

## Environment Setup

### Install Dependencies

From repository root:

```bash
python -m pip install -r learning/requirements.txt
```

Key dependencies:
- PyTorch 2.4.0
- PyTorch Geometric
- scikit-learn (for t-SNE)
- matplotlib (for plotting)
- numpy

### Working Directory

Run all commands from the `learning/` directory:

```bash
cd /path/to/Structura/learning
python src/examples/gnn_feasibility_demo.py [options]
```

## Example Output

Running the script produces console output like:

```
============================================================
GNN Feasibility Proof - Structura Project
============================================================

[1/4] Loading tensor bundle...
  Loaded bundle from: data/0c097fa3-71ca-4ddd-8288-58889a5de402_bundle.pkl
  Nodes: 1234, Edges: 5678
  Node features shape: torch.Size([1234, 6])
  Edge index shape: torch.Size([2, 5678])

[2/4] Initializing GNN model...
  Model: TwoLayerGNN
  Number of layers: 2
  Architecture: 6 → 128 → 64
  Random seed: 42 (for reproducibility)
  Mode: eval

[3/4] Generating node embeddings...
  Embeddings shape: torch.Size([1234, 64])
  Expected shape: [1234, 64] ✓

[4/4] Creating t-SNE visualization...
  t-SNE projection shape: (1234, 2)
  Visualization saved to: output/tsne_embeddings_2layer.png
  Figure saved to output/tsne_embeddings_2layer.png

============================================================
✓ Feasibility proof complete!
============================================================

Summary:
  • GNN model successfully processed 1234 nodes
  • Generated 64-dimensional embeddings
  • t-SNE projection created and saved
  • Orphan nodes: 0 (handled gracefully)

Next steps:
  1. View visualization at: output/tsne_embeddings_2layer.png
  2. Try with real snapshot data: --bundle-path <path>
  3. Experiment with different model architectures
```

## Cosmetic Customization Guide

### Adjusting Point Transparency (Alpha)

The `--alpha` parameter controls point transparency:

- **`alpha=0.2-0.3`**: Very transparent, good for dense graphs with many overlapping points
- **`alpha=0.4-0.5`**: Moderate transparency (default: 0.4), balanced for most use cases
- **`alpha=0.6-0.8`**: More opaque, better for sparse graphs
- **`alpha=1.0`**: Fully opaque, use for very sparse graphs or publication figures

Example:
```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/snapshot_bundle.pkl \
  --alpha 0.25 \
  --num-layers 2
```

### Adjusting Point Size

The `--point-size` parameter controls marker size:

- **`point-size=10-15`**: Small points, ideal for large graphs (1000+ nodes)
- **`point-size=20-30`**: Medium points (default: 20), good for most graphs
- **`point-size=40-80`**: Large points, best for small graphs (< 100 nodes)

Example:
```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/snapshot_bundle.pkl \
  --point-size 15 \
  --num-layers 2
```

### Adjusting t-SNE Perplexity

The `--perplexity` parameter affects clustering:

- **Low perplexity (5-15)**: Emphasizes local structure, creates more distinct clusters
- **Medium perplexity (20-50)**: Balanced view (default: 30 or auto-adjusted)
- **High perplexity (50-100)**: Emphasizes global structure, more spread out

Rule of thumb: perplexity should be less than the number of nodes.

Example:
```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/snapshot_bundle.pkl \
  --perplexity 50 \
  --num-layers 2
```

### Subsampling Large Graphs

For graphs with thousands of nodes, use `--subsample` to randomly select nodes:

```bash
# Visualize only 500 randomly selected nodes
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/large_snapshot_bundle.pkl \
  --subsample 500 \
  --num-layers 2
```

Benefits:
- **Faster t-SNE computation**: Dramatically reduces runtime for large graphs
- **Clearer visualizations**: Less cluttered plots
- **Same seed**: Reproducible subsampling with `--seed` parameter

Example for a very large graph:
```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/large_snapshot_bundle.pkl \
  --subsample 1000 \
  --alpha 0.3 \
  --point-size 10 \
  --perplexity 40 \
  --num-layers 2
```

## Troubleshooting

### Too Few Nodes for t-SNE

If your graph has fewer than 2 nodes:

```
ValueError: t-SNE requires at least 2 samples, got 1
```

**Solution**: Use a larger snapshot or synthetic data with more nodes.

### Perplexity Warning

If your graph is small (< 30 nodes), perplexity is automatically adjusted:

```python
effective_perplexity = min(perplexity, max(5, n_samples - 1))
```

This prevents t-SNE failures on small graphs.

### Memory Issues with Large Graphs

For graphs with > 10,000 nodes:

1. **Reduce batch size**: Process embeddings in chunks
2. **Use sampling**: Extract subgraphs for visualization
3. **Increase system memory**: Or use a machine with more RAM

### PyTorch Geometric Installation

If `torch_geometric` import fails:

```bash
# Install with pip
pip install torch-geometric

# Or with conda
conda install pyg -c pyg
```

See [PyTorch Geometric Installation Guide](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html) for platform-specific instructions.

## Design Principles

### Reproducibility

All random operations use fixed seeds:
- **Model initialization**: `seed=42` (default)
- **t-SNE projection**: `random_state=42`

Multiple runs with the same seed produce identical results.

### Deterministic Node Ordering

Nodes are indexed alphabetically by ID in the tensor bundle, ensuring consistent embeddings across runs.

### Handling Orphan Nodes

SAGEConv gracefully handles nodes without edges:
- Uses only the node's own features (no neighborhood aggregation)
- Still produces valid embeddings
- No special preprocessing required

### Frozen Models

Models are set to evaluation mode (`model.eval()`) with gradients disabled (`torch.no_grad()`):
- Ensures deterministic forward passes
- Prevents dropout or batch normalization randomness
- Faster inference (no gradient computation)

## Related Components

- [Tensor Graph Export](./tensor-graph-export.md): Create tensor bundles from snapshots
- [Feature Engineering](./feature-engineering.md): Node feature extraction details
- [Snapshot Materializer](./snapshot-materializer.md): Load snapshots from PostgreSQL
