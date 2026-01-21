from components.exporter import (
    TensorBundle,
    create_edge_index,
    create_node_mapping,
    export_snapshot,
)
from components.materializer import materialize_snapshot
from components.models import SnapshotGraph
from components.node_features import create_feature_matrix_v1


def run_export_pipeline(snapshot_id: str, output_path: str) -> TensorBundle:
    """
    Run the export pipeline for a snapshot and persist the final bundle.

    Returns a dictionary with:
    - "x": node feature matrix
    - "edge_index": COO edge index tensor
    - "node_mapping": node-id-to-index mapping
    """
    snapshot: SnapshotGraph = materialize_snapshot(snapshot_id=snapshot_id)
    graph = snapshot.graph

    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)
    x = create_feature_matrix_v1(snapshot.nodes, node_to_idx)

    bundle: TensorBundle = {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_to_idx,
    }
    export_snapshot(bundle, output_path)
    return bundle
