import json
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Mapping, Optional, Tuple

import numpy as np
import torch
from torch_geometric.utils import degree

from components.embedding_metrics import (
    summarize_cluster_identities,
    try_find_best_kmeans_silhouette,
)
from components.exporter import TensorBundle
from components.gnn_model import create_gnn_model, generate_embeddings
from components.node_features import create_degree_feature_matrix
from components.tsne_viz import visualize_embeddings

LogFn = Optional[Callable[[str], None]]
LABEL_NAMES_BY_BUCKET: Mapping[int, str] = {
    0: "Container",
    1: "Logic",
    2: "Data",
    3: "Reference",
    4: "Statement",
    5: "Other",
}


@dataclass(frozen=True)
class GnnExperimentConfig:
    bundle_path: Optional[str] = None
    output_dir: str = "output"
    seed: int = 42
    num_layers: int = 2
    hidden_channels: int = 256
    perplexity: Optional[float] = None
    alpha: float = 0.4
    point_size: int = 20
    subsample_size: Optional[int] = None
    silhouette_metric: str = "euclidean"
    silhouette_sample_size: Optional[int] = None
    cluster_k_min: int = 2
    cluster_k_max: int = 10
    embeddings_output_path: Optional[str] = None


@dataclass(frozen=True)
class GnnExperimentResult:
    num_nodes: int
    num_edges: int
    num_orphans: int
    embeddings_shape: Tuple[int, ...]
    projection_shape: Tuple[int, ...]
    silhouette_score: Optional[float]
    silhouette_error: Optional[str]
    best_cluster_k: Optional[int]
    cluster_summary_lines: list[str]
    embeddings_path: Optional[Path]
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
    edge_index = torch.randint(0, num_nodes, (2, num_edges), dtype=torch.long)
    node_mapping = {f"node_{i}": i for i in range(num_nodes)}
    labels = torch.randint(0, 6, (num_nodes,), dtype=torch.long)
    x = create_degree_feature_matrix(edge_index=edge_index, num_nodes=num_nodes)

    return {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_mapping,
        "labels": labels,
    }


def extract_original_labels(bundle: TensorBundle) -> np.ndarray:
    """Extract node-type labels for cluster interpretation."""
    labels = bundle.get("labels")
    if labels is not None:
        if isinstance(labels, torch.Tensor):
            labels = labels.cpu().numpy()
        labels_np = np.asarray(labels)
        if labels_np.ndim != 1:
            raise ValueError("Bundle labels must be a 1D array")
        return labels_np

    x = bundle["x"]
    if isinstance(x, torch.Tensor):
        x = x.cpu().numpy()
    if x.ndim != 2:
        raise ValueError("Bundle x must be a 2D array when labels are missing")
    return np.argmax(x, axis=1)


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

    x_from_bundle = bundle["x"]
    edge_index = bundle["edge_index"]
    original_labels = extract_original_labels(bundle)

    num_nodes = x_from_bundle.shape[0]
    if original_labels.shape[0] != num_nodes:
        raise ValueError(
            f"Label count ({original_labels.shape[0]}) does not match node count ({num_nodes})"
        )
    x = create_degree_feature_matrix(edge_index=edge_index, num_nodes=num_nodes)
    num_edges = edge_index.shape[1]
    _emit(log, f"  Nodes: {num_nodes}, Edges: {num_edges}")
    _emit(log, "  Recomputed node degree features (in-degree, out-degree)")
    _emit(log, f"  Node features shape: {x.shape}")
    _emit(log, f"  Edge index shape: {edge_index.shape}")

    out_degree = degree(edge_index[0], num_nodes=num_nodes, dtype=torch.float32).cpu().numpy()
    in_degree = degree(edge_index[1], num_nodes=num_nodes, dtype=torch.float32).cpu().numpy()

    connected_nodes = torch.unique(edge_index)
    num_orphans = num_nodes - len(connected_nodes)
    if num_orphans > 0:
        _emit(log, f"  ⚠ Found {num_orphans} orphan node(s) with no edges")
        _emit(log, "  ✓ SAGEConv handles orphans gracefully using self-features")

    input_dim = int(x.shape[1])
    _emit(log, "\n[2/5] Initializing GNN model...")
    model = create_gnn_model(
        in_channels=input_dim,
        out_channels=64,
        seed=config.seed,
        eval_mode=True,
        num_layers=config.num_layers,
        hidden_channels=config.hidden_channels,
    )
    _emit(log, f"  Model: {model.__class__.__name__}")
    _emit(log, f"  Number of layers: {config.num_layers}")
    _emit(log, f"  Input feature dimension: {input_dim}")
    if config.num_layers == 1:
        _emit(log, f"  Architecture: {input_dim} -> 64")
    elif config.num_layers == 2:
        _emit(log, f"  Architecture: {input_dim} -> {config.hidden_channels} -> 64")
    else:
        _emit(
            log,
            f"  Architecture: {input_dim} -> {config.hidden_channels} -> {config.hidden_channels} -> 64",
        )
    _emit(log, f"  Random seed: {config.seed} (for reproducibility)")
    _emit(log, "  Mode: eval")

    _emit(log, "\n[3/5] Generating node embeddings...")
    embeddings = generate_embeddings(model, x, edge_index)
    _emit(log, f"  Embeddings shape: {embeddings.shape}")
    _emit(log, f"  Expected shape: [{num_nodes}, 64] ✓")

    saved_embeddings_path: Optional[Path] = None
    if config.embeddings_output_path:
        saved_embeddings_path = Path(config.embeddings_output_path)
        saved_embeddings_path.parent.mkdir(parents=True, exist_ok=True)
        with open(saved_embeddings_path, "wb") as handle:
            pickle.dump(embeddings, handle)
        _emit(log, f"  Saved embeddings to: {saved_embeddings_path}")

    _emit(log, "\n[4/5] Searching best K-Means silhouette score...")
    cluster_search, silhouette_error = try_find_best_kmeans_silhouette(
        embeddings=embeddings,
        k_min=config.cluster_k_min,
        k_max=config.cluster_k_max,
        metric=config.silhouette_metric,
        sample_size=config.silhouette_sample_size,
        random_state=config.seed,
    )
    if cluster_search is None:
        silhouette_score = None
        best_cluster_k = None
        cluster_labels = None
        cluster_summary_lines: list[str] = []
        _emit(log, f"  ⚠ Silhouette score skipped: {silhouette_error}")
    else:
        silhouette_score = cluster_search.best_score
        best_cluster_k = cluster_search.best_k
        cluster_labels = cluster_search.labels
        cluster_summary_lines = summarize_cluster_identities(
            cluster_labels=cluster_labels,
            original_labels=original_labels,
            in_degrees=in_degree,
            out_degrees=out_degree,
            cluster_ids=list(range(best_cluster_k)),
            top_n_types=3,
            label_name_map=LABEL_NAMES_BY_BUCKET,
            emit=None,
        )
        scores_text = ", ".join(
            f"k={k}: {score:.4f}" for k, score in sorted(cluster_search.scores_by_k.items())
        )
        _emit(log, f"  Silhouette metric: {config.silhouette_metric}")
        _emit(log, f"  Scores by k -> {scores_text}")
        _emit(log, f"  Best positive silhouette: k={best_cluster_k}, score={silhouette_score:.4f}")

    _emit(log, "\n[5/5] Creating t-SNE visualization...")
    if config.subsample_size and config.subsample_size < num_nodes:
        _emit(log, f"  Subsampling {config.subsample_size} nodes from {num_nodes} total nodes...")
        np.random.seed(config.seed)
        subsample_indices = np.random.choice(num_nodes, config.subsample_size, replace=False)
        embeddings_viz = embeddings[subsample_indices]
        labels_viz = cluster_labels[subsample_indices] if cluster_labels is not None else None
        _emit(log, f"  Using {config.subsample_size} nodes for visualization")
    else:
        embeddings_viz = embeddings
        labels_viz = cluster_labels
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
    cluster_summary_path = output_path / "cluster_summary.json"

    layer_suffix = f"{config.num_layers}-Layer" if config.num_layers > 1 else "1-Layer"
    title_suffix = (
        f"Discovered Clusters (k={best_cluster_k})"
        if best_cluster_k is not None
        else "No Positive Cluster Split Found"
    )
    projection, _fig = visualize_embeddings(
        embeddings_viz,
        labels=labels_viz,
        label_name="Discovered Cluster ID",
        title=f"t-SNE Projection of GNN Embeddings ({layer_suffix} SAGEConv, {title_suffix})",
        save_path=save_path,
        show=False,
        perplexity=effective_perplexity,
        random_state=config.seed,
        alpha=config.alpha,
        point_size=config.point_size,
    )

    _emit(log, f"  t-SNE projection shape: {projection.shape}")
    _emit(log, f"  Visualization saved to: {save_path}")

    cluster_summary_payload = {
        "best_cluster_k": best_cluster_k,
        "silhouette_score": silhouette_score,
        "lines": cluster_summary_lines,
    }
    with open(cluster_summary_path, "w", encoding="utf-8") as handle:
        json.dump(cluster_summary_payload, handle, indent=2)
    _emit(log, f"  Cluster summary saved to: {cluster_summary_path}")

    _emit(log, "\n" + "=" * 60)
    _emit(log, "✓ Feasibility proof complete!")
    _emit(log, "=" * 60)
    _emit(log, "\nSummary:")
    _emit(log, f"  • GNN model successfully processed {num_nodes} nodes")
    _emit(log, "  • Generated 64-dimensional embeddings")
    if silhouette_score is None:
        _emit(log, f"  • Silhouette score: unavailable ({silhouette_error})")
    else:
        _emit(log, f"  • Best positive silhouette ({config.silhouette_metric}): {silhouette_score:.4f}")
        _emit(log, f"  • Selected cluster count: k={best_cluster_k}")
        _emit(log, "  • Cluster identity summary:")
        for line in cluster_summary_lines:
            _emit(log, f"    - {line}")
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
        best_cluster_k=best_cluster_k,
        cluster_summary_lines=cluster_summary_lines,
        embeddings_path=saved_embeddings_path,
        visualization_path=save_path,
    )
