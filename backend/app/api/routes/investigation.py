from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.schemas.api_schemas import (
    AssistantQueryRequest, AssistantQueryResponse, ShortestPathRequest, ShortestPathResponse
)
from backend.app.services.assistant_service import assistant_service

router = APIRouter(prefix="/investigation", tags=["Investigation Assistant"])

@router.post("/query", response_model=AssistantQueryResponse)
def query_investigation_assistant(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    """
    Natural Language Investigation Assistant Query Engine.
    Executes graph-grounded reasoning over cases, entities, anomalies, and evidence chains.
    """
    return assistant_service.answer_query(
        db=db,
        query=req.query,
        case_id=req.case_id,
        focused_entity_id=req.focused_entity_id
    )

@router.post("/path", response_model=ShortestPathResponse)
def find_investigation_path(req: ShortestPathRequest):
    """Calculates multi-hop path and returns formatted evidence trail."""
    return graph_store.find_shortest_path(
        source_id=req.source_id,
        target_id=req.target_id,
        max_hops=req.max_hops or 4
    )
