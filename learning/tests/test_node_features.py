import sys
from pathlib import Path

import pytest
import torch

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from components.models import SnapshotNode  # noqa: E402
from components.node_features import (  # noqa: E402
    KIND_TO_BUCKET,
    create_feature_matrix_v1,
    _validate_node_set,
)


def make_test_nodes():
    """Create sample nodes with different kinds."""
    return [
        SnapshotNode(id="a", kind="Module"),
        SnapshotNode(id="b", kind="Function"),
        SnapshotNode(id="c", kind="Variable"),
        SnapshotNode(id="d", kind="Call"),
        SnapshotNode(id="e", kind="Import"),
        SnapshotNode(id="f", kind="Unknown"),
    ]


def make_node_mapping(nodes):
    """Create a simple node-to-index mapping."""
    return {str(node.id): i for i, node in enumerate(nodes)}


def test_feature_matrix_shape():
    """Feature matrix should have shape [num_nodes, 6]."""
    nodes = make_test_nodes()
    node_to_idx = make_node_mapping(nodes)

    x = create_feature_matrix_v1(nodes, node_to_idx)

    assert x.shape == (len(nodes), 6)
    assert x.dtype == torch.float32


def test_one_hot_encoding():
    """Each row should sum to 1.0 (one-hot encoding)."""
    nodes = make_test_nodes()
    node_to_idx = make_node_mapping(nodes)

    x = create_feature_matrix_v1(nodes, node_to_idx)

    row_sums = x.sum(dim=1)
    assert torch.allclose(row_sums, torch.ones(len(nodes)))


def test_kind_to_bucket_mapping():
    """Each node kind should map to the correct bucket."""
    test_cases = [
        ("Module", 0),      # Container
        ("Block", 0),       # Container
        ("Function", 1),    # Logic
        ("Conditional", 1), # Logic
        ("Loop", 1),        # Logic
        ("Return", 1),      # Logic
        ("Variable", 2),    # Data
        ("Parameter", 2),   # Data
        ("Assignment", 2),  # Data
        ("Literal", 2),     # Data
        ("Call", 3),        # Reference
        ("MemberExpression", 3),  # Reference
        ("Identifier", 3),  # Reference
        ("ExpressionStatement", 4),  # Statement
        ("Import", 4),      # Statement
        ("Unknown", 5),     # Other
    ]

    for kind, expected_bucket in test_cases:
        nodes = [SnapshotNode(id="test", kind=kind)]
        node_to_idx = {"test": 0}

        x = create_feature_matrix_v1(nodes, node_to_idx)

        assert x[0, expected_bucket] == 1.0
        assert x[0].sum() == 1.0


def test_unknown_kind_defaults_to_other():
    """Unknown or unmapped kinds should default to bucket 5 (Other)."""
    unknown_kinds = ["SomeNewKind", "UnknownType", "CustomNode"]

    for kind in unknown_kinds:
        nodes = [SnapshotNode(id="test", kind=kind)]
        node_to_idx = {"test": 0}

        x = create_feature_matrix_v1(nodes, node_to_idx)

        assert x[0, 5] == 1.0  # Bucket 5 = Other
        assert x[0].sum() == 1.0


def test_node_kind_none():
    """Nodes with None kind should be treated as Unknown (bucket 5)."""
    nodes = [SnapshotNode(id="test", kind=None)]
    node_to_idx = {"test": 0}

    x = create_feature_matrix_v1(nodes, node_to_idx)

    assert x[0, 5] == 1.0  # Bucket 5 = Other
    assert x[0].sum() == 1.0


def test_multiple_nodes_same_kind():
    """Multiple nodes with same kind should all map to same bucket."""
    nodes = [
        SnapshotNode(id="a", kind="Function"),
        SnapshotNode(id="b", kind="Function"),
        SnapshotNode(id="c", kind="Function"),
    ]
    node_to_idx = make_node_mapping(nodes)

    x = create_feature_matrix_v1(nodes, node_to_idx)

    # All should be in bucket 1 (Logic)
    assert x[0, 1] == 1.0
    assert x[1, 1] == 1.0
    assert x[2, 1] == 1.0


def test_feature_matrix_all_buckets():
    """Feature matrix should correctly handle nodes in all buckets."""
    nodes = [
        SnapshotNode(id="a", kind="Module"),              # Bucket 0
        SnapshotNode(id="b", kind="Function"),            # Bucket 1
        SnapshotNode(id="c", kind="Variable"),            # Bucket 2
        SnapshotNode(id="d", kind="Call"),                # Bucket 3
        SnapshotNode(id="e", kind="ExpressionStatement"), # Bucket 4
        SnapshotNode(id="f", kind="Unknown"),             # Bucket 5
    ]
    node_to_idx = make_node_mapping(nodes)

    x = create_feature_matrix_v1(nodes, node_to_idx)

    # Check each node is in the correct bucket
    expected_buckets = [0, 1, 2, 3, 4, 5]
    for i, expected_bucket in enumerate(expected_buckets):
        assert x[i, expected_bucket] == 1.0
        assert x[i].sum() == 1.0


def test_validate_node_set_valid():
    """Validation should pass when node sets match."""
    nodes = make_test_nodes()
    node_to_idx = make_node_mapping(nodes)

    # Should not raise
    _validate_node_set(nodes, node_to_idx)


def test_validate_node_set_missing_nodes():
    """Validation should fail when nodes are missing from nodes list."""
    nodes = [
        SnapshotNode(id="a", kind="Function"),
        SnapshotNode(id="b", kind="Variable"),
    ]
    node_to_idx = {
        "a": 0,
        "b": 1,
        "c": 2,  # c is in mapping but not in nodes
    }

    with pytest.raises(ValueError) as exc_info:
        _validate_node_set(nodes, node_to_idx)

    error_msg = str(exc_info.value)
    assert "missing" in error_msg.lower()
    assert "1 node ids from nodes list" in error_msg


def test_validate_node_set_extra_nodes():
    """Validation should fail when nodes list has extra nodes."""
    nodes = [
        SnapshotNode(id="a", kind="Function"),
        SnapshotNode(id="b", kind="Variable"),
        SnapshotNode(id="c", kind="Call"),
    ]
    node_to_idx = {
        "a": 0,
        "b": 1,
        # c is in nodes but not in mapping
    }

    with pytest.raises(ValueError) as exc_info:
        _validate_node_set(nodes, node_to_idx)

    error_msg = str(exc_info.value)
    assert "found" in error_msg.lower()
    assert "1 node ids not present in node_to_idx" in error_msg


def test_validate_node_set_both_missing_and_extra():
    """Validation should report both missing and extra nodes."""
    nodes = [
        SnapshotNode(id="a", kind="Function"),
        SnapshotNode(id="b", kind="Variable"),
    ]
    node_to_idx = {
        "b": 0,
        "c": 1,  # a is missing, c is extra
    }

    with pytest.raises(ValueError) as exc_info:
        _validate_node_set(nodes, node_to_idx)

    error_msg = str(exc_info.value)
    assert "missing" in error_msg.lower()
    assert "found" in error_msg.lower()


def test_feature_matrix_indices_match_mapping():
    """Feature matrix rows should correspond to node_to_idx mapping."""
    nodes = [
        SnapshotNode(id="c", kind="Variable"),
        SnapshotNode(id="a", kind="Function"),
        SnapshotNode(id="b", kind="Call"),
    ]
    # Custom mapping (not sorted)
    node_to_idx = {
        "a": 1,
        "b": 2,
        "c": 0,
    }

    x = create_feature_matrix_v1(nodes, node_to_idx)

    # Check that features are at correct indices
    assert x[1, 1] == 1.0  # a is Function (bucket 1), at index 1
    assert x[2, 3] == 1.0  # b is Call (bucket 3), at index 2
    assert x[0, 2] == 1.0  # c is Variable (bucket 2), at index 0


def test_feature_matrix_empty_nodes():
    """Feature matrix for empty node set should be [0, 6]."""
    nodes = []
    node_to_idx = {}

    x = create_feature_matrix_v1(nodes, node_to_idx)

    assert x.shape == (0, 6)
    assert x.dtype == torch.float32


def test_kind_to_bucket_completeness():
    """KIND_TO_BUCKET should contain all expected node kinds."""
    expected_kinds = [
        "Module", "Block",
        "Function", "Conditional", "Loop", "Return",
        "Variable", "Parameter", "Assignment", "Literal",
        "Call", "MemberExpression", "Identifier",
        "ExpressionStatement", "Import",
        "Unknown",
    ]

    for kind in expected_kinds:
        assert kind in KIND_TO_BUCKET, f"{kind} not in KIND_TO_BUCKET"


def test_kind_to_bucket_valid_buckets():
    """All buckets in KIND_TO_BUCKET should be in range [0, 5]."""
    for kind, bucket in KIND_TO_BUCKET.items():
        assert 0 <= bucket <= 5, f"{kind} maps to invalid bucket {bucket}"


def test_feature_matrix_with_properties():
    """Feature matrix should ignore node properties and only use kind."""
    nodes = [
        SnapshotNode(
            id="a",
            kind="Function",
            properties={"name": "test", "complexity": 10}
        ),
        SnapshotNode(
            id="b",
            kind="Variable",
            properties={"type": "string"}
        ),
    ]
    node_to_idx = make_node_mapping(nodes)

    x = create_feature_matrix_v1(nodes, node_to_idx)

    # Should still only use kind, not properties
    assert x[0, 1] == 1.0  # Function -> bucket 1
    assert x[1, 2] == 1.0  # Variable -> bucket 2
