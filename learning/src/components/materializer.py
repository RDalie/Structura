import json
import os
from datetime import datetime, timezone
from typing import Any, List, Optional, Tuple
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

import networkx as nx
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

from .models import SnapshotEdge, SnapshotGraph, SnapshotNode

DEFAULT_NODES_TABLE = "AstNode"
DEFAULT_EDGES_TABLE = "GraphEdge"


def _dsn_with_schema_options(dsn: str) -> str:
    """Translate ?schema=... into libpq options for search_path."""
    if "://" not in dsn or "schema=" not in dsn:
        return dsn

    parts = urlsplit(dsn)
    query_items = parse_qsl(parts.query, keep_blank_values=True)
    schema = None
    options_value = None
    preserved: List[Tuple[str, str]] = []

    for key, value in query_items:
        if key == "schema" and schema is None:
            schema = value
            continue
        if key == "options" and options_value is None:
            options_value = value
            continue
        preserved.append((key, value))

    if not schema:
        return dsn

    search_path = f"-c search_path={schema}"
    if options_value:
        options_value = f"{options_value} {search_path}"
    else:
        options_value = search_path

    preserved.append(("options", options_value))
    new_query = urlencode(preserved, doseq=True, quote_via=quote)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, new_query, parts.fragment))


def _connect(dsn: Optional[str] = None) -> psycopg2.extensions.connection:
    """Create a connection from a DSN or the expected env vars."""
    if dsn:
        return psycopg2.connect(_dsn_with_schema_options(dsn))

    env_dsn = os.getenv("DATABASE_URL")
    if env_dsn:
        return psycopg2.connect(_dsn_with_schema_options(env_dsn))

    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )


def _canonicalize(value: Any) -> Any:
    """Recursively sort mappings to stabilize hash/JSON output."""
    if isinstance(value, dict):
        return {key: _canonicalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value


def _stable_json(value: Any) -> str:
    """Create a stable string representation for deterministic sorting."""
    try:
        return json.dumps(
            _canonicalize(value),
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
            default=str,
        )
    except TypeError:
        return repr(value)


def _fetch_nodes(
    conn: psycopg2.extensions.connection,
    table: str,
    snapshot_id: str,
) -> List[SnapshotNode]:
    """Load nodes from SQL with a stable ordering."""
    node_columns = [
        "id",
        "type",
        "originalType",
        "filePath",
        "data",
        "location",
        "snapshotId",
        "createdAt",
        "updatedAt",
    ]
    query = sql.SQL(
        "SELECT {fields} FROM {table} WHERE {snapshot_col} = %s ORDER BY {order}"
    ).format(
        fields=sql.SQL(", ").join(map(sql.Identifier, node_columns)),
        table=sql.Identifier(table),
        snapshot_col=sql.Identifier("snapshotId"),
        order=sql.SQL(", ").join(map(sql.Identifier, ["id"])),
    )

    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(query, (snapshot_id,))
        rows = cursor.fetchall()

    nodes: List[SnapshotNode] = []
    for row in rows:
        node_id = str(row["id"])
        properties = {
            "filePath": row.get("filePath"),
            "data": row.get("data"),
            "location": row.get("location"),
            "snapshotId": row.get("snapshotId"),
            "createdAt": row.get("createdAt").isoformat()
            if row.get("createdAt")
            else None,
            "updatedAt": row.get("updatedAt").isoformat()
            if row.get("updatedAt")
            else None,
        }
        nodes.append(
            SnapshotNode(
                id=node_id,
                kind=row.get("type"),
                label=row.get("originalType"),
                properties=_canonicalize(properties),
            )
        )
    return nodes


def _fetch_edges(
    conn: psycopg2.extensions.connection,
    table: str,
    snapshot_id: str,
) -> List[SnapshotEdge]:
    """Load edges from SQL with a stable ordering."""
    edge_columns = [
        "id",
        "fromId",
        "toId",
        "kind",
        "filePath",
        "snapshotId",
        "version",
        "createdAt",
    ]
    query = sql.SQL(
        "SELECT {fields} FROM {table} WHERE {snapshot_col} = %s ORDER BY {order}"
    ).format(
        fields=sql.SQL(", ").join(map(sql.Identifier, edge_columns)),
        table=sql.Identifier(table),
        snapshot_col=sql.Identifier("snapshotId"),
        order=sql.SQL(", ").join(map(sql.Identifier, ["fromId", "toId", "kind"])),
    )

    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(query, (snapshot_id,))
        rows = cursor.fetchall()

    edges: List[SnapshotEdge] = []
    for row in rows:
        properties = {
            "id": row.get("id"),
            "filePath": row.get("filePath"),
            "snapshotId": row.get("snapshotId"),
            "version": row.get("version"),
            "createdAt": row.get("createdAt").isoformat()
            if row.get("createdAt")
            else None,
        }
        edges.append(
            SnapshotEdge(
                source=str(row["fromId"]),
                target=str(row["toId"]),
                kind=row.get("kind"),
                properties=_canonicalize(properties),
            )
        )
    return edges


def _edge_sort_key(edge: SnapshotEdge) -> Tuple[str, str, str, str]:
    """Sort edges deterministically, including properties."""
    return (
        edge.source,
        edge.target,
        edge.kind or "",
        _stable_json(edge.properties),
    )


def _build_frozen_graph(
    nodes: List[SnapshotNode],
    edges: List[SnapshotEdge],
) -> nx.MultiDiGraph:
    """Build a frozen MultiDiGraph from snapshot records."""
    graph = nx.MultiDiGraph()

    for node in sorted(nodes, key=lambda item: item.id):
        graph.add_node(
            node.id,
            kind=node.kind,
            label=node.label,
            properties=node.properties,
        )

    for edge in sorted(edges, key=_edge_sort_key):
        graph.add_edge(
            edge.source,
            edge.target,
            kind=edge.kind,
            properties=edge.properties,
        )

    return nx.freeze(graph)


def materialize_snapshot(
    snapshot_id: Optional[str],
    dsn: Optional[str] = None,
    nodes_table: Optional[str] = None,
    edges_table: Optional[str] = None,
) -> SnapshotGraph:
    """Materialize a frozen snapshot graph from SQL storage."""
    if not snapshot_id:
        raise ValueError("snapshot_id is required to scope the snapshot graph.")
    nodes_table = nodes_table or DEFAULT_NODES_TABLE
    edges_table = edges_table or DEFAULT_EDGES_TABLE

    conn = _connect(dsn)
    try:
        nodes = _fetch_nodes(conn, nodes_table, snapshot_id)
        edges = _fetch_edges(conn, edges_table, snapshot_id)
    finally:
        conn.close()

    # Freeze to guarantee immutability for downstream ML workflows.
    frozen_graph = _build_frozen_graph(nodes, edges)
    created_at = datetime.now(timezone.utc).isoformat()
    return SnapshotGraph(
        graph=frozen_graph,
        nodes=tuple(nodes),
        edges=tuple(edges),
        created_at=created_at,
        source="sql",
    )
