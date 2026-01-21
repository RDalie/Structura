import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import networkx as nx
import pytest

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

import components.materializer as materializer  # noqa: E402


def make_connection(node_rows, edge_rows):
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


def sample_rows(snapshot_id):
    created_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    node_rows = [
        {
            "id": "b",
            "type": "Identifier",
            "originalType": "Identifier",
            "filePath": "b.js",
            "data": {"b": 2, "a": 1},
            "location": None,
            "snapshotId": snapshot_id,
            "createdAt": created_at,
            "updatedAt": created_at,
        },
        {
            "id": "a",
            "type": "Identifier",
            "originalType": "Identifier",
            "filePath": "a.js",
            "data": {"a": 1, "b": 2},
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
            "kind": "IMPORT",
            "filePath": "a.js",
            "snapshotId": snapshot_id,
            "version": 1,
            "createdAt": created_at,
        },
        {
            "id": "e2",
            "fromId": "b",
            "toId": "a",
            "kind": "CALL",
            "filePath": "b.js",
            "snapshotId": snapshot_id,
            "version": 1,
            "createdAt": created_at,
        },
    ]
    return node_rows, edge_rows


def test_immutability_boundary(monkeypatch):
    snapshot_id = "snap-immutability"
    node_rows, edge_rows = sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    snapshot = materializer.materialize_snapshot(snapshot_id=snapshot_id)

    with pytest.raises(nx.NetworkXError):
        snapshot.graph.add_node("should-fail")

    edge = snapshot.edges[0]
    with pytest.raises(nx.NetworkXError):
        snapshot.graph.remove_edge(edge.source, edge.target)


def test_deterministic_ordering(monkeypatch):
    snapshot_id = "snap-determinism"
    node_rows, edge_rows = sample_rows(snapshot_id)

    connections = [
        make_connection(node_rows, edge_rows),
        make_connection(node_rows, edge_rows),
    ]

    def connect(_dsn=None):
        return connections.pop(0)

    monkeypatch.setattr(materializer, "_connect", connect)

    snapshot_a = materializer.materialize_snapshot(snapshot_id=snapshot_id)
    snapshot_b = materializer.materialize_snapshot(snapshot_id=snapshot_id)

    assert snapshot_a.nodes == snapshot_b.nodes
    assert snapshot_a.edges == snapshot_b.edges


def test_property_stabilization(monkeypatch):
    snapshot_id = "snap-canonicalize"
    node_rows, edge_rows = sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    snapshot = materializer.materialize_snapshot(snapshot_id=snapshot_id)
    nodes_by_id = {node.id: node for node in snapshot.nodes}

    data_a = nodes_by_id["a"].properties["data"]
    data_b = nodes_by_id["b"].properties["data"]

    assert data_a == data_b
    assert list(data_a.keys()) == ["a", "b"]
    assert list(data_b.keys()) == ["a", "b"]


def test_connection_closed_before_return(monkeypatch):
    snapshot_id = "snap-close"
    node_rows, edge_rows = sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)

    close_called = {"value": False}

    def close():
        close_called["value"] = True

    conn.close.side_effect = close

    original_build = materializer._build_frozen_graph

    def wrapped_build(nodes, edges):
        assert close_called["value"] is True
        return original_build(nodes, edges)

    monkeypatch.setattr(materializer, "_build_frozen_graph", wrapped_build)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    snapshot = materializer.materialize_snapshot(snapshot_id=snapshot_id)
    assert snapshot is not None
    assert conn.close.called


def test_serialization_round_trip(monkeypatch):
    snapshot_id = "snap-pickle"
    node_rows, edge_rows = sample_rows(snapshot_id)
    conn = make_connection(node_rows, edge_rows)
    monkeypatch.setattr(materializer, "_connect", lambda dsn=None: conn)

    snapshot = materializer.materialize_snapshot(snapshot_id=snapshot_id)

    payload = pickle.dumps(snapshot)
    loaded = pickle.loads(payload)

    assert nx.is_frozen(loaded.graph)
    assert loaded.nodes == snapshot.nodes
    assert loaded.edges == snapshot.edges
