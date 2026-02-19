#!/usr/bin/env python3
"""
Run a complete baseline experiment pipeline.

This is a wrapper entrypoint used by the backend experiments service.
Core experiment logic lives in `pipeline/gnn_experiment_pipeline.py`.
"""
import argparse
import json
import pickle
import sys
from pathlib import Path

from torch_geometric.data import Data

SRC_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SRC_ROOT))

from components.exporter import TensorBundle, create_edge_index, create_node_mapping
from components.materializer import materialize_snapshot
from components.node_features import create_degree_feature_matrix, create_label_vector_v1
from pipeline.gnn_experiment_pipeline import GnnExperimentConfig, run_gnn_experiment


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run baseline experiment pipeline.")
    parser.add_argument("--snapshot_id", required=True, help="Snapshot UUID to process.")
    parser.add_argument("--run_id", required=True, help="Experiment run UUID for output directory.")
    parser.add_argument("--num_layers", type=int, default=2, choices=[1, 2, 3], help="Number of GNN layers.")
    parser.add_argument("--hidden_channels", type=int, default=256, help="Hidden layer dimension.")
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
    hidden_channels: int = 256,
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
    - silhouette_score: Best positive silhouette score from K-Means sweep (or null)
    - best_cluster_k: Cluster count (k) that produced silhouette_score (or null)
    - cluster_summary: Cluster identity summary lines for UI display
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Materialize snapshot from database and build tensor bundle
    print(f"[1/2] Materializing snapshot {snapshot_id}...")
    snapshot = materialize_snapshot(snapshot_id=snapshot_id)
    graph = snapshot.graph
    node_count = len(snapshot.nodes)
    edge_count = len(snapshot.edges)
    print(f"      Loaded {node_count} nodes, {edge_count} edges")

    print("[2/2] Creating tensor bundle...")
    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)
    labels = create_label_vector_v1(snapshot.nodes, node_to_idx)

    data = Data(edge_index=edge_index, num_nodes=len(node_to_idx))
    data.x = create_degree_feature_matrix(data.edge_index, data.num_nodes)

    bundle: TensorBundle = {
        "x": data.x,
        "edge_index": data.edge_index,
        "node_mapping": node_to_idx,
        "labels": labels,
    }

    tensor_bundle_path = output_dir / "tensor_bundle.pkl"
    with open(tensor_bundle_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"      Saved tensor bundle to {tensor_bundle_path}")

    embeddings_path = output_dir / "embeddings.pkl"
    config = GnnExperimentConfig(
        bundle_path=str(tensor_bundle_path),
        output_dir=str(output_dir),
        seed=seed,
        num_layers=num_layers,
        hidden_channels=hidden_channels,
        embeddings_output_path=str(embeddings_path),
    )

    result = run_gnn_experiment(config=config, log=print)

    if result.embeddings_path is None:
        raise ValueError("Expected embeddings output path from experiment pipeline")

    return {
        "tensor_bundle_path": str(tensor_bundle_path.relative_to(output_dir.parent.parent)),
        "embeddings_path": str(result.embeddings_path.relative_to(output_dir.parent.parent)),
        "tsne_plot_path": str(result.visualization_path.relative_to(output_dir.parent.parent)),
        "node_count": result.num_nodes,
        "edge_count": result.num_edges,
        "silhouette_score": result.silhouette_score,
        "best_cluster_k": result.best_cluster_k,
        "cluster_summary": result.cluster_summary_lines,
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
