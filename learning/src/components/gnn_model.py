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


class TwoLayerGNN(nn.Module):
    """
    A two-layer Graph Neural Network using SAGEConv.

    This model takes node features of dimension 6 (one-hot encoded node types)
    and produces 64-dimensional embeddings using two SAGEConv layers.

    Args:
        in_channels: Input feature dimension (default: 6)
        hidden_channels: Hidden layer dimension (default: 128)
        out_channels: Output embedding dimension (default: 64)
        seed: Random seed for reproducible initialization (default: 42)
    """

    def __init__(
        self,
        in_channels: int = 6,
        hidden_channels: int = 128,
        out_channels: int = 64,
        seed: Optional[int] = 42
    ):
        super().__init__()

        # Set seed for reproducible weight initialization
        if seed is not None:
            torch.manual_seed(seed)

        # Two SAGEConv layers
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, out_channels)

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
        # First layer with ReLU activation
        x = self.conv1(x, edge_index)
        x = torch.relu(x)

        # Second layer (no activation for final embeddings)
        x = self.conv2(x, edge_index)

        return x


def create_gnn_model(
    in_channels: int = 6,
    out_channels: int = 64,
    seed: int = 42,
    eval_mode: bool = True,
    num_layers: int = 1,
    hidden_channels: int = 128
) -> nn.Module:
    """
    Factory function to create and initialize a GNN model.

    Args:
        in_channels: Input feature dimension
        out_channels: Output embedding dimension
        seed: Random seed for reproducible initialization
        eval_mode: If True, set model to eval mode (default: True)
        num_layers: Number of GNN layers (1 or 2, default: 1)
        hidden_channels: Hidden layer dimension for 2-layer model (default: 128)

    Returns:
        Initialized GNN model (SimpleGNN or TwoLayerGNN)
    """
    if num_layers == 1:
        model = SimpleGNN(in_channels, out_channels, seed)
    elif num_layers == 2:
        model = TwoLayerGNN(in_channels, hidden_channels, out_channels, seed)
    else:
        raise ValueError(f"num_layers must be 1 or 2, got {num_layers}")

    if eval_mode:
        model.eval()

    return model


def generate_embeddings(
    model: nn.Module,
    x: torch.Tensor,
    edge_index: torch.Tensor
) -> torch.Tensor:
    """
    Generate node embeddings using the GNN model.

    Args:
        model: Trained or initialized GNN model (SimpleGNN or TwoLayerGNN)
        x: Node feature matrix [N, 6]
        edge_index: Graph connectivity [2, E]

    Returns:
        Node embeddings [N, 64]
    """
    model.eval()
    with torch.no_grad():
        embeddings = model(x, edge_index)
    return embeddings
