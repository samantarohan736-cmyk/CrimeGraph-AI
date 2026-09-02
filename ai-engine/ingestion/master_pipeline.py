import os
import csv
import json
from datetime import datetime
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.config import settings
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import (
    Case, Person, Phone, Vehicle, Location, Organization,
    Document, Evidence, Alert, EntityResolution, CDRRecord, TransactionRecord
)
from anomaly_detection.transaction_anomaly import tx_anomaly_detector
from anomaly_detection.cdr_anomaly import cdr_anomaly_detector
from scoring.priority_scorer import priority_scorer
from nlp.entity_extractor import entity_extractor

class MasterIngestionPipeline:
    """
    End-to-End Data Ingestion & Intelligence Pipeline for CrimeGraph AI.
    Handles data validation, relational persistence, graph loading, NLP extraction,
    anomaly detection, alert generation, entity resolution, and priority scoring.
    """
    def __init__(self, synthetic_dir: str = None, reports_dir: str = None):
        self.synthetic_dir = synthetic_dir or settings.SYNTHETIC_DIR
        self.reports_dir = reports_dir or settings.REPORTS_DIR

    def validate_csv(self, filename: str, required_fields_options: list) -> tuple[bool, list, list]:
        """
        Validates CSV file existence and presence of required fields.
        required_fields_options is a list where each item is either a field name or a list/tuple of alternative field names.
        """
        filepath = os.path.join(self.synthetic_dir, filename)
        if not os.path.exists(filepath):
            return False, [], [f"File not found: {filepath}"]

        records = []
        errors = []
        seen_ids = set()

        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = set(reader.fieldnames or [])
            
            for req in required_fields_options:
                if isinstance(req, (list, tuple)):
                    if not any(alt in headers for alt in req):
                        errors.append(f"[{filename}] Missing required field from alternatives {req}.")
                elif req not in headers:
                    errors.append(f"[{filename}] Missing required field '{req}'.")

            first_col = reader.fieldnames[0] if reader.fieldnames else None

            for idx, row in enumerate(reader, start=1):
                if first_col:
                    rec_id = row.get(first_col, "").strip()
                    if rec_id:
                        if rec_id in seen_ids:
                            errors.append(f"[{filename}:Row {idx}] Duplicate ID detected: '{rec_id}'.")
                        else:
                            seen_ids.add(rec_id)
                records.append(row)

        return len(errors) == 0, records, errors

    def extract_person_cases_map(self) -> dict:
        """Dynamically maps person IDs to associated Case IDs from relationships and cases."""
        person_cases_map = {}
        rel_path = os.path.join(self.synthetic_dir, "relationships.csv")
        if os.path.exists(rel_path):
            with open(rel_path, "r", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    s, t = row.get("source_id", ""), row.get("target_id", "")
                    if s.startswith("P") and t.startswith("C"):
                        person_cases_map.setdefault(s, set()).add(t)
                    elif t.startswith("P") and s.startswith("C"):
                        person_cases_map.setdefault(t, set()).add(s)

        # Convert sets to sorted lists
        return {k: sorted(list(v)) for k, v in person_cases_map.items()}

    def run(self, db: Session = None, reset_db: bool = True):
        print("\n==========================================")
        print("Starting CrimeGraph AI Master Ingestion Pipeline")
        print("==========================================")

        # 0. Load Gazetteers into NLP Entity Extractor
        entity_extractor.load_gazetteers_from_data(self.synthetic_dir)

        # Reset database tables if requested
        if reset_db:
            print("[Database] Re-creating database schema from scratch...")
            Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        try:
            # 1. Validate & Ingest Cases
            valid, cases_data, errs = self.validate_csv("cases.csv", ["case_id", "title"])
            if errs:
                print(f"[Validation Warning] Cases errors: {errs}")
            
            for c in cases_data:
                existing = db.query(Case).filter(Case.case_id == c["case_id"]).first()
                if not existing:
                    reg_date = None
                    if c.get("date_registered"):
                        try:
                            reg_date = datetime.strptime(c["date_registered"], "%Y-%m-%d")
                        except Exception:
                            pass
                    inc_date = None
                    if c.get("incident_date"):
                        try:
                            inc_date = datetime.strptime(c["incident_date"], "%Y-%m-%d")
                        except Exception:
                            pass
                    
                    est_val = None
                    if c.get("estimated_value"):
                        try:
                            est_val = float(c["estimated_value"])
                        except Exception:
                            pass

                    case_obj = Case(
                        case_id=c["case_id"],
                        title=c["title"],
                        description=c.get("description"),
                        case_type=c.get("case_type"),
                        status=c.get("status", "Active Investigation"),
                        priority=c.get("priority", "Medium"),
                        lead_officer=c.get("lead_officer"),
                        date_registered=reg_date,
                        incident_date=inc_date,
                        estimated_value=est_val
                    )
                    db.add(case_obj)
            db.commit()
            print(f"[Ingestion] Cases loaded: {len(cases_data)}")

            # 2. Validate & Ingest Persons
            valid, persons_data, errs = self.validate_csv("persons.csv", ["person_id", "name"])
            for p in persons_data:
                existing = db.query(Person).filter(Person.person_id == p["person_id"]).first()
                dob_val = None
                if p.get("dob"):
                    try:
                        dob_val = datetime.strptime(p["dob"], "%Y-%m-%d").date()
                    except Exception:
                        pass
                if not existing:
                    p_obj = Person(
                        person_id=p["person_id"],
                        name=p["name"],
                        aliases=p.get("aliases"),
                        dob=dob_val,
                        nationality=p.get("nationality"),
                        role=p.get("role"),
                        primary_location=p.get("primary_location"),
                        risk_level=p.get("risk_level", "Medium"),
                        priority_score=0.0
                    )
                    db.add(p_obj)
            db.commit()
            print(f"[Ingestion] Persons loaded: {len(persons_data)}")

            # 3. Validate & Ingest Phones
            valid, phones_data, errs = self.validate_csv("phones.csv", ["phone_id", "phone_number"])
            for ph in phones_data:
                existing = db.query(Phone).filter(Phone.phone_id == ph["phone_id"]).first()
                if not existing:
                    is_burner = ph.get("is_burner", "False") == "True" or "prepaid" in str(ph.get("plan_type", "")).lower()
                    ph_obj = Phone(
                        phone_id=ph["phone_id"],
                        phone_number=ph["phone_number"],
                        imei=ph.get("imei"),
                        imsi=ph.get("imsi"),
                        telecom_circle=ph.get("telecom_circle"),
                        operator=ph.get("operator") or ph.get("carrier"),
                        registered_owner=ph.get("registered_owner"),
                        is_burner=is_burner
                    )
                    db.add(ph_obj)
            db.commit()
            print(f"[Ingestion] Phones loaded: {len(phones_data)}")

            # 4. Vehicles
            valid, vehicles_data, errs = self.validate_csv("vehicles.csv", ["vehicle_id", "plate_number"])
            for v in vehicles_data:
                existing = db.query(Vehicle).filter(Vehicle.vehicle_id == v["vehicle_id"]).first()
                if not existing:
                    make = v.get("make") or (v.get("make_model", "").split()[0] if v.get("make_model") else "")
                    model = v.get("model") or (" ".join(v.get("make_model", "").split()[1:]) if v.get("make_model") else "")
                    v_obj = Vehicle(
                        vehicle_id=v["vehicle_id"],
                        plate_number=v["plate_number"],
                        make=make,
                        model=model,
                        color=v.get("color"),
                        registered_owner=v.get("registered_owner"),
                        vehicle_type=v.get("vehicle_type")
                    )
                    db.add(v_obj)
            db.commit()
            print(f"[Ingestion] Vehicles loaded: {len(vehicles_data)}")

            # 5. Locations
            valid, locs_data, errs = self.validate_csv("locations.csv", ["location_id", "name"])
            for l in locs_data:
                existing = db.query(Location).filter(Location.location_id == l["location_id"]).first()
                if not existing:
                    coords = [c.strip() for c in l.get("coordinates", "").split(",")] if l.get("coordinates") else []
                    lat = float(coords[0]) if len(coords) > 0 and coords[0] else (float(l["latitude"]) if l.get("latitude") else None)
                    lon = float(coords[1]) if len(coords) > 1 and coords[1] else (float(l["longitude"]) if l.get("longitude") else None)
                    
                    l_obj = Location(
                        location_id=l["location_id"],
                        name=l["name"],
                        address=l.get("address"),
                        latitude=lat,
                        longitude=lon,
                        location_type=l.get("location_type")
                    )
                    db.add(l_obj)
            db.commit()
            print(f"[Ingestion] Locations loaded: {len(locs_data)}")

            # 6. Organizations
            valid, orgs_data, errs = self.validate_csv("organizations.csv", ["org_id", "name"])
            for o in orgs_data:
                existing = db.query(Organization).filter(Organization.org_id == o["org_id"]).first()
                if not existing:
                    o_obj = Organization(
                        org_id=o["org_id"],
                        name=o["name"],
                        registration_no=o.get("registration_no") or o.get("registration_number"),
                        jurisdiction=o.get("jurisdiction"),
                        org_type=o.get("org_type") or o.get("type"),
                        flagged_status=o.get("flagged_status") or o.get("status")
                    )
                    db.add(o_obj)
            db.commit()
            print(f"[Ingestion] Organizations loaded: {len(orgs_data)}")

            # 7. CDR Records
            valid, cdr_data, errs = self.validate_csv("cdr.csv", ["cdr_id", ["caller_phone", "caller_id"]])
            for c in cdr_data:
                existing = db.query(CDRRecord).filter(CDRRecord.cdr_id == c["cdr_id"]).first()
                if not existing:
                    ts = None
                    if c.get("timestamp"):
                        try:
                            ts = datetime.strptime(c["timestamp"], "%Y-%m-%d %H:%M:%S")
                        except Exception:
                            try:
                                ts = datetime.fromisoformat(c["timestamp"])
                            except Exception:
                                pass
                    dur = int(c.get("duration_seconds") or c.get("duration_sec") or 0)
                    caller_id = c.get("caller_id")
                    callee_id = c.get("callee_id") or c.get("receiver_id")
                    tower = c.get("cell_tower") or c.get("cell_tower_location")
                    flagged = c.get("flagged_surge") or c.get("flagged_status")

                    cdr_obj = CDRRecord(
                        cdr_id=c["cdr_id"],
                        caller_id=caller_id,
                        caller_phone=c.get("caller_phone"),
                        receiver_id=callee_id,
                        receiver_phone=c.get("receiver_phone"),
                        timestamp=ts,
                        duration_sec=dur,
                        cell_tower_location=tower,
                        call_type=c.get("call_type"),
                        flagged_status=flagged
                    )
                    db.add(cdr_obj)
            db.commit()
            print(f"[Ingestion] CDR Records loaded: {len(cdr_data)}")

            # 8. Transactions
            valid, tx_data, errs = self.validate_csv("transactions.csv", ["tx_id", ["sender_name", "source_id"], "amount"])
            for t in tx_data:
                existing = db.query(TransactionRecord).filter(TransactionRecord.tx_id == t["tx_id"]).first()
                if not existing:
                    ts = None
                    if t.get("timestamp"):
                        try:
                            ts = datetime.strptime(t["timestamp"], "%Y-%m-%d %H:%M:%S")
                        except Exception:
                            try:
                                ts = datetime.fromisoformat(t["timestamp"])
                            except Exception:
                                pass
                    
                    sender_id = t.get("sender_id") or t.get("source_id")
                    receiver_id = t.get("receiver_id") or t.get("target_id")
                    ref = t.get("bank_reference") or t.get("reference_no")
                    flagged = t.get("flagged_anomaly") or t.get("flagged_status")

                    tx_obj = TransactionRecord(
                        tx_id=t["tx_id"],
                        sender_id=sender_id,
                        sender_name=t.get("sender_name") or sender_id,
                        receiver_id=receiver_id,
                        receiver_name=t.get("receiver_name") or receiver_id,
                        amount=float(t.get("amount", 0.0)),
                        currency=t.get("currency", "INR"),
                        channel=t.get("channel"),
                        bank_reference=ref,
                        timestamp=ts,
                        category=t.get("category"),
                        flagged_status=str(flagged) if flagged is not None else None,
                        anomaly_multiplier=t.get("anomaly_multiplier")
                    )
                    db.add(tx_obj)
            db.commit()
            print(f"[Ingestion] Transactions loaded: {len(tx_data)}")

            # 9. Ingest Unstructured Documents & Run NLP Entity Extraction
            valid, reports_data, errs = self.validate_csv("reports.csv", ["report_id", "title", "filename"])
            for r in reports_data:
                doc_file = os.path.join(self.reports_dir, r.get("filename", ""))
                doc_text = ""
                if os.path.exists(doc_file):
                    with open(doc_file, "r", encoding="utf-8") as f:
                        doc_text = f.read()

                extracted_entities = entity_extractor.extract_entities(doc_text, source_doc=r["report_id"])
                
                existing_doc = db.query(Document).filter(Document.document_id == r["report_id"]).first()
                if not existing_doc:
                    doc_obj = Document(
                        document_id=r["report_id"],
                        case_id=r.get("case_id"),
                        title=r.get("title"),
                        filename=r.get("filename"),
                        source_agency=r.get("source_agency") or r.get("source_type"),
                        author=r.get("author") or r.get("officer"),
                        content=doc_text,
                        content_summary=r.get("content_summary") or f"{r.get('title')} filed by {r.get('officer', 'Investigator')}.",
                        classification=r.get("classification") or "CONFIDENTIAL",
                        extracted_entities=extracted_entities,
                        extracted_relationships=[]
                    )
                    db.add(doc_obj)
            db.commit()
            print(f"[NLP Engine] Ingested {len(reports_data)} unstructured documents & extracted entity spans.")

            # 10. Populate Evidence Catalog
            for r in reports_data:
                ev_id = f"EVD-{r['report_id']}"
                existing_ev = db.query(Evidence).filter(Evidence.evidence_id == ev_id).first()
                if not existing_ev:
                    ev_obj = Evidence(
                        evidence_id=ev_id,
                        case_id=r.get("case_id"),
                        document_id=r["report_id"],
                        title=r["title"],
                        evidence_type=r.get("source_type", "Intelligence Report"),
                        source_record=r.get("filename", ""),
                        description=f"Official investigative documentation: {r['title']}",
                        confidence=0.98,
                        timestamp=datetime.utcnow()
                    )
                    db.add(ev_obj)
            db.commit()
            print(f"[Evidence] Cataloged {len(reports_data)} primary evidence items.")

            # 11. Extract Dynamic Person-Case Associations
            person_cases_map = self.extract_person_cases_map()
            print(f"[Intelligence] Discovered cross-case links for {len(person_cases_map)} persons.")

            # 12. Run Anomaly Detectors & Generate Alerts
            tx_anomalies = tx_anomaly_detector.detect_anomalies(tx_data, person_cases_map=person_cases_map)
            cdr_anomalies = cdr_anomaly_detector.detect_anomalies(cdr_data, person_cases_map=person_cases_map)
            all_anomalies = tx_anomalies + cdr_anomalies

            for anom in all_anomalies:
                existing_alert = db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first()
                if not existing_alert:
                    alert_obj = Alert(
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
                        status="ACTIVE"
                    )
                    db.add(alert_obj)
            db.commit()
            print(f"[Analytics] Generated {len(all_anomalies)} statistical anomaly alerts (TX: {len(tx_anomalies)}, CDR: {len(cdr_anomalies)}).")

            # 13. Load Knowledge Graph Engine
            graph_store.load_from_dataset(self.synthetic_dir)
            centralities = graph_store.calculate_centralities()
            bridges = graph_store.find_bridge_nodes()
            bridge_ids = {b.node_id for b in bridges}

            # 14. Calculate & Update Investigation Priority Scores
            active_alerts = db.query(Alert).all()
            alert_dicts = [{"entity_id": a.entity_id, "alert_type": a.alert_type, "severity": a.severity, "supporting_evidence_id": a.supporting_evidence_id} for a in active_alerts]
            
            scored_count = 0
            for p in persons_data:
                p_id = p["person_id"]
                p_metrics = {
                    "betweenness": centralities.get(p_id, {}).get("betweenness", 0.0),
                    "degree": graph_store.undirected_graph.degree(p_id) if graph_store.undirected_graph.has_node(p_id) else 0,
                    "is_bridge": p_id in bridge_ids
                }
                
                score_res = priority_scorer.calculate_priority_score(
                    person_id=p_id,
                    graph_metrics=p_metrics,
                    associated_cases=person_cases_map.get(p_id, []),
                    alerts=alert_dicts,
                    cdrs=cdr_data,
                    transactions=tx_data
                )
                
                db_p = db.query(Person).filter(Person.person_id == p_id).first()
                if db_p:
                    db_p.priority_score = score_res["score"]
                    db.add(db_p)
                    scored_count += 1

                # Also update node in graph store
                if p_id in graph_store.nodes_data:
                    graph_store.nodes_data[p_id]["priority_score"] = score_res["score"]

            db.commit()
            print(f"[Scoring] Calculated & persisted priority scores for {scored_count} persons.")
            print("==========================================")
            print("Master Ingestion Pipeline Completed Successfully!")
            print("==========================================\n")

        finally:
            if close_session:
                db.close()

pipeline = MasterIngestionPipeline()

if __name__ == "__main__":
    pipeline.run()
