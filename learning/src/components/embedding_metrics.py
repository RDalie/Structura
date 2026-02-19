from typing import Any, Optional, Sequence, Tuple, Union

import numpy as np
from sklearn.metrics import silhouette_score as sklearn_silhouette_score


ArrayLike = Union[np.ndarray, Sequence[int]]
EmbeddingInput = Union[np.ndarray, Any]


def _to_numpy(value: Any) -> np.ndarray:
    """Convert numpy-like values (including torch tensors) to numpy."""
    if hasattr(value, "detach") and callable(value.detach):
        value = value.detach()
    if hasattr(value, "cpu") and callable(value.cpu):
        value = value.cpu()
    if hasattr(value, "numpy") and callable(value.numpy):
        value = value.numpy()
    return np.asarray(value)


def _to_numpy_embeddings(embeddings: EmbeddingInput) -> np.ndarray:
    """Normalize embeddings to a 2D numpy array."""
    embeddings = _to_numpy(embeddings)
    if embeddings.ndim != 2:
        raise ValueError(
            f"embeddings must be a 2D array of shape [N, D], got shape {embeddings.shape}"
        )
    return embeddings


def _to_numpy_labels(labels: ArrayLike) -> np.ndarray:
    """Normalize labels to a 1D numpy array."""
    labels = _to_numpy(labels)
    if labels.ndim != 1:
        raise ValueError(f"labels must be a 1D array of shape [N], got shape {labels.shape}")
    return labels


def compute_silhouette_score(
    embeddings: EmbeddingInput,
    labels: ArrayLike,
    metric: str = "euclidean",
    sample_size: Optional[int] = None,
    random_state: int = 42,
) -> float:
    """
    Compute silhouette score for node embeddings using provided cluster labels.

    Raises ValueError when the input does not satisfy silhouette requirements.
    """
    embeddings_np = _to_numpy_embeddings(embeddings)
    labels_np = _to_numpy_labels(labels)

    n_samples = embeddings_np.shape[0]
    if labels_np.shape[0] != n_samples:
        raise ValueError(
            f"labels length ({labels_np.shape[0]}) must match number of embeddings ({n_samples})"
        )

    unique_labels = np.unique(labels_np)
    n_labels = unique_labels.shape[0]
    if n_labels < 2:
        raise ValueError(
            "silhouette score requires at least 2 distinct labels, "
            f"but received {n_labels}"
        )
    if n_labels >= n_samples:
        raise ValueError(
            "silhouette score requires n_labels < n_samples, "
            f"but received n_labels={n_labels}, n_samples={n_samples}"
        )

    effective_sample_size = sample_size
    if effective_sample_size is not None:
        if effective_sample_size < 2:
            raise ValueError(
                f"sample_size must be >= 2 when provided, got {effective_sample_size}"
            )
        effective_sample_size = min(effective_sample_size, n_samples)

    return float(
        sklearn_silhouette_score(
            embeddings_np,
            labels_np,
            metric=metric,
            sample_size=effective_sample_size,
            random_state=random_state,
        )
    )


def try_compute_silhouette_score(
    embeddings: EmbeddingInput,
    labels: ArrayLike,
    metric: str = "euclidean",
    sample_size: Optional[int] = None,
    random_state: int = 42,
) -> Tuple[Optional[float], Optional[str]]:
    """
    Compute silhouette score and return (score, error_message).

    Returns:
        (score, None) on success
        (None, message) when score cannot be computed safely
    """
    try:
        score = compute_silhouette_score(
            embeddings=embeddings,
            labels=labels,
            metric=metric,
            sample_size=sample_size,
            random_state=random_state,
        )
    except ValueError as exc:
        return None, str(exc)
    return score, None
