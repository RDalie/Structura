from dataclasses import dataclass
import warnings
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, Tuple, Union

import numpy as np
from scipy.cluster.vq import kmeans2
from sklearn.metrics import silhouette_score as sklearn_silhouette_score


ArrayLike = Union[np.ndarray, Sequence[int]]
EmbeddingInput = Union[np.ndarray, Any]


@dataclass(frozen=True)
class KMeansSilhouetteSearchResult:
    best_k: int
    best_score: float
    labels: np.ndarray
    scores_by_k: Dict[int, float]


def _format_type_label(
    label: Any, label_name_map: Optional[Mapping[Any, str]]
) -> str:
    if label_name_map is not None and label in label_name_map:
        return label_name_map[label]
    if isinstance(label, (np.integer, int)):
        return f"Type {int(label)}"
    return str(label)


def summarize_cluster_identities(
    cluster_labels: ArrayLike,
    original_labels: ArrayLike,
    in_degrees: Union[np.ndarray, Sequence[float], Any],
    out_degrees: Union[np.ndarray, Sequence[float], Any],
    cluster_ids: Optional[Sequence[int]] = tuple(range(10)),
    top_n_types: int = 3,
    label_name_map: Optional[Mapping[Any, str]] = None,
    emit: Optional[Callable[[str], None]] = print,
) -> List[str]:
    """
    Summarize the identity of each cluster using node-type composition + degree stats.

    Output format:
      Cluster X: Primarily [Type A] (70.0%), [Type B] (20.0%), and [Type C] (10.0%).
      Average connections: [In]/[Out].
    """
    if top_n_types < 1:
        raise ValueError(f"top_n_types must be >= 1, got {top_n_types}")

    cluster_np = _to_numpy_labels(cluster_labels)
    original_np = _to_numpy_labels(original_labels)
    in_degree_np = _to_numpy(in_degrees).reshape(-1)
    out_degree_np = _to_numpy(out_degrees).reshape(-1)

    n_samples = cluster_np.shape[0]
    if original_np.shape[0] != n_samples:
        raise ValueError(
            f"original_labels length ({original_np.shape[0]}) must match "
            f"cluster_labels length ({n_samples})"
        )
    if in_degree_np.shape[0] != n_samples:
        raise ValueError(
            f"in_degrees length ({in_degree_np.shape[0]}) must match "
            f"cluster_labels length ({n_samples})"
        )
    if out_degree_np.shape[0] != n_samples:
        raise ValueError(
            f"out_degrees length ({out_degree_np.shape[0]}) must match "
            f"cluster_labels length ({n_samples})"
        )

    if cluster_ids is None:
        cluster_values = sorted(np.unique(cluster_np).tolist())
    else:
        cluster_values = list(cluster_ids)

    lines: List[str] = []
    for cluster_id in cluster_values:
        mask = cluster_np == cluster_id
        cluster_size = int(np.sum(mask))

        if cluster_size == 0:
            line = f"Cluster {cluster_id}: No nodes assigned."
            lines.append(line)
            if emit:
                emit(line)
            continue

        labels_in_cluster = original_np[mask]
        unique_labels, counts = np.unique(labels_in_cluster, return_counts=True)
        order = np.argsort(-counts)

        top_labels = unique_labels[order][:top_n_types]
        top_counts = counts[order][:top_n_types]

        label_parts: List[str] = []
        for label, count in zip(top_labels, top_counts):
            type_name = _format_type_label(label, label_name_map=label_name_map)
            pct = (float(count) / float(cluster_size)) * 100.0
            label_parts.append(f"{type_name} ({pct:.1f}%)")

        if len(label_parts) == 1:
            composition_text = label_parts[0]
        elif len(label_parts) == 2:
            composition_text = f"{label_parts[0]} and {label_parts[1]}"
        else:
            composition_text = ", ".join(label_parts[:-1]) + f", and {label_parts[-1]}"

        avg_in = float(np.mean(in_degree_np[mask]))
        avg_out = float(np.mean(out_degree_np[mask]))

        line = (
            f"Cluster {cluster_id}: Primarily {composition_text}. "
            f"Average connections: {avg_in:.2f}/{avg_out:.2f}."
        )
        lines.append(line)
        if emit:
            emit(line)

    return lines


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


def find_best_kmeans_silhouette(
    embeddings: EmbeddingInput,
    k_min: int = 2,
    k_max: int = 10,
    metric: str = "euclidean",
    sample_size: Optional[int] = None,
    random_state: int = 42,
) -> KMeansSilhouetteSearchResult:
    """
    Run a K-Means sweep and select the k with the highest positive silhouette score.

    Raises ValueError when search cannot be performed safely or no positive score exists.
    """
    embeddings_np = _to_numpy_embeddings(embeddings)
    n_samples = embeddings_np.shape[0]

    if k_min < 2:
        raise ValueError(f"k_min must be >= 2, got {k_min}")
    if k_max < k_min:
        raise ValueError(f"k_max ({k_max}) must be >= k_min ({k_min})")
    if n_samples < 3:
        raise ValueError(f"need at least 3 samples for k-means silhouette search, got {n_samples}")

    effective_k_max = min(k_max, n_samples - 1)
    if effective_k_max < k_min:
        raise ValueError(
            f"insufficient samples ({n_samples}) for requested k range [{k_min}, {k_max}]"
        )

    effective_sample_size = sample_size
    if effective_sample_size is not None:
        if effective_sample_size < 2:
            raise ValueError(f"sample_size must be >= 2 when provided, got {effective_sample_size}")
        effective_sample_size = min(effective_sample_size, n_samples)

    scores_by_k: Dict[int, float] = {}
    labels_by_k: Dict[int, np.ndarray] = {}
    best_positive_k: Optional[int] = None
    best_positive_score = float("-inf")

    for k in range(k_min, effective_k_max + 1):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=UserWarning)
            _, cluster_labels = kmeans2(
                embeddings_np.astype(np.float64),
                k,
                minit="++",
                iter=100,
                seed=random_state,
            )

        cluster_labels = np.asarray(cluster_labels)
        n_labels = np.unique(cluster_labels).shape[0]
        if n_labels < 2 or n_labels >= n_samples:
            continue

        score = float(
            sklearn_silhouette_score(
                embeddings_np,
                cluster_labels,
                metric=metric,
                sample_size=effective_sample_size,
                random_state=random_state,
            )
        )
        scores_by_k[k] = score
        labels_by_k[k] = cluster_labels

        if score > 0.0 and score > best_positive_score:
            best_positive_score = score
            best_positive_k = k

    if not scores_by_k:
        raise ValueError("k-means silhouette search produced no valid clusterings")

    if best_positive_k is None:
        best_k = max(scores_by_k, key=scores_by_k.get)
        best_score = scores_by_k[best_k]
        raise ValueError(
            "no positive silhouette score found in k range "
            f"[{k_min}, {effective_k_max}] (best observed: k={best_k}, score={best_score:.4f})"
        )

    return KMeansSilhouetteSearchResult(
        best_k=best_positive_k,
        best_score=best_positive_score,
        labels=labels_by_k[best_positive_k],
        scores_by_k=scores_by_k,
    )


def try_find_best_kmeans_silhouette(
    embeddings: EmbeddingInput,
    k_min: int = 2,
    k_max: int = 10,
    metric: str = "euclidean",
    sample_size: Optional[int] = None,
    random_state: int = 42,
) -> Tuple[Optional[KMeansSilhouetteSearchResult], Optional[str]]:
    """Run k-means silhouette search and return (result, error_message)."""
    try:
        result = find_best_kmeans_silhouette(
            embeddings=embeddings,
            k_min=k_min,
            k_max=k_max,
            metric=metric,
            sample_size=sample_size,
            random_state=random_state,
        )
    except ValueError as exc:
        return None, str(exc)
    return result, None
