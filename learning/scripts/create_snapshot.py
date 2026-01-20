#!/usr/bin/env python3
"""
Materialize a snapshot graph and persist it as a pickle.

Env setup (choose one):
  set -a; source learning/.env; set +a
  set -a; source backend/.env; set +a

Run:
  python learning/scripts/create_snapshot.py --snapshot_id <UUID>
"""
import argparse
import pickle
import sys
from pathlib import Path

import networkx as nx

# Ensure the learning package root is importable when run from repo root.
LEARNING_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LEARNING_ROOT))

from snapshot_graph.materializer import materialize_snapshot  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Materialize a snapshot graph.")
    parser.add_argument("--snapshot_id", required=True, help="Snapshot UUID to load.")
    parser.add_argument(
        "--output_path",
        default=None,
        help="Path to write the pickled SnapshotGraph.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = (
        Path(args.output_path)
        if args.output_path
        else (LEARNING_ROOT / "snapshots" / f"{args.snapshot_id}.pkl")
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)

    snapshot = materialize_snapshot(snapshot_id=args.snapshot_id)

    # Validation probe to confirm the frozen graph rejects mutations.
    try:
        snapshot.graph.add_node("__mutation_probe__")
    except nx.NetworkXError:
        pass

    with open(output_path, "wb") as handle:
        pickle.dump(snapshot, handle)

    print(
        f"Snapshot frozen with {len(snapshot.nodes)} nodes and {len(snapshot.edges)} edges."
    )
    print(f"Wrote snapshot to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
