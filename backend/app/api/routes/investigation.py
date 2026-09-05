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
    Natural Language Investigation Assistant.
    Supports 15+ intent types: case lookup, person profile, CDR queries, transaction
    analysis, alert review, bridge detection, centrality, path finding, network subgraphs,
    priority scores, evidence catalog, and general status summaries.
    Pass 'history' for multi-turn conversations.
    """
    return assistant_service.answer_query(
        db=db,
        query=req.query,
        case_id=req.case_id,
        focused_entity_id=req.focused_entity_id,
        history=req.history or []
    )


@router.post("/path", response_model=ShortestPathResponse)
def find_investigation_path(req: ShortestPathRequest):
    """Finds shortest investigative path between two entities with evidence trail."""
    return graph_store.find_shortest_path(
        source_id=req.source_id,
        target_id=req.target_id,
        max_hops=req.max_hops or 4
    )
