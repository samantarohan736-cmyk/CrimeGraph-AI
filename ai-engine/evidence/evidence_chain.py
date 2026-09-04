import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Evidence, Document, Case, Alert

class EvidenceChainService:
    """
    Evidence Chain & Traceability Engine.
    Ensures every relationship, alert, and priority score is strictly linked to raw
    evidence records that actually exist in the database - never fabricates one.
    """
    def get_evidence_by_id(self, db: Session, evidence_id: str) -> Optional[Dict[str, Any]]:
        ev = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
        if not ev:
            return None
        
        doc = db.query(Document).filter(Document.document_id == ev.document_id).first() if ev.document_id else None
        case = db.query(Case).filter(Case.case_id == ev.case_id).first() if ev.case_id else None

        return {
            "evidence_id": ev.evidence_id,
            "title": ev.title,
            "evidence_type": ev.evidence_type,
            "source_record": ev.source_record,
            "description": ev.description,
            "confidence": ev.confidence,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            "case_id": ev.case_id,
            "case_title": case.title if case else None,
            "document_id": ev.document_id,
            "document_title": doc.title if doc else None,
            "raw_payload": ev.raw_payload or {}
        }

    def trace_entity_evidence(self, db: Session, entity_id: str) -> List[Dict[str, Any]]:
        """
        Collects real evidence records tied to an entity via its alerts. If an alert
        references an evidence_id that doesn't actually exist in the Evidence table,
        it's a genuine data gap and is simply omitted here, never fabricated.
        """
        alerts = db.query(Alert).filter(Alert.entity_id == entity_id).all()
        ev_ids = {a.supporting_evidence_id for a in alerts if a.supporting_evidence_id}

        results = []
        for ev_id in ev_ids:
            item = self.get_evidence_by_id(db, ev_id)
            if item:
                results.append(item)

        return results

evidence_chain_service = EvidenceChainService()