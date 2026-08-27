from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Case, Document, Evidence, Alert, Person
from backend.app.schemas.api_schemas import CaseOut, CaseDetailOut

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseOut])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    results = []
    for c in cases:
        # Count associated entities from graph or DB
        doc_count = db.query(Document).filter(Document.case_id == c.case_id).count()
        alert_count = db.query(Alert).filter(Alert.case_id == c.case_id).count()
        
        # Subgraph entity count
        sub_graph = graph_store.get_case_subgraph(c.case_id, hops=2)
        
        results.append(CaseOut(
            case_id=c.case_id,
            title=c.title,
            description=c.description,
            case_type=c.case_type,
            status=c.status,
            priority=c.priority,
            lead_officer=c.lead_officer,
            date_registered=c.date_registered,
            incident_date=c.incident_date,
            estimated_value=float(c.estimated_value) if c.estimated_value else None,
            entity_count=sub_graph.total_nodes,
            alert_count=alert_count,
            document_count=doc_count
        ))
    return results

@router.get("/{case_id}", response_model=CaseDetailOut)
def get_case_details(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    docs = db.query(Document).filter(Document.case_id == case_id).all()
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    alerts = db.query(Alert).filter(Alert.case_id == case_id).all()

    # Get associated entities from graph
    sub_graph = graph_store.get_case_subgraph(case_id, hops=2)
    
    persons = []
    locations = []
    vehicles = []
    orgs = []

    for node in sub_graph.nodes:
        if node.type == "Person":
            p_db = db.query(Person).filter(Person.person_id == node.id).first()
            persons.append({
                "person_id": node.id,
                "name": node.label,
                "role": node.properties.get("role", "Syndicate Associate"),
                "priority_score": int(p_db.priority_score if p_db else 0),
                "primary_location": node.properties.get("primary_location", "")
            })
        elif node.type == "Location":
            locations.append({
                "location_id": node.id,
                "name": node.label,
                "address": node.properties.get("address", ""),
                "location_type": node.properties.get("location_type", "")
            })
        elif node.type == "Vehicle":
            vehicles.append({
                "vehicle_id": node.id,
                "plate_number": node.label,
                "make": node.properties.get("make", ""),
                "model": node.properties.get("model", ""),
                "vehicle_type": node.properties.get("vehicle_type", "")
            })
        elif node.type == "Organization":
            orgs.append({
                "org_id": node.id,
                "name": node.label,
                "org_type": node.properties.get("org_type", ""),
                "flagged_status": node.properties.get("flagged_status", "")
            })

    return CaseDetailOut(
        case_id=case.case_id,
        title=case.title,
        description=case.description,
        case_type=case.case_type,
        status=case.status,
        priority=case.priority,
        lead_officer=case.lead_officer,
        date_registered=case.date_registered,
        incident_date=case.incident_date,
        estimated_value=float(case.estimated_value) if case.estimated_value else None,
        entity_count=sub_graph.total_nodes,
        alert_count=len(alerts),
        document_count=len(docs),
        persons=persons,
        locations=locations,
        vehicles=vehicles,
        organizations=orgs,
        documents=[{"document_id": d.document_id, "title": d.title, "classification": d.classification, "filename": d.filename} for d in docs],
        evidence_items=[{"evidence_id": e.evidence_id, "title": e.title, "evidence_type": e.evidence_type, "confidence": e.confidence} for e in evidence_items],
        alerts=[{"alert_id": a.alert_id, "severity": a.severity, "reason": a.reason, "entity_id": a.entity_id} for a in alerts]
    )
