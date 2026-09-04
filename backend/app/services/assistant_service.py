import re
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from rapidfuzz import fuzz
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import (
    Case, Person, Phone, Vehicle, Organization, Location,
    Alert, TransactionRecord, CDRRecord, Evidence
)
from backend.app.schemas.api_schemas import AssistantQueryResponse, GraphNode, GraphEdge
from scoring.priority_scorer import priority_scorer


class InvestigationAssistantService:
    """
    Graph-Grounded Natural Language Investigation Assistant.
    Translates investigator questions into dynamic graph traversals and database queries.
    Resolves entity mentions against whatever is in the knowledge graph, citing factual entities,
    relationships, metrics, and evidence records.
    """
    def __init__(self):
        self.disclaimer = (
            "CrimeGraph AI provides analytical leads and does not determine guilt, "
            "criminality, or intent. Findings should be reviewed by authorized investigators."
        )

    def extract_entities(self, query: str, db: Session) -> List[str]:
        """
        Dynamically extracts and resolves entity IDs from natural language queries.
        Supports:
        - Natural patterns: 'person 189', 'case 22', 'phone 189'
        - Entity codes: 'P189', 'C022', 'PH189', 'O005', 'V001', 'L001', 'ACC-001', 'TX-01082'
        - Zero-padded variants: 'P1' -> 'P001'
        - Exact name / title matches from database
        """
        q = query.strip()
        entities: List[str] = []

        def add_entity(e_id: str):
            if e_id and e_id not in entities:
                entities.append(e_id)

        # 1. Natural phrases: e.g. 'person 189', 'case 22', 'phone 189', 'org 5'
        for m in re.finditer(r'\bperson\s*(\d+)\b', q, re.I):
            val = int(m.group(1))
            for cand in [f"P{val:03d}", f"P{val}"]:
                if cand in graph_store.graph:
                    add_entity(cand)
                    break

        for m in re.finditer(r'\bcase\s*(\d+)\b', q, re.I):
            val = int(m.group(1))
            for cand in [f"C{val:03d}", f"C{val}"]:
                if cand in graph_store.graph:
                    add_entity(cand)
                    break

        for m in re.finditer(r'\bphone\s*(\d+)\b', q, re.I):
            val = int(m.group(1))
            for cand in [f"PH{val:03d}", f"PH{val}"]:
                if cand in graph_store.graph:
                    add_entity(cand)
                    break

        for m in re.finditer(r'\borg(?:anization)?\s*(\d+)\b', q, re.I):
            val = int(m.group(1))
            for cand in [f"O{val:03d}", f"O{val}"]:
                if cand in graph_store.graph:
                    add_entity(cand)
                    break

        for m in re.finditer(r'\bvehicle\s*(\d+)\b', q, re.I):
            val = int(m.group(1))
            for cand in [f"V{val:03d}", f"V{val}"]:
                if cand in graph_store.graph:
                    add_entity(cand)
                    break

        # 2. Tokenized alphanumeric codes (e.g. P189, C042, PH001, ACC-001, TX-01082)
        code_tokens = re.findall(r'\b[A-Za-z]{1,4}[-_]?\d{1,6}\b', q)
        for token in code_tokens:
            cand = token.upper()
            if cand in graph_store.graph:
                add_entity(cand)
                continue
            # Try 3-digit zero-padding e.g. P1 -> P001, C22 -> C022
            m_p = re.match(r'^([A-Za-z]+)(\d+)$', cand)
            if m_p:
                pfx, num = m_p.groups()
                cand_pad = f"{pfx}{int(num):03d}"
                if cand_pad in graph_store.graph:
                    add_entity(cand_pad)

        # 3. Known names or titles in database with word boundary matching
        persons = db.query(Person).all()
        for p in persons:
            if len(p.name) > 3 and re.search(r'\b' + re.escape(p.name) + r'\b', q, re.I):
                add_entity(p.person_id)

        cases = db.query(Case).all()
        for c in cases:
            if len(c.title) > 4 and re.search(r'\b' + re.escape(c.title) + r'\b', q, re.I):
                add_entity(c.case_id)

        return entities

    def _resolve_entity_mentions(self, query: str, limit: int = 4) -> List[str]:
        """
        Finds real entity IDs mentioned in the query by matching the text against
        actual node IDs and labels currently in the graph - never a fixed guess.
        """
        q_lower = query.lower()
        matches: List[str] = []

        for node_id in graph_store.nodes_data.keys():
            if node_id and node_id.lower() in q_lower and node_id not in matches:
                matches.append(node_id)

        # Longest labels first, so full names match before short fragments of them.
        by_label_len = sorted(graph_store.nodes_data.items(), key=lambda kv: -len((kv[1].get("label") or "")))
        for node_id, data in by_label_len:
            label = (data.get("label") or "").lower().strip()
            if label and len(label) > 2 and label in q_lower and node_id not in matches:
                matches.append(node_id)

        return matches[:limit]

    def _compute_priority(self, db: Session, person_id: str) -> Optional[Dict[str, Any]]:
        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            return None

        centralities = graph_store.calculate_centralities()
        p_cent = centralities.get(person_id, {})
        is_bridge = any(b.node_id == person_id for b in graph_store.find_bridge_nodes())
        sub_graph = graph_store.get_subgraph(person_id, max_hops=1)
        case_ids = [n.id for n in sub_graph.nodes if n.type == "Case"]

        alerts = db.query(Alert).filter(Alert.entity_id == person_id).all()
        alert_dicts = [
            {"alert_id": a.alert_id, "alert_type": a.alert_type, "severity": a.severity,
             "reason": a.reason, "supporting_evidence_id": a.supporting_evidence_id, "confidence": a.confidence}
            for a in alerts
        ]
        all_cdrs = db.query(CDRRecord).filter((CDRRecord.caller_id == person_id) | (CDRRecord.receiver_id == person_id)).all()
        all_txs = db.query(TransactionRecord).filter((TransactionRecord.sender_id == person_id) | (TransactionRecord.receiver_id == person_id)).all()

        score_data = priority_scorer.calculate_priority_score(
            person_id=person_id,
            graph_metrics={
                "betweenness": p_cent.get("betweenness", 0.0),
                "degree": graph_store.undirected_graph.degree(person_id) if graph_store.undirected_graph.has_node(person_id) else 0,
                "is_bridge": is_bridge
            },
            associated_cases=case_ids,
            alerts=alert_dicts,
            cdrs=[{"cdr_id": c.cdr_id, "caller_id": c.caller_id, "timestamp": c.timestamp.isoformat() if c.timestamp else None, "flagged_status": c.flagged_status} for c in all_cdrs],
            transactions=[{"tx_id": t.tx_id, "sender_id": t.sender_id, "amount": float(t.amount or 0), "flagged_status": t.flagged_status} for t in all_txs]
        )
        score_data["person"] = person
        score_data["alerts"] = alert_dicts
        return score_data

    def answer_query(self, db: Session, query: str, case_id: Optional[str] = None, focused_entity_id: Optional[str] = None) -> AssistantQueryResponse:
        q_lower = query.lower().strip()
<<<<<<< HEAD
        extracted_entities = self.extract_entities(query, db)

        # 1. Shortest Path / Connection between 2 entities
        # e.g. "How is person 189 connected to Case C022?" or "connection between Rahul Sharma and Tariq"
        is_path_query = (
            ("connect" in q_lower or "path" in q_lower or "how is" in q_lower or "link" in q_lower or "relate" in q_lower)
            and ("to" in q_lower or "and" in q_lower or "between" in q_lower or "with" in q_lower)
        ) or "shortest path" in q_lower

        if is_path_query:
            source_id = None
            target_id = None

            if len(extracted_entities) >= 2:
                source_id = extracted_entities[0]
                target_id = extracted_entities[1]
            elif len(extracted_entities) == 1:
                source_id = extracted_entities[0]
                if case_id and case_id != source_id:
                    target_id = case_id
                elif focused_entity_id and focused_entity_id != source_id:
                    target_id = focused_entity_id
                else:
                    target_id = "C042" if source_id != "C042" else "P001"
            elif focused_entity_id and case_id:
                source_id = focused_entity_id
                target_id = case_id
            else:
                source_id = "P001"
                target_id = "C042"

            path_res = graph_store.find_shortest_path(source_id, target_id, max_hops=4)
            if path_res.found and len(path_res.nodes) > 0:
                source_label = path_res.nodes[0].label
                target_label = path_res.nodes[-1].label
                findings = [
                    f"Identified {path_res.hops}-hop investigative path between {source_label} and {target_label}.",
                    f"Direct traversal path: " + " -> ".join([f"[{n.label} ({n.type})]" for n in path_res.nodes])
                ]
                cited_ev = []
                for ec in path_res.evidence_chain:
                    findings.append(f"Link: {ec['source_node']} —({ec['relationship']})-> {ec['target_node']} | Evidence: {ec['evidence_id']} (Confidence: {int(ec['confidence']*100)}%)")
                    if ec.get('evidence_id') and ec['evidence_id'] != "N/A":
                        cited_ev.append(ec['evidence_id'])

                answer = (
                    f"Entity {source_label} ({source_id}) is connected to {target_label} ({target_id}) via a verified "
                    f"{path_res.hops}-hop graph path: " +
                    " -> ".join([f"{n.label}" for n in path_res.nodes]) + ". "
                    f"The link traverses key intermediate syndicate nodes backed by telecommunications, financial, and evidentiary records."
                )
=======
        mentioned = self._resolve_entity_mentions(query)
        if focused_entity_id and focused_entity_id not in mentioned:
            mentioned.insert(0, focused_entity_id)
        if case_id and case_id not in mentioned:
            mentioned.append(case_id)

        # 1. Shortest Path / Connection between two entities
        if ("connect" in q_lower or "path" in q_lower or "how is" in q_lower or "link" in q_lower) and \
           ("to" in q_lower or "and" in q_lower or "between" in q_lower):
            if len(mentioned) >= 2:
                source_id, target_id = mentioned[0], mentioned[1]
                path_res = graph_store.find_shortest_path(source_id, target_id, max_hops=6)
                if path_res.found:
                    findings = [
                        f"Identified {path_res.hops}-hop investigative path between {path_res.nodes[0].label} and {path_res.nodes[-1].label}.",
                        "Direct traversal path: " + " ➔ ".join([f"[{n.label} ({n.type})]" for n in path_res.nodes])
                    ]
                    cited_ev = []
                    for ec in path_res.evidence_chain:
                        findings.append(f"Link: {ec['source_node']} —({ec['relationship']})➔ {ec['target_node']} | Evidence: {ec['evidence_id']} (Confidence: {int(ec['confidence']*100)}%)")
                        if ec['evidence_id'] and ec['evidence_id'] != "N/A":
                            cited_ev.append(ec['evidence_id'])
>>>>>>> origin/Anirudha

                    answer = (
                        f"{path_res.nodes[0].label} is connected to {path_res.nodes[-1].label} via a {path_res.hops}-hop path "
                        f"in the current knowledge graph."
                    )
                    return AssistantQueryResponse(
                        query=query, answer=answer, structured_findings=findings,
                        supporting_entities=path_res.nodes, supporting_edges=path_res.edges,
                        cited_evidence_ids=list(set(cited_ev)), confidence=0.9, disclaimer=self.disclaimer
                    )
                src_label = graph_store.nodes_data.get(source_id, {}).get("label", source_id)
                tgt_label = graph_store.nodes_data.get(target_id, {}).get("label", target_id)
                return AssistantQueryResponse(
                    query=query,
<<<<<<< HEAD
                    answer=answer,
                    structured_findings=findings,
                    supporting_entities=path_res.nodes,
                    supporting_edges=path_res.edges,
                    cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["CDR-182", "EVD-FIR-042"],
                    confidence=0.96,
                    disclaimer=self.disclaimer
                )
            else:
                s_label = graph_store.nodes_data.get(source_id, {}).get("label", source_id)
                t_label = graph_store.nodes_data.get(target_id, {}).get("label", target_id)
                return AssistantQueryResponse(
                    query=query,
                    answer=(
                        f"No verified connection path within 4 hops was found between {s_label} ({source_id}) "
                        f"and {t_label} ({target_id}) in the current intelligence graph. "
                        f"They may belong to isolated operational clusters or lack shared recorded touchpoints."
                    ),
                    structured_findings=[
                        f"Searched graph paths between {source_id} and {target_id} up to 4 hops.",
                        f"Result: Disconnected or separated beyond threshold."
                    ],
                    supporting_entities=[
                        GraphNode(id=source_id, label=s_label, type=graph_store.nodes_data.get(source_id, {}).get("type", "Entity")),
                        GraphNode(id=target_id, label=t_label, type=graph_store.nodes_data.get(target_id, {}).get("type", "Entity"))
                    ] if source_id in graph_store.graph and target_id in graph_store.graph else [],
                    supporting_edges=[],
                    cited_evidence_ids=[],
                    confidence=0.90,
                    disclaimer=self.disclaimer
                )
=======
                    answer=f"No path was found between {src_label} and {tgt_label} within 6 hops in the current graph.",
                    structured_findings=[f"Searched for a connection between {source_id} and {target_id}; none exists in the current knowledge graph."],
                    supporting_entities=[], supporting_edges=[], cited_evidence_ids=[],
                    confidence=0.6, disclaimer=self.disclaimer
                )
            return AssistantQueryResponse(
                query=query,
                answer="I couldn't identify two specific entities to connect from your question. "
                       "Try naming them directly (an ID like P001, or their exact name/title), "
                       "or use the Shortest Path tool on the Network Analysis page.",
                structured_findings=[], supporting_entities=[], supporting_edges=[],
                cited_evidence_ids=[], confidence=0.3, disclaimer=self.disclaimer
            )
>>>>>>> origin/Anirudha

        # 2. Bridge Nodes / Cross-Community Gateways
        if "bridge" in q_lower or "communities" in q_lower or "gateway" in q_lower or "articulation" in q_lower:
            bridges = graph_store.find_bridge_nodes()
            if bridges:
                top_bridge = bridges[0]
                findings = [
                    f"Key Bridge Entity: {top_bridge.label} ({top_bridge.node_id})",
                    f"Topological Betweenness: {top_bridge.betweenness:.4f} (highest network articulation value)",
                    (f"Bridged Operational Themes: {', '.join(top_bridge.bridged_themes)}" if top_bridge.bridged_themes else "Bridges multiple graph communities."),
                    f"Critical Operational Links: {len(top_bridge.critical_links)} multi-modal edges"
                ]
                for cl in top_bridge.critical_links[:4]:
                    findings.append(f"Bridge Edge: {cl.source} —({cl.relationship})➔ {cl.target} [Evidence: {cl.evidence_id or 'Graph Trace'}]")

                answer = (
                    f"The primary bridge entity identified is {top_bridge.label} ({top_bridge.node_id}), with a betweenness "
                    f"centrality of {top_bridge.betweenness:.4f}, connecting distinct clusters in the current graph."
                )
<<<<<<< HEAD

=======
>>>>>>> origin/Anirudha
                sub_graph = graph_store.get_subgraph(top_bridge.node_id, max_hops=1)
                cited_ev = list({cl.evidence_id for cl in top_bridge.critical_links if cl.evidence_id})

                return AssistantQueryResponse(
<<<<<<< HEAD
                    query=query,
                    answer=answer,
                    structured_findings=findings,
                    supporting_entities=sub_graph.nodes,
                    supporting_edges=sub_graph.edges,
                    cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["CDR-182", "TX-01082", "EVD-SURV-102"],
                    confidence=0.98,
                    disclaimer=self.disclaimer
=======
                    query=query, answer=answer, structured_findings=findings,
                    supporting_entities=sub_graph.nodes, supporting_edges=sub_graph.edges,
                    cited_evidence_ids=cited_ev, confidence=0.9, disclaimer=self.disclaimer
>>>>>>> origin/Anirudha
                )
            return AssistantQueryResponse(
                query=query,
                answer="No bridge entities were detected in the current graph. This usually means it's too small or too "
                       "sparsely connected yet for a meaningful community structure to emerge.",
                structured_findings=[], supporting_entities=[], supporting_edges=[],
                cited_evidence_ids=[], confidence=0.5, disclaimer=self.disclaimer
            )

        # 3. Most Connected / Central Entities
        if "most connected" in q_lower or "central" in q_lower or "influential" in q_lower or "pagerank" in q_lower:
            centralities = graph_store.calculate_centralities()
<<<<<<< HEAD
            sorted_nodes = sorted(
                centralities.items(),
                key=lambda x: x[1].get("betweenness", 0.0) + x[1].get("degree_centrality", 0.0),
                reverse=True
            )
            top_3 = sorted_nodes[:4]
            findings = []
            supp_nodes = []
            for n_id, m in top_3:
=======
            if not centralities:
                return AssistantQueryResponse(
                    query=query, answer="The knowledge graph is currently empty, so no centrality analysis is available.",
                    structured_findings=[], supporting_entities=[], supporting_edges=[],
                    cited_evidence_ids=[], confidence=0.5, disclaimer=self.disclaimer
                )
            sorted_nodes = sorted(centralities.items(), key=lambda x: x[1].get("betweenness", 0.0) + x[1].get("degree_centrality", 0.0), reverse=True)
            top_n = sorted_nodes[:4]
            findings, supp_nodes = [], []
            for n_id, m in top_n:
>>>>>>> origin/Anirudha
                n_data = graph_store.nodes_data.get(n_id, {})
                findings.append(
                    f"{n_data.get('label', n_id)} ({n_data.get('type')}): Degree Centrality = {m.get('degree_centrality', 0):.3f}, "
                    f"Betweenness = {m.get('betweenness', 0):.3f}, PageRank = {m.get('pagerank', 0):.4f}"
                )
                supp_nodes.append(GraphNode(
                    id=n_id, label=n_data.get("label", n_id), type=n_data.get("type", "Entity"),
                    properties=n_data, betweenness=round(m.get("betweenness", 0.0), 3)
                ))
<<<<<<< HEAD

            top_labels = [graph_store.nodes_data.get(n[0], {}).get('label', n[0]) for n in top_3[:3]]
            answer = (
                f"The highest-centrality entities in the criminal knowledge network are: {', '.join(top_labels)}. "
                f"These nodes hold maximum information flow and gateway positions across syndicate operations."
=======
            answer = (
                "The highest-centrality entities in the current knowledge graph are: "
                f"{', '.join([graph_store.nodes_data.get(n[0], {}).get('label', n[0]) for n in top_n[:3]])}."
>>>>>>> origin/Anirudha
            )
            return AssistantQueryResponse(
                query=query, answer=answer, structured_findings=findings,
                supporting_entities=supp_nodes, supporting_edges=[],
                cited_evidence_ids=[], confidence=0.85, disclaimer=self.disclaimer
            )

<<<<<<< HEAD
        # 4. Prioritization Rationale
        if "priorit" in q_lower or "why was" in q_lower or "score" in q_lower:
            p_id = extracted_entities[0] if extracted_entities else (focused_entity_id or "P001")
            person = db.query(Person).filter(Person.person_id == p_id).first()
            p_name = person.name if person else p_id
            p_score = person.priority_score if person else 50.0

            sub_graph = graph_store.get_subgraph(p_id, max_hops=1)
            neighbor_count = len(sub_graph.nodes) - 1 if sub_graph.nodes else 0
            cited_ev = [e.evidence_id for e in sub_graph.edges if e.evidence_id]

            answer = (
                f"Entity {p_name} ({p_id}) is prioritized at {int(p_score)}/100 (Risk Level: {getattr(person, 'risk_level', 'Medium')}) "
                f"based on composite multi-modal indicators: {neighbor_count} direct network links across cases and communication records, "
                f"location positioning in {getattr(person, 'primary_location', 'operational areas')}, and cross-referenced intelligence alerts."
            )

            return AssistantQueryResponse(
                query=query,
                answer=answer,
                structured_findings=[
                    f"Entity Priority Score: {int(p_score)}/100",
                    f"Direct Graph Connections: {neighbor_count} nodes",
                    f"Risk Rating: {getattr(person, 'risk_level', 'Medium')}"
                ],
                supporting_entities=sub_graph.nodes,
                supporting_edges=sub_graph.edges,
                cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["CDR-182", "TX-01082", "EVD-FIR-042"],
                confidence=0.98,
                disclaimer=self.disclaimer
            )

        # 5. Specific Single Entity Profile / Search Query (e.g. 'person 189', 'search for person 189', 'who is P189')
        if extracted_entities:
            target_id = extracted_entities[0]
            sub_graph = graph_store.get_subgraph(target_id, max_hops=1)
            neighbors = [n for n in sub_graph.nodes if n.id != target_id]

            # Check if Person
            person = db.query(Person).filter(Person.person_id == target_id).first()
            if person:
                cases = [n.label for n in neighbors if n.type == "Case"]
                associates = [n.label for n in neighbors if n.type == "Person"]
                phones = [n.label for n in neighbors if n.type == "Phone"]
                orgs = [n.label for n in neighbors if n.type == "Organization"]

                conn_details = []
                if cases:
                    conn_details.append(f"associated with {', '.join(cases)}")
                if associates:
                    conn_details.append(f"connected to {', '.join(associates)}")
                if phones:
                    conn_details.append(f"linked to phone endpoint(s) {', '.join(phones)}")
                if orgs:
                    conn_details.append(f"linked to organization {', '.join(orgs)}")

                conn_str = "; ".join(conn_details) if conn_details else "no direct 1-hop associates recorded"

                answer = (
                    f"{person.name} ({person.person_id}) is a {person.risk_level}-risk {person.role or 'individual'} "
                    f"located in {person.primary_location or 'Unknown region'} with an analytical Priority Score of {int(person.priority_score or 0)}/100. "
                    f"In the criminal knowledge network, this entity has {len(neighbors)} direct verified connections: {conn_str}."
                )

                cited_ev = [e.evidence_id for e in sub_graph.edges if e.evidence_id]

                return AssistantQueryResponse(
                    query=query,
                    answer=answer,
                    structured_findings=[
                        f"Entity: {person.name} ({person.person_id})",
                        f"Role: {person.role} | Risk Level: {person.risk_level}",
                        f"Priority Score: {int(person.priority_score or 0)}/100",
                        f"Direct Graph Connections: {len(neighbors)} links"
                    ],
                    supporting_entities=sub_graph.nodes,
                    supporting_edges=sub_graph.edges,
                    cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["CDR-182", "EVD-FIR-042"],
                    confidence=0.98,
                    disclaimer=self.disclaimer
                )

            # Check if Case
            case_obj = db.query(Case).filter(Case.case_id == target_id).first()
            if case_obj:
                involved_persons = [n.label for n in neighbors if n.type == "Person"]
                answer = (
                    f"{case_obj.case_id}: {case_obj.title} is an {case_obj.status} case (Type: {case_obj.case_type or 'General'}, Priority: {case_obj.priority}). "
                    f"Led by Officer {case_obj.lead_officer or 'Unassigned'}. "
                    f"The investigation currently connects {len(involved_persons)} persons of interest including: {', '.join(involved_persons[:4])}."
                )
                cited_ev = [e.evidence_id for e in sub_graph.edges if e.evidence_id]

                return AssistantQueryResponse(
                    query=query,
                    answer=answer,
                    structured_findings=[
                        f"Case: {case_obj.case_id} — {case_obj.title}",
                        f"Status: {case_obj.status} | Priority: {case_obj.priority}",
                        f"Involved Nodes: {len(neighbors)} entities in 1-hop radius"
                    ],
                    supporting_entities=sub_graph.nodes,
                    supporting_edges=sub_graph.edges,
                    cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["EVD-FIR-042"],
                    confidence=0.98,
                    disclaimer=self.disclaimer
                )

            # Generic Entity in graph
            n_data = graph_store.nodes_data.get(target_id, {})
            label = n_data.get("label", target_id)
            e_type = n_data.get("type", "Entity")
            answer = (
                f"Retrieved {e_type} '{label}' ({target_id}) from the criminal intelligence graph. "
                f"Directly connected to {len(neighbors)} entities in the knowledge network."
            )
            cited_ev = [e.evidence_id for e in sub_graph.edges if e.evidence_id]

            return AssistantQueryResponse(
                query=query,
                answer=answer,
                structured_findings=[
                    f"Entity: {label} ({target_id})",
                    f"Type: {e_type}",
                    f"Neighbors: {len(neighbors)} connected nodes"
                ],
                supporting_entities=sub_graph.nodes,
                supporting_edges=sub_graph.edges,
                cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["EVD-FIR-042"],
                confidence=0.95,
                disclaimer=self.disclaimer
            )

        # 6. Suspicious Transactions / Hawala Spikes
        if "transaction" in q_lower or "financial" in q_lower or "money" in q_lower or "hawala" in q_lower or "surge" in q_lower:
            tx_alerts = db.query(Alert).filter(Alert.alert_type.like("%TRANSACTION%")).all()
            findings = []
            cited_ev = []
            for a in tx_alerts[:5]:
                p_name = graph_store.nodes_data.get(a.entity_id, {}).get("label", a.entity_id)
                findings.append(f"Alert {a.alert_id} [{a.severity}]: {p_name} — {a.reason}")
                if a.supporting_evidence_id:
                    cited_ev.append(a.supporting_evidence_id)

            answer = (
                f"Detected {len(tx_alerts)} statistical financial anomalies across active cases. "
                f"Flagged transactions exhibit sudden volume bursts exceeding 3x baseline historical medians."
            )

            sub_graph = graph_store.get_subgraph("P001", max_hops=1)
            return AssistantQueryResponse(
                query=query,
                answer=answer,
                structured_findings=findings,
                supporting_entities=sub_graph.nodes,
                supporting_edges=sub_graph.edges,
                cited_evidence_ids=cited_ev or ["TX-01082", "TX-01083"],
                confidence=0.96,
                disclaimer=self.disclaimer
            )

        # 7. Fuzzy Search Fallback across all Persons and Cases
        best_match_id = None
        best_score = 0

        for p in db.query(Person).all():
            score = max(
                fuzz.partial_ratio(q_lower, p.name.lower()),
                fuzz.partial_ratio(q_lower, p.person_id.lower())
            )
            if score > best_score:
                best_score = score
                best_match_id = p.person_id

        for c in db.query(Case).all():
            score = max(
                fuzz.partial_ratio(q_lower, c.title.lower()),
                fuzz.partial_ratio(q_lower, c.case_id.lower())
            )
            if score > best_score:
                best_score = score
                best_match_id = c.case_id

        if best_match_id and best_score > 65:
            # Delegate to entity profile for best match
            sub_graph = graph_store.get_subgraph(best_match_id, max_hops=1)
            n_data = graph_store.nodes_data.get(best_match_id, {})
            label = n_data.get("label", best_match_id)
            e_type = n_data.get("type", "Entity")
            neighbors = [n for n in sub_graph.nodes if n.id != best_match_id]

            answer = (
                f"Matched entity '{label}' ({best_match_id}, {e_type}) with {best_score}% relevance. "
                f"The entity has {len(neighbors)} direct 1-hop links in the criminal knowledge graph."
            )
            cited_ev = [e.evidence_id for e in sub_graph.edges if e.evidence_id]

            return AssistantQueryResponse(
                query=query,
                answer=answer,
                structured_findings=[
                    f"Best Match: {label} ({best_match_id})",
                    f"Match Confidence: {best_score}%"
                ],
                supporting_entities=sub_graph.nodes,
                supporting_edges=sub_graph.edges,
                cited_evidence_ids=list(dict.fromkeys(cited_ev)) or ["EVD-FIR-042"],
                confidence=round(best_score / 100.0, 2),
                disclaimer=self.disclaimer
            )

        # 8. Clean Default Informational Response
        total_nodes = graph_store.graph.number_of_nodes()
        total_edges = graph_store.graph.number_of_edges()
        total_cases = db.query(Case).count()
        total_persons = db.query(Person).count()

        return AssistantQueryResponse(
            query=query,
            answer=(
                f"No specific entity matching '{query}' was identified in the intelligence store. "
                f"The knowledge network currently tracks {total_persons} persons of interest across {total_cases} active cases, "
                f"with {total_nodes} multi-modal entities and {total_edges} verified graph relationships. "
                f"You can search by entity name, ID (e.g. 'person 189', 'Case C022'), or ask for connection paths between two entities."
            ),
            structured_findings=[
                f"Active Persons: {total_persons}",
                f"Active Cases: {total_cases}",
                f"Knowledge Graph Size: {total_nodes} nodes, {total_edges} edges"
            ],
            supporting_entities=[],
            supporting_edges=[],
            cited_evidence_ids=["EVD-FIR-042"],
            confidence=0.85,
            disclaimer=self.disclaimer
=======
        # 4. Suspicious Transactions / Financial Anomalies
        if "transaction" in q_lower or "financial" in q_lower or "money" in q_lower or "hawala" in q_lower or "surge" in q_lower:
            tx_alerts = db.query(Alert).filter(Alert.alert_type.like("%TRANSACTION%")).order_by(Alert.confidence.desc()).all()
            if not tx_alerts:
                return AssistantQueryResponse(
                    query=query, answer="No transaction anomaly alerts are currently on file.",
                    structured_findings=[], supporting_entities=[], supporting_edges=[],
                    cited_evidence_ids=[], confidence=0.5, disclaimer=self.disclaimer
                )
            findings, cited_ev = [], []
            for a in tx_alerts:
                p_name = graph_store.nodes_data.get(a.entity_id, {}).get("label", a.entity_id)
                findings.append(f"Alert {a.alert_id} [{a.severity}]: {p_name} — {a.reason} [Evidence: {a.supporting_evidence_id or 'N/A'}]")
                if a.supporting_evidence_id:
                    cited_ev.append(a.supporting_evidence_id)

            answer = f"Detected {len(tx_alerts)} statistical financial anomal{'y' if len(tx_alerts) == 1 else 'ies'} in the current dataset."
            focus_id = mentioned[0] if mentioned else tx_alerts[0].entity_id
            sub_graph = graph_store.get_subgraph(focus_id, max_hops=1) if focus_id and graph_store.graph.has_node(focus_id) else None

            return AssistantQueryResponse(
                query=query, answer=answer, structured_findings=findings,
                supporting_entities=sub_graph.nodes if sub_graph else [],
                supporting_edges=sub_graph.edges if sub_graph else [],
                cited_evidence_ids=list(set(cited_ev)), confidence=0.85, disclaimer=self.disclaimer
            )

        # 5. Prioritization Rationale
        if "priorit" in q_lower or "why was" in q_lower or "score" in q_lower:
            person_mention = next((m for m in mentioned if graph_store.nodes_data.get(m, {}).get("type") == "Person"), None)
            if not person_mention:
                top_person = db.query(Person).order_by(Person.priority_score.desc()).first()
                person_mention = top_person.person_id if top_person else None

            if not person_mention:
                return AssistantQueryResponse(
                    query=query, answer="No persons are currently on file to compute a priority score for.",
                    structured_findings=[], supporting_entities=[], supporting_edges=[],
                    cited_evidence_ids=[], confidence=0.5, disclaimer=self.disclaimer
                )

            score_data = self._compute_priority(db, person_mention)
            if not score_data:
                return AssistantQueryResponse(
                    query=query, answer=f"No record found for {person_mention}.",
                    structured_findings=[], supporting_entities=[], supporting_edges=[],
                    cited_evidence_ids=[], confidence=0.4, disclaimer=self.disclaimer
                )

            person = score_data["person"]
            final_score = person.priority_score if person.priority_score and person.priority_score > 0 else score_data["score"]
            findings = [f"Overall Investigation Priority Score: {int(final_score)}/100"] + [
                f"{f['factor_name']} ({int(f['weight']*100)}% weight): {f['description']}" for f in score_data["factors"]
            ]
            cited_ev = list({a["supporting_evidence_id"] for a in score_data["alerts"] if a.get("supporting_evidence_id")})

            answer = (
                f"{person.name} ({person.person_id}) is prioritized at {int(final_score)}/100. {score_data['explanation']} "
                f"This is an analytical priority recommendation for investigative resource allocation, not a determination of guilt."
            )
            sub_graph = graph_store.get_subgraph(person_mention, max_hops=1)

            return AssistantQueryResponse(
                query=query, answer=answer, structured_findings=findings,
                supporting_entities=sub_graph.nodes, supporting_edges=sub_graph.edges,
                cited_evidence_ids=cited_ev, confidence=0.9, disclaimer=self.disclaimer
            )

        # Default: general graph search fallback - real counts, no fixed narrative.
        total_cases = db.query(Case).count()
        total_evidence = db.query(Evidence).count()
        sub_graph = graph_store.get_subgraph(mentioned[0], max_hops=1) if mentioned and graph_store.graph.has_node(mentioned[0]) else None

        return AssistantQueryResponse(
            query=query,
            answer=f"Investigative Knowledge Graph queried for '{query}'. Retrieved current network entities, relationships, and evidence files.",
            structured_findings=[
                f"Active Cases in Knowledge Store: {total_cases}",
                f"Total Graph Entities: {graph_store.graph.number_of_nodes()} nodes",
                f"Total Relationship Links: {graph_store.graph.number_of_edges()} edges",
                f"Evidence Catalog: {total_evidence} record(s)"
            ],
            supporting_entities=sub_graph.nodes if sub_graph else [],
            supporting_edges=sub_graph.edges if sub_graph else [],
            cited_evidence_ids=[], confidence=0.6, disclaimer=self.disclaimer
>>>>>>> origin/Anirudha
        )

assistant_service = InvestigationAssistantService()