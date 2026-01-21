#!/usr/bin/env python3
"""
Materialize a snapshot graph and persist it as a pickle.

Env setup (choose one):
  set -a; source learning/.env; set +a
  set -a; source backend/.env; set +a

Run:
  python learning/src/pipeline/run_export.py --snapshot_id <UUID>
"""
import argparse
import sys
from pathlib import Path

SRC_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SRC_ROOT))

from components.exporter import export_snapshot  # noqa: E402
from components.materializer import materialize_snapshot  # noqa: E402


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
    learning_root = Path(__file__).resolve().parents[2]

    output_path = (
        Path(args.output_path)
        if args.output_path
        else (learning_root / "data" / f"{args.snapshot_id}.pkl")
    )

    snapshot = materialize_snapshot(snapshot_id=args.snapshot_id)
    export_snapshot(snapshot, output_path)

    print(
        f"Snapshot frozen with {len(snapshot.nodes)} nodes and {len(snapshot.edges)} edges."
    )
    print(f"Wrote snapshot to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
