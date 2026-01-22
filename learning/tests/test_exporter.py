import pickle
import sys
from pathlib import Path
from unittest.mock import MagicMock

import networkx as nx
import pytest
import torch

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from components.exporter import (  # noqa: E402
    TensorBundle,
    create_edge_index,
    create_node_mapping,
    export_snapshot,
)
from components.models import SnapshotGraph, SnapshotNode, SnapshotEdge  # noqa: E402


def make_test_graph():
    """Create a simple test graph with nodes and edges."""
    g = nx.DiGraph()
    g.add_node("b")
    g.add_node("a")
    g.add_node("c")
    g.add_edge("a", "b")
    g.add_edge("b", "c")
    g.add_edge("c", "a")
    return nx.freeze(g)


def test_node_mapping_determinism():
    """Node mapping should be deterministic across multiple calls."""
    graph = make_test_graph()

    mapping_1 = create_node_mapping(graph)
    mapping_2 = create_node_mapping(graph)

    assert mapping_1 == mapping_2
    assert list(mapping_1.keys()) == list(mapping_2.keys())
    assert list(mapping_1.values()) == list(mapping_2.values())


def test_node_mapping_sorted():
    """Node IDs should be sorted alphabetically in the mapping."""
    graph = make_test_graph()
    mapping = create_node_mapping(graph)

    # Nodes should be sorted: a, b, c
    assert mapping["a"] == 0
    assert mapping["b"] == 1
    assert mapping["c"] == 2


def test_node_mapping_all_nodes_included():
    """All graph nodes should be included in the mapping."""
    graph = make_test_graph()
    mapping = create_node_mapping(graph)

    assert len(mapping) == len(graph.nodes())
    for node in graph.nodes():
        assert node in mapping


def test_node_mapping_indices_sequential():
    """Mapping indices should be sequential from 0 to n-1."""
    graph = make_test_graph()
    mapping = create_node_mapping(graph)

    indices = sorted(mapping.values())
    assert indices == list(range(len(graph.nodes())))


def test_edge_index_shape():
    """Edge index should have shape [2, num_edges]."""
    graph = make_test_graph()
    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)

    assert edge_index.shape == (2, len(graph.edges()))
    assert edge_index.dtype == torch.long


def test_edge_index_values():
    """Edge index should correctly map source and target nodes."""
    graph = make_test_graph()
    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)

    # Verify each edge is correctly represented
    edges = list(graph.edges())
    for i, (src, dst) in enumerate(edges):
        assert edge_index[0, i] == node_to_idx[src]
        assert edge_index[1, i] == node_to_idx[dst]


def test_edge_index_empty_graph():
    """Edge index for graph with no edges should be [2, 0]."""
    g = nx.DiGraph()
    g.add_node("a")
    g.add_node("b")
    graph = nx.freeze(g)

    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)

    assert edge_index.shape == (2, 0)
    assert edge_index.dtype == torch.long


def test_edge_index_single_edge():
    """Edge index for graph with single edge."""
    g = nx.DiGraph()
    g.add_edge("a", "b")
    graph = nx.freeze(g)

    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)

    assert edge_index.shape == (2, 1)
    assert edge_index[0, 0] == node_to_idx["a"]
    assert edge_index[1, 0] == node_to_idx["b"]


def test_export_snapshot_creates_directory(tmp_path):
    """Export should create parent directories if they don't exist."""
    output_path = tmp_path / "nested" / "dir" / "snapshot.pkl"
    graph = make_test_graph()

    nodes = tuple([
        SnapshotNode(id="a", kind="Identifier"),
        SnapshotNode(id="b", kind="Function"),
        SnapshotNode(id="c", kind="Variable"),
    ])
    edges = tuple([
        SnapshotEdge(source="a", target="b", kind="CALL"),
        SnapshotEdge(source="b", target="c", kind="ASSIGNMENT"),
    ])

    snapshot = SnapshotGraph(
        graph=graph,
        nodes=nodes,
        edges=edges,
        created_at="2025-01-01T00:00:00Z"
    )

    result_path = export_snapshot(snapshot, output_path)

    assert result_path.exists()
    assert result_path.parent.exists()
    assert result_path == output_path


def test_export_snapshot_persistence(tmp_path):
    """Exported snapshot should be loadable with pickle."""
    output_path = tmp_path / "snapshot.pkl"
    graph = make_test_graph()

    nodes = tuple([
        SnapshotNode(id="a", kind="Identifier"),
        SnapshotNode(id="b", kind="Function"),
        SnapshotNode(id="c", kind="Variable"),
    ])
    edges = tuple([
        SnapshotEdge(source="a", target="b", kind="CALL"),
    ])

    snapshot = SnapshotGraph(
        graph=graph,
        nodes=nodes,
        edges=edges,
        created_at="2025-01-01T00:00:00Z"
    )

    export_snapshot(snapshot, output_path)

    # Load and verify
    with open(output_path, "rb") as f:
        loaded = pickle.load(f)

    assert isinstance(loaded, SnapshotGraph)
    assert loaded.nodes == snapshot.nodes
    assert loaded.edges == snapshot.edges
    assert nx.is_frozen(loaded.graph)


def test_export_tensor_bundle(tmp_path):
    """TensorBundle should be exportable and loadable."""
    output_path = tmp_path / "bundle.pkl"
    graph = make_test_graph()

    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)
    x = torch.rand(len(graph.nodes()), 6)

    bundle: TensorBundle = {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_to_idx,
    }

    export_snapshot(bundle, output_path)

    # Load and verify
    with open(output_path, "rb") as f:
        loaded = pickle.load(f)

    assert "x" in loaded
    assert "edge_index" in loaded
    assert "node_mapping" in loaded
    assert torch.equal(loaded["x"], x)
    assert torch.equal(loaded["edge_index"], edge_index)
    assert loaded["node_mapping"] == node_to_idx


def test_export_returns_path(tmp_path):
    """Export should return the Path object."""
    output_path = tmp_path / "test.pkl"
    graph = make_test_graph()

    nodes = tuple([SnapshotNode(id="a")])
    snapshot = SnapshotGraph(
        graph=graph,
        nodes=nodes,
        edges=tuple(),
        created_at="2025-01-01T00:00:00Z"
    )

    result = export_snapshot(snapshot, output_path)

    assert isinstance(result, Path)
    assert result == output_path


def test_export_with_string_path(tmp_path):
    """Export should accept string paths."""
    output_path = str(tmp_path / "test.pkl")
    graph = make_test_graph()

    nodes = tuple([SnapshotNode(id="a")])
    snapshot = SnapshotGraph(
        graph=graph,
        nodes=nodes,
        edges=tuple(),
        created_at="2025-01-01T00:00:00Z"
    )

    result = export_snapshot(snapshot, output_path)

    assert result.exists()
    assert isinstance(result, Path)
