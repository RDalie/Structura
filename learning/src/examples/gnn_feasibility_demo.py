"""
GNN Feasibility Proof - Complete Demonstration

Thin CLI wrapper over the reusable GNN experiment pipeline.
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.gnn_experiment_pipeline import GnnExperimentConfig, run_gnn_experiment


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="GNN Feasibility Proof for Structura",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with synthetic data
  python gnn_feasibility_demo.py

  # Run with existing tensor bundle
  python gnn_feasibility_demo.py --bundle-path data/tensors/snapshot.pkl

  # Custom output directory
  python gnn_feasibility_demo.py --output-dir results/
        """,
    )

    parser.add_argument(
        "--bundle-path",
        type=str,
        default=None,
        help="Path to TensorBundle pickle file (if not provided, uses synthetic data)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="output",
        help="Directory to save output visualizations (default: output/)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--num-layers",
        type=int,
        default=2,
        choices=[1, 2, 3],
        help="Number of GNN layers (default: 2)",
    )
    parser.add_argument(
        "--hidden-channels",
        type=int,
        default=256,
        help="Hidden layer dimension for multi-layer models (default: 256)",
    )
    parser.add_argument(
        "--perplexity",
        type=float,
        default=None,
        help="t-SNE perplexity parameter (default: auto-adjust based on graph size)",
    )
    parser.add_argument(
        "--alpha",
        type=float,
        default=0.4,
        help="Point transparency for scatter plot (0-1, default: 0.4)",
    )
    parser.add_argument(
        "--point-size",
        type=int,
        default=20,
        help="Size of points in scatter plot (default: 20)",
    )
    parser.add_argument(
        "--subsample",
        type=int,
        default=None,
        help="Number of nodes to subsample for visualization (default: use all nodes)",
    )
    parser.add_argument(
        "--silhouette-metric",
        type=str,
        default="euclidean",
        help="Distance metric for silhouette score (default: euclidean)",
    )
    parser.add_argument(
        "--silhouette-sample-size",
        type=int,
        default=None,
        help="Optional sample size for silhouette score computation",
    )
    parser.add_argument(
        "--cluster-k-min",
        type=int,
        default=2,
        help="Minimum cluster count for K-Means silhouette sweep (default: 2)",
    )
    parser.add_argument(
        "--cluster-k-max",
        type=int,
        default=10,
        help="Maximum cluster count for K-Means silhouette sweep (default: 10)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = GnnExperimentConfig(
        bundle_path=args.bundle_path,
        output_dir=args.output_dir,
        seed=args.seed,
        num_layers=args.num_layers,
        hidden_channels=args.hidden_channels,
        perplexity=args.perplexity,
        alpha=args.alpha,
        point_size=args.point_size,
        subsample_size=args.subsample,
        silhouette_metric=args.silhouette_metric,
        silhouette_sample_size=args.silhouette_sample_size,
        cluster_k_min=args.cluster_k_min,
        cluster_k_max=args.cluster_k_max,
    )
    run_gnn_experiment(config, log=print)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        raise SystemExit(1)
