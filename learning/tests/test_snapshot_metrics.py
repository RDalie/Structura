import sys
from pathlib import Path
from unittest.mock import MagicMock

LEARNING_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = LEARNING_ROOT / "src"
sys.path.insert(0, str(SRC_ROOT))

import components.snapshot_metrics as snapshot_metrics  # noqa: E402


def test_persist_snapshot_silhouette_score_updates_row(monkeypatch):
    conn = MagicMock()
    cursor = MagicMock()
    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = False
    cursor.rowcount = 1
    conn.cursor.return_value = cursor

    monkeypatch.setattr(snapshot_metrics, "_connect", lambda dsn=None: conn)

    updated = snapshot_metrics.persist_snapshot_silhouette_score("snap-1", 0.456)

    assert updated is True
    cursor.execute.assert_called_once()
    conn.commit.assert_called_once()
    conn.close.assert_called_once()


def test_persist_snapshot_silhouette_score_returns_false_when_missing(monkeypatch):
    conn = MagicMock()
    cursor = MagicMock()
    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = False
    cursor.rowcount = 0
    conn.cursor.return_value = cursor

    monkeypatch.setattr(snapshot_metrics, "_connect", lambda dsn=None: conn)

    updated = snapshot_metrics.persist_snapshot_silhouette_score("snap-missing", 0.123)

    assert updated is False


def test_persist_snapshot_silhouette_score_accepts_null(monkeypatch):
    conn = MagicMock()
    cursor = MagicMock()
    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = False
    cursor.rowcount = 1
    conn.cursor.return_value = cursor

    monkeypatch.setattr(snapshot_metrics, "_connect", lambda dsn=None: conn)

    updated = snapshot_metrics.persist_snapshot_silhouette_score("snap-2", None)

    assert updated is True
    args = cursor.execute.call_args.args
    assert args[1][0] is None
