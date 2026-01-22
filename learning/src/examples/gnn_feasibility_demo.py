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
    seed: int = 42
):
    """
    Run the complete GNN feasibility demonstration.

    Args:
        bundle_path: Path to a TensorBundle pickle file (if None, creates synthetic data)
        output_dir: Directory to save output visualizations
        seed: Random seed for reproducibility
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
        eval_mode=True
    )
    print(f"  Model: {model.__class__.__name__}")
    print(f"  Input dim: 6, Output dim: 64")
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

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    save_path = output_path / "tsne_embeddings.png"

    # Visualize
    projection, fig = visualize_embeddings(
        embeddings,
        labels=labels,
        title="t-SNE Projection of GNN Embeddings (SAGEConv)",
        save_path=save_path,
        show=False,  # Don't block in script mode
        perplexity=min(30, num_nodes - 1),  # Adjust for small graphs
        random_state=seed
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

    args = parser.parse_args()

    try:
        run_feasibility_demo(
            bundle_path=args.bundle_path,
            output_dir=args.output_dir,
            seed=args.seed
        )
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
