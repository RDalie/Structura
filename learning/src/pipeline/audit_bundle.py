import argparse
import pickle
from pathlib import Path

import torch

def audit_bundle(bundle_path: Path) -> None:
    if not bundle_path.exists():
        raise FileNotFoundError(f"Bundle file not found: {bundle_path}")

    # Use weights_only=True if you transition to torch.load later for security 🛡️
    with open(bundle_path, "rb") as handle:
        bundle = pickle.load(handle)

    x = bundle["x"]
    node_mapping = bundle["node_mapping"]
    labels = bundle.get("labels")

    print("--- Bundle Audit ---")
    print(f"Nodes: {len(node_mapping)}")
    print(f"Feature shape: {tuple(x.shape)}")

    # Degree feature contract: two columns [log1p(in_degree), log1p(out_degree)].
    assert x.shape[1] == 2, "Degree-feature bundles must have 2 columns"
    assert torch.all(x >= 0), "Degree features should be non-negative after log1p scaling"

    if labels is not None:
        if isinstance(labels, torch.Tensor):
            labels_tensor = labels
        else:
            labels_tensor = torch.as_tensor(labels)
        assert labels_tensor.ndim == 1, "labels must be a 1D vector"
        assert labels_tensor.shape[0] == x.shape[0], "labels length must match node count"
        print(f"Labels shape: {tuple(labels_tensor.shape)}")

    print("\nStructure audit passed.")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_path")
    args = parser.parse_args()
    audit_bundle(Path(args.bundle_path))
    return 0

if __name__ == "__main__":
    main()
