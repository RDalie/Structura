import argparse
import pickle
from pathlib import Path

import torch

# This is our "Contract" - we need to see if the data matches these keys!
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

def audit_bundle(bundle_path: Path) -> None:
    if not bundle_path.exists():
        raise FileNotFoundError(f"Bundle file not found: {bundle_path}")

    # Use weights_only=True if you transition to torch.load later for security 🛡️
    with open(bundle_path, "rb") as handle:
        bundle = pickle.load(handle)

    x = bundle["x"]
    node_mapping = bundle["node_mapping"]
    
    # --- NEW: Discovery Logic 🕵️ ---
    # We need to see what the 'kind' labels actually are.
    # Note: This assumes your bundle or nodes carry the kind info!
    # If the bundle only has tensors, we should check the Exporter's input.
    
    print("--- Diagnostic: Feature Alignment ---")
    bucket_labels = ["Container", "Logic", "Data", "Ref", "Statement", "Other"]
    bucket_counts = x.sum(dim=0).to(torch.int).tolist()

    for label, count in zip(bucket_labels, bucket_counts):
        print(f"- {label}: {count}")

    if bucket_counts[5] > 0 and sum(bucket_counts[:5]) == 0:
        print("\n⚠️ ALERT: All nodes are in 'Other'. Mapping failure suspected.")
        print(f"Expected keys: {list(KIND_TO_BUCKET.keys())[:5]}...")
    
    # --- Integrity Checks ---
    row_sums = x.sum(dim=1)
    assert torch.allclose(row_sums, torch.ones(x.shape[0])), "Rows must sum to 1"
    assert x.shape[1] == 6, "Must have 6 columns"

    print("\nStructure audit passed.")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_path")
    args = parser.parse_args()
    audit_bundle(Path(args.bundle_path))
    return 0

if __name__ == "__main__":
    main()
