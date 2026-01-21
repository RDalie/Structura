import pickle
from pathlib import Path
from typing import Dict, Tuple, Union

import torch

from .models import SnapshotGraph
from .node_features import create_feature_matrix_v1


def create_node_mapping(graph) -> Dict[str, int]:
    """Create a deterministic node-id-to-index mapping for frozen graphs."""
    nodes = list(graph.nodes())
    nodes.sort(key=lambda item: str(item))
    return {node_id: i for i, node_id in enumerate(nodes)}


def create_edge_index(graph, node_to_idx: Dict[str, int]) -> torch.Tensor:
    """Translate graph edges into a PyG-style COO edge_index tensor."""
    source_indices = []
    target_indices = []

    for src, dst in graph.edges():
        source_indices.append(node_to_idx[src])
        target_indices.append(node_to_idx[dst])

    return torch.tensor([source_indices, target_indices], dtype=torch.long)


def export_snapshot(snapshot: SnapshotGraph, output_path: Union[str, Path]) -> Path:
    """Persist a snapshot graph to disk, creating the destination directory."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as handle:
        pickle.dump(snapshot, handle)
    return path


def build_tensor_bundle(
    snapshot: SnapshotGraph,
) -> Tuple[torch.Tensor, torch.Tensor, Dict[str, int]]:
    """Create deterministic tensors and the node index mapping for a snapshot."""
    node_to_idx = create_node_mapping(snapshot.graph)
    x = create_feature_matrix_v1(snapshot.nodes, node_to_idx)
    edge_index = create_edge_index(snapshot.graph, node_to_idx)
    return x, edge_index, node_to_idx
