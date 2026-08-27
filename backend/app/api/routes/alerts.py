from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Alert, Case, Evidence
from backend.app.schemas.api_schemas import AlertOut

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[str] = None,
    case_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    if case_id:
        query = query.filter(Alert.case_id == case_id)
    if status:
        query = query.filter(Alert.status == status.upper())

    alerts = query.order_by(Alert.timestamp.desc()).all()
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
            status=a.status
        ))
    return results

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
        status=alert.status
    )

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: str, action: str = "REVIEWED", db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
    alert.status = action.upper()
    db.commit()
    return {"status": "success", "alert_id": alert_id, "new_status": alert.status}
