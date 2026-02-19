from typing import Optional

from .materializer import _connect


def persist_snapshot_silhouette_score(
    snapshot_id: str,
    silhouette_score: Optional[float],
    dsn: Optional[str] = None,
) -> bool:
    """
    Persist silhouette score for a snapshot.

    Returns True when a row is updated, False when no snapshot row matched.
    """
    if not snapshot_id:
        raise ValueError("snapshot_id is required to persist silhouette score")

    conn = _connect(dsn)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                'UPDATE "Snapshot" SET "silhouetteScore" = %s WHERE "id" = %s',
                (None if silhouette_score is None else float(silhouette_score), snapshot_id),
            )
            updated = cursor.rowcount > 0
        conn.commit()
        return updated
    finally:
        conn.close()
