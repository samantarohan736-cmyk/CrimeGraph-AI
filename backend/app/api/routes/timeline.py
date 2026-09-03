from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Case, Document, Evidence, Alert, CDRRecord, TransactionRecord
from backend.app.schemas.api_schemas import TimelineEvent

router = APIRouter(prefix="/timeline", tags=["Timeline"])


def _infer_case_id(entity_id: Optional[str]) -> Optional[str]:
    """Looks up a real case association for this entity from the knowledge graph, if any."""
    if not entity_id or not graph_store.graph.has_node(entity_id):
        return None
    sub = graph_store.get_subgraph(entity_id, max_hops=2)
    case_node = next((n for n in sub.nodes if n.type == "Case"), None)
    return case_node.id if case_node else None


def _first_case_evidence_id(db: Session, case_id: str) -> Optional[str]:
    """Real evidence record for a case's registration/incident milestones, if one exists - never fabricated."""
    ev = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.timestamp.asc()).first()
    return ev.evidence_id if ev else None


@router.get("/all", response_model=List[TimelineEvent])
@router.get("/{case_id}", response_model=List[TimelineEvent])
def get_investigation_timeline(
    case_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Constructs unified chronological investigation timeline:
    - Case incidents & registrations
    - Critical call intercepts & surges
    - Anomalous transactions & cash drops
    - Field surveillance observations
    - Intelligence document filings

    Every case_id and evidence_id below is looked up from real data (the knowledge
    graph or the Evidence table) - none are guessed or fabricated. Events without a
    real timestamp are skipped rather than given a fake one.
    """
    events = []

    # 1. Case milestones
    cases_q = db.query(Case)
    if case_id:
        cases_q = cases_q.filter(Case.case_id == case_id)

    for c in cases_q.all():
        case_evidence_id = _first_case_evidence_id(db, c.case_id)
        if c.incident_date:
            events.append(TimelineEvent(
                event_id=f"EVT-CASE-INC-{c.case_id}",
                timestamp=c.incident_date.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="CASE_INCIDENT",
                title=f"Incident Date: {c.title}",
                description=f"Primary operational activity commenced for {c.title}.",
                case_id=c.case_id,
                severity="High",
                evidence_id=case_evidence_id
            ))
        if c.date_registered:
            events.append(TimelineEvent(
                event_id=f"EVT-CASE-REG-{c.case_id}",
                timestamp=c.date_registered.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="DOCUMENT_FILED",
                title=f"Case Registered: {c.case_id}",
                description=f"Investigation opened under Lead Officer {c.lead_officer}.",
                case_id=c.case_id,
                severity="Normal",
                evidence_id=case_evidence_id
            ))

    # 2. Key Transactions (Flagged or Large)
    tx_q = db.query(TransactionRecord)
    if entity_id:
        tx_q = tx_q.filter((TransactionRecord.sender_id == entity_id) | (TransactionRecord.receiver_id == entity_id))

    for t in tx_q.all():
        if not t.timestamp:
            continue  # no real timestamp to place this event on the timeline
        if "ANOMALY" in str(t.flagged_status).upper() or float(t.amount or 0) >= 500000:
            events.append(TimelineEvent(
                event_id=f"EVT-TX-{t.tx_id}",
                timestamp=t.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="TRANSACTION",
                title=f"Financial Movement: {t.currency} {float(t.amount):,.2f}",
                description=f"{t.sender_name} transferred to {t.receiver_name} via {t.channel}. Flag: {t.flagged_status}",
                entity_ids=[t.sender_id, t.receiver_id],
                case_id=_infer_case_id(t.sender_id) or _infer_case_id(t.receiver_id),
                severity="Critical" if "CRITICAL" in str(t.flagged_status) else "High",
                evidence_id=t.tx_id
            ))

    # 3. CDR Spikes and Notable Intercepts
    cdr_q = db.query(CDRRecord)
    if entity_id:
        cdr_q = cdr_q.filter((CDRRecord.caller_id == entity_id) | (CDRRecord.receiver_id == entity_id))

    for c in cdr_q.all():
        if not c.timestamp:
            continue
        if "Anomalous" in str(c.flagged_status) or "High Alert" in str(c.flagged_status):
            caller_name = graph_store.nodes_data.get(c.caller_id, {}).get("label", c.caller_id)
            rec_name = graph_store.nodes_data.get(c.receiver_id, {}).get("label", c.receiver_id)
            events.append(TimelineEvent(
                event_id=f"EVT-CDR-{c.cdr_id}",
                timestamp=c.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="CALL",
                title=f"Intercept: {caller_name} ➔ {rec_name}",
                description=f"Duration: {c.duration_sec}s | Tower: {c.cell_tower_location} | Status: {c.flagged_status}",
                entity_ids=[c.caller_id, c.receiver_id],
                case_id=_infer_case_id(c.caller_id) or _infer_case_id(c.receiver_id),
                severity="High",
                evidence_id=c.cdr_id
            ))

    # 4. Intelligence Documents
    doc_q = db.query(Document)
    if case_id:
        doc_q = doc_q.filter(Document.case_id == case_id)

    for d in doc_q.all():
        if not d.created_at:
            continue
        events.append(TimelineEvent(
            event_id=f"EVT-DOC-{d.document_id}",
            timestamp=d.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            event_type="DOCUMENT_FILED",
            title=f"Intel Report: {d.title}",
            description=f"Filed by {d.author} ({d.source_agency}). Classification: {d.classification}.",
            case_id=d.case_id,
            severity="Normal",
            evidence_id=d.document_id
        ))

    # Sort chronological
    events.sort(key=lambda x: x.timestamp)
    return events
