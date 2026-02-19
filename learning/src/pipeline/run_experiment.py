#!/usr/bin/env python3
"""
Run a complete baseline experiment pipeline.

This script orchestrates the full workflow:
1. Materialize snapshot from PostgreSQL
2. Create tensor bundle (node features + edge index)
3. Run GNN model to generate embeddings
4. Create t-SNE visualization

Outputs are saved to learning/output/experiments/{run_id}/.

Usage:
  python learning/src/pipeline/run_experiment.py \
    --snapshot_id <UUID> \
    --run_id <UUID> \
    --num_layers 2 \
    --hidden_channels 128 \
    --seed 42

Env setup (choose one):
  set -a; source learning/.env; set +a
  set -a; source backend/.env; set +a
"""
import argparse
import json
import pickle
import sys
from pathlib import Path

SRC_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SRC_ROOT))

import numpy as np
import torch

from components.exporter import TensorBundle, create_edge_index, create_node_mapping
from components.gnn_model import create_gnn_model, generate_embeddings
from components.materializer import materialize_snapshot
from components.node_features import create_feature_matrix_v1
from components.tsne_viz import visualize_embeddings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run baseline experiment pipeline.")
    parser.add_argument("--snapshot_id", required=True, help="Snapshot UUID to process.")
    parser.add_argument("--run_id", required=True, help="Experiment run UUID for output directory.")
    parser.add_argument("--num_layers", type=int, default=2, choices=[1, 2, 3], help="Number of GNN layers.")
    parser.add_argument("--hidden_channels", type=int, default=128, help="Hidden layer dimension.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility.")
    parser.add_argument(
        "--output_base",
        default=None,
        help="Base output directory. Defaults to learning/output/experiments.",
    )
    return parser.parse_args()


def run_experiment(
    snapshot_id: str,
    run_id: str,
    output_dir: Path,
    num_layers: int = 2,
    hidden_channels: int = 128,
    seed: int = 42,
) -> dict:
    """
    Run the complete experiment pipeline.

    Returns a dict with:
    - tensor_bundle_path: Path to the saved tensor bundle
    - embeddings_path: Path to the saved embeddings
    - tsne_plot_path: Path to the t-SNE visualization
    - node_count: Number of nodes in the graph
    - edge_count: Number of edges in the graph
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Materialize snapshot from database
    print(f"[1/4] Materializing snapshot {snapshot_id}...")
    snapshot = materialize_snapshot(snapshot_id=snapshot_id)
    graph = snapshot.graph
    node_count = len(snapshot.nodes)
    edge_count = len(snapshot.edges)
    print(f"      Loaded {node_count} nodes, {edge_count} edges")

    # Step 2: Create tensor bundle
    print("[2/4] Creating tensor bundle...")
    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)
    x = create_feature_matrix_v1(snapshot.nodes, node_to_idx)

    bundle: TensorBundle = {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_to_idx,
    }

    tensor_bundle_path = output_dir / "tensor_bundle.pkl"
    with open(tensor_bundle_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"      Saved tensor bundle to {tensor_bundle_path}")

    # Step 3: Run GNN model
    print(f"[3/4] Running {num_layers}-layer GNN model...")
    model = create_gnn_model(
        in_channels=6,
        out_channels=64,
        seed=seed,
        eval_mode=True,
        num_layers=num_layers,
        hidden_channels=hidden_channels,
    )
    embeddings = generate_embeddings(model, x, edge_index)
    print(f"      Generated embeddings shape: {embeddings.shape}")

    embeddings_path = output_dir / "embeddings.pkl"
    with open(embeddings_path, "wb") as f:
        pickle.dump(embeddings, f)
    print(f"      Saved embeddings to {embeddings_path}")

    # Step 4: Create t-SNE visualization
    print("[4/4] Creating t-SNE visualization...")

    # Extract labels from one-hot features for coloring
    x_np = x.cpu().numpy() if isinstance(x, torch.Tensor) else x
    labels = np.argmax(x_np, axis=1)

    # Adaptive perplexity
    effective_perplexity = min(30, node_count - 1)

    tsne_plot_path = output_dir / f"tsne_{num_layers}layer.png"
    layer_suffix = f"{num_layers}-Layer" if num_layers > 1 else "1-Layer"

    visualize_embeddings(
        embeddings,
        labels=labels,
        title=f"t-SNE Projection ({layer_suffix} SAGEConv) - {node_count} nodes",
        save_path=tsne_plot_path,
        show=False,
        perplexity=effective_perplexity,
        random_state=seed,
        alpha=0.4,
        point_size=20,
    )
    print(f"      Saved t-SNE plot to {tsne_plot_path}")

    return {
        "tensor_bundle_path": str(tensor_bundle_path.relative_to(output_dir.parent.parent)),
        "embeddings_path": str(embeddings_path.relative_to(output_dir.parent.parent)),
        "tsne_plot_path": str(tsne_plot_path.relative_to(output_dir.parent.parent)),
        "node_count": node_count,
        "edge_count": edge_count,
    }


def main() -> int:
    args = parse_args()

    # Determine output directory
    if args.output_base:
        output_base = Path(args.output_base)
    else:
        learning_root = Path(__file__).resolve().parents[2]
        output_base = learning_root / "output" / "experiments"

    output_dir = output_base / args.run_id

    try:
        result = run_experiment(
            snapshot_id=args.snapshot_id,
            run_id=args.run_id,
            output_dir=output_dir,
            num_layers=args.num_layers,
            hidden_channels=args.hidden_channels,
            seed=args.seed,
        )

        # Output JSON result for the backend to parse
        print("\n" + "=" * 50)
        print("EXPERIMENT_RESULT_JSON:")
        print(json.dumps(result))
        print("=" * 50)

        print("\nExperiment completed successfully!")
        return 0

    except Exception as e:
        print(f"\nExperiment failed: {e}", file=sys.stderr)
        # Output error JSON for the backend to parse
        print("\nEXPERIMENT_ERROR_JSON:")
        print(json.dumps({"error": str(e)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
