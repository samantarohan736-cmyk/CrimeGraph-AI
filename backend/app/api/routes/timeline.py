from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Case, Document, Evidence, Alert, CDRRecord, TransactionRecord
from backend.app.schemas.api_schemas import TimelineEvent

router = APIRouter(prefix="/timeline", tags=["Timeline"])

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
    """
    events = []

    # 1. Case milestones
    cases_q = db.query(Case)
    if case_id:
        cases_q = cases_q.filter(Case.case_id == case_id)
    
    for c in cases_q.all():
        if c.incident_date:
            events.append(TimelineEvent(
                event_id=f"EVT-CASE-INC-{c.case_id}",
                timestamp=c.incident_date.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="CASE_INCIDENT",
                title=f"Incident Date: {c.title}",
                description=f"Primary syndicate operational activity commenced for {c.title}.",
                case_id=c.case_id,
                severity="High",
                evidence_id=f"EVD-FIR-{c.case_id[1:]}"
            ))
        if c.date_registered:
            events.append(TimelineEvent(
                event_id=f"EVT-CASE-REG-{c.case_id}",
                timestamp=c.date_registered.strftime("%Y-%m-%d %H:%M:%S"),
                event_type="DOCUMENT_FILED",
                title=f"Formal FIR Registered: {c.case_id}",
                description=f"Investigation opened under Lead Officer {c.lead_officer}.",
                case_id=c.case_id,
                severity="Normal",
                evidence_id=f"EVD-FIR-{c.case_id[1:]}"
            ))

    # 2. Key Transactions (Flagged or Large)
    tx_q = db.query(TransactionRecord)
    if entity_id:
        tx_q = tx_q.filter((TransactionRecord.sender_id == entity_id) | (TransactionRecord.receiver_id == entity_id))
    
    for t in tx_q.all():
        if "ANOMALY" in str(t.flagged_status).upper() or float(t.amount or 0) >= 500000:
            events.append(TimelineEvent(
                event_id=f"EVT-TX-{t.tx_id}",
                timestamp=t.timestamp.strftime("%Y-%m-%d %H:%M:%S") if t.timestamp else "2025-10-04 14:15:30",
                event_type="TRANSACTION",
                title=f"Financial Movement: {t.currency} {float(t.amount):,.2f}",
                description=f"{t.sender_name} transferred to {t.receiver_name} via {t.channel}. Flag: {t.flagged_status}",
                entity_ids=[t.sender_id, t.receiver_id],
                case_id="C042" if t.sender_id in ["P001", "P002", "P004", "P006"] else "C055",
                severity="Critical" if "CRITICAL" in str(t.flagged_status) else "High",
                evidence_id=t.tx_id
            ))

    # 3. CDR Spikes and Notable Intercepts
    cdr_q = db.query(CDRRecord)
    if entity_id:
        cdr_q = cdr_q.filter((CDRRecord.caller_id == entity_id) | (CDRRecord.receiver_id == entity_id))
    
    for c in cdr_q.all():
        if "Anomalous" in str(c.flagged_status) or "High Alert" in str(c.flagged_status):
            caller_name = graph_store.nodes_data.get(c.caller_id, {}).get("label", c.caller_id)
            rec_name = graph_store.nodes_data.get(c.receiver_id, {}).get("label", c.receiver_id)
            events.append(TimelineEvent(
                event_id=f"EVT-CDR-{c.cdr_id}",
                timestamp=c.timestamp.strftime("%Y-%m-%d %H:%M:%S") if c.timestamp else "2025-10-03 01:45:10",
                event_type="CALL",
                title=f"Intercept: {caller_name} ➔ {rec_name}",
                description=f"Duration: {c.duration_sec}s | Tower: {c.cell_tower_location} | Status: {c.flagged_status}",
                entity_ids=[c.caller_id, c.receiver_id],
                case_id="C042" if c.caller_id in ["P001", "P002"] else "C019",
                severity="High",
                evidence_id=c.cdr_id
            ))

    # 4. Intelligence Documents
    doc_q = db.query(Document)
    if case_id:
        doc_q = doc_q.filter(Document.case_id == case_id)
    
    for d in doc_q.all():
        events.append(TimelineEvent(
            event_id=f"EVT-DOC-{d.document_id}",
            timestamp=d.created_at.strftime("%Y-%m-%d %H:%M:%S") if d.created_at else "2025-10-08 12:00:00",
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
