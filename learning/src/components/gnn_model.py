from typing import Optional

import torch
import torch.nn as nn
from torch_geometric.nn import SAGEConv


class SimpleGNN(nn.Module):
    """
    A simple Graph Neural Network using SAGEConv for feasibility testing.

    This model takes node features of dimension 6 (one-hot encoded node types)
    and produces 64-dimensional embeddings using a single SAGEConv layer.

    Args:
        in_channels: Input feature dimension (default: 6)
        out_channels: Output embedding dimension (default: 64)
        seed: Random seed for reproducible initialization (default: 42)
    """

    def __init__(
        self,
        in_channels: int = 6,
        out_channels: int = 64,
        seed: Optional[int] = 42
    ):
        super().__init__()

        # Set seed for reproducible weight initialization
        if seed is not None:
            torch.manual_seed(seed)

        # Single SAGEConv layer for proof of concept
        self.conv = SAGEConv(in_channels, out_channels)

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor
    ) -> torch.Tensor:
        """
        Forward pass through the GNN.

        Args:
            x: Node feature matrix of shape [N, in_channels]
            edge_index: Graph connectivity in COO format [2, E]

        Returns:
            Node embeddings of shape [N, out_channels]
        """
        # Apply SAGEConv layer
        # SAGEConv handles nodes without edges gracefully by using only the node's own features
        x = self.conv(x, edge_index)

        # No activation function for proof of concept (embeddings can be raw)
        # In production, you might add ReLU or other activations
        return x


def create_gnn_model(
    in_channels: int = 6,
    out_channels: int = 64,
    seed: int = 42,
    eval_mode: bool = True
) -> SimpleGNN:
    """
    Factory function to create and initialize a GNN model.

    Args:
        in_channels: Input feature dimension
        out_channels: Output embedding dimension
        seed: Random seed for reproducible initialization
        eval_mode: If True, set model to eval mode (default: True)

    Returns:
        Initialized SimpleGNN model
    """
    model = SimpleGNN(in_channels, out_channels, seed)

    if eval_mode:
        model.eval()

    return model


def generate_embeddings(
    model: SimpleGNN,
    x: torch.Tensor,
    edge_index: torch.Tensor
) -> torch.Tensor:
    """
    Generate node embeddings using the GNN model.

    Args:
        model: Trained or initialized GNN model
        x: Node feature matrix [N, 6]
        edge_index: Graph connectivity [2, E]

    Returns:
        Node embeddings [N, 64]
    """
    model.eval()
    with torch.no_grad():
        embeddings = model(x, edge_index)
    return embeddings
