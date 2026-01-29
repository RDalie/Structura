from pathlib import Path
from typing import Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.manifold import TSNE


def compute_tsne_projection(
    embeddings: Union[torch.Tensor, np.ndarray],
    n_components: int = 2,
    random_state: int = 42,
    perplexity: float = 30.0,
    n_iter: int = 1000
) -> np.ndarray:
    """
    Project high-dimensional embeddings to 2D using t-SNE.

    Args:
        embeddings: Node embeddings of shape [N, D]
        n_components: Number of dimensions for output (default: 2)
        random_state: Random seed for reproducibility (default: 42)
        perplexity: t-SNE perplexity parameter (default: 30.0)
                   Should be lower than the number of nodes
        n_iter: Number of iterations for optimization (default: 1000)

    Returns:
        2D projection of shape [N, 2]
    """
    # Convert torch tensor to numpy if needed
    if isinstance(embeddings, torch.Tensor):
        embeddings = embeddings.cpu().numpy()

    # Handle edge case: very small graphs
    n_samples = embeddings.shape[0]
    effective_perplexity = min(perplexity, max(5, n_samples - 1))

    if n_samples < 2:
        raise ValueError(
            f"t-SNE requires at least 2 samples, got {n_samples}. "
            "Cannot create visualization for a single node."
        )

    # Apply t-SNE
    tsne = TSNE(
        n_components=n_components,
        random_state=random_state,
        perplexity=effective_perplexity,
        n_iter=n_iter
    )

    projection = tsne.fit_transform(embeddings)
    return projection


def create_scatter_plot(
    projection: np.ndarray,
    labels: Optional[np.ndarray] = None,
    title: str = "t-SNE Projection of Node Embeddings",
    figsize: Tuple[int, int] = (10, 8),
    alpha: float = 0.6,
    s: int = 50,
    save_path: Optional[Union[str, Path]] = None
) -> plt.Figure:
    """
    Create a scatter plot of 2D t-SNE projections.

    Args:
        projection: 2D coordinates of shape [N, 2]
        labels: Optional labels for coloring points (shape [N,])
        title: Plot title
        figsize: Figure size (width, height)
        alpha: Point transparency (0-1)
        s: Point size
        save_path: Optional path to save the figure

    Returns:
        matplotlib Figure object
    """
    fig, ax = plt.subplots(figsize=figsize)

    if labels is not None:
        scatter = ax.scatter(
            projection[:, 0],
            projection[:, 1],
            c=labels,
            cmap='tab10',
            alpha=alpha,
            s=s
        )
        plt.colorbar(scatter, ax=ax, label='Node Type')
    else:
        ax.scatter(
            projection[:, 0],
            projection[:, 1],
            alpha=alpha,
            s=s
        )

    ax.set_xlabel('t-SNE Dimension 1', fontsize=12)
    ax.set_ylabel('t-SNE Dimension 2', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.grid(True, alpha=0.3)

    plt.tight_layout()

    if save_path:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Figure saved to {save_path}")

    return fig


def visualize_embeddings(
    embeddings: Union[torch.Tensor, np.ndarray],
    labels: Optional[np.ndarray] = None,
    title: str = "t-SNE Projection of Node Embeddings",
    save_path: Optional[Union[str, Path]] = None,
    show: bool = True,
    alpha: float = 0.6,
    point_size: int = 50,
    **tsne_kwargs
) -> Tuple[np.ndarray, plt.Figure]:
    """
    Complete pipeline: compute t-SNE projection and create visualization.

    This function handles the entire workflow from embeddings to visualization,
    including graceful handling of edge cases like orphan nodes (which are
    naturally handled by the embedding generation).

    Args:
        embeddings: Node embeddings of shape [N, D]
        labels: Optional labels for coloring points
        title: Plot title
        save_path: Optional path to save the figure
        show: Whether to display the plot (default: True)
        alpha: Point transparency (0-1, default: 0.6)
        point_size: Size of scatter plot points (default: 50)
        **tsne_kwargs: Additional arguments for t-SNE (perplexity, n_iter, etc.)

    Returns:
        Tuple of (2D projection, matplotlib Figure)

    Example:
        >>> embeddings = generate_embeddings(model, x, edge_index)
        >>> projection, fig = visualize_embeddings(
        ...     embeddings,
        ...     title="AST Node Embeddings",
        ...     save_path="output/tsne_plot.png",
        ...     alpha=0.3,
        ...     point_size=20
        ... )
    """
    # Compute t-SNE projection
    projection = compute_tsne_projection(embeddings, **tsne_kwargs)

    # Create scatter plot
    fig = create_scatter_plot(
        projection,
        labels=labels,
        title=title,
        save_path=save_path,
        alpha=alpha,
        s=point_size
    )

    if show:
        plt.show()

    return projection, fig
