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

    def validate_csv(self, filename: str, required_fields: list) -> tuple[bool, list, list]:
        filepath = os.path.join(self.synthetic_dir, filename)
        if not os.path.exists(filepath):
            return False, [], [f"File not found: {filepath}"]

        records = []
        errors = []
        seen_ids = set()

        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=1):
                # Check required fields
                for field in required_fields:
                    if not row.get(field) or not row[field].strip():
                        errors.append(f"[{filename}:Row {idx}] Missing required field '{field}'.")
                
                # Check duplicate primary ID if first required field is an ID
                id_field = required_fields[0]
                rec_id = row.get(id_field, "").strip()
                if rec_id:
                    if rec_id in seen_ids:
                        errors.append(f"[{filename}:Row {idx}] Duplicate ID detected: '{rec_id}'.")
                    else:
                        seen_ids.add(rec_id)
                records.append(row)

        return len(errors) == 0, records, errors

    def run(self, db: Session = None):
        print("\n==========================================")
        print("Starting CrimeGraph AI Master Ingestion Pipeline")
        print("==========================================")

        # Create database tables
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
                    reg_date = datetime.strptime(c["date_registered"], "%Y-%m-%d") if c.get("date_registered") else None
                    inc_date = datetime.strptime(c["incident_date"], "%Y-%m-%d") if c.get("incident_date") else None
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
                        estimated_value=float(c["estimated_value"]) if c.get("estimated_value") else None
                    )
                    db.add(case_obj)
            db.commit()
            print(f"[Ingestion] Cases loaded: {len(cases_data)}")

            # 2. Validate & Ingest Persons
            valid, persons_data, errs = self.validate_csv("persons.csv", ["person_id", "name"])
            for p in persons_data:
                existing = db.query(Person).filter(Person.person_id == p["person_id"]).first()
                dob_val = datetime.strptime(p["dob"], "%Y-%m-%d").date() if p.get("dob") else None
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
                    ph_obj = Phone(
                        phone_id=ph["phone_id"],
                        phone_number=ph["phone_number"],
                        imei=ph.get("imei"),
                        imsi=ph.get("imsi"),
                        telecom_circle=ph.get("telecom_circle"),
                        operator=ph.get("operator"),
                        registered_owner=ph.get("registered_owner"),
                        is_burner=ph.get("is_burner", "False") == "True"
                    )
                    db.add(ph_obj)
            db.commit()

            # 4. Vehicles
            valid, vehicles_data, errs = self.validate_csv("vehicles.csv", ["vehicle_id", "plate_number"])
            for v in vehicles_data:
                existing = db.query(Vehicle).filter(Vehicle.vehicle_id == v["vehicle_id"]).first()
                if not existing:
                    v_obj = Vehicle(
                        vehicle_id=v["vehicle_id"],
                        plate_number=v["plate_number"],
                        make=v.get("make"),
                        model=v.get("model"),
                        color=v.get("color"),
                        registered_owner=v.get("registered_owner"),
                        vehicle_type=v.get("vehicle_type")
                    )
                    db.add(v_obj)
            db.commit()

            # 5. Locations
            valid, locs_data, errs = self.validate_csv("locations.csv", ["location_id", "name"])
            for l in locs_data:
                existing = db.query(Location).filter(Location.location_id == l["location_id"]).first()
                if not existing:
                    l_obj = Location(
                        location_id=l["location_id"],
                        name=l["name"],
                        address=l.get("address"),
                        latitude=float(l["latitude"]) if l.get("latitude") else None,
                        longitude=float(l["longitude"]) if l.get("longitude") else None,
                        location_type=l.get("location_type")
                    )
                    db.add(l_obj)
            db.commit()

            # 6. Organizations
            valid, orgs_data, errs = self.validate_csv("organizations.csv", ["org_id", "name"])
            for o in orgs_data:
                existing = db.query(Organization).filter(Organization.org_id == o["org_id"]).first()
                if not existing:
                    o_obj = Organization(
                        org_id=o["org_id"],
                        name=o["name"],
                        registration_no=o.get("registration_no"),
                        jurisdiction=o.get("jurisdiction"),
                        org_type=o.get("org_type"),
                        flagged_status=o.get("flagged_status")
                    )
                    db.add(o_obj)
            db.commit()

            # 7. CDR Records
            valid, cdr_data, errs = self.validate_csv("cdr.csv", ["cdr_id", "caller_phone", "receiver_phone"])
            for c in cdr_data:
                existing = db.query(CDRRecord).filter(CDRRecord.cdr_id == c["cdr_id"]).first()
                if not existing:
                    ts = datetime.strptime(c["timestamp"], "%Y-%m-%d %H:%M:%S") if c.get("timestamp") else None
                    cdr_obj = CDRRecord(
                        cdr_id=c["cdr_id"],
                        caller_id=c.get("caller_id"),
                        caller_phone=c.get("caller_phone"),
                        receiver_id=c.get("receiver_id"),
                        receiver_phone=c.get("receiver_phone"),
                        timestamp=ts,
                        duration_sec=int(c.get("duration_sec", 0)),
                        cell_tower_location=c.get("cell_tower_location"),
                        call_type=c.get("call_type"),
                        flagged_status=c.get("flagged_status")
                    )
                    db.add(cdr_obj)
            db.commit()

            # 8. Transactions
            valid, tx_data, errs = self.validate_csv("transactions.csv", ["tx_id", "sender_name", "amount"])
            for t in tx_data:
                existing = db.query(TransactionRecord).filter(TransactionRecord.tx_id == t["tx_id"]).first()
                if not existing:
                    ts = datetime.strptime(t["timestamp"], "%Y-%m-%d %H:%M:%S") if t.get("timestamp") else None
                    tx_obj = TransactionRecord(
                        tx_id=t["tx_id"],
                        sender_id=t.get("sender_id"),
                        sender_name=t.get("sender_name"),
                        receiver_id=t.get("receiver_id"),
                        receiver_name=t.get("receiver_name"),
                        amount=float(t.get("amount", 0.0)),
                        currency=t.get("currency", "INR"),
                        channel=t.get("channel"),
                        bank_reference=t.get("bank_reference"),
                        timestamp=ts,
                        category=t.get("category"),
                        flagged_status=t.get("flagged_status"),
                        anomaly_multiplier=t.get("anomaly_multiplier")
                    )
                    db.add(tx_obj)
            db.commit()

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
                        source_agency=r.get("source_agency"),
                        author=r.get("author"),
                        content=doc_text,
                        content_summary=r.get("content_summary"),
                        classification=r.get("classification"),
                        extracted_entities=extracted_entities,
                        extracted_relationships=[]
                    )
                    db.add(doc_obj)
            db.commit()

            # 10. Populate Evidence Catalog
            evidence_entries = [
                {"id": "EVD-FIR-042", "case_id": "C042", "title": "First Information Report (FIR-042/2025)", "type": "Statutory FIR", "desc": "Formal police complaint alleging illegal cross-border foreign exchange and Hawala banking syndicate."},
                {"id": "CDR-182", "case_id": "C042", "title": "CDR Intercept - Colaba Tower #09", "type": "Telecommunications Intercept", "desc": "Encrypted VoIP calls between Rahul Sharma burner and Dubai roaming profile."},
                {"id": "TX-01082", "case_id": "C042", "title": "Bank Transaction Record TX-01082", "type": "Financial Audit", "desc": "RTGS transfer of INR 75,00,000 for off-market cryptocurrency settlement."},
                {"id": "EVD-SURV-102", "case_id": "C042", "title": "Surveillance Log & CCTV Capture #102", "type": "Physical Surveillance", "desc": "Photographic evidence of target entering Colaba Safehouse and BKC Diamond Tower."},
                {"id": "EVD-SEIZE-019", "case_id": "C019", "title": "JNPT Port Container Seizure Memo #019", "type": "Physical Seizure", "desc": "Customs inventory of undeclared electronics inside freight container CON-9921."},
                {"id": "CDR-194", "case_id": "C019", "title": "CDR Port Coordination Intercept", "type": "Telecommunications Intercept", "desc": "Pre-dispatch phone coordination between Tariq Khan and broker Rahul Sharma."},
                {"id": "EVD-BLOCK-055", "case_id": "C055", "title": "Blockchain On-Chain Forensics Log #055", "type": "Digital Forensics", "desc": "TRC-20 token tracking from extortion ransom wallet to OTC broker David Miller."}
            ]
            for ev in evidence_entries:
                existing_ev = db.query(Evidence).filter(Evidence.evidence_id == ev["id"]).first()
                if not existing_ev:
                    ev_obj = Evidence(
                        evidence_id=ev["id"],
                        case_id=ev.get("case_id"),
                        title=ev["title"],
                        evidence_type=ev["type"],
                        source_record=ev["id"],
                        description=ev["desc"],
                        confidence=0.98,
                        timestamp=datetime.utcnow()
                    )
                    db.add(ev_obj)
            db.commit()

            # 11. Run Anomaly Detectors & Generate Alerts
            tx_anomalies = tx_anomaly_detector.detect_anomalies(tx_data)
            cdr_anomalies = cdr_anomaly_detector.detect_anomalies(cdr_data)
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
            print(f"[Analytics] Generated {len(all_anomalies)} statistical anomaly alerts.")

            # 12. Load Knowledge Graph Engine
            graph_store.load_from_dataset(self.synthetic_dir)
            centralities = graph_store.calculate_centralities()
            bridges = graph_store.find_bridge_nodes()
            bridge_ids = {b.node_id for b in bridges}

            # 14. Calculate & Update Investigation Priority Scores
            active_alerts = db.query(Alert).all()
            alert_dicts = [{"entity_id": a.entity_id, "alert_type": a.alert_type, "severity": a.severity, "supporting_evidence_id": a.supporting_evidence_id} for a in active_alerts]
            
            # Map person cases
            person_cases_map = {
                "P001": ["C042", "C019"],
                "P002": ["C042"],
                "P003": ["C019"],
                "P004": ["C042"],
                "P005": ["C055"],
                "P006": ["C042"],
                "P007": ["C019"],
                "P012": ["C055"]
            }

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
                    associated_cases=person_cases_map.get(p_id, ["C042"] if p_id == "P001" else []),
                    alerts=alert_dicts,
                    cdrs=cdr_data,
                    transactions=tx_data
                )
                
                db_p = db.query(Person).filter(Person.person_id == p_id).first()
                if db_p:
                    db_p.priority_score = score_res["score"]
                    db.add(db_p)

                # Also update node in graph store
                if p_id in graph_store.nodes_data:
                    graph_store.nodes_data[p_id]["priority_score"] = score_res["score"]

            db.commit()
            print("[Scoring] Investigation Priority Scores successfully calculated and persisted.")
            print("==========================================")
            print("Master Ingestion Pipeline Completed Successfully!")
            print("==========================================\n")

        finally:
            if close_session:
                db.close()

pipeline = MasterIngestionPipeline()

if __name__ == "__main__":
    pipeline.run()
