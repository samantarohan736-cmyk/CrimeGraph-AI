import os
# Triggering uvicorn auto-reload after spacy install
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Document, Case, Evidence, Person, Phone, Location, Organization, Vehicle
from backend.app.schemas.api_schemas import DocumentAnalyzeResponse, ExtractedEntity, ExtractedRelationship

import sys
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
for p in [ROOT_DIR, AI_ENGINE_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from nlp.entity_extractor import entity_extractor
from nlp.relationship_extractor import relationship_extractor
from nlp.entity_linker import entity_linker

router = APIRouter(prefix="/documents", tags=["Documents & NLP"])

# Entity types that get promoted into the knowledge graph from NLP extractions
_GRAPH_SYNCABLE_TYPES = {"PERSON", "LOCATION", "ORGANIZATION", "PHONE", "VEHICLE"}
_TYPE_MAP = {
    "PERSON": "Person", "LOCATION": "Location", "ORGANIZATION": "Organization",
    "PHONE": "Phone", "VEHICLE": "Vehicle"
}


def _sync_entities_to_graph(entities: List[Dict[str, Any]], doc_id: str, case_id: Optional[str] = None):
    """
    Promote high-confidence NLP-extracted entities into the Neo4j-backed knowledge graph.
    Each entity gets a deterministic node ID derived from its normalized value so that
    re-uploads of the same document don't create duplicate nodes.
    """
    for ent in entities or []:
        et = ent.get("entity_type", "")
        if et not in _GRAPH_SYNCABLE_TYPES:
            continue
        if (ent.get("confidence") or 0) < 0.75:
            continue

        normalized = (ent.get("normalized_value") or ent.get("extracted_text") or "").strip()
        if not normalized or len(normalized) < 2:
            continue

        node_type = _TYPE_MAP[et]
        # Deterministic ID: prevents duplicates across re-analysis
        node_id = f"NLP-{node_type[:3].upper()}-{normalized[:40].replace(' ','_').replace('/','_')}"

        try:
            graph_store.add_entity_node(
                node_id=node_id,
                label=normalized,
                node_type=node_type,
                properties={
                    "source": "nlp_extraction",
                    "doc_id": doc_id,
                    "case_id": case_id or "",
                    "confidence": round(ent.get("confidence", 0.8), 3),
                    "extracted_text": ent.get("extracted_text", "")
                }
            )
            # Link the entity to its source document node in the graph (if the doc node exists)
            if graph_store.graph.has_node(doc_id):
                graph_store.add_relationship_edge(
                    edge_id=f"DOC-MENTIONS-{doc_id}-{node_id}",
                    source_id=doc_id,
                    target_id=node_id,
                    relationship_type="MENTIONS",
                    confidence=ent.get("confidence", 0.8),
                    evidence_id=doc_id
                )
        except Exception as e:
            print(f"[Documents] Failed to sync entity {node_id} to graph: {e}")

def _auto_promote_sql_entities(db: Session, entities: List[Dict[str, Any]]):
    """Automatically promotes high-confidence NLP entities to SQL master tables."""
    sql_created = 0
    added_in_session = set()
    
    for ent in entities:
        conf = ent.get("confidence") or 0
        if conf >= 0.84:
            et = ent.get("entity_type")
            text = (ent.get("normalized_value") or ent.get("extracted_text") or "").strip()
            if not text or len(text) < 2:
                continue
                
            dedup_key = f"{et}-{text}"
            if dedup_key in added_in_session:
                continue
                
            if et == "PERSON":
                if not db.query(Person).filter(Person.name == text).first():
                    pid = f"P-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    db.add(Person(person_id=pid, name=text, risk_level="Medium", role="NLP Extracted", priority_score=0.0))
                    added_in_session.add(dedup_key)
                    sql_created += 1
            elif et == "PHONE":
                if not db.query(Phone).filter(Phone.phone_number == text).first():
                    phid = f"PH-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    db.add(Phone(phone_id=phid, phone_number=text, is_burner=False))
                    added_in_session.add(dedup_key)
                    sql_created += 1
            elif et == "VEHICLE":
                if not db.query(Vehicle).filter(Vehicle.plate_number == text).first():
                    vid = f"V-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    db.add(Vehicle(vehicle_id=vid, plate_number=text))
                    added_in_session.add(dedup_key)
                    sql_created += 1
            elif et == "LOCATION":
                if not db.query(Location).filter(Location.name == text).first():
                    lid = f"L-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    db.add(Location(location_id=lid, name=text))
                    added_in_session.add(dedup_key)
                    sql_created += 1
            elif et == "ORGANIZATION":
                if not db.query(Organization).filter(Organization.name == text).first():
                    oid = f"O-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    db.add(Organization(org_id=oid, name=text))
                    added_in_session.add(dedup_key)
                    sql_created += 1
            elif et == "CASE":
                if not db.query(Case).filter(Case.case_id == text).first():
                    db.add(Case(case_id=text, title=f"Auto-Promoted Case {text}", case_type="NLP Extracted", status="Active Investigation"))
                    added_in_session.add(dedup_key)
                    sql_created += 1
                    
    if sql_created > 0:
        db.commit()
    return sql_created


@router.get("")
def list_documents(case_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if case_id:
        query = query.filter(Document.case_id == case_id)
    docs = query.order_by(Document.created_at.desc()).all()
    return [
        {
            "document_id": d.document_id,
            "case_id": d.case_id,
            "title": d.title,
            "filename": d.filename,
            "source_agency": d.source_agency,
            "author": d.author,
            "classification": d.classification,
            "file_type": d.file_type,
            "content_summary": d.content_summary,
            "entities_count": len(d.extracted_entities or []),
            "created_at": d.created_at
        }
        for d in docs
    ]


@router.get("/{document_id}")
def get_document_by_id(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")
    return {
        "document_id": doc.document_id,
        "case_id": doc.case_id,
        "title": doc.title,
        "filename": doc.filename,
        "source_agency": doc.source_agency,
        "author": doc.author,
        "content": doc.content,
        "content_summary": doc.content_summary,
        "classification": doc.classification,
        "file_type": doc.file_type,
        "extracted_entities": doc.extracted_entities or [],
        "extracted_relationships": doc.extracted_relationships or [],
        "created_at": doc.created_at
    }


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    case_id: Optional[str] = Form(None),
    source_agency: Optional[str] = Form("Law Enforcement Division"),
    author: Optional[str] = Form("Investigating Officer"),
    classification: Optional[str] = Form("CONFIDENTIAL INVESTIGATIVE RECORD"),
    db: Session = Depends(get_db)
):
    """
    Uploads a TXT or PDF intelligence document and triggers:
    1. Automated NLP entity + relationship extraction (spaCy + regex)
    2. High-confidence entities pushed into the Neo4j knowledge graph
    3. Document node added to graph with MENTIONS edges to extracted entities
    4. Evidence records created for very high-confidence extractions
    """
    filename = file.filename or f"doc_{uuid.uuid4().hex[:8]}.txt"
    file_bytes = await file.read()
    
    # Extract text content in-memory
    content = ""
    file_type = "TXT"
    
    if filename.lower().endswith(".pdf"):
        file_type = "PDF"
        try:
            import fitz  # PyMuPDF
            doc_pdf = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc_pdf:
                content += page.get_text()
            doc_pdf.close()
        except Exception:
            content = f"[PDF content could not be extracted from {filename}]"
    elif filename.lower().endswith(".csv"):
        file_type = "CSV"
        content = file_bytes.decode("utf-8", errors="ignore")
    else:
        content = file_bytes.decode("utf-8", errors="ignore")

    # NLP extraction
    entities = entity_extractor.extract_entities(content, source_doc=filename)
    relationships = relationship_extractor.extract_relationships(content, doc_id=filename)

    # Generate document ID
    doc_count = db.query(Document).count()
    doc_id = f"DOC-{doc_count + 1:04d}"
    summary = content[:300] + "..." if len(content) > 300 else content

    doc_obj = Document(
        document_id=doc_id,
        case_id=case_id,
        title=title,
        filename=filename,
        source_agency=source_agency,
        author=author,
        content=content,
        content_summary=summary,
        classification=classification,
        file_type=file_type,
        extracted_entities=entities,
        extracted_relationships=relationships
    )
    db.add(doc_obj)
    db.commit()

    # Add document node to graph so entity MENTIONS edges can reference it
    graph_store.add_entity_node(
        node_id=doc_id,
        label=title,
        node_type="Document",
        properties={"filename": filename, "case_id": case_id or "", "classification": classification or ""}
    )
    if case_id and graph_store.graph.has_node(case_id):
        graph_store.add_relationship_edge(
            edge_id=f"CASE-DOC-{case_id}-{doc_id}",
            source_id=case_id, target_id=doc_id,
            relationship_type="HAS_DOCUMENT",
            confidence=1.0, evidence_id=doc_id
        )

    # Sync extracted entities to knowledge graph
    _sync_entities_to_graph(entities, doc_id=doc_id, case_id=case_id)

    # Automatically find connections between NLP entities and SQL verified records
    try:
        entity_linker.link_nlp_to_sql(db, entities, doc_id)
    except Exception as e:
        print(f"[Documents] Entity Auto-Linking failed: {e}")

    # Create Evidence records for very-high-confidence extractions
    ev_created = 0
    for ent in entities:
        if (ent.get("confidence") or 0) >= 0.92 and ent.get("entity_type") in _GRAPH_SYNCABLE_TYPES:
            ev_id = f"EV-NLP-{doc_id}-{ev_created+1:03d}"
            if not db.query(Evidence).filter(Evidence.evidence_id == ev_id).first():
                db.add(Evidence(
                    evidence_id=ev_id,
                    case_id=case_id,
                    document_id=doc_id,
                    title=f"NLP Extraction: {ent['entity_type']} — {ent['normalized_value'][:60]}",
                    evidence_type=f"NLP_{ent['entity_type']}",
                    source_record=doc_id,
                    description=f"Extracted from '{filename}' with {int(ent['confidence']*100)}% confidence. "
                                f"Text span: '{ent['extracted_text']}'",
                    confidence=ent["confidence"],
                    raw_payload=ent
                ))
                ev_created += 1
    if ev_created:
        db.commit()

    # --- Auto-SQL Promotion (Confidence >= 0.84) ---
    sql_created = _auto_promote_sql_entities(db, entities)

    return {
        "document_id": doc_id,
        "title": title,
        "file_type": file_type,
        "entities_extracted": len(entities),
        "relationships_extracted": len(relationships),
        "graph_nodes_created": len([e for e in entities if e.get("entity_type") in _GRAPH_SYNCABLE_TYPES and (e.get("confidence") or 0) >= 0.75]),
        "evidence_records_created": ev_created,
        "sql_records_promoted": sql_created,
        "message": "Document ingested, NLP-extracted entities synced to knowledge graph and high-confidence entities promoted to SQL."
    }


@router.post("/{document_id}/analyze", response_model=DocumentAnalyzeResponse)
def reanalyze_document(document_id: str, db: Session = Depends(get_db)):
    """Re-run NLP extraction on an existing document and re-sync entities to the graph."""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")

    entities = entity_extractor.extract_entities(doc.content or "", source_doc=doc.document_id)
    relationships = relationship_extractor.extract_relationships(doc.content or "", doc_id=doc.document_id)

    doc.extracted_entities = entities
    doc.extracted_relationships = relationships
    db.commit()

    # Re-sync to graph
    _sync_entities_to_graph(entities, doc_id=doc.document_id, case_id=doc.case_id)
    
    # Auto-Promote
    _auto_promote_sql_entities(db, entities)

    ent_models = [ExtractedEntity(**{k: v for k, v in e.items() if k in ExtractedEntity.model_fields}) for e in entities]
    rel_models = [ExtractedRelationship(**r) for r in relationships]

    return DocumentAnalyzeResponse(
        document_id=doc.document_id,
        title=doc.title,
        content_summary=doc.content_summary or "",
        entities=ent_models,
        relationships=rel_models,
        new_graph_candidates=[
            {"type": e["entity_type"], "value": e["normalized_value"], "confidence": e["confidence"]}
            for e in entities[:10] if e.get("entity_type") in _GRAPH_SYNCABLE_TYPES
        ]
    )
