import os
import json
import networkx as nx
from typing import Dict, List, Any, Optional, Tuple
from backend.app.core.config import settings
from backend.app.core.neo4j_client import neo4j_client
from backend.app.schemas.api_schemas import (
    GraphNode, GraphEdge, GraphResponse, ShortestPathResponse,
    CentralityMetric, CommunityInfo, BridgeNodeInfo, NetworkOverviewMetrics
)

class KnowledgeGraphStore:
    """
    Unified Knowledge Graph Engine for CrimeGraph AI.
    Neo4j is the persistent source of truth for entities and relationships.
    Every write goes to Neo4j via MERGE (see neo4j_client.py) and is mirrored into an
    in-memory NetworkX graph, which is what actually powers the fast analytics below
    (betweenness/degree/PageRank centrality, community detection, bridge detection,
    shortest paths). NetworkX has no built-in equivalent for these that runs directly
    against Neo4j without the GDS plugin, so on startup - and any time you want to make
    sure the mirror reflects the graph exactly - call load_from_neo4j() to rebuild it
    from what's actually stored in Neo4j.
    """
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.undirected_graph = nx.Graph()
        self.nodes_data: Dict[str, Dict[str, Any]] = {}
        self.edges_data: List[Dict[str, Any]] = []
        self._centrality_cache = None
        self._community_cache = None
        # Rehydrate the in-memory analytics mirror from Neo4j on boot. If Neo4j isn't
        # reachable yet (e.g. container still starting), start with an empty graph rather
        # than failing hard - main.py's lifespan hook calls load_from_neo4j() again once
        # the app is fully up.
        try:
            self.load_from_neo4j()
        except Exception as e:
            print(f"[KnowledgeGraphStore] Neo4j not reachable at startup ({e}); starting with an empty graph.")

    def clear(self):
        self.graph.clear()
        self.undirected_graph.clear()
        self.nodes_data.clear()
        self.edges_data.clear()
        self._centrality_cache = None
        self._community_cache = None

    def add_entity_node(self, node_id: str, label: str, node_type: str, properties: Dict[str, Any] = None,
                         sync_to_neo4j: bool = True):
        props = dict(properties or {})
        props["id"] = node_id
        props["label"] = label
        props["type"] = node_type

        self.nodes_data[node_id] = props
        self.graph.add_node(node_id, **props)
        self.undirected_graph.add_node(node_id, **props)

        if sync_to_neo4j:
            try:
                neo4j_client.merge_node(label=node_type, node_id=node_id, properties=props)
            except Exception as e:
                print(f"[KnowledgeGraphStore] Failed to persist node {node_id} to Neo4j: {e}")

    def add_relationship_edge(self, edge_id: str, source_id: str, target_id: str,
                               relationship_type: str, confidence: float = 1.0,
                               date: str = None, evidence_id: str = None, notes: str = None,
                               sync_to_neo4j: bool = True):
        edge_data = {
            "id": edge_id,
            "source": source_id,
            "target": target_id,
            "relationship": relationship_type,
            "confidence": float(confidence) if confidence else 1.0,
            "date": date or "",
            "evidence_id": evidence_id or "",
            "notes": notes or ""
        }
        self.edges_data.append(edge_data)
        
        # Add to MultiDiGraph
        self.graph.add_edge(source_id, target_id, key=edge_id, **edge_data)
        
        # Add to Undirected Graph for community detection and betweenness
        if not self.undirected_graph.has_edge(source_id, target_id):
            self.undirected_graph.add_edge(source_id, target_id, **edge_data)

        if sync_to_neo4j:
            try:
                neo4j_client.merge_relationship(
                    source_id=source_id, target_id=target_id,
                    relationship_type=relationship_type, properties=edge_data
                )
            except Exception as e:
                print(f"[KnowledgeGraphStore] Failed to persist relationship {edge_id} to Neo4j: {e}")

    def load_from_neo4j(self):
        """
        Rebuilds the in-memory NetworkX mirror from whatever is currently persisted in
        Neo4j. This is the graph's "boot" method - call it on startup, and again any time
        the mirror might have drifted from Neo4j (e.g. after a bulk import run outside
        this process).
        """
        self.clear()

        try:
            nodes = neo4j_client.fetch_all_nodes()
        except Exception as e:
            print(f"[KnowledgeGraphStore] Could not fetch nodes from Neo4j: {e}")
            return

        for n in nodes:
            node_id = n.get("id")
            if not node_id:
                continue
            props = dict(n.get("props") or {})
            labels = n.get("labels") or []
            node_type = props.get("type") or (labels[0] if labels else "Entity")
            label = props.get("label", node_id)
            self.add_entity_node(
                node_id=node_id, label=label, node_type=node_type,
                properties=props, sync_to_neo4j=False
            )

        try:
            rels = neo4j_client.fetch_all_relationships()
        except Exception as e:
            print(f"[KnowledgeGraphStore] Could not fetch relationships from Neo4j: {e}")
            rels = []

        for r in rels:
            source_id, target_id = r.get("source"), r.get("target")
            if not source_id or not target_id:
                continue
            props = dict(r.get("props") or {})
            edge_id = props.get("id") or f"{source_id}-{target_id}-{r.get('rel_type')}"
            self.add_relationship_edge(
                edge_id=edge_id,
                source_id=source_id,
                target_id=target_id,
                relationship_type=r.get("rel_type", "RELATED_TO"),
                confidence=props.get("confidence", 1.0),
                date=props.get("date", ""),
                evidence_id=props.get("evidence_id", ""),
                notes=props.get("notes", ""),
                sync_to_neo4j=False
            )

        print(f"[KnowledgeGraphStore] Loaded {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges from Neo4j.")

    def get_full_graph(self) -> GraphResponse:
        """Returns the full knowledge graph with computed metrics."""
        centrality = self.calculate_centralities()
        communities = self.detect_communities()
        bridges = self.find_bridge_nodes()
        bridge_ids = {b.node_id for b in bridges}

        nodes = []
        for n_id, data in self.nodes_data.items():
            deg = self.undirected_graph.degree(n_id) if self.undirected_graph.has_node(n_id) else 0
            b_score = centrality.get(n_id, {}).get("betweenness", 0.0)
            comm_id = communities.get(n_id, 0)
            
            nodes.append(GraphNode(
                id=n_id,
                label=data.get("label", n_id),
                type=data.get("type", "Entity"),
                properties=data,
                degree=deg,
                betweenness=round(b_score, 4),
                community=comm_id,
                is_bridge=n_id in bridge_ids,
                priority_score=data.get("priority_score", 0.0)
            ))

        edges = [
            GraphEdge(
                id=e["id"],
                source=e["source"],
                target=e["target"],
                relationship=e["relationship"],
                date=e.get("date"),
                confidence=e.get("confidence", 1.0),
                evidence_id=e.get("evidence_id"),
                notes=e.get("notes")
            )
            for e in self.edges_data
        ]

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges)
        )

    def get_subgraph(self, center_node_id: str, max_hops: int = 2, rel_types: List[str] = None) -> GraphResponse:
        """Extracts k-hop ego network around a specific entity node."""
        if not self.undirected_graph.has_node(center_node_id):
            return GraphResponse(nodes=[], edges=[], total_nodes=0, total_edges=0)

        # BFS to find k-hop neighbors
        visited = {center_node_id: 0}
        queue = [(center_node_id, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if depth >= max_hops:
                continue
            for neighbor in self.undirected_graph.neighbors(curr):
                if neighbor not in visited or visited[neighbor] > depth + 1:
                    visited[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))

        sub_node_ids = set(visited.keys())
        centrality = self.calculate_centralities()
        communities = self.detect_communities()
        bridges = self.find_bridge_nodes()
        bridge_ids = {b.node_id for b in bridges}

        nodes = []
        for n_id in sub_node_ids:
            data = self.nodes_data.get(n_id, {})
            deg = self.undirected_graph.degree(n_id) if self.undirected_graph.has_node(n_id) else 0
            b_score = centrality.get(n_id, {}).get("betweenness", 0.0)
            comm_id = communities.get(n_id, 0)
            nodes.append(GraphNode(
                id=n_id,
                label=data.get("label", n_id),
                type=data.get("type", "Entity"),
                properties=data,
                degree=deg,
                betweenness=round(b_score, 4),
                community=comm_id,
                is_bridge=n_id in bridge_ids,
                priority_score=data.get("priority_score", 0.0)
            ))

        edges = []
        for e in self.edges_data:
            if e["source"] in sub_node_ids and e["target"] in sub_node_ids:
                if not rel_types or e["relationship"] in rel_types:
                    edges.append(GraphEdge(
                        id=e["id"],
                        source=e["source"],
                        target=e["target"],
                        relationship=e["relationship"],
                        date=e.get("date"),
                        confidence=e.get("confidence", 1.0),
                        evidence_id=e.get("evidence_id"),
                        notes=e.get("notes")
                    ))

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges)
        )

    def get_case_subgraph(self, case_id: str, hops: int = 2) -> GraphResponse:
        """Retrieves the subgraph for all entities directly or transitively linked to a Case."""
        return self.get_subgraph(center_node_id=case_id, max_hops=hops)

    def calculate_centralities(self) -> Dict[str, Dict[str, float]]:
        """Calculates degree, betweenness, and PageRank centralities."""
        if self.undirected_graph.number_of_nodes() == 0:
            return {}

        deg_cent = nx.degree_centrality(self.undirected_graph)
        try:
            bet_cent = nx.betweenness_centrality(self.undirected_graph, normalized=True)
        except Exception:
            bet_cent = {n: 0.0 for n in self.undirected_graph.nodes()}
            
        try:
            pagerank = nx.pagerank(self.undirected_graph, max_iter=200)
        except Exception:
            pagerank = {n: 0.0 for n in self.undirected_graph.nodes()}

        results = {}
        for n in self.undirected_graph.nodes():
            results[n] = {
                "degree_centrality": deg_cent.get(n, 0.0),
                "betweenness": bet_cent.get(n, 0.0),
                "pagerank": pagerank.get(n, 0.0)
            }
        return results

    def detect_communities(self) -> Dict[str, int]:
        """Detects network communities using greedy modularity or label propagation."""
        if self.undirected_graph.number_of_nodes() == 0:
            return {}

        try:
            communities_gen = nx.community.greedy_modularity_communities(self.undirected_graph)
            node_community = {}
            for comm_idx, comm_set in enumerate(communities_gen):
                for node_id in comm_set:
                    node_community[node_id] = comm_idx + 1
            return node_community
        except Exception:
            # Fallback to connected components
            node_community = {}
            for idx, comp in enumerate(nx.connected_components(self.undirected_graph)):
                for node_id in comp:
                    node_community[node_id] = idx + 1
            return node_community

    def get_community_details(self) -> List[CommunityInfo]:
        """Provides rich community summaries and key members, themed from whatever
        Case nodes actually sit in each cluster - never a fixed guess."""
        comm_map = self.detect_communities()
        groups: Dict[int, List[str]] = {}
        for node_id, c_id in comm_map.items():
            groups.setdefault(c_id, []).append(node_id)

        community_list = []
        for c_id, members in sorted(groups.items()):
            key_entities = [self.nodes_data.get(m, {}).get("label", m) for m in members if self.nodes_data.get(m, {}).get("type") in ["Person", "Case", "Organization"]]
            theme = self._community_theme_label(members)

            member_nodes = []
            for m in members:
                data = self.nodes_data.get(m, {})
                member_nodes.append(GraphNode(
                    id=m,
                    label=data.get("label", m),
                    type=data.get("type", "Entity"),
                    properties=data,
                    community=c_id
                ))

            community_list.append(CommunityInfo(
                community_id=c_id,
                name=f"Cluster {c_id}",
                size=len(members),
                key_entities=key_entities[:5],
                dominant_crime_theme=theme,
                members=member_nodes
            ))

        return community_list

    def _community_theme_label(self, member_ids: List[str]) -> str:
        """Builds a theme label for a cluster from its actual Case nodes, falling back
        to the cluster's dominant entity type when no case is linked yet."""
        case_titles = [self.nodes_data.get(m, {}).get("label", m) for m in member_ids if self.nodes_data.get(m, {}).get("type") == "Case"]
        if case_titles:
            return f"Linked to {', '.join(case_titles)}"
        type_counts: Dict[str, int] = {}
        for m in member_ids:
            t = self.nodes_data.get(m, {}).get("type", "Entity")
            type_counts[t] = type_counts.get(t, 0) + 1
        dominant_type = max(type_counts, key=type_counts.get) if type_counts else "Entity"
        return f"{dominant_type}-Dominant Cluster (no case linked yet)"

    def find_bridge_nodes(self) -> List[BridgeNodeInfo]:
        """Identifies key bridge nodes (articulation points or cross-community gateways)."""
        centralities = self.calculate_centralities()
        communities = self.detect_communities()
        bridge_list = []

        for node_id in self.undirected_graph.nodes():
            n_data = self.nodes_data.get(node_id, {})
            # Check if this node has edges to multiple distinct communities
            neighbor_communities = set()
            critical_edges = []
            
            for neighbor in self.undirected_graph.neighbors(node_id):
                neighbor_c = communities.get(neighbor)
                if neighbor_c is not None:
                    neighbor_communities.add(neighbor_c)

            b_score = centralities.get(node_id, {}).get("betweenness", 0.0)

            if len(neighbor_communities) >= 2 or b_score > 0.15:
                for e in self.edges_data:
                    if e["source"] == node_id or e["target"] == node_id:
                        critical_edges.append(GraphEdge(
                            id=e["id"],
                            source=e["source"],
                            target=e["target"],
                            relationship=e["relationship"],
                            date=e.get("date"),
                            confidence=e.get("confidence", 1.0),
                            evidence_id=e.get("evidence_id")
                        ))

                themes = []
                for nc in neighbor_communities:
                    nc_members = [n for n, c in communities.items() if c == nc]
                    themes.append(self._community_theme_label(nc_members))

                bridge_list.append(BridgeNodeInfo(
                    node_id=node_id,
                    label=n_data.get("label", node_id),
                    type=n_data.get("type", "Entity"),
                    bridged_communities=list(neighbor_communities),
                    bridged_themes=themes,
                    betweenness=round(b_score, 4),
                    explanation=f"Node {n_data.get('label', node_id)} acts as a critical network gateway with high betweenness ({round(b_score, 3)}), bridging multiple distinct criminal operational clusters.",
                    critical_links=critical_edges[:6]
                ))

        bridge_list.sort(key=lambda x: x.betweenness, reverse=True)
        return bridge_list

    def find_shortest_path(self, source_id: str, target_id: str, max_hops: int = 4) -> ShortestPathResponse:
        """Finds shortest investigative path with complete evidence trail."""
        if not self.undirected_graph.has_node(source_id) or not self.undirected_graph.has_node(target_id):
            return ShortestPathResponse(
                found=False,
                hops=0,
                nodes=[],
                edges=[],
                evidence_chain=[],
                path_summary=f"Path not found between {source_id} and {target_id}."
            )

        try:
            path_nodes = nx.shortest_path(self.undirected_graph, source=source_id, target=target_id)
            if len(path_nodes) - 1 > max_hops:
                return ShortestPathResponse(
                    found=False,
                    hops=len(path_nodes) - 1,
                    nodes=[],
                    edges=[],
                    path_summary=f"Path exceeds maximum allowed hops ({max_hops})."
                )

            # Build nodes
            nodes = []
            for n_id in path_nodes:
                data = self.nodes_data.get(n_id, {})
                nodes.append(GraphNode(
                    id=n_id,
                    label=data.get("label", n_id),
                    type=data.get("type", "Entity"),
                    properties=data
                ))

            # Build edges along the path
            edges = []
            evidence_chain = []
            for i in range(len(path_nodes) - 1):
                u, v = path_nodes[i], path_nodes[i+1]
                # Find matching edge in edges_data
                matched_edge = None
                for e in self.edges_data:
                    if (e["source"] == u and e["target"] == v) or (e["source"] == v and e["target"] == u):
                        matched_edge = e
                        break
                
                if matched_edge:
                    edge_obj = GraphEdge(
                        id=matched_edge["id"],
                        source=matched_edge["source"],
                        target=matched_edge["target"],
                        relationship=matched_edge["relationship"],
                        date=matched_edge.get("date"),
                        confidence=matched_edge.get("confidence", 1.0),
                        evidence_id=matched_edge.get("evidence_id"),
                        notes=matched_edge.get("notes")
                    )
                    edges.append(edge_obj)
                    
                    evidence_chain.append({
                        "step": i + 1,
                        "source_node": self.nodes_data.get(matched_edge["source"], {}).get("label", matched_edge["source"]),
                        "relationship": matched_edge["relationship"],
                        "target_node": self.nodes_data.get(matched_edge["target"], {}).get("label", matched_edge["target"]),
                        "evidence_id": matched_edge.get("evidence_id", "N/A"),
                        "date": matched_edge.get("date", "N/A"),
                        "confidence": matched_edge.get("confidence", 1.0),
                        "notes": matched_edge.get("notes", "")
                    })

            summary = f"Investigative path identified with {len(path_nodes) - 1} hops linking {nodes[0].label} to {nodes[-1].label} across {len(edges)} verified relationships."

            return ShortestPathResponse(
                found=True,
                hops=len(path_nodes) - 1,
                nodes=nodes,
                edges=edges,
                evidence_chain=evidence_chain,
                path_summary=summary
            )
        except nx.NetworkXNoPath:
            return ShortestPathResponse(
                found=False,
                hops=0,
                nodes=[],
                edges=[],
                evidence_chain=[],
                path_summary=f"No connected path exists between {source_id} and {target_id}."
            )

    def get_network_overview(self) -> NetworkOverviewMetrics:
        """Returns high-level graph topology metrics with plain-English definitions."""
        n_count = self.undirected_graph.number_of_nodes()
        e_count = self.undirected_graph.number_of_edges()
        density = nx.density(self.undirected_graph) if n_count > 1 else 0.0
        clustering = nx.average_clustering(self.undirected_graph) if n_count > 2 else 0.0
        components = nx.number_connected_components(self.undirected_graph)
        communities = len(self.get_community_details())

        explanations = {
            "network_density": "Measures how interconnected the network is (0 = completely sparse, 1 = every entity connected to all others).",
            "betweenness_centrality": "Identifies gatekeeper entities that lie on the shortest investigative paths between different parts of the network.",
            "degree_centrality": "Measures the sheer volume of direct links an entity possesses.",
            "pagerank": "Calculates the systemic influence of an entity based on the importance of the entities connected to it.",
            "bridge_node": "An articulation point whose removal would split or severely disconnect criminal sub-networks."
        }

        return NetworkOverviewMetrics(
            total_nodes=n_count,
            total_edges=e_count,
            network_density=round(ensity, 4),
            average_clustering=round(clustering, 4),
            connected_components=components,
            louvain_communities_count=communities,
            metric_explanations=explanations
        )

# Global Singleton Instance
graph_store = KnowledgeGraphStore()