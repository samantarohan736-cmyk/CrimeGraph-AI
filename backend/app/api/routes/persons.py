from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Person, Alert, Phone, Vehicle, Location, Organization, CDRRecord, TransactionRecord
from backend.app.schemas.api_schemas import PersonOut, PersonDetailOut, PriorityFactor
from scoring.priority_scorer import priority_scorer

router = APIRouter(prefix="/persons", tags=["Persons"])

@router.get("", response_model=List[PersonOut])
def list_persons(db: Session = Depends(get_db)):
    persons = db.query(Person).order_by(Person.priority_score.desc()).all()
    return persons

@router.get("/{person_id}", response_model=PersonDetailOut)
def get_person_details(person_id: str, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.person_id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found.")

    # 1. Graph Metrics & Centrality
    centralities = graph_store.calculate_centralities()
    p_cent = centralities.get(person_id, {})
    communities = graph_store.detect_communities()
    p_comm = communities.get(person_id, 1)
    bridges = graph_store.find_bridge_nodes()
    is_bridge = any(b.node_id == person_id for b in bridges)

    # 2. Extract Connected Entities from Graph Store
    sub_graph = graph_store.get_subgraph(person_id, max_hops=1)
    
    associated_cases = []
    phones = []
    vehicles = []
    organizations = []
    locations = []
    connections = []

    for node in sub_graph.nodes:
        if node.id == person_id:
            continue
        if node.type == "Case":
            associated_cases.append({"case_id": node.id, "title": node.label})
        elif node.type == "Phone":
            phones.append({"phone_id": node.id, "number": node.label, "is_burner": node.properties.get("is_burner", False), "operator": node.properties.get("operator", "")})
        elif node.type == "Vehicle":
            vehicles.append({"vehicle_id": node.id, "plate_number": node.label, "make": node.properties.get("make", ""), "model": node.properties.get("model", "")})
        elif node.type == "Organization":
            organizations.append({"org_id": node.id, "name": node.label, "org_type": node.properties.get("org_type", "")})
        elif node.type == "Location":
            locations.append({"location_id": node.id, "name": node.label, "address": node.properties.get("address", "")})
        elif node.type == "Person":
            connections.append({
                "person_id": node.id,
                "name": node.label,
                "role": node.properties.get("role", ""),
                "priority_score": int(node.properties.get("priority_score", 0))
            })

    # 3. Active Alerts
    alerts = db.query(Alert).filter(Alert.entity_id == person_id).all()
    alert_dicts = [
        {
            "alert_id": a.alert_id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "reason": a.reason,
            "supporting_evidence_id": a.supporting_evidence_id,
            "confidence": a.confidence
        }
        for a in alerts
    ]

    # 4. Calculate Detailed Priority Score & Factor Breakdown
    all_cdrs = db.query(CDRRecord).filter((CDRRecord.caller_id == person_id) | (CDRRecord.receiver_id == person_id)).all()
    all_txs = db.query(TransactionRecord).filter((TransactionRecord.sender_id == person_id) | (TransactionRecord.receiver_id == person_id)).all()
    
    # Map person case associations
    case_ids = [c["case_id"] for c in associated_cases]

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

    final_score = person.priority_score if person.priority_score and person.priority_score > 0 else float(score_data["score"])
    factors = [PriorityFactor(**f) for f in score_data["factors"]]

    return PersonDetailOut(
        person_id=person.person_id,
        name=person.name,
        aliases=person.aliases,
        dob=person.dob,
        nationality=person.nationality,
        role=person.role,
        primary_location=person.primary_location,
        risk_level=person.risk_level,
        avatar_url=person.avatar_url,
        priority_score=final_score,
        associated_cases=associated_cases,
        phones=phones,
        vehicles=vehicles,
        organizations=organizations,
        locations=locations,
        connections=connections,
        degree_centrality=round(p_cent.get("degree_centrality", 0.0), 3),
        betweenness_centrality=round(p_cent.get("betweenness", 0.0), 3),
        pagerank=round(p_cent.get("pagerank", 0.0), 4),
        community_id=p_comm,
        priority_factors=factors,
        priority_explanation=score_data["explanation"],
        active_alerts=alert_dicts,
        disclaimer="This is an analytical prioritization score, not a determination of guilt or criminality."
    )
