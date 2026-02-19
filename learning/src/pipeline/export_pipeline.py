from components.exporter import (
    TensorBundle,
    create_edge_index,
    create_node_mapping,
    export_snapshot,
)
from components.materializer import materialize_snapshot
from components.models import SnapshotGraph
from components.node_features import create_degree_feature_matrix, create_label_vector_v1


def run_export_pipeline(snapshot_id: str, output_path: str) -> TensorBundle:
    """
    Run the export pipeline for a snapshot and persist the final bundle.

    Returns a dictionary with:
    - "x": degree feature matrix [log1p(in_degree), log1p(out_degree)]
    - "edge_index": COO edge index tensor
    - "node_mapping": node-id-to-index mapping
    - "labels": node-type labels for visualization/evaluation
    """
    snapshot: SnapshotGraph = materialize_snapshot(snapshot_id=snapshot_id)
    graph = snapshot.graph

    node_to_idx = create_node_mapping(graph)
    edge_index = create_edge_index(graph, node_to_idx)
    x = create_degree_feature_matrix(edge_index=edge_index, num_nodes=len(node_to_idx))
    labels = create_label_vector_v1(snapshot.nodes, node_to_idx)

    bundle: TensorBundle = {
        "x": x,
        "edge_index": edge_index,
        "node_mapping": node_to_idx,
        "labels": labels,
    }
    export_snapshot(bundle, output_path)
    return bundle
