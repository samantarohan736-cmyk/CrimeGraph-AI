from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from backend.app.core.graph_store import graph_store
from backend.app.schemas.api_schemas import GraphResponse, ShortestPathRequest, ShortestPathResponse

router = APIRouter(prefix="/graph", tags=["Graph Network"])

@router.get("/full", response_model=GraphResponse)
def get_full_network():
    """Returns the entire multi-modal knowledge graph."""
    return graph_store.get_full_graph()

@router.get("/person/{person_id}", response_model=GraphResponse)
def get_person_graph(
    person_id: str,
    hops: int = Query(2, ge=1, le=4, description="K-hop expansion radius")
):
    """Retrieves k-hop ego subgraph around a specific person."""
    if not graph_store.undirected_graph.has_node(person_id):
        raise HTTPException(status_code=404, detail=f"Person entity {person_id} not found in graph.")
    return graph_store.get_subgraph(person_id, max_hops=hops)

@router.get("/case/{case_id}", response_model=GraphResponse)
def get_case_graph(
    case_id: str,
    hops: int = Query(2, ge=1, le=4, description="K-hop expansion radius")
):
    """Retrieves subgraph for a specific case and all connected nodes."""
    if not graph_store.undirected_graph.has_node(case_id):
        raise HTTPException(status_code=404, detail=f"Case entity {case_id} not found in graph.")
    return graph_store.get_case_subgraph(case_id, hops=hops)

@router.get("/explore", response_model=GraphResponse)
def explore_node(
    node_id: str = Query(..., description="Root entity ID to explore"),
    hops: int = Query(1, ge=1, le=4, description="Number of hops"),
    rel_type: Optional[str] = Query(None, description="Optional relationship filter")
):
    """Explores neighborhood around any arbitrary entity node."""
    if not graph_store.undirected_graph.has_node(node_id):
        raise HTTPException(status_code=404, detail=f"Entity {node_id} not found in graph.")
    rel_filter = [rel_type] if rel_type else None
    return graph_store.get_subgraph(node_id, max_hops=hops, rel_types=rel_filter)

@router.post("/path", response_model=ShortestPathResponse)
def find_graph_path(req: ShortestPathRequest):
    """Finds shortest investigative path between two entities with complete evidence trail."""
    return graph_store.find_shortest_path(
        source_id=req.source_id,
        target_id=req.target_id,
        max_hops=req.max_hops or 4
    )
