import os
import csv
import io
import shutil
import tempfile
from datetime import datetime
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db, SessionLocal
from backend.app.core.config import settings
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import (
    Case, Person, Phone, Vehicle, Location, Organization,
    Document, Evidence, Alert, CDRRecord, TransactionRecord
)
from backend.app.schemas.api_schemas import IngestStatusResponse

import sys
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
for p in [ROOT_DIR, AI_ENGINE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

# Tracks the last pipeline run result in-process (simple; no DB persistence needed)
_last_ingest_status: dict = {"status": "idle", "message": "No ingestion run yet.", "run_at": None}


def _run_pipeline_from_dir(import_dir: str, db: Session) -> IngestStatusResponse:
    """
    Core ingestion logic: load all CSV files from import_dir into Postgres + Neo4j graph.
    This is what master_pipeline.py does, but callable directly from the API.
    """
    global _last_ingest_status

    counts = {
        "cases": 0, "persons": 0, "phones": 0, "vehicles": 0,
        "locations": 0, "organizations": 0, "relationships": 0,
        "cdrs": 0, "transactions": 0, "documents": 0, "alerts": 0
    }
    errors: List[str] = []

    def read_csv(filename):
        path = os.path.join(import_dir, filename)
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return list(csv.DictReader(f))
        except Exception as e:
            errors.append(f"{filename}: {e}")
            return []

    # ---- 1. Cases ----
    for c in read_csv("cases.csv"):
        if not c.get("case_id") or not c.get("title"):
            errors.append(f"cases.csv: skipping row missing case_id or title"); continue
        if not db.query(Case).filter(Case.case_id == c["case_id"]).first():
            try:
                reg = datetime.strptime(c["date_registered"], "%Y-%m-%d") if c.get("date_registered") else None
                inc = datetime.strptime(c["incident_date"], "%Y-%m-%d") if c.get("incident_date") else None
                db.add(Case(
                    case_id=c["case_id"], title=c["title"], description=c.get("description"),
                    case_type=c.get("case_type"), status=c.get("status", "Active Investigation"),
                    priority=c.get("priority", "Medium"), lead_officer=c.get("lead_officer"),
                    date_registered=reg, incident_date=inc,
                    estimated_value=float(c["estimated_value"]) if c.get("estimated_value") else None
                ))
                counts["cases"] += 1
            except Exception as e:
                errors.append(f"cases.csv [{c.get('case_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=c["case_id"], label=f"{c['case_id']}: {c['title']}", node_type="Case",
            properties={"title": c.get("title",""), "case_type": c.get("case_type",""),
                        "status": c.get("status",""), "priority": c.get("priority","")}
        )
    db.commit()

    # ---- 2. Persons ----
    for p in read_csv("persons.csv"):
        if not p.get("person_id") or not p.get("name"):
            errors.append("persons.csv: skipping row missing person_id or name"); continue
        if not db.query(Person).filter(Person.person_id == p["person_id"]).first():
            try:
                dob = datetime.strptime(p["dob"], "%Y-%m-%d").date() if p.get("dob") else None
                db.add(Person(
                    person_id=p["person_id"], name=p["name"], aliases=p.get("aliases"),
                    dob=dob, nationality=p.get("nationality"), role=p.get("role"),
                    primary_location=p.get("primary_location"), risk_level=p.get("risk_level","Medium"),
                    priority_score=0.0
                ))
                counts["persons"] += 1
            except Exception as e:
                errors.append(f"persons.csv [{p.get('person_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=p["person_id"], label=p["name"], node_type="Person",
            properties={"aliases": p.get("aliases",""), "role": p.get("role",""),
                        "primary_location": p.get("primary_location",""),
                        "risk_level": p.get("risk_level","Medium"), "nationality": p.get("nationality","")}
        )
        # Link Person -> Location if primary_location is a node ID
        if p.get("primary_location"):
            graph_store.add_relationship_edge(
                f"loc-{p['person_id']}", p["person_id"], p["primary_location"], "LOCATED_AT"
            )
        # Link Person -> Case from linked_cases column
        linked = p.get("linked_cases", "")
        if linked:
            for case_id in [x.strip() for x in linked.split(",") if x.strip()]:
                graph_store.add_relationship_edge(
                    f"case-{p['person_id']}-{case_id}", p["person_id"], case_id, "SUSPECT_IN"
                )
    db.commit()

    # ---- 3. Phones ----
    for ph in read_csv("phones.csv"):
        if not ph.get("phone_id") or not ph.get("phone_number"):
            continue
        # Support both column name variants: 'registered_owner_id' and 'registered_owner'
        owner_id = ph.get("registered_owner_id") or ph.get("registered_owner")
        if not db.query(Phone).filter(Phone.phone_id == ph["phone_id"]).first():
            try:
                db.add(Phone(
                    phone_id=ph["phone_id"], phone_number=ph["phone_number"], imei=ph.get("imei"),
                    imsi=ph.get("imsi"), telecom_circle=ph.get("telecom_circle"), operator=ph.get("operator"),
                    registered_owner=owner_id,
                    is_burner=(ph.get("is_burner","").strip().lower() in ("true","1","yes"))
                ))
                counts["phones"] += 1
            except Exception as e:
                errors.append(f"phones.csv [{ph.get('phone_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=ph["phone_id"], label=ph["phone_number"], node_type="Phone",
            properties={"operator": ph.get("operator",""), "is_burner": ph.get("is_burner",""),
                        "registered_owner": owner_id or ""}
        )
        # Link Phone -> Person in the graph
        if owner_id:
            graph_store.add_relationship_edge(
                f"own-{ph['phone_id']}", owner_id, ph["phone_id"], "OWNS_PHONE"
            )
    db.commit()

    # ---- 4. Vehicles ----
    for v in read_csv("vehicles.csv"):
        if not v.get("vehicle_id") or not v.get("plate_number"):
            continue
        # Support both column name variants
        owner_id = v.get("registered_owner_id") or v.get("registered_owner")
        if not db.query(Vehicle).filter(Vehicle.vehicle_id == v["vehicle_id"]).first():
            try:
                db.add(Vehicle(
                    vehicle_id=v["vehicle_id"], plate_number=v["plate_number"], make=v.get("make"),
                    model=v.get("model"), color=v.get("color"), registered_owner=owner_id,
                    vehicle_type=v.get("vehicle_type")
                ))
                counts["vehicles"] += 1
            except Exception as e:
                errors.append(f"vehicles.csv [{v.get('vehicle_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=v["vehicle_id"], label=v["plate_number"], node_type="Vehicle",
            properties={"make": v.get("make",""), "model": v.get("model",""),
                        "color": v.get("color",""), "vehicle_type": v.get("vehicle_type",""),
                        "registered_owner": owner_id or ""}
        )
        # Link Vehicle -> Person in the graph
        if owner_id:
            graph_store.add_relationship_edge(
                f"own-{v['vehicle_id']}", owner_id, v["vehicle_id"], "OWNS_VEHICLE"
            )
    db.commit()

    # ---- 5. Locations ----
    for l in read_csv("locations.csv"):
        if not l.get("location_id") or not l.get("name"):
            continue
        if not db.query(Location).filter(Location.location_id == l["location_id"]).first():
            try:
                db.add(Location(
                    location_id=l["location_id"], name=l["name"], address=l.get("address"),
                    latitude=float(l["latitude"]) if l.get("latitude") else None,
                    longitude=float(l["longitude"]) if l.get("longitude") else None,
                    location_type=l.get("location_type")
                ))
                counts["locations"] += 1
            except Exception as e:
                errors.append(f"locations.csv [{l.get('location_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=l["location_id"], label=l["name"], node_type="Location",
            properties={"address": l.get("address",""), "location_type": l.get("location_type","")}
        )
    db.commit()

    # ---- 6. Organizations ----
    for o in read_csv("organizations.csv"):
        if not o.get("org_id") or not o.get("name"):
            continue
        if not db.query(Organization).filter(Organization.org_id == o["org_id"]).first():
            try:
                db.add(Organization(
                    org_id=o["org_id"], name=o["name"], registration_no=o.get("registration_no"),
                    jurisdiction=o.get("jurisdiction"), org_type=o.get("org_type"),
                    flagged_status=o.get("flagged_status")
                ))
                counts["organizations"] += 1
            except Exception as e:
                errors.append(f"organizations.csv [{o.get('org_id')}]: {e}")
        graph_store.add_entity_node(
            node_id=o["org_id"], label=o["name"], node_type="Organization",
            properties={"org_type": o.get("org_type",""), "flagged_status": o.get("flagged_status","")}
        )
    db.commit()

    # ---- 7. Relationships ----
    for r in read_csv("relationships.csv"):
        if not r.get("source_id") or not r.get("target_id"):
            continue
        try:
            rel_id = r.get("rel_id") or f"REL-{r['source_id']}-{r['target_id']}"
            graph_store.add_relationship_edge(
                edge_id=rel_id, source_id=r["source_id"], target_id=r["target_id"],
                relationship_type=r.get("relationship_type","RELATED_TO"),
                confidence=float(r.get("confidence",1.0)),
                date=r.get("date",""), evidence_id=r.get("evidence_id",""), notes=r.get("notes","")
            )
            counts["relationships"] += 1
        except Exception as e:
            errors.append(f"relationships.csv: {e}")

    # ---- 8. CDRs ----
    cdr_data = read_csv("cdr.csv")
    for c in cdr_data:
        if not c.get("cdr_id"):
            continue
        if not db.query(CDRRecord).filter(CDRRecord.cdr_id == c["cdr_id"]).first():
            try:
                # Parse ISO 8601 (e.g. 2026-09-01T10:00:00Z) or plain datetime
                raw_ts = c.get("timestamp","")
                ts = None
                if raw_ts:
                    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                        try: ts = datetime.strptime(raw_ts, fmt); break
                        except ValueError: pass
                db.add(CDRRecord(
                    cdr_id=c["cdr_id"], caller_id=c.get("caller_id"), caller_phone=c.get("caller_phone",""),
                    receiver_id=c.get("receiver_id"), receiver_phone=c.get("receiver_phone",""),
                    timestamp=ts, duration_sec=int(c["duration_sec"]) if c.get("duration_sec") else None,
                    cell_tower_location=c.get("cell_tower_start") or c.get("cell_tower_location"),
                    call_type=c.get("call_type"), flagged_status=c.get("flagged_status")
                ))
                counts["cdrs"] += 1
                # Add edge in graph: caller -> receiver
                if c.get("caller_id") and c.get("receiver_id"):
                    graph_store.add_relationship_edge(
                        c["cdr_id"], c["caller_id"], c["receiver_id"], "CALL",
                        date=raw_ts, notes=f"{c.get('duration_sec','?')}s {c.get('call_type','')}"
                    )
            except Exception as e:
                errors.append(f"cdr.csv [{c.get('cdr_id')}]: {e}")
    db.commit()

    # ---- 9. Transactions ----
    tx_data = read_csv("transactions.csv")
    for t in tx_data:
        if not t.get("tx_id"):
            continue
        if not db.query(TransactionRecord).filter(TransactionRecord.tx_id == t["tx_id"]).first():
            try:
                raw_ts = t.get("timestamp","")
                ts = None
                if raw_ts:
                    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                        try: ts = datetime.strptime(raw_ts, fmt); break
                        except ValueError: pass
                db.add(TransactionRecord(
                    tx_id=t["tx_id"], sender_id=t.get("sender_id"), sender_name=t.get("sender_name"),
                    receiver_id=t.get("receiver_id"), receiver_name=t.get("receiver_name"),
                    amount=float(t.get("amount",0.0)), currency=t.get("currency","INR"),
                    channel=t.get("channel"), bank_reference=t.get("bank_reference"), timestamp=ts,
                    category=t.get("category"), flagged_status=t.get("flagged_status"),
                    anomaly_multiplier=t.get("anomaly_multiplier")
                ))
                counts["transactions"] += 1
                # Add edge in graph: sender -> receiver
                if t.get("sender_id") and t.get("receiver_id"):
                    graph_store.add_relationship_edge(
                        t["tx_id"], t["sender_id"], t["receiver_id"], "TRANSFER",
                        date=raw_ts, notes=f"{t.get('amount','?')} {t.get('currency','INR')}"
                    )
            except Exception as e:
                errors.append(f"transactions.csv [{t.get('tx_id')}]: {e}")
    db.commit()

    # ---- 10. Unstructured reports ----
    for r in read_csv("reports.csv"):
        if not r.get("report_id") or not r.get("title"):
            continue
        doc_file = os.path.join(import_dir, r.get("filename",""))
        doc_text = ""
        if os.path.exists(doc_file):
            try:
                with open(doc_file, "r", encoding="utf-8", errors="ignore") as f:
                    doc_text = f.read()
            except Exception:
                pass
        if not db.query(Document).filter(Document.document_id == r["report_id"]).first():
            try:
                from nlp.entity_extractor import entity_extractor
                extracted = entity_extractor.extract_entities(doc_text, source_doc=r["report_id"])
                db.add(Document(
                    document_id=r["report_id"], case_id=r.get("case_id"), title=r["title"],
                    filename=r.get("filename"), source_agency=r.get("source_agency"),
                    author=r.get("author"), content=doc_text,
                    content_summary=r.get("content_summary") or (doc_text[:200]+"..." if doc_text else ""),
                    classification=r.get("classification"), extracted_entities=extracted
                ))
                counts["documents"] += 1
                # Sync extracted entities to graph
                _sync_extracted_to_graph(extracted, doc_id=r["report_id"])
            except Exception as e:
                errors.append(f"reports.csv [{r.get('report_id')}]: {e}")
    db.commit()

    # ---- 11. Evidence catalog ----
    for ev in read_csv("evidence.csv"):
        if not ev.get("evidence_id") or not ev.get("title"):
            continue
        if not db.query(Evidence).filter(Evidence.evidence_id == ev["evidence_id"]).first():
            try:
                db.add(Evidence(
                    evidence_id=ev["evidence_id"], case_id=ev.get("case_id"), title=ev["title"],
                    evidence_type=ev.get("evidence_type","DOCUMENT"),
                    source_record=ev.get("source_record", ev["evidence_id"]),
                    description=ev.get("description"),
                    confidence=float(ev.get("confidence",1.0))
                ))
            except Exception as e:
                errors.append(f"evidence.csv [{ev.get('evidence_id')}]: {e}")
    db.commit()

    # ---- 12. Anomaly detection → Alerts ----
    try:
        import traceback as _tb
        from anomaly_detection.transaction_anomaly import tx_anomaly_detector
        from anomaly_detection.cdr_anomaly import cdr_anomaly_detector

        print(f"[Anomaly] Running detectors on {len(tx_data)} transactions, {len(cdr_data)} CDR records...")
        anomalies = (
            tx_anomaly_detector.detect_anomalies(tx_data)
            + cdr_anomaly_detector.detect_anomalies(cdr_data)
        )
        print(f"[Anomaly] Detectors produced {len(anomalies)} raw anomaly signals.")

        for anom in anomalies:
            # UUID-based IDs mean this check is a safety net only, not a blocker
            if not db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first():
                db.add(Alert(
                    alert_id=anom["alert_id"],
                    entity_id=anom["entity_id"],
                    entity_type=anom["entity_type"],
                    case_id=anom.get("case_id"),
                    alert_type=anom["alert_type"],
                    severity=anom["severity"],
                    reason=anom["reason"],
                    supporting_evidence_id=anom.get("supporting_evidence_id"),
                    supporting_records=anom.get("supporting_records"),
                    confidence=anom.get("confidence", 0.9),
                    status="ACTIVE",
                ))
                counts["alerts"] += 1
        db.commit()
        print(f"[Anomaly] {counts['alerts']} new alert(s) written to DB.")
    except Exception as e:
        tb = _tb.format_exc()
        err_msg = f"Anomaly detection error: {e}"
        print(f"[Anomaly][ERROR] {err_msg}\n{tb}")
        errors.append(err_msg)

    # ---- 13. Priority scoring ----
    try:
        from scoring.priority_scorer import priority_scorer
        centralities = graph_store.calculate_centralities()
        bridges = {b.node_id for b in graph_store.find_bridge_nodes()}
        all_alerts = [{"entity_id": a.entity_id, "alert_type": a.alert_type,
                       "severity": a.severity, "supporting_evidence_id": a.supporting_evidence_id}
                      for a in db.query(Alert).all()]
        for p in db.query(Person).all():
            p_id = p.person_id
            sub = graph_store.get_subgraph(p_id, max_hops=2)
            case_ids = [n.id for n in sub.nodes if n.type == "Case"]
            score_res = priority_scorer.calculate_priority_score(
                person_id=p_id,
                graph_metrics={
                    "betweenness": centralities.get(p_id,{}).get("betweenness",0.0),
                    "degree": graph_store.undirected_graph.degree(p_id) if graph_store.undirected_graph.has_node(p_id) else 0,
                    "is_bridge": p_id in bridges
                },
                associated_cases=case_ids, alerts=all_alerts,
                cdrs=[{"cdr_id": c.cdr_id, "caller_id": c.caller_id,
                       "timestamp": c.timestamp.isoformat() if c.timestamp else None,
                       "flagged_status": c.flagged_status}
                      for c in db.query(CDRRecord).filter(
                          (CDRRecord.caller_id==p_id)|(CDRRecord.receiver_id==p_id)).all()],
                transactions=[{"tx_id": t.tx_id, "sender_id": t.sender_id,
                                "amount": float(t.amount or 0), "flagged_status": t.flagged_status}
                               for t in db.query(TransactionRecord).filter(
                                   (TransactionRecord.sender_id==p_id)|(TransactionRecord.receiver_id==p_id)).all()]
            )
            p.priority_score = score_res["score"]
        db.commit()
    except Exception as e:
        errors.append(f"Priority scoring error: {e}")

    status = "success" if not errors else ("partial" if counts["cases"] + counts["persons"] > 0 else "error")
    result = IngestStatusResponse(
        status=status,
        cases_loaded=counts["cases"], persons_loaded=counts["persons"],
        phones_loaded=counts["phones"], vehicles_loaded=counts["vehicles"],
        locations_loaded=counts["locations"], organizations_loaded=counts["organizations"],
        relationships_loaded=counts["relationships"], cdrs_loaded=counts["cdrs"],
        transactions_loaded=counts["transactions"], documents_loaded=counts["documents"],
        alerts_generated=counts["alerts"], errors=errors[:20],
        message=f"Ingestion complete. {sum(counts.values())} total records processed."
    )
    _last_ingest_status = {**result.model_dump(), "run_at": datetime.utcnow().isoformat()}
    return result


def _sync_extracted_to_graph(entities: list, doc_id: str):
    """Push NLP-extracted entities into the graph store."""
    type_map = {
        "PERSON": "Person", "LOCATION": "Location", "ORGANIZATION": "Organization",
        "PHONE": "Phone", "VEHICLE": "Vehicle"
    }
    for i, ent in enumerate(entities or []):
        mapped = type_map.get(ent.get("entity_type",""))
        if not mapped:
            continue
        node_id = f"NLP-{doc_id}-{i}"
        try:
            graph_store.add_entity_node(
                node_id=node_id,
                label=ent.get("normalized_value", ent.get("extracted_text","")),
                node_type=mapped,
                properties={"source": "nlp_extraction", "doc_id": doc_id,
                            "confidence": ent.get("confidence",0.8),
                            "extracted_text": ent.get("extracted_text","")}
            )
        except Exception:
            pass


# ---- API Endpoints ----

@router.post("/csv", response_model=IngestStatusResponse)
async def ingest_csv_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload one or more CSV files (cases.csv, persons.csv, cdr.csv, transactions.csv, etc.)
    and trigger the full ingestion pipeline: Postgres → Neo4j → anomaly detection → priority scoring.
    Files must match the schema documented in data/import/README.md.
    """
    tmp_dir = tempfile.mkdtemp(prefix="crimegraph_ingest_")
    try:
        for upload in files:
            dest = os.path.join(tmp_dir, upload.filename)
            with open(dest, "wb") as f:
                shutil.copyfileobj(upload.file, f)
        result = _run_pipeline_from_dir(tmp_dir, db)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    return result


@router.post("/trigger", response_model=IngestStatusResponse)
def trigger_pipeline_from_import_dir(db: Session = Depends(get_db)):
    """
    Trigger ingestion from files already dropped in data/import/ directory.
    Use this when you've manually placed CSV files in the import folder.
    """
    import_dir = settings.IMPORT_DIR
    if not os.path.isdir(import_dir):
        raise HTTPException(status_code=404, detail=f"Import directory not found: {import_dir}")
    return _run_pipeline_from_dir(import_dir, db)


@router.get("/status")
def get_ingest_status():
    """Returns the result of the most recent ingestion run."""
    return _last_ingest_status


@router.delete("/reset")
def reset_all_data(db: Session = Depends(get_db), confirm: bool = False):
    """
    DANGER: Deletes all records from all tables and clears the Neo4j graph.
    Requires confirm=true query parameter.
    """
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to confirm this destructive action.")
    try:
        from backend.app.core.neo4j_client import neo4j_client
        for model in [Alert, Evidence, Document, CDRRecord, TransactionRecord,
                      Person, Phone, Vehicle, Location, Organization, Case]:
            db.query(model).delete()
        db.commit()
        neo4j_client.clear_all()
        graph_store.clear()
        return {"status": "success", "message": "All data cleared from Postgres and Neo4j."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebuild_graph")
def rebuild_graph_from_postgres(db: Session = Depends(get_db)):
    """
    Clears Neo4j and rebuilds the knowledge graph from Postgres data.
    Automatically infers relationships from CDR and Transaction records.
    """
    try:
        from backend.app.core.neo4j_client import neo4j_client
        neo4j_client.clear_all()
        graph_store.clear()
        
        # 1. Recreate Nodes
        for c in db.query(Case).all():
            graph_store.add_entity_node(c.case_id, f"{c.case_id}: {c.title}", "Case", {"title": c.title, "case_type": c.case_type, "status": c.status, "priority": c.priority})
            
        for p in db.query(Person).all():
            graph_store.add_entity_node(p.person_id, p.name, "Person", {"aliases": p.aliases, "role": p.role, "primary_location": p.primary_location, "risk_level": p.risk_level, "nationality": p.nationality})
            
        for ph in db.query(Phone).all():
            graph_store.add_entity_node(ph.phone_id, ph.phone_number, "Phone", {"operator": ph.operator, "is_burner": ph.is_burner, "registered_owner": ph.registered_owner})
            
        for v in db.query(Vehicle).all():
            graph_store.add_entity_node(v.vehicle_id, v.plate_number, "Vehicle", {"make": v.make, "model": v.model, "color": v.color, "vehicle_type": v.vehicle_type})
            
        for l in db.query(Location).all():
            graph_store.add_entity_node(l.location_id, l.name, "Location", {"address": l.address, "location_type": l.location_type})
            
        for o in db.query(Organization).all():
            graph_store.add_entity_node(o.org_id, o.name, "Organization", {"org_type": o.org_type, "flagged_status": o.flagged_status})
        
        for d in db.query(Document).all():
            graph_store.add_entity_node(
                d.document_id,
                d.title,
                "Document",
                {"filename": d.filename, "file_type": d.file_type, "case_id": d.case_id}
            )
            # Link Document to its Case
            if d.case_id:
                graph_store.add_relationship_edge(
                    f"doc-case-{d.document_id}", d.document_id, d.case_id, "BELONGS_TO_CASE"
                )
            
        # 2. Recreate Ownership & Structural Relationships
        # Person -> Location
        for p in db.query(Person).all():
            if p.primary_location:
                # Often people use names or IDs. We link them directly via edge.
                graph_store.add_relationship_edge(f"loc-{p.person_id}", p.person_id, p.primary_location, "LOCATED_AT")

        # Phone -> Person (registered_owner stores the person_id)
        for ph in db.query(Phone).all():
            if ph.registered_owner:
                graph_store.add_relationship_edge(
                    f"own-{ph.phone_id}", ph.registered_owner, ph.phone_id, "OWNS_PHONE"
                )

        # Vehicle -> Person
        for v in db.query(Vehicle).all():
            if v.registered_owner:
                graph_store.add_relationship_edge(
                    f"own-{v.vehicle_id}", v.registered_owner, v.vehicle_id, "OWNS_VEHICLE"
                )

        # Person -> Case (from CDR and TX data, persons who called/sent money are suspects)
        from sqlalchemy import distinct
        for cdr in db.query(CDRRecord).all():
            if cdr.caller_id and cdr.receiver_id:
                graph_store.add_relationship_edge(
                    cdr.cdr_id, cdr.caller_id, cdr.receiver_id, "CALL",
                    date=cdr.timestamp.isoformat() if cdr.timestamp else "",
                    notes=f"{cdr.duration_sec}s {cdr.call_type}"
                )
        for tx in db.query(TransactionRecord).all():
            if tx.sender_id and tx.receiver_id:
                graph_store.add_relationship_edge(
                    tx.tx_id, tx.sender_id, tx.receiver_id, "TRANSFER",
                    date=tx.timestamp.isoformat() if tx.timestamp else "",
                    notes=f"{tx.amount} {tx.currency}"
                )

        return {"status": "success", "message": "Graph rebuilt successfully from Postgres database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
