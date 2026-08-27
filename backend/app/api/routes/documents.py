import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.entities import Document, Case
from backend.app.schemas.api_schemas import DocumentAnalyzeResponse, ExtractedEntity, ExtractedRelationship
from nlp.entity_extractor import entity_extractor
from nlp.relationship_extractor import relationship_extractor

router = APIRouter(prefix="/documents", tags=["Documents & NLP"])

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
    """Uploads a TXT or PDF intelligence document and triggers automated NLP extraction."""
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)
    filename = file.filename
    dest_path = os.path.join(settings.REPORTS_DIR, filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    content = ""
    file_type = "TXT"
    if filename.lower().endswith(".pdf"):
        file_type = "PDF"
        try:
            import fitz # PyMuPDF
            doc_pdf = fitz.open(dest_path)
            for page in doc_pdf:
                content += page.get_text()
        except Exception:
            content = f"PDF content extracted from {filename}."
    else:
        with open(dest_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

    # NLP Extraction
    entities = entity_extractor.extract_entities(content, source_doc=filename)
    relationships = relationship_extractor.extract_relationships(content, doc_id=filename)

    doc_id = f"DOC-{int(db.query(Document).count()) + 1:03d}"
    summary = content[:200] + "..." if len(content) > 200 else content

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

    return {
        "document_id": doc_id,
        "title": title,
        "entities_extracted": len(entities),
        "relationships_extracted": len(relationships),
        "message": "Document successfully ingested and analyzed."
    }

@router.post("/{document_id}/analyze", response_model=DocumentAnalyzeResponse)
def reanalyze_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found.")

    entities = entity_extractor.extract_entities(doc.content or "", source_doc=doc.document_id)
    relationships = relationship_extractor.extract_relationships(doc.content or "", doc_id=doc.document_id)

    doc.extracted_entities = entities
    doc.extracted_relationships = relationships
    db.commit()

    ent_models = [ExtractedEntity(**e) for e in entities]
    rel_models = [ExtractedRelationship(**r) for r in relationships]

    return DocumentAnalyzeResponse(
        document_id=doc.document_id,
        title=doc.title,
        content_summary=doc.content_summary or "",
        entities=ent_models,
        relationships=rel_models,
        new_graph_candidates=[{"type": e["entity_type"], "value": e["normalized_value"]} for e in entities[:5]]
    )
