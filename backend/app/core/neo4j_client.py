import os
import re
from typing import Any, Dict, List, Optional

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

from backend.app.core.config import settings

# Only allow safe characters in dynamically-built label / relationship-type identifiers.
# Neo4j does not support parameterizing labels or relationship types, so any value that
# gets interpolated into a Cypher string must be validated against this pattern first.
_SAFE_IDENTIFIER = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


def sanitize_identifier(value: str, fallback: str = "ENTITY") -> str:
    """Turns an arbitrary entity/relationship type string into a safe Cypher label/rel-type."""
    if not value:
        return fallback
    candidate = re.sub(r"[^A-Za-z0-9_]", "_", value.strip()).upper()
    candidate = re.sub(r"_+", "_", candidate).strip("_")
    if not candidate or not _SAFE_IDENTIFIER.match(candidate):
        return fallback
    return candidate


class Neo4jClient:
    """
    Thin wrapper around the official Neo4j driver.
    Provides connection lifecycle management, one-time constraint/index bootstrap,
    and small helpers for the MERGE-based node/relationship writes used by the
    knowledge graph store.
    """

    def __init__(self):
        self._driver = None

    def connect(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
            )
        return self._driver

    def close(self):
        if self._driver is not None:
            self._driver.close()
            self._driver = None

    def verify_connectivity(self) -> bool:
        try:
            self.connect().verify_connectivity()
            return True
        except (ServiceUnavailable, AuthError, Exception):
            return False

    def run(self, cypher: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        driver = self.connect()
        with driver.session() as session:
            result = session.run(cypher, params or {})
            return [record.data() for record in result]

    def apply_constraints(self, cypher_file: Optional[str] = None):
        """
        Executes the idempotent constraint/index statements in database/neo4j/constraints.cypher.
        Safe to call on every startup — every statement uses IF NOT EXISTS.
        """
        path = cypher_file or os.path.join(
            settings.BASE_DIR, "..", "database", "neo4j", "constraints.cypher"
        )
        path = os.path.abspath(path)
        if not os.path.exists(path):
            print(f"[Neo4jClient] Constraints file not found at {path}, skipping.")
            return

        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()

        # Strip line comments and split into individual statements.
        statements = []
        for chunk in raw.split(";"):
            lines = [ln for ln in chunk.splitlines() if not ln.strip().startswith("//")]
            stmt = "\n".join(lines).strip()
            if stmt:
                statements.append(stmt)

        driver = self.connect()
        with driver.session() as session:
            for stmt in statements:
                session.run(stmt)
        print(f"[Neo4jClient] Applied {len(statements)} constraint/index statements.")

    # ---- Node / relationship writes -------------------------------------------------

    def merge_node(self, label: str, node_id: str, properties: Dict[str, Any]):
        safe_label = sanitize_identifier(label, fallback="Entity")
        props = dict(properties or {})
        props["id"] = node_id
        cypher = f"MERGE (n:{safe_label} {{id: $id}}) SET n += $props"
        self.run(cypher, {"id": node_id, "props": props})

    def merge_relationship(
        self,
        source_id: str,
        target_id: str,
        relationship_type: str,
        properties: Dict[str, Any],
    ):
        safe_rel = sanitize_identifier(relationship_type, fallback="RELATED_TO")
        cypher = (
            "MATCH (a {id: $source_id}), (b {id: $target_id}) "
            f"MERGE (a)-[r:{safe_rel} {{id: $edge_id}}]->(b) "
            "SET r += $props"
        )
        props = dict(properties or {})
        self.run(
            cypher,
            {
                "source_id": source_id,
                "target_id": target_id,
                "edge_id": properties.get("id"),
                "props": props,
            },
        )

    # ---- Bulk reads used to rebuild the in-memory analytics mirror ------------------

    def fetch_all_nodes(self) -> List[Dict[str, Any]]:
        rows = self.run(
            "MATCH (n) RETURN n.id AS id, labels(n) AS labels, properties(n) AS props"
        )
        return rows

    def fetch_all_relationships(self) -> List[Dict[str, Any]]:
        rows = self.run(
            "MATCH (a)-[r]->(b) "
            "RETURN a.id AS source, b.id AS target, type(r) AS rel_type, properties(r) AS props"
        )
        return rows

    def clear_all(self):
        """Deletes every node and relationship. Use with care (tests / full reset only)."""
        self.run("MATCH (n) DETACH DELETE n")


neo4j_client = Neo4jClient()
