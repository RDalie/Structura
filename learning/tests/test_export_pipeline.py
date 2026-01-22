import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import networkx as nx
import pytest
import torch

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

import components.materializer as materializer  # noqa: E402
from components.exporter import TensorBundle  # noqa: E402
from pipeline.export_pipeline import run_export_pipeline  # noqa: E402


def make_connection(node_rows, edge_rows):
    """Create a mock database connection."""
    conn = MagicMock()
    nodes_cursor = MagicMock()
    edges_cursor = MagicMock()

    nodes_cursor.__enter__.return_value = nodes_cursor
    nodes_cursor.__exit__.return_value = False
    edges_cursor.__enter__.return_value = edges_cursor
    edges_cursor.__exit__.return_value = False

    nodes_cursor.fetchall.return_value = node_rows
    edges_cursor.fetchall.return_value = edge_rows
    conn.cursor.side_effect = [nodes_cursor, edges_cursor]
    return conn


def make_sample_rows(snapshot_id):
    """Create sample node and edge rows for testing."""
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    node_rows = [
        {
            "id": "a",
            "type": "Function",
            "originalType": "Function",
            "filePath": "test.js",
            "data": {},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        },
        {
            "id": "b",
            "type": "Variable",
            "originalType": "Variable",
            "filePath": "test.js",
            "data": {},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        },
        {
            "id": "c",
            "type": "Call",
            "originalType": "Call",
            "filePath": "test.js",
            "data": {},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        },
    ]
    edge_rows = [
        {
            "id": "e1",
            "fromId": "a",
            "toId": "b",
            "kind": "ASSIGNMENT",
            "filePath": "test.js",
            "snapshotId": snapshot_id,
            "version": 1,
            "createdAt": created_at,
        },
        {
            "id": "e2",
            "fromId": "b",
            "toId": "c",
            "kind": "CALL",
            "filePath": "test.js",
            "snapshotId": snapshot_id,
            "version": 1,
            "createdAt": created_at,
        },
    ]
    return node_rows, edge_rows


def test_run_export_pipeline_integration(tmp_path, monkeypatch):
    """Full pipeline should produce a valid TensorBundle."""
    snapshot_id = "test-pipeline-integration"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    assert isinstance(bundle, dict)
    assert "x" in bundle
    assert "edge_index" in bundle
    assert "node_mapping" in bundle


def test_bundle_structure(tmp_path, monkeypatch):
    """Bundle should have correct keys and types."""
    snapshot_id = "test-bundle-structure"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    # Check types
    assert isinstance(bundle["x"], torch.Tensor)
    assert isinstance(bundle["edge_index"], torch.Tensor)
    assert isinstance(bundle["node_mapping"], dict)

    # Check tensor dtypes
    assert bundle["x"].dtype == torch.float32
    assert bundle["edge_index"].dtype == torch.long


def test_bundle_consistency(tmp_path, monkeypatch):
    """Bundle components should have consistent dimensions."""
    snapshot_id = "test-bundle-consistency"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    num_nodes = len(node_rows)
    num_edges = len(edge_rows)

    # Feature matrix should be [num_nodes, 6]
    assert bundle["x"].shape == (num_nodes, 6)

    # Edge index should be [2, num_edges]
    assert bundle["edge_index"].shape == (2, num_edges)

    # Node mapping should have num_nodes entries
    assert len(bundle["node_mapping"]) == num_nodes


def test_export_creates_file(tmp_path, monkeypatch):
    """Pipeline should create the output file."""
    snapshot_id = "test-export-creates-file"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    run_export_pipeline(snapshot_id, str(output_path))

    assert output_path.exists()
    assert output_path.is_file()


def test_bundle_can_be_loaded(tmp_path, monkeypatch):
    """Exported bundle should be loadable with pickle."""
    snapshot_id = "test-bundle-loadable"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    original_bundle = run_export_pipeline(snapshot_id, str(output_path))

    # Load from disk
    with open(output_path, "rb") as f:
        loaded_bundle = pickle.load(f)

    # Verify contents match
    assert torch.equal(loaded_bundle["x"], original_bundle["x"])
    assert torch.equal(loaded_bundle["edge_index"], original_bundle["edge_index"])
    assert loaded_bundle["node_mapping"] == original_bundle["node_mapping"]


def test_feature_matrix_one_hot(tmp_path, monkeypatch):
    """Feature matrix rows should be one-hot encoded."""
    snapshot_id = "test-one-hot"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    # Each row should sum to 1.0
    row_sums = bundle["x"].sum(dim=1)
    assert torch.allclose(row_sums, torch.ones(len(node_rows)))


def test_edge_index_values(tmp_path, monkeypatch):
    """Edge index should correctly map node IDs to indices."""
    snapshot_id = "test-edge-values"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    node_mapping = bundle["node_mapping"]
    edge_index = bundle["edge_index"]

    # Verify edges match the node mapping
    for i, edge_row in enumerate(edge_rows):
        source_idx = node_mapping[edge_row["fromId"]]
        target_idx = node_mapping[edge_row["toId"]]

        # Find this edge in the edge_index
        # (edges might be in different order)
        found = False
        for j in range(edge_index.shape[1]):
            if edge_index[0, j] == source_idx and edge_index[1, j] == target_idx:
                found = True
                break
        assert found, f"Edge {edge_row['fromId']} -> {edge_row['toId']} not found"


def test_node_mapping_sorted(tmp_path, monkeypatch):
    """Node mapping should be sorted alphabetically."""
    snapshot_id = "test-sorted"
    output_path = tmp_path / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    node_mapping = bundle["node_mapping"]

    # Node IDs should be sorted: a, b, c
    assert node_mapping["a"] == 0
    assert node_mapping["b"] == 1
    assert node_mapping["c"] == 2


def test_nested_output_directory(tmp_path, monkeypatch):
    """Pipeline should create nested output directories."""
    snapshot_id = "test-nested"
    output_path = tmp_path / "nested" / "dir" / "bundle.pkl"
    node_rows, edge_rows = make_sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    run_export_pipeline(snapshot_id, str(output_path))

    assert output_path.exists()
    assert output_path.parent.exists()


def test_isolated_nodes(tmp_path, monkeypatch):
    """Pipeline should handle graphs with isolated nodes (no edges)."""
    snapshot_id = "test-isolated"
    output_path = tmp_path / "bundle.pkl"
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

    node_rows = [
        {
            "id": "isolated",
            "type": "Module",
            "originalType": "Module",
            "filePath": "test.js",
            "data": {},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        },
    ]
    edge_rows = []  # No edges

    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    assert bundle["x"].shape == (1, 6)
    assert bundle["edge_index"].shape == (2, 0)
    assert len(bundle["node_mapping"]) == 1


def test_large_graph(tmp_path, monkeypatch):
    """Pipeline should handle larger graphs efficiently."""
    snapshot_id = "test-large"
    output_path = tmp_path / "bundle.pkl"
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)

    # Create 100 nodes
    node_rows = [
        {
            "id": f"node_{i}",
            "type": "Function",
            "originalType": "Function",
            "filePath": "test.js",
            "data": {},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        }
        for i in range(100)
    ]

    # Create 150 edges
    edge_rows = [
        {
            "id": f"edge_{i}",
            "fromId": f"node_{i % 100}",
            "toId": f"node_{(i + 1) % 100}",
            "kind": "CALL",
            "filePath": "test.js",
            "snapshotId": snapshot_id,
            "version": 1,
            "createdAt": created_at,
        }
        for i in range(150)
    ]

    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    bundle = run_export_pipeline(snapshot_id, str(output_path))

    assert bundle["x"].shape == (100, 6)
    assert bundle["edge_index"].shape == (2, 150)
    assert len(bundle["node_mapping"]) == 100
