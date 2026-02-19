import sys
from pathlib import Path

import numpy as np
import pytest

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

from components.embedding_metrics import compute_silhouette_score, try_compute_silhouette_score  # noqa: E402


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
