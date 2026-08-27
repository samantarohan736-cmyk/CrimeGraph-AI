from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.core.database import get_db
from backend.app.models.entities import Evidence, Case, Document
from backend.app.schemas.api_schemas import EvidenceOut
from evidence.evidence_chain import evidence_chain_service

router = APIRouter(prefix="/evidence", tags=["Evidence Chain"])

@router.get("", response_model=List[EvidenceOut])
def list_evidence(case_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Evidence)
    if case_id:
        query = query.filter(Evidence.case_id == case_id)
    return query.all()

@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence_details(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Evidence record {evidence_id} not found.")
    return ev

@router.get("/chain/{entity_id}")
def get_entity_evidence_chain(entity_id: str, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Retrieves full audited evidence chain linked to an entity."""
    return evidence_chain_service.trace_entity_evidence(db, entity_id)
