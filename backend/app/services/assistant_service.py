from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Case, Person, Alert, TransactionRecord, CDRRecord, Evidence
from backend.app.schemas.api_schemas import AssistantQueryResponse, GraphNode, GraphEdge
from scoring.priority_scorer import priority_scorer


class InvestigationAssistantService:
    """
    Graph-Grounded Natural Language Investigation Assistant.
    Resolves entity mentions against whatever is actually in the knowledge graph - it
    never assumes or defaults to a specific person/case, and never fabricates evidence
    citations. If it can't find something in the real data, it says so plainly.
    """
    def __init__(self):
        self.disclaimer = "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."

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
                sub_graph = graph_store.get_subgraph(top_bridge.node_id, max_hops=1)
                cited_ev = list({cl.evidence_id for cl in top_bridge.critical_links if cl.evidence_id})

                return AssistantQueryResponse(
                    query=query, answer=answer, structured_findings=findings,
                    supporting_entities=sub_graph.nodes, supporting_edges=sub_graph.edges,
                    cited_evidence_ids=cited_ev, confidence=0.9, disclaimer=self.disclaimer
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
                n_data = graph_store.nodes_data.get(n_id, {})
                findings.append(
                    f"{n_data.get('label', n_id)} ({n_data.get('type')}): Degree Centrality = {m.get('degree_centrality', 0):.3f}, "
                    f"Betweenness = {m.get('betweenness', 0):.3f}, PageRank = {m.get('pagerank', 0):.4f}"
                )
                supp_nodes.append(GraphNode(
                    id=n_id, label=n_data.get("label", n_id), type=n_data.get("type", "Entity"),
                    properties=n_data, betweenness=round(m.get("betweenness", 0.0), 3)
                ))
            answer = (
                "The highest-centrality entities in the current knowledge graph are: "
                f"{', '.join([graph_store.nodes_data.get(n[0], {}).get('label', n[0]) for n in top_n[:3]])}."
            )
            return AssistantQueryResponse(
                query=query, answer=answer, structured_findings=findings,
                supporting_entities=supp_nodes, supporting_edges=[],
                cited_evidence_ids=[], confidence=0.85, disclaimer=self.disclaimer
            )

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
        )

assistant_service = InvestigationAssistantService()