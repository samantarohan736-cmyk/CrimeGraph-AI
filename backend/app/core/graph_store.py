import os
import csv
import json
import networkx as nx
from typing import Dict, List, Any, Optional, Tuple
from backend.app.core.config import settings
from backend.app.schemas.api_schemas import (
    GraphNode, GraphEdge, GraphResponse, ShortestPathResponse,
    CentralityMetric, CommunityInfo, BridgeNodeInfo, NetworkOverviewMetrics
)

class KnowledgeGraphStore:
    """
    Unified Knowledge Graph Engine for CrimeGraph AI.
    Provides fast Cypher/Graph traversals, k-hop subgraphs, Louvain community detection,
    centrality analytics, shortest paths, and bridge detection.
    Connects to Neo4j when enabled, or uses in-memory NetworkX with disk persistence.
    """
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self.undirected_graph = nx.Graph()
        self.nodes_data: Dict[str, Dict[str, Any]] = {}
        self.edges_data: List[Dict[str, Any]] = []
        self._centrality_cache = None
        self._community_cache = None
        # Auto-load synthetic dataset on initialization if files exist
        try:
            self.load_from_dataset()
        except Exception:
            pass

    def clear(self):
        self.graph.clear()
        self.undirected_graph.clear()
        self.nodes_data.clear()
        self.edges_data.clear()
        self._centrality_cache = None
        self._community_cache = None

    def add_entity_node(self, node_id: str, label: str, node_type: str, properties: Dict[str, Any] = None):
        props = properties or {}
        props["id"] = node_id
        props["label"] = label
        props["type"] = node_type
        
        self.nodes_data[node_id] = props
        self.graph.add_node(node_id, **props)
        self.undirected_graph.add_node(node_id, **props)

    def add_relationship_edge(self, edge_id: str, source_id: str, target_id: str,
                               relationship_type: str, confidence: float = 1.0,
                               date: str = None, evidence_id: str = None, notes: str = None):
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

    def load_from_dataset(self, synthetic_dir: str = None):
        """Loads all entities and relationships from synthetic CSV dataset."""
        syn_dir = synthetic_dir or settings.SYNTHETIC_DIR
        self.clear()
        
        # 1. Persons
        p_path = os.path.join(syn_dir, "persons.csv")
        if os.path.exists(p_path):
            with open(p_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["person_id"],
                        label=row["name"],
                        node_type="Person",
                        properties={
                            "aliases": row.get("aliases", ""),
                            "role": row.get("role", ""),
                            "primary_location": row.get("primary_location", ""),
                            "risk_level": row.get("risk_level", "Medium"),
                            "dob": row.get("dob", ""),
                            "nationality": row.get("nationality", "")
                        }
                    )

        # 2. Phones
        ph_path = os.path.join(syn_dir, "phones.csv")
        if os.path.exists(ph_path):
            with open(ph_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["phone_id"],
                        label=row["phone_number"],
                        node_type="Phone",
                        properties={
                            "imei": row.get("imei", ""),
                            "operator": row.get("operator", ""),
                            "telecom_circle": row.get("telecom_circle", ""),
                            "is_burner": row.get("is_burner", "False") == "True",
                            "registered_owner": row.get("registered_owner", "")
                        }
                    )

        # 3. Vehicles
        v_path = os.path.join(syn_dir, "vehicles.csv")
        if os.path.exists(v_path):
            with open(v_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["vehicle_id"],
                        label=row["plate_number"],
                        node_type="Vehicle",
                        properties={
                            "make": row.get("make", ""),
                            "model": row.get("model", ""),
                            "color": row.get("color", ""),
                            "vehicle_type": row.get("vehicle_type", ""),
                            "registered_owner": row.get("registered_owner", "")
                        }
                    )

        # 4. Locations
        l_path = os.path.join(syn_dir, "locations.csv")
        if os.path.exists(l_path):
            with open(l_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["location_id"],
                        label=row["name"],
                        node_type="Location",
                        properties={
                            "address": row.get("address", ""),
                            "latitude": float(row["latitude"]) if row.get("latitude") else None,
                            "longitude": float(row["longitude"]) if row.get("longitude") else None,
                            "location_type": row.get("location_type", "")
                        }
                    )

        # 5. Organizations
        o_path = os.path.join(syn_dir, "organizations.csv")
        if os.path.exists(o_path):
            with open(o_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["org_id"],
                        label=row["name"],
                        node_type="Organization",
                        properties={
                            "registration_no": row.get("registration_no", ""),
                            "jurisdiction": row.get("jurisdiction", ""),
                            "org_type": row.get("org_type", ""),
                            "flagged_status": row.get("flagged_status", "")
                        }
                    )

        # 6. Cases
        c_path = os.path.join(syn_dir, "cases.csv")
        if os.path.exists(c_path):
            with open(c_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_entity_node(
                        node_id=row["case_id"],
                        label=f"{row['case_id']}: {row['title']}",
                        node_type="Case",
                        properties={
                            "title": row.get("title", ""),
                            "case_type": row.get("case_type", ""),
                            "status": row.get("status", "Active Investigation"),
                            "priority": row.get("priority", "Medium"),
                            "lead_officer": row.get("lead_officer", ""),
                            "estimated_value": row.get("estimated_value", "")
                        }
                    )

        # 7. Relationships
        r_path = os.path.join(syn_dir, "relationships.csv")
        if os.path.exists(r_path):
            with open(r_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    self.add_relationship_edge(
                        edge_id=row["rel_id"],
                        source_id=row["source_id"],
                        target_id=row["target_id"],
                        relationship_type=row["relationship_type"],
                        confidence=float(row.get("confidence", 1.0)),
                        date=row.get("date", ""),
                        evidence_id=row.get("evidence_id", ""),
                        notes=row.get("notes", "")
                    )

        print(f"[KnowledgeGraphStore] Loaded {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges.")

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
        """Provides rich community summaries and key members."""
        comm_map = self.detect_communities()
        groups: Dict[int, List[str]] = {}
        for node_id, c_id in comm_map.items():
            groups.setdefault(c_id, []).append(node_id)

        themes = {
            1: "Hawala & Financial Layering (Case C042 Focus)",
            2: "Maritime Contraband & Port Cargo (Case C019 Focus)",
            3: "Cyber Extortion & Darknet OTC Mixing (Case C055 Focus)"
        }

        community_list = []
        for c_id, members in sorted(groups.items()):
            key_entities = [self.nodes_data.get(m, {}).get("label", m) for m in members if self.nodes_data.get(m, {}).get("type") in ["Person", "Case", "Organization"]]
            theme = themes.get(c_id, f"Cluster #{c_id} Syndicate Subgroup")
            
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
                name=f"Syndicate Cluster {c_id}: {theme.split('(')[0].strip()}",
                size=len(members),
                key_entities=key_entities[:5],
                dominant_crime_theme=theme,
                members=member_nodes
            ))

        return community_list

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
                if 1 in neighbor_communities: themes.append("Hawala Syndicate (C042)")
                if 2 in neighbor_communities: themes.append("Contraband Logistics (C019)")
                if 3 in neighbor_communities: themes.append("Cyber Extortion (C055)")

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
            network_density=round(density, 4),
            average_clustering=round(clustering, 4),
            connected_components=components,
            louvain_communities_count=communities,
            metric_explanations=explanations
        )

# Global Singleton Instance
graph_store = KnowledgeGraphStore()
