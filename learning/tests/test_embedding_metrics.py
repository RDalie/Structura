import sys
from pathlib import Path

import numpy as np
import pytest

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from components.embedding_metrics import (  # noqa: E402
    compute_silhouette_score,
    find_best_kmeans_silhouette,
    summarize_cluster_identities,
    try_compute_silhouette_score,
    try_find_best_kmeans_silhouette,
)


def test_compute_silhouette_score_returns_float():
    embeddings = np.array([
        [0.0, 0.0],
        [0.1, 0.0],
        [5.0, 5.0],
        [5.1, 5.0],
    ])
    labels = np.array([0, 0, 1, 1])

    score = compute_silhouette_score(embeddings, labels)

    assert isinstance(score, float)
    assert score > 0.8


def test_compute_silhouette_score_requires_multiple_labels():
    embeddings = np.array([
        [0.0, 0.0],
        [0.1, 0.0],
        [0.2, 0.0],
    ])
    labels = np.array([0, 0, 0])

    with pytest.raises(ValueError, match="at least 2 distinct labels"):
        compute_silhouette_score(embeddings, labels)


def test_try_compute_silhouette_score_returns_error_instead_of_raising():
    embeddings = np.array([
        [0.0, 0.0],
        [0.1, 0.0],
        [0.2, 0.0],
    ])
    labels = np.array([0, 0, 0])

    score, error = try_compute_silhouette_score(embeddings, labels)

    assert score is None
    assert error is not None


def test_find_best_kmeans_silhouette_returns_positive_result():
    embeddings = np.array([
        [0.0, 0.0],
        [0.1, -0.1],
        [5.0, 5.0],
        [5.1, 5.2],
        [10.0, 0.0],
        [9.9, -0.2],
    ])

    result = find_best_kmeans_silhouette(embeddings, k_min=2, k_max=4, random_state=42)

    assert result.best_k in {2, 3, 4}
    assert result.best_score > 0.0
    assert result.labels.shape == (embeddings.shape[0],)
    assert set(result.scores_by_k.keys()) == {2, 3, 4}


def test_try_find_best_kmeans_silhouette_returns_error_for_invalid_k_range():
    embeddings = np.array([
        [0.0, 0.0],
        [0.1, -0.1],
        [5.0, 5.0],
        [5.1, 5.2],
    ])

    result, error = try_find_best_kmeans_silhouette(embeddings, k_min=5, k_max=10)

    assert result is None
    assert error is not None


def test_summarize_cluster_identities_formats_expected_lines():
    cluster_labels = np.array([0, 0, 1, 1, 1])
    original_labels = np.array([0, 1, 1, 1, 2])
    in_degrees = np.array([2.0, 4.0, 1.0, 3.0, 5.0])
    out_degrees = np.array([1.0, 2.0, 0.0, 1.0, 4.0])

    lines = summarize_cluster_identities(
        cluster_labels=cluster_labels,
        original_labels=original_labels,
        in_degrees=in_degrees,
        out_degrees=out_degrees,
        cluster_ids=[0, 1, 2],
        label_name_map={0: "Container", 1: "Logic", 2: "Data"},
        emit=None,
    )

    assert len(lines) == 3
    assert "Cluster 0: Primarily" in lines[0]
    assert "Container" in lines[0]
    assert "Logic" in lines[0]
    assert "Average connections:" in lines[0]
    assert "Cluster 2: No nodes assigned." == lines[2]
