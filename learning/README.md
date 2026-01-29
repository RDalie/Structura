# Learning

This directory is the boundary for immutable graph snapshots used by ML and
analysis workflows. Snapshot materialization pulls from SQL storage and
produces a frozen, read-only graph to keep downstream processing deterministic.

Exports default to `learning/data/<UUID>.pkl` and are produced via
`python learning/src/pipeline/run_export.py --snapshot_id <UUID>`.

## GNN Models

The learning module includes Graph Neural Network (GNN) models for generating node embeddings from code structure graphs:

- **SimpleGNN** (1-layer): `6 → 64` - Baseline single-hop message passing
- **TwoLayerGNN** (2-layer): `6 → 128 → 64` - Two-hop message passing with ReLU
- **ThreeLayerGNN** (3-layer): `6 → 128 → 128 → 64` - Three-hop message passing with ReLU

### Quick Start

Run GNN feasibility demo with synthetic data:

```bash
cd learning
python src/examples/gnn_feasibility_demo.py --num-layers 3
```

Run with real snapshot data:

```bash
python src/examples/gnn_feasibility_demo.py \
  --bundle-path data/<UUID>_bundle.pkl \
  --num-layers 3 \
  --output-dir output
```

See the [GNN Visualization docs](../docs/docs/learning/gnn-visualization.md) for complete usage details.
