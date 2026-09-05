from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Alert, Case, Evidence
from backend.app.schemas.api_schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: HIGH, MEDIUM, LOW"),
    case_id: Optional[str] = Query(None, description="Filter by case ID"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, REVIEWED, DISMISSED"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type (e.g. COMMUNICATION_SPIKE)"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=500, description="Max results per page"),
    db: Session = Depends(get_db),
):
    """
    List anomaly alerts with optional filters.
    Supports filtering by severity, status, case, and alert_type.
    Paginated via skip/limit (default: first 100 active alerts).
    """
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if case_id:
        query = query.filter(Alert.case_id == case_id)
    if status:
        query = query.filter(Alert.status == status.upper())
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type.upper())

    alerts = query.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    results = []
    for a in alerts:
        p_name = graph_store.nodes_data.get(a.entity_id, {}).get("label", a.entity_id)
        case_obj = db.query(Case).filter(Case.case_id == a.case_id).first() if a.case_id else None

        results.append(AlertOut(
            alert_id=a.alert_id,
            entity_id=a.entity_id,
            entity_name=p_name,
            entity_type=a.entity_type,
            case_id=a.case_id,
            case_title=case_obj.title if case_obj else None,
            alert_type=a.alert_type,
            severity=a.severity,
            reason=a.reason,
            supporting_evidence_id=a.supporting_evidence_id,
            supporting_records=a.supporting_records,
            confidence=a.confidence,
            timestamp=a.timestamp,
            status=a.status,
        ))
    return results


@router.get("/counts")
def get_alert_counts(db: Session = Depends(get_db)):
    """Returns a summary count of alerts by status and severity for dashboard KPIs."""
    all_alerts = db.query(Alert).all()
    by_status = {}
    by_severity = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for a in all_alerts:
        s = (a.status or "ACTIVE").upper()
        by_status[s] = by_status.get(s, 0) + 1
        sev = (a.severity or "MEDIUM").upper()
        by_severity[sev] = by_severity.get(sev, 0) + 1
    return {
        "total": len(all_alerts),
        "by_status": by_status,
        "by_severity": by_severity,
    }


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert_by_id(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

    p_name = graph_store.nodes_data.get(alert.entity_id, {}).get("label", alert.entity_id)
    case_obj = db.query(Case).filter(Case.case_id == alert.case_id).first() if alert.case_id else None

    return AlertOut(
        alert_id=alert.alert_id,
        entity_id=alert.entity_id,
        entity_name=p_name,
        entity_type=alert.entity_type,
        case_id=alert.case_id,
        case_title=case_obj.title if case_obj else None,
        alert_type=alert.alert_type,
        severity=alert.severity,
        reason=alert.reason,
        supporting_evidence_id=alert.supporting_evidence_id,
        supporting_records=alert.supporting_records,
        confidence=alert.confidence,
        timestamp=alert.timestamp,
        status=alert.status,
    )


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    action: str = Query("REVIEWED", description="New status: REVIEWED or DISMISSED"),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    valid_actions = {"REVIEWED", "DISMISSED", "ACTIVE"}
    action_upper = action.upper()
    if action_upper not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action '{action}'. Use: {valid_actions}")
    alert.status = action_upper
    db.commit()
    return {"status": "success", "alert_id": alert_id, "new_status": alert.status}
