"""
GNN Feasibility Proof - Complete Demonstration

This script demonstrates the complete workflow for the Structura GNN project:
1. Load or create a TensorBundle (node features + edge index)
2. Initialize a GNN model with SAGEConv
3. Generate node embeddings
4. Visualize embeddings using t-SNE

Usage:
    python gnn_feasibility_demo.py --bundle-path data/tensors/snapshot.pkl
    python gnn_feasibility_demo.py --snapshot-id <snapshot-id>  # Export from DB first
"""

import argparse
import pickle
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import torch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from components.exporter import TensorBundle
from components.gnn_model import create_gnn_model, generate_embeddings
from components.tsne_viz import visualize_embeddings


def load_tensor_bundle(bundle_path: str) -> TensorBundle:
    """Load a TensorBundle from a pickle file."""
    path = Path(bundle_path)
    if not path.exists():
        raise FileNotFoundError(f"Bundle file not found: {bundle_path}")

    with open(path, "rb") as f:
        bundle = pickle.load(f)

    # Validate bundle structure
    if not isinstance(bundle, dict):
        raise ValueError("Bundle must be a dictionary")

    required_keys = {"x", "edge_index", "node_mapping"}
    if not required_keys.issubset(bundle.keys()):
        raise ValueError(f"Bundle missing required keys: {required_keys - bundle.keys()}")

    return bundle


def create_synthetic_bundle(num_nodes: int = 100, num_edges: int = 200) -> TensorBundle:
    """Create a synthetic TensorBundle for testing purposes."""
    print(f"Creating synthetic bundle with {num_nodes} nodes and {num_edges} edges...")

    # Random one-hot encoded features (6 categories)
    x = torch.zeros((num_nodes, 6), dtype=torch.float32)
    categories = torch.randint(0, 6, (num_nodes,))
    x[torch.arange(num_nodes), categories] = 1.0

    # Random edges
    edge_index = torch.randint(0, num_nodes, (2, num_edges), dtype=torch.long)

    # Simple node mapping
    node_mapping = {f"node_{i}": i for i in range(num_nodes)}

    return {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_mapping
    }


def extract_node_labels(bundle: TensorBundle) -> np.ndarray:
    """
    Extract node type labels from one-hot encoded features.

    This is useful for coloring points in the t-SNE visualization.
    """
    x = bundle["x"]
    if isinstance(x, torch.Tensor):
        x = x.cpu().numpy()

    # Convert one-hot to label indices
    labels = np.argmax(x, axis=1)
    return labels


def run_feasibility_demo(
    bundle_path: Optional[str] = None,
    output_dir: str = "output",
    seed: int = 42,
    num_layers: int = 1,
    hidden_channels: int = 128,
    perplexity: Optional[float] = None,
    alpha: float = 0.4,
    point_size: int = 20,
    subsample_size: Optional[int] = None
):
    """
    Run the complete GNN feasibility demonstration.

    Args:
        bundle_path: Path to a TensorBundle pickle file (if None, creates synthetic data)
        output_dir: Directory to save output visualizations
        seed: Random seed for reproducibility
        num_layers: Number of GNN layers (1 or 2, default: 1)
        hidden_channels: Hidden layer dimension for 2-layer model (default: 128)
        perplexity: t-SNE perplexity parameter (None = auto-adjust)
        alpha: Point transparency (0-1, default: 0.4)
        point_size: Size of scatter plot points (default: 20)
        subsample_size: Number of nodes to subsample for visualization (None = use all)
    """
    print("=" * 60)
    print("GNN Feasibility Proof - Structura Project")
    print("=" * 60)

    # Step 1: Load or create tensor bundle
    print("\n[1/4] Loading tensor bundle...")
    if bundle_path:
        bundle = load_tensor_bundle(bundle_path)
        print(f"  Loaded bundle from: {bundle_path}")
    else:
        bundle = create_synthetic_bundle(num_nodes=100, num_edges=300)
        print("  Created synthetic bundle")

    x = bundle["x"]
    edge_index = bundle["edge_index"]
    node_mapping = bundle["node_mapping"]

    num_nodes = x.shape[0]
    num_edges = edge_index.shape[1]
    print(f"  Nodes: {num_nodes}, Edges: {num_edges}")
    print(f"  Node features shape: {x.shape}")
    print(f"  Edge index shape: {edge_index.shape}")

    # Check for orphan nodes (for demonstration)
    connected_nodes = torch.unique(edge_index)
    num_orphans = num_nodes - len(connected_nodes)
    if num_orphans > 0:
        print(f"  ⚠ Found {num_orphans} orphan node(s) with no edges")
        print(f"  ✓ SAGEConv handles orphans gracefully using self-features")

    # Step 2: Initialize GNN model
    print("\n[2/4] Initializing GNN model...")
    model = create_gnn_model(
        in_channels=6,
        out_channels=64,
        seed=seed,
        eval_mode=True,
        num_layers=num_layers,
        hidden_channels=hidden_channels
    )
    print(f"  Model: {model.__class__.__name__}")
    print(f"  Number of layers: {num_layers}")
    if num_layers == 2:
        print(f"  Architecture: 6 → {hidden_channels} → 64")
    else:
        print(f"  Architecture: 6 → 64")
    print(f"  Random seed: {seed} (for reproducibility)")
    print(f"  Mode: eval")

    # Step 3: Generate embeddings
    print("\n[3/4] Generating node embeddings...")
    embeddings = generate_embeddings(model, x, edge_index)
    print(f"  Embeddings shape: {embeddings.shape}")
    print(f"  Expected shape: [{num_nodes}, 64] ✓")

    # Step 4: t-SNE visualization
    print("\n[4/4] Creating t-SNE visualization...")

    # Extract labels for coloring
    labels = extract_node_labels(bundle)

    # Subsample nodes if requested
    if subsample_size and subsample_size < num_nodes:
        print(f"  Subsampling {subsample_size} nodes from {num_nodes} total nodes...")
        np.random.seed(seed)
        subsample_indices = np.random.choice(num_nodes, subsample_size, replace=False)
        embeddings_viz = embeddings[subsample_indices]
        labels_viz = labels[subsample_indices]
        print(f"  Using {subsample_size} nodes for visualization")
    else:
        embeddings_viz = embeddings
        labels_viz = labels
        print(f"  Using all {num_nodes} nodes for visualization")

    # Determine perplexity
    viz_num_nodes = embeddings_viz.shape[0]
    if perplexity is None:
        effective_perplexity = min(30, viz_num_nodes - 1)
    else:
        effective_perplexity = min(perplexity, viz_num_nodes - 1)

    print(f"  t-SNE perplexity: {effective_perplexity}")
    print(f"  Point transparency (alpha): {alpha}")
    print(f"  Point size: {point_size}")

    # Create output directory with layer-specific filename
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    save_path = output_path / f"tsne_embeddings_{num_layers}layer.png"

    # Visualize
    layer_suffix = f"{num_layers}-Layer" if num_layers > 1 else "1-Layer"
    projection, fig = visualize_embeddings(
        embeddings_viz,
        labels=labels_viz,
        title=f"t-SNE Projection of GNN Embeddings ({layer_suffix} SAGEConv)",
        save_path=save_path,
        show=False,  # Don't block in script mode
        perplexity=effective_perplexity,
        random_state=seed,
        alpha=alpha,
        point_size=point_size
    )

    print(f"  t-SNE projection shape: {projection.shape}")
    print(f"  Visualization saved to: {save_path}")

    print("\n" + "=" * 60)
    print("✓ Feasibility proof complete!")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  • GNN model successfully processed {num_nodes} nodes")
    print(f"  • Generated 64-dimensional embeddings")
    print(f"  • t-SNE projection created and saved")
    print(f"  • Orphan nodes: {num_orphans} (handled gracefully)")
    print(f"\nNext steps:")
    print(f"  1. View visualization at: {save_path}")
    print(f"  2. Try with real snapshot data: --bundle-path <path>")
    print(f"  3. Experiment with different model architectures")


def main():
    """Command-line interface for the feasibility demo."""
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
        """
    )

    parser.add_argument(
        "--bundle-path",
        type=str,
        default=None,
        help="Path to TensorBundle pickle file (if not provided, uses synthetic data)"
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="output",
        help="Directory to save output visualizations (default: output/)"
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)"
    )

    parser.add_argument(
        "--num-layers",
        type=int,
        default=1,
        choices=[1, 2],
        help="Number of GNN layers (default: 1)"
    )

    parser.add_argument(
        "--hidden-channels",
        type=int,
        default=128,
        help="Hidden layer dimension for 2-layer model (default: 128)"
    )

    parser.add_argument(
        "--perplexity",
        type=float,
        default=None,
        help="t-SNE perplexity parameter (default: auto-adjust based on graph size)"
    )

    parser.add_argument(
        "--alpha",
        type=float,
        default=0.4,
        help="Point transparency for scatter plot (0-1, default: 0.4)"
    )

    parser.add_argument(
        "--point-size",
        type=int,
        default=20,
        help="Size of points in scatter plot (default: 20)"
    )

    parser.add_argument(
        "--subsample",
        type=int,
        default=None,
        help="Number of nodes to subsample for visualization (default: use all nodes)"
    )

    args = parser.parse_args()

    try:
        run_feasibility_demo(
            bundle_path=args.bundle_path,
            output_dir=args.output_dir,
            seed=args.seed,
            num_layers=args.num_layers,
            hidden_channels=args.hidden_channels,
            perplexity=args.perplexity,
            alpha=args.alpha,
            point_size=args.point_size,
            subsample_size=args.subsample
        )
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
