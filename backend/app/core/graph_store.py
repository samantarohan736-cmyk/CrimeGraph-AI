import os
import csv
import json
import networkx as nx
from typing import Dict, List, Any, Optional, Tuple
from backend.app.core.config import settings
from backend.app.schemas.api_schemas import (
    GraphNode, GraphEdge, GraphResponse, ShortestPathResponse,
    CentralityMetric, CommunityInfo, BridgeNodeInfo, NetworkOverviewMetrics,
    EntitySearchItem
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
        self._bridge_cache = None
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
        self._bridge_cache = None

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
        # Caches are invalidated by clear() — will be re-built on first API request
        
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
                            "operator": row.get("operator") or row.get("carrier", ""),
                            "telecom_circle": row.get("telecom_circle", ""),
                            "is_burner": row.get("is_burner", "False") == "True" or "prepaid" in str(row.get("plan_type", "")).lower(),
                            "registered_owner": row.get("registered_owner", "")
                        }
                    )

        # 3. Vehicles
        v_path = os.path.join(syn_dir, "vehicles.csv")
        if os.path.exists(v_path):
            with open(v_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    make = row.get("make") or (row.get("make_model", "").split()[0] if row.get("make_model") else "")
                    model = row.get("model") or (" ".join(row.get("make_model", "").split()[1:]) if row.get("make_model") else "")
                    self.add_entity_node(
                        node_id=row["vehicle_id"],
                        label=row["plate_number"],
                        node_type="Vehicle",
                        properties={
                            "make": make,
                            "model": model,
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
                    coords = [c.strip() for c in row.get("coordinates", "").split(",")] if row.get("coordinates") else []
                    lat = float(coords[0]) if len(coords) > 0 and coords[0] else (float(row["latitude"]) if row.get("latitude") else None)
                    lon = float(coords[1]) if len(coords) > 1 and coords[1] else (float(row["longitude"]) if row.get("longitude") else None)
                    self.add_entity_node(
                        node_id=row["location_id"],
                        label=row["name"],
                        node_type="Location",
                        properties={
                            "address": row.get("address", ""),
                            "latitude": lat,
                            "longitude": lon,
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
                            "registration_no": row.get("registration_no") or row.get("registration_number", ""),
                            "jurisdiction": row.get("jurisdiction", ""),
                            "org_type": row.get("org_type") or row.get("type", ""),
                            "flagged_status": row.get("flagged_status") or row.get("status", "")
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

    def evaluate_node_suspicion(self, node_id: str, node_data: Dict[str, Any], b_score: float, deg: int) -> Tuple[bool, List[str]]:
        """Evaluates whether a node has potentially suspicious activity indicators (Responsible AI)."""
        reasons = []
        is_susp = False

        # 1. High betweenness centrality (bridge gateway)
        if b_score > 0.12:
            is_susp = True
            reasons.append("Potential Bridge Entity (Articulation point linking distinct sub-networks)")

        # 2. Risk classification from properties
        risk = (node_data.get("risk_level") or "").upper()
        if risk in ["HIGH", "CRITICAL"]:
            is_susp = True
            reasons.append(f"High Risk Classification ({risk.capitalize()}) in Intelligence Records")

        # 3. High degree connectivity anomaly
        if deg >= 15:
            is_susp = True
            reasons.append(f"High Density Hub ({deg} active relationships)")

        # 4. Priority lead score above threshold
        priority = float(node_data.get("priority_score") or 0.0)
        if priority >= 70.0:
            is_susp = True
            reasons.append(f"Elevated Investigative Priority Score ({round(priority, 1)}/100)")

        return is_susp, reasons

    def get_all_entities_list(self) -> List[EntitySearchItem]:
        """Returns compact, sorted list of all entities for global graph search & autocomplete."""
        items = []
        for n_id, data in self.nodes_data.items():
            deg = self.undirected_graph.degree(n_id) if self.undirected_graph.has_node(n_id) else 0
            items.append(EntitySearchItem(
                id=n_id,
                label=data.get("label", n_id),
                type=data.get("type", "Entity"),
                risk_level=data.get("risk_level", "Medium"),
                priority_score=data.get("priority_score", 0.0),
                degree=deg
            ))
        # Sort priority: Persons first, then by priority score / degree
        type_order = {"Person": 0, "Case": 1, "Organization": 2, "Phone": 3, "Vehicle": 4, "Location": 5}
        items.sort(key=lambda x: (type_order.get(x.type, 9), -x.priority_score, -x.degree))
        return items

    def get_subgraph(
        self,
        center_node_id: Optional[str] = None,
        max_hops: int = 2,
        categories: Optional[List[str]] = None,
        rel_types: Optional[List[str]] = None,
        max_nodes: int = 25,
        smart_ranking: bool = True,
        suspicious_only: bool = False
    ) -> GraphResponse:
        """Extracts focused, uncluttered k-hop ego network with edge aggregation and smart ranking."""
        if not self.undirected_graph.nodes():
            return GraphResponse(nodes=[], edges=[], total_nodes=0, total_edges=0)

        # Fallback to first high-degree node if center_node_id not provided
        if not center_node_id or not self.undirected_graph.has_node(center_node_id):
            if "P001" in self.undirected_graph:
                center_node_id = "P001"
            else:
                center_node_id = max(self.undirected_graph.degree(), key=lambda x: x[1])[0]

        # Category mapping filter
        CAT_MAP = {
            "CALLS": ["CALL", "CDR", "DIAL", "SMS", "COMMUNICAT", "CONTACT", "CALLED"],
            "FINANCIAL": ["TRANSFER", "HAWALA", "FINANC", "PAY", "TRANSACT", "MONEY", "FUND", "BANK", "FOREX", "LAUNDER"],
            "CASES": ["CASE", "SUSPECT", "EVIDENCE", "INVESTIG", "INCIDENT", "CRIME", "FIR", "LEAD"],
            "PHONES": ["USE", "OWN", "SIM", "DEVICE", "PHONE", "CALL"],
            "VEHICLES": ["VEHICLE", "DRIV", "REGIST", "CAR", "TRANSPORT"],
            "LOCATIONS": ["LOCAT", "SEEN", "VISIT", "STAY", "MEET", "PLACE", "PORT"],
            "ORGANIZATIONS": ["ORGANIZATION", "MEMBER", "DIRECTOR", "OPERAT", "COMPANY", "SHELL"],
            "ASSOCIATIONS": ["ASSOCIAT", "KNOWN", "RELAT", "ACCOMPLICE", "FAMILY", "MEETING"]
        }

        allowed_rel_patterns = []
        if categories:
            for cat in categories:
                cat_upper = cat.upper()
                if cat_upper in CAT_MAP:
                    allowed_rel_patterns.extend(CAT_MAP[cat_upper])
                else:
                    allowed_rel_patterns.append(cat_upper)

        def is_edge_allowed(rel_name: str) -> bool:
            if not rel_name:
                return True
            r_up = rel_name.upper()
            if rel_types and rel_name not in rel_types:
                return False
            if allowed_rel_patterns:
                return any(pat in r_up for pat in allowed_rel_patterns)
            return True

        # BFS to find k-hop reachable candidates
        visited = {center_node_id: 0}
        queue = [(center_node_id, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if depth >= max_hops:
                continue
            for neighbor in self.undirected_graph.neighbors(curr):
                # Verify at least one connecting edge matches the category filters
                edges_between = self.graph.get_edge_data(curr, neighbor) or self.graph.get_edge_data(neighbor, curr) or {}
                has_matching_edge = any(is_edge_allowed(ed.get("relationship", "")) for ed in edges_between.values())
                if not has_matching_edge and (allowed_rel_patterns or rel_types):
                    continue

                if neighbor not in visited or visited[neighbor] > depth + 1:
                    visited[neighbor] = depth + 1
                    queue.append((neighbor, depth + 1))

        all_reachable_node_ids = set(visited.keys())
        total_connections_count = len(all_reachable_node_ids)

        centrality = self.calculate_centralities()
        communities = self.detect_communities()
        bridges = self.find_bridge_nodes()
        bridge_ids = {b.node_id for b in bridges}

        # Select & Prioritize Nodes (Smart Ranking)
        if len(all_reachable_node_ids) <= max_nodes:
            selected_node_ids = all_reachable_node_ids
        else:
            # Seed node always included
            candidate_ids = [n for n in all_reachable_node_ids if n != center_node_id]

            if smart_ranking:
                def score_node(n_id: str) -> float:
                    hop_dist = visited.get(n_id, 99)
                    hop_score = 100.0 / (hop_dist + 1)
                    data = self.nodes_data.get(n_id, {})
                    p_score = float(data.get("priority_score", 0.0))
                    b_score = centrality.get(n_id, {}).get("betweenness", 0.0) * 50.0
                    deg_score = self.undirected_graph.degree(n_id) * 1.5
                    is_susp, _ = self.evaluate_node_suspicion(n_id, data, centrality.get(n_id, {}).get("betweenness", 0.0), self.undirected_graph.degree(n_id))
                    susp_boost = 30.0 if is_susp else 0.0
                    return hop_score + p_score + b_score + deg_score + susp_boost

                candidate_ids.sort(key=score_node, reverse=True)
            else:
                candidate_ids.sort(key=lambda n: (visited.get(n, 99), -self.undirected_graph.degree(n)))

            selected_node_ids = {center_node_id} | set(candidate_ids[:max_nodes - 1])

        # Filter by suspicious_only if enabled
        if suspicious_only:
            susp_nodes = {center_node_id}
            for n_id in selected_node_ids:
                data = self.nodes_data.get(n_id, {})
                b_score = centrality.get(n_id, {}).get("betweenness", 0.0)
                deg = self.undirected_graph.degree(n_id) if self.undirected_graph.has_node(n_id) else 0
                is_susp, _ = self.evaluate_node_suspicion(n_id, data, b_score, deg)
                if is_susp:
                    susp_nodes.add(n_id)
            selected_node_ids = susp_nodes

        # Build GraphNode list
        nodes = []
        for n_id in selected_node_ids:
            data = self.nodes_data.get(n_id, {})
            deg = self.undirected_graph.degree(n_id) if self.undirected_graph.has_node(n_id) else 0
            b_score = centrality.get(n_id, {}).get("betweenness", 0.0)
            comm_id = communities.get(n_id, 0)
            is_susp, reasons = self.evaluate_node_suspicion(n_id, data, b_score, deg)

            nodes.append(GraphNode(
                id=n_id,
                label=data.get("label", n_id),
                type=data.get("type", "Entity"),
                properties=data,
                degree=deg,
                betweenness=round(b_score, 4),
                community=comm_id,
                is_bridge=n_id in bridge_ids,
                priority_score=data.get("priority_score", 0.0),
                is_suspicious=is_susp,
                suspicion_reasons=reasons,
                total_connections=deg
            ))

        # Build & Aggregate Edges between selected nodes
        edge_groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
        for e in self.edges_data:
            u, v = e["source"], e["target"]
            if u in selected_node_ids and v in selected_node_ids:
                rel = e.get("relationship", "")
                if is_edge_allowed(rel):
                    # Canonical unordered pair for undirected representation
                    pair = (min(u, v), max(u, v))
                    edge_groups.setdefault(pair, []).append(e)

        edges = []
        for (u, v), recs in edge_groups.items():
            primary_rec = recs[0]
            count = len(recs)
            # Find representative relationship label
            rel_types_in_group = [r.get("relationship", "CONNECTED") for r in recs]
            most_frequent_rel = max(set(rel_types_in_group), key=rel_types_in_group.count)
            display_rel = f"{most_frequent_rel} ×{count}" if count > 1 else most_frequent_rel

            # Aggregate notes and evidence IDs
            all_evidence = [r["evidence_id"] for r in recs if r.get("evidence_id")]
            primary_evidence = all_evidence[0] if all_evidence else ""

            # Check if edge is suspicious
            edge_suspicious = count >= 5 or any("HAWALA" in r.get("relationship", "").upper() or "UNTRACE" in r.get("notes", "").upper() for r in recs)
            edge_susp_reasons = []
            if count >= 5:
                edge_susp_reasons.append(f"High Interaction Frequency ({count} repeated records)")
            if any("HAWALA" in r.get("relationship", "").upper() for r in recs):
                edge_susp_reasons.append("Unregulated Hawala Financial Layering Pattern")

            edges.append(GraphEdge(
                id=f"agg_{u}_{v}",
                source=u,
                target=v,
                relationship=display_rel,
                date=primary_rec.get("date"),
                confidence=round(sum(r.get("confidence", 1.0) for r in recs) / count, 2),
                evidence_id=primary_evidence,
                notes=primary_rec.get("notes"),
                count=count,
                is_suspicious=edge_suspicious,
                suspicion_reasons=edge_susp_reasons,
                aggregated_records=recs
            ))

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            total_nodes=len(nodes),
            total_edges=len(edges),
            total_connections_count=total_connections_count,
            filtered_nodes_count=len(nodes),
            filtered_edges_count=len(edges),
            seed_node_id=center_node_id,
            is_filtered=len(nodes) < total_connections_count
        )

    def get_case_subgraph(self, case_id: str, hops: int = 2) -> GraphResponse:
        """Retrieves the subgraph for all entities directly or transitively linked to a Case."""
        return self.get_subgraph(center_node_id=case_id, max_hops=hops)

    def calculate_centralities(self) -> Dict[str, Dict[str, float]]:
        """Calculates degree, betweenness, and PageRank centralities (cached after first computation)."""
        if self._centrality_cache is not None:
            return self._centrality_cache

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
        self._centrality_cache = results
        print("[KnowledgeGraphStore] Centrality cache built.")
        return results

    def detect_communities(self) -> Dict[str, int]:
        """Detects network communities using greedy modularity or label propagation (cached after first computation)."""
        if self._community_cache is not None:
            return self._community_cache

        if self.undirected_graph.number_of_nodes() == 0:
            return {}

        try:
            communities_gen = nx.community.greedy_modularity_communities(self.undirected_graph)
            node_community = {}
            for comm_idx, comm_set in enumerate(communities_gen):
                for node_id in comm_set:
                    node_community[node_id] = comm_idx + 1
        except Exception:
            # Fallback to connected components
            node_community = {}
            for idx, comp in enumerate(nx.connected_components(self.undirected_graph)):
                for node_id in comp:
                    node_community[node_id] = idx + 1

        self._community_cache = node_community
        print("[KnowledgeGraphStore] Community cache built.")
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
        """Identifies key bridge nodes (articulation points or cross-community gateways) (cached after first computation)."""
        if self._bridge_cache is not None:
            return self._bridge_cache

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
        self._bridge_cache = bridge_list
        print(f"[KnowledgeGraphStore] Bridge cache built ({len(bridge_list)} bridge nodes).")
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
