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
    Manual bulk-import pipeline for CrimeGraph AI.

    This is NOT run automatically on startup - the application boots with an empty
    graph/database and stays that way until you run this explicitly. Drop CSV files
    matching the schemas documented in data/import/README.md into the import
    directory (default: data/import/) and run:

        python ai-engine/ingestion/master_pipeline.py

    It validates and loads structured records into PostgreSQL, mirrors entities and
    relationships into the Neo4j-backed knowledge graph, runs statistical anomaly
    detection on CDRs/transactions, and (re)computes Investigation Priority Scores
    from the graph itself (not a hardcoded mapping). Safe to re-run: existing
    records are matched by primary key and skipped.
    """
    def __init__(self, import_dir: str = None):
        self.import_dir = import_dir or settings.IMPORT_DIR

    def validate_csv(self, filename: str, required_fields: list) -> tuple[bool, list, list]:
        filepath = os.path.join(self.import_dir, filename)
        if not os.path.exists(filepath):
            return False, [], [f"File not found: {filepath}"]

        records = []
        errors = []
        seen_ids = set()

        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=1):
                for field in required_fields:
                    if not row.get(field) or not row[field].strip():
                        errors.append(f"[{filename}:Row {idx}] Missing required field '{field}'.")

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
        print("Starting CrimeGraph AI Bulk Import Pipeline")
        print(f"Import directory: {self.import_dir}")
        print("==========================================")

        Base.metadata.create_all(bind=engine)

        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        try:
            # 1. Cases
            valid, cases_data, errs = self.validate_csv("cases.csv", ["case_id", "title"])
            if errs:
                print(f"[Validation Warning] Cases errors: {errs}")

            for c in cases_data:
                existing = db.query(Case).filter(Case.case_id == c["case_id"]).first()
                if not existing:
                    reg_date = datetime.strptime(c["date_registered"], "%Y-%m-%d") if c.get("date_registered") else None
                    inc_date = datetime.strptime(c["incident_date"], "%Y-%m-%d") if c.get("incident_date") else None
                    db.add(Case(
                        case_id=c["case_id"], title=c["title"], description=c.get("description"),
                        case_type=c.get("case_type"), status=c.get("status", "Active Investigation"),
                        priority=c.get("priority", "Medium"), lead_officer=c.get("lead_officer"),
                        date_registered=reg_date, incident_date=inc_date,
                        estimated_value=float(c["estimated_value"]) if c.get("estimated_value") else None
                    ))
            db.commit()
            print(f"[Ingestion] Cases loaded: {len(cases_data)}")

            for c in cases_data:
                graph_store.add_entity_node(
                    node_id=c["case_id"], label=f"{c['case_id']}: {c['title']}", node_type="Case",
                    properties={
                        "title": c.get("title", ""), "case_type": c.get("case_type", ""),
                        "status": c.get("status", "Active Investigation"), "priority": c.get("priority", "Medium"),
                        "lead_officer": c.get("lead_officer", ""), "estimated_value": c.get("estimated_value", "")
                    }
                )

            # 2. Persons
            valid, persons_data, errs = self.validate_csv("persons.csv", ["person_id", "name"])
            if errs:
                print(f"[Validation Warning] Persons errors: {errs}")
            for p in persons_data:
                existing = db.query(Person).filter(Person.person_id == p["person_id"]).first()
                dob_val = datetime.strptime(p["dob"], "%Y-%m-%d").date() if p.get("dob") else None
                if not existing:
                    db.add(Person(
                        person_id=p["person_id"], name=p["name"], aliases=p.get("aliases"), dob=dob_val,
                        nationality=p.get("nationality"), role=p.get("role"),
                        primary_location=p.get("primary_location"), risk_level=p.get("risk_level", "Medium"),
                        priority_score=0.0
                    ))
            db.commit()
            print(f"[Ingestion] Persons loaded: {len(persons_data)}")

            for p in persons_data:
                graph_store.add_entity_node(
                    node_id=p["person_id"], label=p["name"], node_type="Person",
                    properties={
                        "aliases": p.get("aliases", ""), "role": p.get("role", ""),
                        "primary_location": p.get("primary_location", ""),
                        "risk_level": p.get("risk_level", "Medium"), "dob": p.get("dob", ""),
                        "nationality": p.get("nationality", "")
                    }
                )

            # 3. Phones
            valid, phones_data, errs = self.validate_csv("phones.csv", ["phone_id", "phone_number"])
            if errs:
                print(f"[Validation Warning] Phones errors: {errs}")
            for ph in phones_data:
                existing = db.query(Phone).filter(Phone.phone_id == ph["phone_id"]).first()
                if not existing:
                    db.add(Phone(
                        phone_id=ph["phone_id"], phone_number=ph["phone_number"], imei=ph.get("imei"),
                        imsi=ph.get("imsi"), telecom_circle=ph.get("telecom_circle"), operator=ph.get("operator"),
                        registered_owner=ph.get("registered_owner"), is_burner=ph.get("is_burner", "False") == "True"
                    ))
            db.commit()
            for ph in phones_data:
                graph_store.add_entity_node(
                    node_id=ph["phone_id"], label=ph["phone_number"], node_type="Phone",
                    properties={
                        "imei": ph.get("imei", ""), "operator": ph.get("operator", ""),
                        "telecom_circle": ph.get("telecom_circle", ""),
                        "is_burner": ph.get("is_burner", "False") == "True",
                        "registered_owner": ph.get("registered_owner", "")
                    }
                )

            # 4. Vehicles
            valid, vehicles_data, errs = self.validate_csv("vehicles.csv", ["vehicle_id", "plate_number"])
            if errs:
                print(f"[Validation Warning] Vehicles errors: {errs}")
            for v in vehicles_data:
                existing = db.query(Vehicle).filter(Vehicle.vehicle_id == v["vehicle_id"]).first()
                if not existing:
                    db.add(Vehicle(
                        vehicle_id=v["vehicle_id"], plate_number=v["plate_number"], make=v.get("make"),
                        model=v.get("model"), color=v.get("color"), registered_owner=v.get("registered_owner"),
                        vehicle_type=v.get("vehicle_type")
                    ))
            db.commit()
            for v in vehicles_data:
                graph_store.add_entity_node(
                    node_id=v["vehicle_id"], label=v["plate_number"], node_type="Vehicle",
                    properties={
                        "make": v.get("make", ""), "model": v.get("model", ""), "color": v.get("color", ""),
                        "vehicle_type": v.get("vehicle_type", ""), "registered_owner": v.get("registered_owner", "")
                    }
                )

            # 5. Locations
            valid, locs_data, errs = self.validate_csv("locations.csv", ["location_id", "name"])
            if errs:
                print(f"[Validation Warning] Locations errors: {errs}")
            for l in locs_data:
                existing = db.query(Location).filter(Location.location_id == l["location_id"]).first()
                if not existing:
                    db.add(Location(
                        location_id=l["location_id"], name=l["name"], address=l.get("address"),
                        latitude=float(l["latitude"]) if l.get("latitude") else None,
                        longitude=float(l["longitude"]) if l.get("longitude") else None,
                        location_type=l.get("location_type")
                    ))
            db.commit()
            for l in locs_data:
                graph_store.add_entity_node(
                    node_id=l["location_id"], label=l["name"], node_type="Location",
                    properties={
                        "address": l.get("address", ""),
                        "latitude": float(l["latitude"]) if l.get("latitude") else None,
                        "longitude": float(l["longitude"]) if l.get("longitude") else None,
                        "location_type": l.get("location_type", "")
                    }
                )

            # 6. Organizations
            valid, orgs_data, errs = self.validate_csv("organizations.csv", ["org_id", "name"])
            if errs:
                print(f"[Validation Warning] Organizations errors: {errs}")
            for o in orgs_data:
                existing = db.query(Organization).filter(Organization.org_id == o["org_id"]).first()
                if not existing:
                    db.add(Organization(
                        org_id=o["org_id"], name=o["name"], registration_no=o.get("registration_no"),
                        jurisdiction=o.get("jurisdiction"), org_type=o.get("org_type"),
                        flagged_status=o.get("flagged_status")
                    ))
            db.commit()
            for o in orgs_data:
                graph_store.add_entity_node(
                    node_id=o["org_id"], label=o["name"], node_type="Organization",
                    properties={
                        "registration_no": o.get("registration_no", ""), "jurisdiction": o.get("jurisdiction", ""),
                        "org_type": o.get("org_type", ""), "flagged_status": o.get("flagged_status", "")
                    }
                )

            # 7. Relationships -> knowledge graph (Neo4j, via graph_store write-through)
            valid, rel_data, errs = self.validate_csv("relationships.csv", ["rel_id", "source_id", "target_id"])
            if errs:
                print(f"[Validation Warning] Relationships errors: {errs}")
            for r in rel_data:
                graph_store.add_relationship_edge(
                    edge_id=r["rel_id"], source_id=r["source_id"], target_id=r["target_id"],
                    relationship_type=r.get("relationship_type", "RELATED_TO"),
                    confidence=float(r.get("confidence", 1.0)) if r.get("confidence") else 1.0,
                    date=r.get("date", ""), evidence_id=r.get("evidence_id", ""), notes=r.get("notes", "")
                )
            print(f"[Ingestion] Relationships loaded into knowledge graph: {len(rel_data)}")

            # 8. CDR Records
            valid, cdr_data, errs = self.validate_csv("cdr.csv", ["cdr_id", "caller_phone", "receiver_phone"])
            if errs:
                print(f"[Validation Warning] CDR errors: {errs}")
            for c in cdr_data:
                existing = db.query(CDRRecord).filter(CDRRecord.cdr_id == c["cdr_id"]).first()
                if not existing:
                    ts = datetime.strptime(c["timestamp"], "%Y-%m-%d %H:%M:%S") if c.get("timestamp") else None
                    db.add(CDRRecord(
                        cdr_id=c["cdr_id"], caller_id=c.get("caller_id"), caller_phone=c.get("caller_phone"),
                        receiver_id=c.get("receiver_id"), receiver_phone=c.get("receiver_phone"), timestamp=ts,
                        duration_sec=int(c.get("duration_sec")) if c.get("duration_sec") else 0,
                        cell_tower_location=c.get("cell_tower_location"), call_type=c.get("call_type"),
                        flagged_status=c.get("flagged_status")
                    ))
            db.commit()
            print(f"[Ingestion] CDR records loaded: {len(cdr_data)}")

            # 9. Transactions
            valid, tx_data, errs = self.validate_csv("transactions.csv", ["tx_id", "sender_name", "amount"])
            if errs:
                print(f"[Validation Warning] Transactions errors: {errs}")
            for t in tx_data:
                existing = db.query(TransactionRecord).filter(TransactionRecord.tx_id == t["tx_id"]).first()
                if not existing:
                    ts = datetime.strptime(t["timestamp"], "%Y-%m-%d %H:%M:%S") if t.get("timestamp") else None
                    db.add(TransactionRecord(
                        tx_id=t["tx_id"], sender_id=t.get("sender_id"), sender_name=t.get("sender_name"),
                        receiver_id=t.get("receiver_id"), receiver_name=t.get("receiver_name"),
                        amount=float(t.get("amount", 0.0)), currency=t.get("currency", "INR"),
                        channel=t.get("channel"), bank_reference=t.get("bank_reference"), timestamp=ts,
                        category=t.get("category"), flagged_status=t.get("flagged_status"),
                        anomaly_multiplier=t.get("anomaly_multiplier")
                    ))
            db.commit()
            print(f"[Ingestion] Transactions loaded: {len(tx_data)}")

            # 10. Unstructured reports -> Documents + NLP entity extraction
            valid, reports_data, errs = self.validate_csv("reports.csv", ["report_id", "title", "filename"])
            if errs:
                print(f"[Validation Warning] Reports errors: {errs}")
            for r in reports_data:
                doc_file = os.path.join(self.import_dir, r.get("filename", ""))
                doc_text = ""
                if os.path.exists(doc_file):
                    with open(doc_file, "r", encoding="utf-8") as f:
                        doc_text = f.read()

                extracted_entities = entity_extractor.extract_entities(doc_text, source_doc=r["report_id"])

                existing_doc = db.query(Document).filter(Document.document_id == r["report_id"]).first()
                if not existing_doc:
                    db.add(Document(
                        document_id=r["report_id"], case_id=r.get("case_id"), title=r.get("title"),
                        filename=r.get("filename"), source_agency=r.get("source_agency"), author=r.get("author"),
                        content=doc_text, content_summary=r.get("content_summary"),
                        classification=r.get("classification"), extracted_entities=extracted_entities,
                        extracted_relationships=[]
                    ))
            db.commit()
            print(f"[Ingestion] Reports loaded: {len(reports_data)}")

            # 11. Evidence catalog (optional evidence.csv - only what's actually provided)
            valid, evidence_data, errs = self.validate_csv("evidence.csv", ["evidence_id", "title", "evidence_type"])
            if errs:
                print(f"[Validation Warning] Evidence errors: {errs}")
            for ev in evidence_data:
                existing_ev = db.query(Evidence).filter(Evidence.evidence_id == ev["evidence_id"]).first()
                if not existing_ev:
                    db.add(Evidence(
                        evidence_id=ev["evidence_id"], case_id=ev.get("case_id"), title=ev["title"],
                        evidence_type=ev["evidence_type"], source_record=ev.get("source_record", ev["evidence_id"]),
                        description=ev.get("description"),
                        confidence=float(ev.get("confidence", 1.0)) if ev.get("confidence") else 1.0,
                        timestamp=datetime.utcnow()
                    ))
            db.commit()
            print(f"[Ingestion] Evidence records loaded: {len(evidence_data)}")

            # 12. Anomaly detection -> Alerts
            tx_anomalies = tx_anomaly_detector.detect_anomalies(tx_data)
            cdr_anomalies = cdr_anomaly_detector.detect_anomalies(cdr_data)
            all_anomalies = tx_anomalies + cdr_anomalies

            for anom in all_anomalies:
                existing_alert = db.query(Alert).filter(Alert.alert_id == anom["alert_id"]).first()
                if not existing_alert:
                    db.add(Alert(
                        alert_id=anom["alert_id"], entity_id=anom["entity_id"], entity_type=anom["entity_type"],
                        case_id=anom.get("case_id"), alert_type=anom["alert_type"], severity=anom["severity"],
                        reason=anom["reason"], supporting_evidence_id=anom.get("supporting_evidence_id"),
                        supporting_records=anom.get("supporting_records"), confidence=anom.get("confidence", 0.9),
                        status="ACTIVE"
                    ))
            db.commit()
            print(f"[Analytics] Generated {len(all_anomalies)} statistical anomaly alerts.")

            # 13. Priority scoring - cases-per-person is read live from the graph
            # (whatever relationships.csv actually connected them to), not a hardcoded map.
            centralities = graph_store.calculate_centralities()
            bridges = graph_store.find_bridge_nodes()
            bridge_ids = {b.node_id for b in bridges}

            active_alerts = db.query(Alert).all()
            alert_dicts = [
                {"entity_id": a.entity_id, "alert_type": a.alert_type, "severity": a.severity,
                 "supporting_evidence_id": a.supporting_evidence_id}
                for a in active_alerts
            ]

            for p in persons_data:
                p_id = p["person_id"]

                person_subgraph = graph_store.get_subgraph(p_id, max_hops=2)
                associated_case_ids = [n.id for n in person_subgraph.nodes if n.type == "Case"]

                p_metrics = {
                    "betweenness": centralities.get(p_id, {}).get("betweenness", 0.0),
                    "degree": graph_store.undirected_graph.degree(p_id) if graph_store.undirected_graph.has_node(p_id) else 0,
                    "is_bridge": p_id in bridge_ids
                }

                score_res = priority_scorer.calculate_priority_score(
                    person_id=p_id, graph_metrics=p_metrics, associated_cases=associated_case_ids,
                    alerts=alert_dicts, cdrs=cdr_data, transactions=tx_data
                )

                db_p = db.query(Person).filter(Person.person_id == p_id).first()
                if db_p:
                    db_p.priority_score = score_res["score"]
                    db.add(db_p)

                if p_id in graph_store.nodes_data:
                    graph_store.nodes_data[p_id]["priority_score"] = score_res["score"]

            db.commit()
            print("[Scoring] Investigation Priority Scores successfully calculated and persisted.")
            print("==========================================")
            print("Bulk Import Pipeline Completed Successfully!")
            print("==========================================\n")

        finally:
            if close_session:
                db.close()


pipeline = MasterIngestionPipeline()

if __name__ == "__main__":
    pipeline.run()
