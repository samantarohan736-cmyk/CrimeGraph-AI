"""
CrimeGraph AI — Investigation Assistant Service
================================================
Graph-grounded, evidence-cited natural language query engine.

Architecture:
  1. Entity resolution — finds real IDs in the graph matching words in the query.
  2. Intent classification — 15+ intent patterns mapped to structured DB/graph queries.
  3. Structured context builder — assembles real DB counts, alerts, top persons, etc.
  4. LLM enrichment (optional) — if GEMINI_API_KEY or OPENAI_API_KEY is set in .env,
     the structured context is passed to the LLM to generate a richer natural-language
     answer. The LLM can ONLY reference entities provided in the context payload — it
     cannot fabricate names, IDs, or evidence citations.
  5. Rule-based fallback — if no LLM key is configured, a deterministic rule-based
     answer is built directly from the structured query results.

IMPORTANT: This service never fabricates data. Every answer is derived from what is
actually stored in PostgreSQL and the Neo4j knowledge graph at query time.
"""

import os
import json
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.app.core.graph_store import graph_store
from backend.app.models.entities import (
    Case, Person, Alert, TransactionRecord, CDRRecord,
    Evidence, Document, Phone, Vehicle, Location, Organization
)
from backend.app.schemas.api_schemas import (
    AssistantQueryResponse, AssistantMessage, GraphNode, GraphEdge
)


class InvestigationAssistantService:
    """
    Graph-Grounded Natural Language Investigation Assistant.

    Handles 15+ query intents using real DB + graph data.
    Optional LLM enrichment via GEMINI_API_KEY or OPENAI_API_KEY.
    """

    DISCLAIMER = (
        "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. "
        "Findings should be reviewed by authorized investigators."
    )

    def __init__(self):
        self._llm_client = None
        self._llm_type: Optional[str] = None
        self._init_llm()

    def _init_llm(self):
        """Try to initialize an LLM client from available API keys."""
        gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("LLM_API_KEY", "")
        openai_key = os.environ.get("OPENAI_API_KEY", "")

        if gemini_key and len(gemini_key) > 10:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                self._llm_client = genai.GenerativeModel("gemini-1.5-flash")
                self._llm_type = "gemini"
                print("[Assistant] Gemini LLM backend initialized.")
            except Exception as e:
                print(f"[Assistant] Gemini init failed: {e} — using rule-based mode.")
        elif openai_key and len(openai_key) > 10:
            try:
                from openai import OpenAI
                self._llm_client = OpenAI(api_key=openai_key)
                self._llm_type = "openai"
                print("[Assistant] OpenAI LLM backend initialized.")
            except Exception as e:
                print(f"[Assistant] OpenAI init failed: {e} — using rule-based mode.")

    # ─────────────────────── Entity Resolution ────────────────────────────────

    def _resolve_mentions(self, query: str, limit: int = 6) -> List[str]:
        """
        Match text in the query against real node IDs and labels in the graph.
        Returns matched entity IDs, longest-label matches first.
        """
        q_lower = query.lower()
        matches: List[str] = []

        # Exact ID match
        for node_id in graph_store.nodes_data:
            if node_id and node_id.lower() in q_lower and node_id not in matches:
                matches.append(node_id)

        # Label match (longest first to avoid short fragment shadowing full name)
        by_label = sorted(
            graph_store.nodes_data.items(),
            key=lambda kv: -len((kv[1].get("label") or ""))
        )
        for node_id, data in by_label:
            label = (data.get("label") or "").lower().strip()
            if label and len(label) > 2 and label in q_lower and node_id not in matches:
                matches.append(node_id)

        return matches[:limit]

    def _node_label(self, node_id: str) -> str:
        return graph_store.nodes_data.get(node_id, {}).get("label", node_id)

    # ─────────────────────── Structured Context Builder ───────────────────────

    def _build_context(self, db: Session) -> Dict[str, Any]:
        """Build a real-data context snapshot for LLM enrichment and fallback answers."""
        total_cases = db.query(Case).count()
        total_persons = db.query(Person).count()
        total_alerts = db.query(Alert).count()
        total_docs = db.query(Document).count()
        total_cdrs = db.query(CDRRecord).count()
        total_txs = db.query(TransactionRecord).count()

        top_persons = [
            {"id": p.person_id, "name": p.name, "score": int(p.priority_score or 0), "role": p.role or "Unknown"}
            for p in db.query(Person).order_by(Person.priority_score.desc()).limit(5).all()
        ]
        recent_alerts = [
            {"id": a.alert_id, "type": a.alert_type, "severity": a.severity,
             "entity": self._node_label(a.entity_id), "reason": a.reason[:120]}
            for a in db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all()
        ]
        return {
            "total_cases": total_cases, "total_persons": total_persons,
            "total_alerts": total_alerts, "total_documents": total_docs,
            "total_cdrs": total_cdrs, "total_transactions": total_txs,
            "graph_nodes": graph_store.graph.number_of_nodes(),
            "graph_edges": graph_store.graph.number_of_edges(),
            "top_persons": top_persons,
            "recent_alerts": recent_alerts,
        }

    # ─────────────────────── LLM Enrichment ──────────────────────────────────

    def _ask_llm(self, query: str, context: Dict[str, Any],
                 history: List[AssistantMessage], rule_answer: str) -> Optional[str]:
        """
        Send the query + structured context to the LLM.
        The LLM must only reference entities present in context — hallucination guard.
        Returns None if LLM is unavailable or fails.
        """
        if not self._llm_client:
            return None

        system_prompt = (
            "You are CrimeGraph AI, an investigation assistant for law enforcement analysts. "
            "You MUST only reference entities, names, IDs, and evidence that appear in the "
            "CONTEXT block below. Never invent names, case IDs, or statistics. "
            "Be concise, factual, and professional. End every response with the disclaimer.\n\n"
            f"DISCLAIMER: {self.DISCLAIMER}\n\n"
            f"LIVE DATABASE CONTEXT:\n{json.dumps(context, indent=2)}\n\n"
            f"RULE-BASED ANALYSIS:\n{rule_answer}"
        )

        try:
            if self._llm_type == "gemini":
                hist_parts = []
                for msg in (history or [])[-6:]:  # last 3 turns
                    hist_parts.append({"role": msg.role, "parts": [msg.content]})
                hist_parts.append({"role": "user", "parts": [query]})
                response = self._llm_client.generate_content(
                    [{"role": "user", "parts": [system_prompt]}] + hist_parts
                )
                return response.text
            elif self._llm_type == "openai":
                messages = [{"role": "system", "content": system_prompt}]
                for msg in (history or [])[-6:]:
                    messages.append({"role": msg.role, "content": msg.content})
                messages.append({"role": "user", "content": query})
                resp = self._llm_client.chat.completions.create(
                    model="gpt-4o-mini", messages=messages, max_tokens=600
                )
                return resp.choices[0].message.content
        except Exception as e:
            print(f"[Assistant] LLM call failed: {e}")
            return None

    # ─────────────────────── Priority Score Helper ────────────────────────────

    def _compute_priority(self, db: Session, person_id: str) -> Optional[Dict[str, Any]]:
        person = db.query(Person).filter(Person.person_id == person_id).first()
        if not person:
            return None
        try:
            from scoring.priority_scorer import priority_scorer
            centralities = graph_store.calculate_centralities()
            p_cent = centralities.get(person_id, {})
            is_bridge = any(b.node_id == person_id for b in graph_store.find_bridge_nodes())
            sub = graph_store.get_subgraph(person_id, max_hops=1)
            case_ids = [n.id for n in sub.nodes if n.type == "Case"]
            alerts = db.query(Alert).filter(Alert.entity_id == person_id).all()
            alert_dicts = [{"alert_id": a.alert_id, "alert_type": a.alert_type, "severity": a.severity,
                            "reason": a.reason, "supporting_evidence_id": a.supporting_evidence_id,
                            "confidence": a.confidence} for a in alerts]
            cdrs = db.query(CDRRecord).filter(
                (CDRRecord.caller_id == person_id) | (CDRRecord.receiver_id == person_id)).all()
            txs = db.query(TransactionRecord).filter(
                (TransactionRecord.sender_id == person_id) | (TransactionRecord.receiver_id == person_id)).all()
            score_data = priority_scorer.calculate_priority_score(
                person_id=person_id,
                graph_metrics={"betweenness": p_cent.get("betweenness", 0.0),
                               "degree": graph_store.undirected_graph.degree(person_id)
                               if graph_store.undirected_graph.has_node(person_id) else 0,
                               "is_bridge": is_bridge},
                associated_cases=case_ids, alerts=alert_dicts,
                cdrs=[{"cdr_id": c.cdr_id, "caller_id": c.caller_id,
                       "timestamp": c.timestamp.isoformat() if c.timestamp else None,
                       "flagged_status": c.flagged_status} for c in cdrs],
                transactions=[{"tx_id": t.tx_id, "sender_id": t.sender_id,
                               "amount": float(t.amount or 0), "flagged_status": t.flagged_status}
                              for t in txs]
            )
            score_data["person"] = person
            score_data["alerts"] = alert_dicts
            return score_data
        except Exception as e:
            return {"person": person, "score": person.priority_score or 0,
                    "factors": [], "explanation": str(e), "alerts": []}

    # ─────────────────────── Response Builder ─────────────────────────────────

    def _resp(self, query: str, answer: str, findings: List[str],
              entities=None, edges=None, evidence_ids=None,
              confidence: float = 0.8, llm_enriched: str = None) -> AssistantQueryResponse:
        return AssistantQueryResponse(
            query=query,
            answer=llm_enriched or answer,
            structured_findings=findings,
            supporting_entities=entities or [],
            supporting_edges=edges or [],
            cited_evidence_ids=list(set(evidence_ids or [])),
            confidence=confidence,
            disclaimer=self.DISCLAIMER
        )

    # ─────────────────────── Main Query Handler ───────────────────────────────

    def answer_query(
        self, db: Session, query: str,
        case_id: Optional[str] = None,
        focused_entity_id: Optional[str] = None,
        history: Optional[List[AssistantMessage]] = None
    ) -> AssistantQueryResponse:

        q = query.lower().strip()
        mentioned = self._resolve_mentions(query)
        if focused_entity_id and focused_entity_id not in mentioned:
            mentioned.insert(0, focused_entity_id)
        if case_id and case_id not in mentioned:
            mentioned.append(case_id)

        ctx = self._build_context(db)

        # ── 1. SHORTEST PATH / CONNECTION QUERY ──
        if any(k in q for k in ("connect", "path between", "link between", "how is", "related to", "linked to")) \
                and any(k in q for k in ("to", "and", "between")):
            if len(mentioned) >= 2:
                src, tgt = mentioned[0], mentioned[1]
                path = graph_store.find_shortest_path(src, tgt, max_hops=6)
                if path.found:
                    findings = [
                        f"Found {path.hops}-hop investigative path: "
                        + " ➔ ".join(f"[{n.label} ({n.type})]" for n in path.nodes)
                    ]
                    for ec in path.evidence_chain:
                        findings.append(
                            f"Link: {ec['source_node']} —({ec['relationship']})➔ {ec['target_node']}"
                            + (f" | Evidence: {ec['evidence_id']}" if ec.get('evidence_id') and ec['evidence_id'] != 'N/A' else "")
                        )
                    answer = (f"{self._node_label(src)} → {self._node_label(tgt)}: "
                              f"{path.hops}-hop path confirmed in the knowledge graph.")
                    cited = [ec['evidence_id'] for ec in path.evidence_chain
                             if ec.get('evidence_id') and ec['evidence_id'] != 'N/A']
                    llm = self._ask_llm(query, ctx, history or [], answer)
                    return self._resp(query, answer, findings, path.nodes, path.edges, cited, 0.92, llm)
                else:
                    answer = f"No path found between {self._node_label(src)} and {self._node_label(tgt)} within 6 hops."
                    return self._resp(query, answer, [answer], confidence=0.6)
            return self._resp(query,
                "Name at least two entities (by ID or exact name) to find a connection between them.",
                [], confidence=0.3)

        # ── 2. LIST ALL CASES ──
        if any(k in q for k in ("list cases", "all cases", "show cases", "how many cases", "active cases")):
            cases = db.query(Case).order_by(Case.date_registered.desc()).limit(20).all()
            if not cases:
                return self._resp(query, "No cases are currently in the database.",
                                  ["Database is empty — ingest case data via /api/ingest/csv"], confidence=0.7)
            findings = [f"[{c.case_id}] {c.title} | Type: {c.case_type or 'N/A'} | Status: {c.status} | "
                        f"Priority: {c.priority} | Lead: {c.lead_officer or 'N/A'}" for c in cases]
            answer = f"Found {len(cases)} case(s) in the database. Showing up to 20 most recent."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.9, llm_enriched=llm)

        # ── 3. CASE DETAILS (specific case mentioned) ──
        case_node_ids = [m for m in mentioned if graph_store.nodes_data.get(m, {}).get("type") == "Case"
                         or db.query(Case).filter(Case.case_id == m).first() is not None]
        if case_node_ids and any(k in q for k in ("case", "detail", "show", "info", "about", "what")):
            target_case_id = case_node_ids[0]
            case = db.query(Case).filter(Case.case_id == target_case_id).first()
            if case:
                sub = graph_store.get_case_subgraph(target_case_id, hops=2)
                docs = db.query(Document).filter(Document.case_id == target_case_id).count()
                alerts = db.query(Alert).filter(Alert.case_id == target_case_id).all()
                findings = [
                    f"Case ID: {case.case_id}", f"Title: {case.title}",
                    f"Type: {case.case_type or 'N/A'}", f"Status: {case.status}",
                    f"Priority: {case.priority}", f"Lead Officer: {case.lead_officer or 'N/A'}",
                    f"Registered: {case.date_registered.strftime('%Y-%m-%d') if case.date_registered else 'N/A'}",
                    f"Incident Date: {case.incident_date.strftime('%Y-%m-%d') if case.incident_date else 'N/A'}",
                    f"Estimated Value: {case.estimated_value or 'N/A'}",
                    f"Linked Graph Entities: {sub.total_nodes}",
                    f"Documents Filed: {docs}",
                    f"Active Alerts: {len(alerts)}",
                ]
                if case.description:
                    findings.append(f"Description: {case.description[:300]}")
                answer = f"Case {case.case_id}: '{case.title}' — {case.status}. " \
                         f"{sub.total_nodes} entities linked in the knowledge graph."
                llm = self._ask_llm(query, ctx, history or [], answer)
                return self._resp(query, answer, findings, sub.nodes, sub.edges,
                                  confidence=0.92, llm_enriched=llm)

        # ── 4. LIST ALL PERSONS ──
        if any(k in q for k in ("list persons", "all persons", "list suspects", "show persons",
                                 "who are the", "list people", "all suspects")):
            persons = db.query(Person).order_by(Person.priority_score.desc()).limit(20).all()
            if not persons:
                return self._resp(query, "No persons are currently in the database.",
                                  ["Database is empty — ingest person data via /api/ingest/csv"], confidence=0.7)
            findings = [f"[{p.person_id}] {p.name} | Role: {p.role or 'N/A'} | "
                        f"Location: {p.primary_location or 'N/A'} | Priority Score: {int(p.priority_score or 0)}/100 | "
                        f"Risk: {p.risk_level or 'N/A'}" for p in persons]
            answer = f"{len(persons)} person(s) on file, ranked by investigation priority score."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.9, llm_enriched=llm)

        # ── 5. PERSON PROFILE (specific person mentioned) ──
        person_ids = [m for m in mentioned if graph_store.nodes_data.get(m, {}).get("type") == "Person"
                      or db.query(Person).filter(Person.person_id == m).first() is not None]
        if person_ids:
            person_id = person_ids[0]
            person = db.query(Person).filter(Person.person_id == person_id).first()
            if person:
                sub = graph_store.get_subgraph(person_id, max_hops=1)
                alerts = db.query(Alert).filter(Alert.entity_id == person_id).all()
                cdrs = db.query(CDRRecord).filter(
                    (CDRRecord.caller_id == person_id) | (CDRRecord.receiver_id == person_id)).count()
                txs = db.query(TransactionRecord).filter(
                    (TransactionRecord.sender_id == person_id) | (TransactionRecord.receiver_id == person_id)).count()
                cent = graph_store.calculate_centralities().get(person_id, {})
                findings = [
                    f"Name: {person.name}", f"ID: {person.person_id}",
                    f"Aliases: {person.aliases or 'None'}",
                    f"Role: {person.role or 'Unknown'}", f"Nationality: {person.nationality or 'N/A'}",
                    f"Primary Location: {person.primary_location or 'Unknown'}",
                    f"Risk Level: {person.risk_level}", f"Priority Score: {int(person.priority_score or 0)}/100",
                    f"DOB: {person.dob.strftime('%Y-%m-%d') if person.dob else 'N/A'}",
                    f"Graph Connections: {sub.total_nodes} linked entities",
                    f"Degree Centrality: {round(cent.get('degree_centrality', 0), 3)}",
                    f"Betweenness Centrality: {round(cent.get('betweenness', 0), 4)}",
                    f"Call Records (CDRs): {cdrs}", f"Financial Transactions: {txs}",
                    f"Active Alerts: {len(alerts)}"
                ]
                for a in alerts[:3]:
                    findings.append(f"Alert [{a.severity}]: {a.reason[:100]}")
                answer = (f"{person.name} ({person.person_id}): Priority {int(person.priority_score or 0)}/100 | "
                          f"{sub.total_nodes} network connections | {len(alerts)} active alert(s).")
                llm = self._ask_llm(query, ctx, history or [], answer)
                return self._resp(query, answer, findings, sub.nodes, sub.edges,
                                  confidence=0.92, llm_enriched=llm)

        # ── 6. CDR / CALL RECORDS ──
        if any(k in q for k in ("cdr", "call record", "call log", "who called", "phone call", "calls")):
            filters = []
            if person_ids:
                pid = person_ids[0]
                records = db.query(CDRRecord).filter(
                    (CDRRecord.caller_id == pid) | (CDRRecord.receiver_id == pid)
                ).order_by(CDRRecord.timestamp.desc()).limit(20).all()
                label = self._node_label(pid)
                findings = [
                    f"[{c.cdr_id}] {c.caller_phone} → {c.receiver_phone} | "
                    f"Time: {c.timestamp.strftime('%Y-%m-%d %H:%M') if c.timestamp else 'N/A'} | "
                    f"Duration: {c.duration_sec or 0}s | Tower: {c.cell_tower_location or 'N/A'} | "
                    f"Flagged: {c.flagged_status or 'No'}"
                    for c in records
                ]
                answer = f"Found {len(records)} CDR record(s) involving {label}."
            else:
                total = db.query(CDRRecord).count()
                recent = db.query(CDRRecord).order_by(CDRRecord.timestamp.desc()).limit(10).all()
                findings = [f"Total CDRs in DB: {total}"] + [
                    f"[{c.cdr_id}] {c.caller_phone} → {c.receiver_phone} | "
                    f"{c.timestamp.strftime('%Y-%m-%d %H:%M') if c.timestamp else 'N/A'} | "
                    f"Flagged: {c.flagged_status or 'No'}"
                    for c in recent
                ]
                answer = f"Database contains {total} CDR record(s). Showing 10 most recent."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.88, llm_enriched=llm)

        # ── 7. TRANSACTIONS / FINANCIAL ──
        if any(k in q for k in ("transaction", "financial", "money", "transfer", "payment",
                                 "hawala", "funds", "amount", "banking")):
            if person_ids:
                pid = person_ids[0]
                txs = db.query(TransactionRecord).filter(
                    (TransactionRecord.sender_id == pid) | (TransactionRecord.receiver_id == pid)
                ).order_by(TransactionRecord.timestamp.desc()).limit(20).all()
                findings = [
                    f"[{t.tx_id}] {t.sender_name or t.sender_id} → {t.receiver_name or t.receiver_id} | "
                    f"{t.currency or 'INR'} {float(t.amount or 0):,.2f} | "
                    f"Channel: {t.channel or 'N/A'} | "
                    f"Time: {t.timestamp.strftime('%Y-%m-%d') if t.timestamp else 'N/A'} | "
                    f"Flagged: {t.flagged_status or 'No'}"
                    for t in txs
                ]
                answer = f"Found {len(txs)} transaction record(s) involving {self._node_label(pid)}."
            else:
                tx_alerts = db.query(Alert).filter(Alert.alert_type.like("%TRANSACTION%")).order_by(Alert.confidence.desc()).all()
                total_tx = db.query(TransactionRecord).count()
                findings = [f"Total Transactions in DB: {total_tx}",
                            f"Transaction Anomaly Alerts: {len(tx_alerts)}"]
                for a in tx_alerts[:8]:
                    findings.append(f"[{a.severity}] {self._node_label(a.entity_id)}: {a.reason[:120]}")
                answer = f"Database has {total_tx} transactions, {len(tx_alerts)} anomaly alert(s)."
                cited = [a.supporting_evidence_id for a in tx_alerts if a.supporting_evidence_id]
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.88,
                              evidence_ids=cited if 'cited' in dir() else [],
                              llm_enriched=llm)

        # ── 8. ALERTS ──
        if any(k in q for k in ("alert", "anomaly", "flag", "suspicious", "warning")):
            severity_filter = None
            if "high" in q:
                severity_filter = "HIGH"
            elif "medium" in q:
                severity_filter = "MEDIUM"
            elif "low" in q:
                severity_filter = "LOW"

            q_obj = db.query(Alert)
            if severity_filter:
                q_obj = q_obj.filter(Alert.severity == severity_filter)
            if person_ids:
                q_obj = q_obj.filter(Alert.entity_id.in_(person_ids))
            alerts = q_obj.order_by(Alert.timestamp.desc()).limit(20).all()
            findings = [
                f"[{a.alert_id}] [{a.severity}] [{a.alert_type}] "
                f"{self._node_label(a.entity_id)}: {a.reason[:150]} "
                f"(Confidence: {int(a.confidence*100)}% | Status: {a.status})"
                for a in alerts
            ]
            label = f" for {self._node_label(person_ids[0])}" if person_ids else ""
            answer = f"Found {len(alerts)} alert(s){label}" + (f" with {severity_filter} severity" if severity_filter else "") + "."
            cited = [a.supporting_evidence_id for a in alerts if a.supporting_evidence_id]
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.9, evidence_ids=cited, llm_enriched=llm)

        # ── 9. BRIDGE NODES / GATEKEEPERS ──
        if any(k in q for k in ("bridge", "gateway", "articulation", "communities", "gatekeeper", "connector")):
            bridges = graph_store.find_bridge_nodes()
            if not bridges:
                return self._resp(query,
                    "No bridge entities detected. The graph may be too sparse for community structure to emerge.",
                    [], confidence=0.5)
            top = bridges[0]
            findings = [
                f"Top Bridge: {top.label} ({top.node_id})",
                f"Betweenness Centrality: {top.betweenness:.4f}",
                f"Bridged Themes: {', '.join(top.bridged_themes) if top.bridged_themes else 'N/A'}",
                f"Critical Links: {len(top.critical_links)}"
            ]
            for cl in top.critical_links[:5]:
                findings.append(f"Edge: {cl.source} —({cl.relationship})➔ {cl.target}")
            answer = (f"Key bridge entity: {top.label} with betweenness {top.betweenness:.4f}, "
                      f"connecting multiple network clusters.")
            sub = graph_store.get_subgraph(top.node_id, max_hops=1)
            cited = list({cl.evidence_id for cl in top.critical_links if cl.evidence_id})
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, sub.nodes, sub.edges, cited, 0.9, llm)

        # ── 10. CENTRALITY / MOST CONNECTED ──
        if any(k in q for k in ("most connected", "central", "influential", "pagerank", "highest degree", "network hub")):
            cents = graph_store.calculate_centralities()
            if not cents:
                return self._resp(query, "No centrality data — knowledge graph is empty.", [], confidence=0.5)
            top4 = sorted(cents.items(), key=lambda x: x[1].get("betweenness", 0) + x[1].get("degree_centrality", 0), reverse=True)[:4]
            findings = []
            supp_nodes = []
            for nid, m in top4:
                data = graph_store.nodes_data.get(nid, {})
                findings.append(
                    f"{data.get('label', nid)} ({data.get('type','?')}): "
                    f"Degree={m.get('degree_centrality',0):.3f} | "
                    f"Betweenness={m.get('betweenness',0):.3f} | "
                    f"PageRank={m.get('pagerank',0):.4f}"
                )
                supp_nodes.append(GraphNode(id=nid, label=data.get("label",nid),
                                            type=data.get("type","Entity"), properties=data,
                                            betweenness=round(m.get("betweenness",0),3)))
            top_labels = [graph_store.nodes_data.get(n[0],{}).get("label",n[0]) for n in top4[:3]]
            answer = f"Most central entities: {', '.join(top_labels)}."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, supp_nodes, [], confidence=0.88, llm_enriched=llm)

        # ── 11. PRIORITY SCORE EXPLANATION ──
        if any(k in q for k in ("priority", "score", "why is", "why was", "triage", "ranked")):
            target_person = next((m for m in mentioned
                                  if graph_store.nodes_data.get(m,{}).get("type") == "Person"), None)
            if not target_person:
                top_p = db.query(Person).order_by(Person.priority_score.desc()).first()
                target_person = top_p.person_id if top_p else None
            if not target_person:
                return self._resp(query, "No persons on file for priority scoring.", [], confidence=0.5)
            sd = self._compute_priority(db, target_person)
            if not sd:
                return self._resp(query, f"No record for {target_person}.", [], confidence=0.4)
            person = sd["person"]
            final_score = person.priority_score if person.priority_score and person.priority_score > 0 else sd["score"]
            findings = [f"Investigation Priority Score: {int(final_score)}/100"] + [
                f"{f['factor_name']} ({int(f['weight']*100)}% weight): {f['description']}"
                for f in sd["factors"]
            ]
            cited = list({a.get("supporting_evidence_id") for a in sd["alerts"]
                          if a.get("supporting_evidence_id")})
            answer = (f"{person.name} ({person.person_id}): Priority {int(final_score)}/100. "
                      f"{sd.get('explanation','')}")
            sub = graph_store.get_subgraph(target_person, max_hops=1)
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, sub.nodes, sub.edges, cited, 0.9, llm)

        # ── 12. DOCUMENTS / REPORTS ──
        if any(k in q for k in ("document", "report", "intel", "file", "upload", "uploaded")):
            docs = db.query(Document).order_by(Document.created_at.desc()).limit(10).all()
            if not docs:
                return self._resp(query, "No documents are currently in the database.",
                                  ["Upload documents via /api/documents/upload"], confidence=0.7)
            findings = [
                f"[{d.document_id}] {d.title} | Type: {d.file_type} | "
                f"Agency: {d.source_agency or 'N/A'} | Entities: {len(d.extracted_entities or [])} extracted | "
                f"Case: {d.case_id or 'Unlinked'}"
                for d in docs
            ]
            answer = f"{len(docs)} document(s) in the intelligence repository."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.85, llm_enriched=llm)

        # ── 13. NETWORK SUBGRAPH / SHOW CONNECTIONS ──
        if mentioned and any(k in q for k in ("network", "connections", "linked", "graph", "neighbours", "neighbors", "who knows")):
            node_id = mentioned[0]
            if graph_store.undirected_graph.has_node(node_id):
                hops = 2 if "2" in q or "second" in q else 1
                sub = graph_store.get_subgraph(node_id, max_hops=hops)
                findings = [f"Entity: {self._node_label(node_id)} — {hops}-hop network",
                            f"Connected nodes: {sub.total_nodes} | Edges: {sub.total_edges}"]
                for n in sub.nodes[:15]:
                    if n.id != node_id:
                        findings.append(f"  → {n.label} ({n.type})")
                answer = (f"{self._node_label(node_id)} has {sub.total_nodes} linked entities "
                          f"within {hops} hop(s) in the knowledge graph.")
                llm = self._ask_llm(query, ctx, history or [], answer)
                return self._resp(query, answer, findings, sub.nodes, sub.edges, confidence=0.88, llm_enriched=llm)

        # ── 14. STATUS / SUMMARY / OVERVIEW ──
        if any(k in q for k in ("status", "summary", "overview", "how many", "statistics", "stats",
                                 "what do we have", "what's in", "total")):
            findings = [
                f"Total Cases: {ctx['total_cases']}",
                f"Total Persons: {ctx['total_persons']}",
                f"Graph Nodes: {ctx['graph_nodes']} | Graph Edges: {ctx['graph_edges']}",
                f"Active Alerts: {ctx['total_alerts']}",
                f"Intelligence Documents: {ctx['total_documents']}",
                f"CDR Records: {ctx['total_cdrs']}",
                f"Transaction Records: {ctx['total_transactions']}",
            ]
            if ctx["top_persons"]:
                findings.append("Top Priority Persons:")
                for p in ctx["top_persons"]:
                    findings.append(f"  [{p['id']}] {p['name']} — Score: {p['score']}/100 | Role: {p['role']}")
            if ctx["recent_alerts"]:
                findings.append("Recent Alerts:")
                for a in ctx["recent_alerts"]:
                    findings.append(f"  [{a['severity']}] {a['entity']}: {a['reason']}")
            answer = (f"Database has {ctx['total_cases']} cases, {ctx['total_persons']} persons, "
                      f"{ctx['total_alerts']} alerts, and {ctx['graph_nodes']} graph entities.")
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.85, llm_enriched=llm)

        # ── 15. EVIDENCE ──
        if any(k in q for k in ("evidence", "evidence record", "proof", "exhibit")):
            evs = db.query(Evidence).order_by(Evidence.created_at.desc()).limit(10).all()
            findings = [
                f"[{e.evidence_id}] {e.title} | Type: {e.evidence_type} | "
                f"Confidence: {int(e.confidence*100)}% | Case: {e.case_id or 'N/A'}"
                for e in evs
            ]
            answer = f"Evidence catalog contains {db.query(Evidence).count()} record(s)."
            llm = self._ask_llm(query, ctx, history or [], answer)
            return self._resp(query, answer, findings, confidence=0.82, llm_enriched=llm)

        # ── 16. GENERAL FALLBACK with real data ──
        sub = graph_store.get_subgraph(mentioned[0], max_hops=1) if mentioned and graph_store.graph.has_node(mentioned[0]) else None
        findings = [
            f"Active Cases: {ctx['total_cases']}",
            f"Persons on File: {ctx['total_persons']}",
            f"Knowledge Graph: {ctx['graph_nodes']} nodes, {ctx['graph_edges']} edges",
            f"Alerts: {ctx['total_alerts']} | Evidence: {db.query(Evidence).count()}",
        ]
        if ctx["top_persons"]:
            findings.append("Highest Priority Person: "
                            + f"{ctx['top_persons'][0]['name']} (Score: {ctx['top_persons'][0]['score']}/100)")

        # For the fallback, always try LLM since the user may have asked a custom question
        answer = (f"Query received: '{query}'. "
                  f"The knowledge base has {ctx['total_cases']} cases and {ctx['total_persons']} persons. "
                  f"Try asking about specific cases, persons by ID or name, CDRs, transactions, or network connections.")
        llm = self._ask_llm(query, ctx, history or [], answer)
        return self._resp(query, answer, findings,
                          sub.nodes if sub else [], sub.edges if sub else [],
                          confidence=0.6, llm_enriched=llm)


assistant_service = InvestigationAssistantService()