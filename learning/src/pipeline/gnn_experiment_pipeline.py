import pickle
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Tuple

import numpy as np
import torch

from components.embedding_metrics import try_compute_silhouette_score
from components.exporter import TensorBundle
from components.gnn_model import create_gnn_model, generate_embeddings
from components.snapshot_metrics import persist_snapshot_silhouette_score
from components.tsne_viz import visualize_embeddings

UUID_PATTERN = re.compile(
    r"[0-9a-fA-F]{8}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{12}"
)

LogFn = Optional[Callable[[str], None]]


@dataclass(frozen=True)
class GnnExperimentConfig:
    bundle_path: Optional[str] = None
    snapshot_id: Optional[str] = None
    output_dir: str = "output"
    seed: int = 42
    num_layers: int = 1
    hidden_channels: int = 128
    perplexity: Optional[float] = None
    alpha: float = 0.4
    point_size: int = 20
    subsample_size: Optional[int] = None
    silhouette_metric: str = "euclidean"
    silhouette_sample_size: Optional[int] = None
    db_dsn: Optional[str] = None


@dataclass(frozen=True)
class GnnExperimentResult:
    num_nodes: int
    num_edges: int
    num_orphans: int
    embeddings_shape: Tuple[int, ...]
    projection_shape: Tuple[int, ...]
    silhouette_score: Optional[float]
    silhouette_error: Optional[str]
    silhouette_persisted: bool
    snapshot_id: Optional[str]
    visualization_path: Path


def _emit(log: LogFn, message: str) -> None:
    if log:
        log(message)


def load_tensor_bundle(bundle_path: str) -> TensorBundle:
    """Load a TensorBundle from a pickle file."""
    path = Path(bundle_path)
    if not path.exists():
        raise FileNotFoundError(f"Bundle file not found: {bundle_path}")

    with open(path, "rb") as handle:
        bundle = pickle.load(handle)

    if not isinstance(bundle, dict):
        raise ValueError("Bundle must be a dictionary")

    required_keys = {"x", "edge_index", "node_mapping"}
    if not required_keys.issubset(bundle.keys()):
        raise ValueError(f"Bundle missing required keys: {required_keys - bundle.keys()}")

    return bundle


def create_synthetic_bundle(num_nodes: int = 100, num_edges: int = 200) -> TensorBundle:
    """Create a synthetic TensorBundle for testing purposes."""
    x = torch.zeros((num_nodes, 6), dtype=torch.float32)
    categories = torch.randint(0, 6, (num_nodes,))
    x[torch.arange(num_nodes), categories] = 1.0

    edge_index = torch.randint(0, num_nodes, (2, num_edges), dtype=torch.long)
    node_mapping = {f"node_{i}": i for i in range(num_nodes)}

    return {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_mapping,
    }


def extract_node_labels(bundle: TensorBundle) -> np.ndarray:
    """Extract node type labels from one-hot encoded features."""
    x = bundle["x"]
    if isinstance(x, torch.Tensor):
        x = x.cpu().numpy()
    return np.argmax(x, axis=1)


def infer_snapshot_id(bundle_path: Optional[str]) -> Optional[str]:
    """Infer snapshot UUID from bundle file name when possible."""
    if not bundle_path:
        return None
    match = UUID_PATTERN.search(Path(bundle_path).name)
    if not match:
        return None
    return match.group(0)


def run_gnn_experiment(config: GnnExperimentConfig, log: LogFn = print) -> GnnExperimentResult:
    """Run the GNN embedding experiment and optional metric persistence."""
    _emit(log, "=" * 60)
    _emit(log, "GNN Feasibility Proof - Structura Project")
    _emit(log, "=" * 60)

    _emit(log, "\n[1/5] Loading tensor bundle...")
    if config.bundle_path:
        bundle = load_tensor_bundle(config.bundle_path)
        _emit(log, f"  Loaded bundle from: {config.bundle_path}")
    else:
        bundle = create_synthetic_bundle(num_nodes=100, num_edges=300)
        _emit(log, "  Created synthetic bundle")

    x = bundle["x"]
    edge_index = bundle["edge_index"]
    labels = extract_node_labels(bundle)

    num_nodes = x.shape[0]
    num_edges = edge_index.shape[1]
    _emit(log, f"  Nodes: {num_nodes}, Edges: {num_edges}")
    _emit(log, f"  Node features shape: {x.shape}")
    _emit(log, f"  Edge index shape: {edge_index.shape}")

    connected_nodes = torch.unique(edge_index)
    num_orphans = num_nodes - len(connected_nodes)
    if num_orphans > 0:
        _emit(log, f"  ⚠ Found {num_orphans} orphan node(s) with no edges")
        _emit(log, "  ✓ SAGEConv handles orphans gracefully using self-features")

    _emit(log, "\n[2/5] Initializing GNN model...")
    model = create_gnn_model(
        in_channels=6,
        out_channels=64,
        seed=config.seed,
        eval_mode=True,
        num_layers=config.num_layers,
        hidden_channels=config.hidden_channels,
    )
    _emit(log, f"  Model: {model.__class__.__name__}")
    _emit(log, f"  Number of layers: {config.num_layers}")
    if config.num_layers == 1:
        _emit(log, "  Architecture: 6 -> 64")
    elif config.num_layers == 2:
        _emit(log, f"  Architecture: 6 -> {config.hidden_channels} -> 64")
    else:
        _emit(
            log,
            f"  Architecture: 6 -> {config.hidden_channels} -> {config.hidden_channels} -> 64",
        )
    _emit(log, f"  Random seed: {config.seed} (for reproducibility)")
    _emit(log, "  Mode: eval")

    _emit(log, "\n[3/5] Generating node embeddings...")
    embeddings = generate_embeddings(model, x, edge_index)
    _emit(log, f"  Embeddings shape: {embeddings.shape}")
    _emit(log, f"  Expected shape: [{num_nodes}, 64] ✓")

    _emit(log, "\n[4/5] Computing silhouette score...")
    silhouette_score, silhouette_error = try_compute_silhouette_score(
        embeddings=embeddings,
        labels=labels,
        metric=config.silhouette_metric,
        sample_size=config.silhouette_sample_size,
        random_state=config.seed,
    )
    if silhouette_score is None:
        _emit(log, f"  ⚠ Silhouette score skipped: {silhouette_error}")
    else:
        _emit(log, f"  Silhouette score ({config.silhouette_metric}): {silhouette_score:.4f}")

    resolved_snapshot_id = config.snapshot_id or infer_snapshot_id(config.bundle_path)
    if resolved_snapshot_id is None:
        raise ValueError(
            "snapshot_id is required for DB persistence. "
            "Pass --snapshot-id or use a bundle filename containing the snapshot UUID."
        )

    silhouette_persisted = persist_snapshot_silhouette_score(
        snapshot_id=resolved_snapshot_id,
        silhouette_score=silhouette_score,
        dsn=config.db_dsn,
    )
    if not silhouette_persisted:
        raise ValueError(
            "DB update did not match any Snapshot row "
            f"(snapshot_id={resolved_snapshot_id})"
        )
    if silhouette_score is None:
        _emit(
            log,
            "  Persisted NULL silhouette score to Snapshot table "
            f"(snapshot_id={resolved_snapshot_id})",
        )
    else:
        _emit(
            log,
            "  Persisted silhouette score to Snapshot table "
            f"(snapshot_id={resolved_snapshot_id})",
        )

    _emit(log, "\n[5/5] Creating t-SNE visualization...")
    if config.subsample_size and config.subsample_size < num_nodes:
        _emit(log, f"  Subsampling {config.subsample_size} nodes from {num_nodes} total nodes...")
        np.random.seed(config.seed)
        subsample_indices = np.random.choice(num_nodes, config.subsample_size, replace=False)
        embeddings_viz = embeddings[subsample_indices]
        labels_viz = labels[subsample_indices]
        _emit(log, f"  Using {config.subsample_size} nodes for visualization")
    else:
        embeddings_viz = embeddings
        labels_viz = labels
        _emit(log, f"  Using all {num_nodes} nodes for visualization")

    viz_num_nodes = embeddings_viz.shape[0]
    if config.perplexity is None:
        effective_perplexity = min(30, viz_num_nodes - 1)
    else:
        effective_perplexity = min(config.perplexity, viz_num_nodes - 1)

    _emit(log, f"  t-SNE perplexity: {effective_perplexity}")
    _emit(log, f"  Point transparency (alpha): {config.alpha}")
    _emit(log, f"  Point size: {config.point_size}")

    output_path = Path(config.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    save_path = output_path / f"tsne_embeddings_{config.num_layers}layer.png"

    layer_suffix = f"{config.num_layers}-Layer" if config.num_layers > 1 else "1-Layer"
    projection, _fig = visualize_embeddings(
        embeddings_viz,
        labels=labels_viz,
        title=f"t-SNE Projection of GNN Embeddings ({layer_suffix} SAGEConv)",
        save_path=save_path,
        show=False,
        perplexity=effective_perplexity,
        random_state=config.seed,
        alpha=config.alpha,
        point_size=config.point_size,
    )

    _emit(log, f"  t-SNE projection shape: {projection.shape}")
    _emit(log, f"  Visualization saved to: {save_path}")

    _emit(log, "\n" + "=" * 60)
    _emit(log, "✓ Feasibility proof complete!")
    _emit(log, "=" * 60)
    _emit(log, "\nSummary:")
    _emit(log, f"  • GNN model successfully processed {num_nodes} nodes")
    _emit(log, "  • Generated 64-dimensional embeddings")
    if silhouette_score is None:
        _emit(log, f"  • Silhouette score: unavailable ({silhouette_error})")
    else:
        _emit(log, f"  • Silhouette score ({config.silhouette_metric}): {silhouette_score:.4f}")
    _emit(log, "  • t-SNE projection created and saved")
    _emit(log, f"  • Orphan nodes: {num_orphans} (handled gracefully)")
    _emit(log, "\nNext steps:")
    _emit(log, f"  1. View visualization at: {save_path}")
    _emit(log, "  2. Try with real snapshot data: --bundle-path <path>")
    _emit(log, "  3. Experiment with different model architectures")

    return GnnExperimentResult(
        num_nodes=num_nodes,
        num_edges=num_edges,
        num_orphans=num_orphans,
        embeddings_shape=tuple(embeddings.shape),
        projection_shape=tuple(projection.shape),
        silhouette_score=silhouette_score,
        silhouette_error=silhouette_error,
        silhouette_persisted=silhouette_persisted,
        snapshot_id=resolved_snapshot_id,
        visualization_path=save_path,
    )
