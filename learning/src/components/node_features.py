from typing import Dict, Iterable, Sequence

import torch

KIND_TO_BUCKET = {
    "Module": 0,
    "Block": 0,
    "Function": 1,
    "Conditional": 1,
    "Loop": 1,
    "Return": 1,
    "Variable": 2,
    "Parameter": 2,
    "Assignment": 2,
    "Literal": 2,
    "Call": 3,
    "MemberExpression": 3,
    "Identifier": 3,
    "ExpressionStatement": 4,
    "Import": 4,
    "Unknown": 5,
}


def create_feature_matrix_v1(
    nodes: Iterable, node_to_idx: Dict[str, int]
) -> torch.Tensor:
    """
    Build a fixed 6-column feature matrix X for node kinds.

    Column meaning:
    - Column 0 (Container): Module, Block
    - Column 1 (Logic): Function, Conditional, Loop, Return
    - Column 2 (Data): Variable, Parameter, Assignment, Literal
    - Column 3 (Ref): Call, MemberExpression, Identifier
    - Column 4 (Statement): ExpressionStatement, Import
    - Column 5 (Other): Unknown or any kind not listed above (including None)
    """
    node_list = list(nodes)
    _validate_node_set(node_list, node_to_idx)

    x = torch.zeros((len(node_to_idx), 6), dtype=torch.float32)
    for node in node_list:
        node_id = str(node.id)
        kind_str = (
            str(node.kind) if getattr(node, "kind", None) is not None else "UNKNOWN"
        )
        bucket = KIND_TO_BUCKET.get(kind_str, 5)
        x[node_to_idx[node_id], bucket] = 1.0

    return x


def _validate_node_set(nodes: Sequence, node_to_idx: Dict[str, int]) -> None:
    node_ids = {str(node.id) for node in nodes}
    mapping_ids = {str(node_id) for node_id in node_to_idx.keys()}
    if node_ids == mapping_ids:
        return
    missing = mapping_ids - node_ids
    extra = node_ids - mapping_ids
    parts = []
    if missing:
        parts.append(f"missing {len(missing)} node ids from nodes list")
    if extra:
        parts.append(f"found {len(extra)} node ids not present in node_to_idx")
    detail = "; ".join(parts) if parts else "node id mismatch"
    raise ValueError(f"nodes and node_to_idx must cover the same ids ({detail}).")
