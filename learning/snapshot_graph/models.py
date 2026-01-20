from dataclasses import dataclass, field
from typing import Any, Mapping, Optional, Tuple


@dataclass(frozen=True)
class SnapshotNode:
    """Immutable node record used to build snapshot graphs."""
    id: str
    kind: Optional[str] = None
    label: Optional[str] = None
    properties: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SnapshotEdge:
    """Immutable edge record used to build snapshot graphs."""
    source: str
    target: str
    kind: Optional[str] = None
    properties: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SnapshotGraph:
    """Container for a frozen NetworkX graph plus the raw snapshot records."""
    graph: Any
    nodes: Tuple[SnapshotNode, ...]
    edges: Tuple[SnapshotEdge, ...]
    created_at: str
    source: Optional[str] = None
