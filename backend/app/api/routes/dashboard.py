from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Dict, Any, List
from datetime import datetime, timezone
from collections import defaultdict
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Case, Person, Alert, Document, Evidence, TransactionRecord, CDRRecord

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns real-time aggregated intelligence statistics calculated from database and knowledge graph:
    - Total Cases, Persons, Networks, Alerts, Relationships
    - Crime type distribution
    - Intelligence activity over time
    - Network cluster sizes
    - Alert severity breakdown
    - Top Investigation Leads with transparent priority scores (not criminal verdicts)
    - Recent operational activity
    """
    total_cases = db.query(Case).count()
    total_persons = db.query(Person).count()
    # FIX: count only ACTIVE alerts for the KPI — resolved/dismissed are not actionable
    total_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    total_alerts_all = db.query(Alert).count()
    total_docs = db.query(Document).count()
    total_evidence = db.query(Evidence).count()
    total_tx = db.query(TransactionRecord).count()
    total_cdr = db.query(CDRRecord).count()
    
    total_nodes = graph_store.graph.number_of_nodes()
    total_edges = graph_store.graph.number_of_edges()

    # Crime type distribution
    cases = db.query(Case).all()
    crime_dist = {}
    for c in cases:
        c_type = c.case_type or "General Syndicate"
        crime_dist[c_type] = crime_dist.get(c_type, 0) + 1
    
    crime_distribution = [{"name": k, "value": v} for k, v in crime_dist.items()]

    # Alert severity distribution
    alerts = db.query(Alert).all()
    sev_dist = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for a in alerts:
        s = (a.severity or "MEDIUM").upper()
        sev_dist[s] = sev_dist.get(s, 0) + 1
    alert_severity = [{"severity": k, "count": v} for k, v in sev_dist.items()]

    # Top Investigation Leads (Triage Ranking)
    top_persons = db.query(Person).order_by(Person.priority_score.desc()).limit(6).all()
    top_leads = []
    for p in top_persons:
        deg = graph_store.undirected_graph.degree(p.person_id) if graph_store.undirected_graph.has_node(p.person_id) else 0
        top_leads.append({
            "person_id": p.person_id,
            "name": p.name,
            "role": p.role or "Nodal Entity",
            "primary_location": p.primary_location or "Unknown",
            "priority_score": int(p.priority_score or 0),
            "priority_rating": "CRITICAL" if p.priority_score >= 80 else ("HIGH" if p.priority_score >= 60 else "MEDIUM"),
            "degree_links": deg,
            "risk_level": p.risk_level or "Medium",
            "avatar_url": p.avatar_url
        })

    # Activity over time — real DB queries grouped by year-month
    # We look at the last 6 months of transaction and CDR activity.
    tx_by_month: Dict[str, int] = defaultdict(int)
    cdr_by_month: Dict[str, int] = defaultdict(int)
    doc_by_month: Dict[str, int] = defaultdict(int)

    for tx in db.query(TransactionRecord).filter(TransactionRecord.timestamp.isnot(None)).all():
        key = tx.timestamp.strftime("%b %Y")
        tx_by_month[key] += 1

    for cdr in db.query(CDRRecord).filter(CDRRecord.timestamp.isnot(None)).all():
        key = cdr.timestamp.strftime("%b %Y")
        cdr_by_month[key] += 1

    for doc in db.query(Document).filter(Document.created_at.isnot(None)).all():
        key = doc.created_at.strftime("%b %Y")
        doc_by_month[key] += 1

    # Merge all months and sort chronologically
    all_months = sorted(
        set(tx_by_month) | set(cdr_by_month) | set(doc_by_month),
        key=lambda m: datetime.strptime(m, "%b %Y")
    )

    # If no real data yet, return a meaningful placeholder
    if not all_months:
        now = datetime.now(timezone.utc)
        all_months = [
            datetime(now.year, max(1, now.month - i), 1).strftime("%b %Y")
            for i in range(5, -1, -1)
        ]

    # Trim to most recent 12 months
    all_months = all_months[-12:]

    activity_timeline = [
        {
            "month": m,
            "transactions": tx_by_month.get(m, 0),
            "calls": cdr_by_month.get(m, 0),
            "intel_reports": doc_by_month.get(m, 0),
        }
        for m in all_months
    ]

    # Recent Alerts List
    recent_alerts = []
    for a in db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all():
        p_name = graph_store.nodes_data.get(a.entity_id, {}).get("label", a.entity_id)
        recent_alerts.append({
            "alert_id": a.alert_id,
            "entity_id": a.entity_id,
            "entity_name": p_name,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "reason": a.reason,
            "supporting_evidence_id": a.supporting_evidence_id,
            "status": a.status
        })

    # Network cluster sizes
    communities = graph_store.get_community_details()
    network_clusters = [{"name": c.name.split(':')[0], "size": c.size, "theme": c.dominant_crime_theme} for c in communities]

    return {
        "metrics": {
            "total_cases": total_cases,
            "total_persons": total_persons,
            "total_nodes": total_nodes,
            "total_relationships": total_edges,
            "total_alerts": total_alerts,          # Active only
            "total_alerts_all": total_alerts_all,  # All statuses
            "total_documents": total_docs,
            "total_evidence": total_evidence,
            "total_transactions": total_tx,
            "total_cdrs": total_cdr
        },
        "crime_distribution": crime_distribution,
        "alert_severity": alert_severity,
        "activity_timeline": activity_timeline,
        "top_leads": top_leads,
        "recent_alerts": recent_alerts,
        "network_clusters": network_clusters,
        "disclaimer": "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."
    }
