import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
import sys, os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
for p in [ROOT_DIR, AI_ENGINE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from nlp.entity_linker import entity_linker
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import (
    Case, Person, Phone, Vehicle, Location, Organization,
    CDRRecord, TransactionRecord, Alert, Evidence
)
from backend.app.schemas.api_schemas import (
    CaseCreateRequest, PersonCreateRequest, PhoneCreateRequest,
    VehicleCreateRequest, LocationCreateRequest,
    CDRCreateRequest, TransactionCreateRequest, RelationshipCreateRequest
)

router = APIRouter(prefix="/create", tags=["Create Records"])


def _make_id(prefix: str, db_count: int) -> str:
    return f"{prefix}-{db_count+1:04d}"


# ---- Cases ----

@router.post("/case")
def create_case(req: CaseCreateRequest, db: Session = Depends(get_db)):
    """Create a new case record in Postgres and add it to the knowledge graph."""
    case_id = req.case_id or _make_id("CASE", db.query(Case).count())
    if db.query(Case).filter(Case.case_id == case_id).first():
        raise HTTPException(status_code=409, detail=f"Case {case_id} already exists.")

    reg = datetime.strptime(req.date_registered, "%Y-%m-%d") if req.date_registered else None
    inc = datetime.strptime(req.incident_date, "%Y-%m-%d") if req.incident_date else None

    case = Case(
        case_id=case_id, title=req.title, description=req.description,
        case_type=req.case_type, status=req.status or "Active Investigation",
        priority=req.priority or "Medium", lead_officer=req.lead_officer,
        date_registered=reg, incident_date=inc,
        estimated_value=req.estimated_value
    )
    db.add(case)
    db.commit()

    graph_store.add_entity_node(
        node_id=case_id, label=f"{case_id}: {req.title}", node_type="Case",
        properties={"title": req.title, "case_type": req.case_type or "",
                    "status": req.status or "Active Investigation",
                    "priority": req.priority or "Medium",
                    "lead_officer": req.lead_officer or ""}
    )
    return {"case_id": case_id, "message": f"Case {case_id} created successfully."}


# ---- Persons ----

@router.post("/person")
def create_person(req: PersonCreateRequest, db: Session = Depends(get_db)):
    """Create a new person record in Postgres and add to graph."""
    person_id = req.person_id or _make_id("P", db.query(Person).count())
    if db.query(Person).filter(Person.person_id == person_id).first():
        raise HTTPException(status_code=409, detail=f"Person {person_id} already exists.")

    dob = datetime.strptime(req.dob, "%Y-%m-%d").date() if req.dob else None
    person = Person(
        person_id=person_id, name=req.name, aliases=req.aliases, dob=dob,
        nationality=req.nationality, role=req.role, primary_location=req.primary_location,
        risk_level=req.risk_level or "Medium", avatar_url=req.avatar_url, priority_score=0.0
    )
    db.add(person)
    db.commit()

    graph_store.add_entity_node(
        node_id=person_id, label=req.name, node_type="Person",
        properties={"aliases": req.aliases or "", "role": req.role or "",
                    "primary_location": req.primary_location or "",
                    "risk_level": req.risk_level or "Medium",
                    "nationality": req.nationality or ""}
    )
    
    try:
        entity_linker.link_sql_to_nlp(person_id, req.name, "PERSON")
    except Exception as e:
        print(f"Auto-linking failed: {e}")
        
    return {"person_id": person_id, "message": f"Person {person_id} ({req.name}) created."}


# ---- Phones ----

@router.post("/phone")
def create_phone(req: PhoneCreateRequest, db: Session = Depends(get_db)):
    """Create a phone record in Postgres and add to graph."""
    phone_id = req.phone_id or _make_id("PH", db.query(Phone).count())
    if db.query(Phone).filter(Phone.phone_id == phone_id).first():
        raise HTTPException(status_code=409, detail=f"Phone {phone_id} already exists.")
    if db.query(Phone).filter(Phone.phone_number == req.phone_number).first():
        raise HTTPException(status_code=409, detail=f"Phone number {req.phone_number} already registered.")

    phone = Phone(
        phone_id=phone_id, phone_number=req.phone_number, imei=req.imei,
        imsi=req.imsi, telecom_circle=req.telecom_circle, operator=req.operator,
        registered_owner=req.registered_owner, is_burner=req.is_burner or False
    )
    db.add(phone)
    db.commit()

    graph_store.add_entity_node(
        node_id=phone_id, label=req.phone_number, node_type="Phone",
        properties={"operator": req.operator or "", "is_burner": req.is_burner or False,
                    "registered_owner": req.registered_owner or ""}
    )
    
    try:
        entity_linker.link_sql_to_nlp(phone_id, req.phone_number, "PHONE")
    except Exception as e:
        print(f"Auto-linking failed: {e}")

    return {"phone_id": phone_id, "message": f"Phone {phone_id} created."}


# ---- CDR Records ----

@router.post("/cdr")
def create_cdr(req: CDRCreateRequest, db: Session = Depends(get_db)):
    """Create a single CDR record and run anomaly detection."""
    cdr_id = req.cdr_id or _make_id("CDR", db.query(CDRRecord).count())
    if db.query(CDRRecord).filter(CDRRecord.cdr_id == cdr_id).first():
        raise HTTPException(status_code=409, detail=f"CDR {cdr_id} already exists.")

    ts = None
    if req.timestamp:
        try:
            ts = datetime.strptime(req.timestamp, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = datetime.strptime(req.timestamp, "%Y-%m-%dT%H:%M:%S")

    cdr = CDRRecord(
        cdr_id=cdr_id, caller_id=req.caller_id, caller_phone=req.caller_phone,
        receiver_id=req.receiver_id, receiver_phone=req.receiver_phone,
        timestamp=ts, duration_sec=req.duration_sec,
        cell_tower_location=req.cell_tower_location,
        call_type=req.call_type, flagged_status=req.flagged_status
    )
    db.add(cdr)
    db.commit()

    # Auto-link callers in graph if person IDs provided
    if req.caller_id and req.receiver_id:
        try:
            graph_store.add_relationship_edge(
                edge_id=f"CDR-EDGE-{cdr_id}",
                source_id=req.caller_id, target_id=req.receiver_id,
                relationship_type="CALLED",
                confidence=0.99,
                date=req.timestamp or "",
                evidence_id=cdr_id,
                notes=f"Duration: {req.duration_sec}s | Tower: {req.cell_tower_location or 'N/A'}"
            )
        except Exception:
            pass  # Nodes may not exist yet

    # Run CDR anomaly detection on this new record
    alerts_created = 0
    try:
        from anomaly_detection.cdr_anomaly import cdr_anomaly_detector
        cdr_dict = {
            "cdr_id": cdr_id, "caller_id": req.caller_id, "caller_phone": req.caller_phone,
            "receiver_id": req.receiver_id, "receiver_phone": req.receiver_phone,
            "timestamp": req.timestamp, "duration_sec": req.duration_sec,
            "call_type": req.call_type, "flagged_status": req.flagged_status
        }
        anomalies = cdr_anomaly_detector.detect_anomalies([cdr_dict])
        for anom in anomalies:
            if not db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first():
                db.add(Alert(
                    alert_id=anom["alert_id"], entity_id=anom["entity_id"],
                    entity_type=anom["entity_type"], case_id=anom.get("case_id"),
                    alert_type=anom["alert_type"], severity=anom["severity"],
                    reason=anom["reason"], confidence=anom.get("confidence", 0.9), status="ACTIVE"
                ))
                alerts_created += 1
        db.commit()
    except Exception:
        pass

    return {"cdr_id": cdr_id, "alerts_generated": alerts_created, "message": f"CDR {cdr_id} created."}


@router.post("/cdrs/bulk")
def create_cdrs_bulk(records: List[CDRCreateRequest], db: Session = Depends(get_db)):
    """Bulk-create CDR records and run anomaly detection on the batch."""
    created, skipped, errors = 0, 0, []
    cdr_dicts = []
    for req in records:
        try:
            cdr_id = req.cdr_id or _make_id("CDR", db.query(CDRRecord).count() + created)
            if db.query(CDRRecord).filter(CDRRecord.cdr_id == cdr_id).first():
                skipped += 1; continue
            ts = None
            if req.timestamp:
                try:
                    ts = datetime.strptime(req.timestamp, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    ts = datetime.strptime(req.timestamp, "%Y-%m-%dT%H:%M:%S")
            db.add(CDRRecord(
                cdr_id=cdr_id, caller_id=req.caller_id, caller_phone=req.caller_phone,
                receiver_id=req.receiver_id, receiver_phone=req.receiver_phone,
                timestamp=ts, duration_sec=req.duration_sec,
                cell_tower_location=req.cell_tower_location,
                call_type=req.call_type, flagged_status=req.flagged_status
            ))
            cdr_dicts.append({
                "cdr_id": cdr_id, "caller_id": req.caller_id,
                "timestamp": req.timestamp, "flagged_status": req.flagged_status,
                "cell_tower_location": req.cell_tower_location,
            })
            created += 1
        except Exception as e:
            errors.append(str(e))
    db.commit()

    # Run CDR anomaly detection on the batch
    alerts_created = 0
    try:
        from anomaly_detection.cdr_anomaly import cdr_anomaly_detector
        anomalies = cdr_anomaly_detector.detect_anomalies(cdr_dicts)
        for anom in anomalies:
            if not db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first():
                db.add(Alert(
                    alert_id=anom["alert_id"], entity_id=anom["entity_id"],
                    entity_type=anom["entity_type"], case_id=anom.get("case_id"),
                    alert_type=anom["alert_type"], severity=anom["severity"],
                    reason=anom["reason"], supporting_evidence_id=anom.get("supporting_evidence_id"),
                    supporting_records=anom.get("supporting_records"),
                    confidence=anom.get("confidence", 0.9), status="ACTIVE",
                ))
                alerts_created += 1
        db.commit()
    except Exception as e:
        print(f"[Anomaly] CDR bulk anomaly detection error: {e}")

    return {"created": created, "skipped": skipped, "alerts_generated": alerts_created, "errors": errors[:10]}


# ---- Transaction Records ----

@router.post("/transaction")
def create_transaction(req: TransactionCreateRequest, db: Session = Depends(get_db)):
    """Create a single transaction record and run anomaly detection."""
    tx_id = req.tx_id or _make_id("TX", db.query(TransactionRecord).count())
    if db.query(TransactionRecord).filter(TransactionRecord.tx_id == tx_id).first():
        raise HTTPException(status_code=409, detail=f"Transaction {tx_id} already exists.")

    ts = None
    if req.timestamp:
        try:
            ts = datetime.strptime(req.timestamp, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            ts = datetime.strptime(req.timestamp, "%Y-%m-%dT%H:%M:%S")

    tx = TransactionRecord(
        tx_id=tx_id, sender_id=req.sender_id, sender_name=req.sender_name,
        receiver_id=req.receiver_id, receiver_name=req.receiver_name,
        amount=req.amount, currency=req.currency or "INR", channel=req.channel,
        bank_reference=req.bank_reference, timestamp=ts,
        category=req.category, flagged_status=req.flagged_status
    )
    db.add(tx)
    db.commit()

    # Auto-link sender/receiver in graph
    if req.sender_id and req.receiver_id:
        try:
            graph_store.add_relationship_edge(
                edge_id=f"TX-EDGE-{tx_id}",
                source_id=req.sender_id, target_id=req.receiver_id,
                relationship_type="TRANSFERRED_TO",
                confidence=0.99,
                date=req.timestamp or "",
                evidence_id=tx_id,
                notes=f"{req.currency or 'INR'} {req.amount:,.2f} via {req.channel or 'N/A'}"
            )
        except Exception:
            pass

    # Run anomaly detection
    alerts_created = 0
    try:
        from anomaly_detection.transaction_anomaly import tx_anomaly_detector
        tx_dict = {
            "tx_id": tx_id, "sender_id": req.sender_id, "sender_name": req.sender_name,
            "receiver_id": req.receiver_id, "receiver_name": req.receiver_name,
            "amount": req.amount, "currency": req.currency or "INR",
            "channel": req.channel, "timestamp": req.timestamp, "flagged_status": req.flagged_status
        }
        anomalies = tx_anomaly_detector.detect_anomalies([tx_dict])
        for anom in anomalies:
            if not db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first():
                db.add(Alert(
                    alert_id=anom["alert_id"], entity_id=anom["entity_id"],
                    entity_type=anom["entity_type"], case_id=anom.get("case_id"),
                    alert_type=anom["alert_type"], severity=anom["severity"],
                    reason=anom["reason"], supporting_evidence_id=anom.get("supporting_evidence_id"),
                    supporting_records=anom.get("supporting_records"),
                    confidence=anom.get("confidence", 0.9), status="ACTIVE"
                ))
                alerts_created += 1
        db.commit()
    except Exception:
        pass

    return {"tx_id": tx_id, "alerts_generated": alerts_created, "message": f"Transaction {tx_id} created."}


@router.post("/transactions/bulk")
def create_transactions_bulk(records: List[TransactionCreateRequest], db: Session = Depends(get_db)):
    """Bulk-create transaction records and run anomaly detection on the batch."""
    created, skipped, errors = 0, 0, []
    tx_dicts = []
    for req in records:
        try:
            tx_id = req.tx_id or _make_id("TX", db.query(TransactionRecord).count() + created)
            if db.query(TransactionRecord).filter(TransactionRecord.tx_id == tx_id).first():
                skipped += 1; continue
            ts = None
            if req.timestamp:
                try:
                    ts = datetime.strptime(req.timestamp, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    ts = datetime.strptime(req.timestamp, "%Y-%m-%dT%H:%M:%S")
            db.add(TransactionRecord(
                tx_id=tx_id, sender_id=req.sender_id, sender_name=req.sender_name,
                receiver_id=req.receiver_id, receiver_name=req.receiver_name,
                amount=req.amount, currency=req.currency or "INR", channel=req.channel,
                bank_reference=req.bank_reference, timestamp=ts,
                category=req.category, flagged_status=req.flagged_status
            ))
            tx_dicts.append({
                "tx_id": tx_id, "sender_id": req.sender_id, "sender_name": req.sender_name,
                "receiver_id": req.receiver_id, "receiver_name": req.receiver_name,
                "amount": req.amount, "currency": req.currency or "INR",
                "channel": req.channel, "timestamp": req.timestamp,
                "flagged_status": req.flagged_status,
            })
            created += 1
        except Exception as e:
            errors.append(str(e))
    db.commit()

    # Run transaction anomaly detection on the full batch
    alerts_created = 0
    try:
        from anomaly_detection.transaction_anomaly import tx_anomaly_detector
        anomalies = tx_anomaly_detector.detect_anomalies(tx_dicts)
        for anom in anomalies:
            if not db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first():
                db.add(Alert(
                    alert_id=anom["alert_id"], entity_id=anom["entity_id"],
                    entity_type=anom["entity_type"], case_id=anom.get("case_id"),
                    alert_type=anom["alert_type"], severity=anom["severity"],
                    reason=anom["reason"], supporting_evidence_id=anom.get("supporting_evidence_id"),
                    supporting_records=anom.get("supporting_records"),
                    confidence=anom.get("confidence", 0.9), status="ACTIVE",
                ))
                alerts_created += 1
        db.commit()
    except Exception as e:
        print(f"[Anomaly] TX bulk anomaly detection error: {e}")

    return {"created": created, "skipped": skipped, "alerts_generated": alerts_created, "errors": errors[:10]}


# ---- Relationships ----

@router.post("/relationship")
def create_relationship(req: RelationshipCreateRequest, db: Session = Depends(get_db)):
    """Create a graph relationship between two existing entities."""
    rel_id = req.rel_id or f"REL-{req.source_id}-{req.target_id}-{uuid.uuid4().hex[:6]}"
    try:
        graph_store.add_relationship_edge(
            edge_id=rel_id,
            source_id=req.source_id,
            target_id=req.target_id,
            relationship_type=req.relationship_type,
            confidence=req.confidence or 1.0,
            date=req.date or "",
            evidence_id=req.evidence_id or "",
            notes=req.notes or ""
        )
        return {"rel_id": rel_id, "message": f"Relationship {rel_id} created in knowledge graph."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Vehicles ----

@router.post("/vehicle")
def create_vehicle(req: VehicleCreateRequest, db: Session = Depends(get_db)):
    """Create a vehicle node in the knowledge graph (graph-only, no SQL table)."""
    # Derive a sequential ID from existing Vehicle nodes in the graph
    existing_vehicle_count = sum(
        1 for n in graph_store.nodes_data.values() if n.get("type") == "Vehicle"
    )
    vehicle_id = req.vehicle_id or _make_id("VH", existing_vehicle_count)

    if vehicle_id in graph_store.nodes_data:
        raise HTTPException(status_code=409, detail=f"Vehicle {vehicle_id} already exists in graph.")

    label = req.license_plate
    if req.make or req.model:
        label = f"{req.license_plate} ({req.make or ''} {req.model or ''}).strip()"

    graph_store.add_entity_node(
        node_id=vehicle_id,
        label=req.license_plate,
        node_type="Vehicle",
        properties={
            "license_plate": req.license_plate,
            "make": req.make or "",
            "model": req.model or "",
            "color": req.color or "",
            "year": req.year or "",
            "registered_owner": req.registered_owner or "",
            "notes": req.notes or "",
        }
    )

    try:
        entity_linker.link_sql_to_nlp(vehicle_id, req.license_plate, "VEHICLE")
    except Exception as e:
        print(f"Auto-linking failed: {e}")

    return {"vehicle_id": vehicle_id, "message": f"Vehicle {vehicle_id} ({req.license_plate}) created in knowledge graph."}


# ---- Locations ----

@router.post("/location")
def create_location(req: LocationCreateRequest, db: Session = Depends(get_db)):
    """Create a location record in Postgres and add it to the knowledge graph."""
    from backend.app.models.entities import Location
    location_id = req.location_id or _make_id("LOC", db.query(Location).count())
    if db.query(Location).filter(Location.location_id == location_id).first():
        raise HTTPException(status_code=409, detail=f"Location {location_id} already exists.")

    loc = Location(
        location_id=location_id,
        name=req.name,
        address=req.address,
        latitude=req.latitude,
        longitude=req.longitude,
        location_type=req.location_type,
    )
    db.add(loc)
    db.commit()

    graph_store.add_entity_node(
        node_id=location_id,
        label=req.name,
        node_type="Location",
        properties={
            "address": req.address or "",
            "latitude": req.latitude or "",
            "longitude": req.longitude or "",
            "location_type": req.location_type or "",
        }
    )

    try:
        entity_linker.link_sql_to_nlp(location_id, req.name, "LOCATION")
    except Exception as e:
        print(f"Auto-linking failed: {e}")

    return {"location_id": location_id, "message": f"Location {location_id} ({req.name}) created."}
