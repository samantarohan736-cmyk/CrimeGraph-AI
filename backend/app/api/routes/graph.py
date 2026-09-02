from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
from backend.app.core.graph_store import graph_store
from backend.app.schemas.api_schemas import (
    GraphResponse, ShortestPathRequest, ShortestPathResponse, EntitySearchItem
)

router = APIRouter(prefix="/graph", tags=["Graph Network"])

@router.get("/entities", response_model=List[EntitySearchItem])
def get_graph_entities():
    """Returns compact list of all multi-modal entities for fast graph search autocomplete."""
    return graph_store.get_all_entities_list()

@router.get("/full", response_model=GraphResponse)
def get_full_network():
    """Returns the entire multi-modal knowledge graph (Backend dataset export)."""
    return graph_store.get_full_graph()

@router.get("/person/{person_id}", response_model=GraphResponse)
def get_person_graph(
    person_id: str,
    hops: int = Query(2, ge=1, le=4, description="K-hop expansion radius"),
    max_nodes: int = Query(25, ge=5, le=200, description="Max node threshold"),
    smart_ranking: bool = Query(True, description="Enable smart prioritization of connections"),
    suspicious_only: bool = Query(False, description="Filter for suspicious activity flags only"),
    categories: Optional[str] = Query(None, description="Comma-separated category filters (CALLS,FINANCIAL,CASES,etc.)")
):
    """Retrieves evidence-backed k-hop ego subgraph around a specific person."""
    if not graph_store.undirected_graph.has_node(person_id):
        raise HTTPException(status_code=404, detail=f"Person entity {person_id} not found in graph.")
    cat_list = [c.strip() for c in categories.split(",")] if categories else None
    return graph_store.get_subgraph(
        center_node_id=person_id,
        max_hops=hops,
        categories=cat_list,
        max_nodes=max_nodes,
        smart_ranking=smart_ranking,
        suspicious_only=suspicious_only
    )

@router.get("/case/{case_id}", response_model=GraphResponse)
def get_case_graph(
    case_id: str,
    hops: int = Query(2, ge=1, le=4, description="K-hop expansion radius"),
    max_nodes: int = Query(25, ge=5, le=200, description="Max node threshold"),
    smart_ranking: bool = Query(True, description="Enable smart prioritization of connections"),
    suspicious_only: bool = Query(False, description="Filter for suspicious activity flags only"),
    categories: Optional[str] = Query(None, description="Comma-separated category filters")
):
    """Retrieves subgraph for a specific case and all connected nodes."""
    if not graph_store.undirected_graph.has_node(case_id):
        raise HTTPException(status_code=404, detail=f"Case entity {case_id} not found in graph.")
    cat_list = [c.strip() for c in categories.split(",")] if categories else None
    return graph_store.get_subgraph(
        center_node_id=case_id,
        max_hops=hops,
        categories=cat_list,
        max_nodes=max_nodes,
        smart_ranking=smart_ranking,
        suspicious_only=suspicious_only
    )

@router.get("/explore", response_model=GraphResponse)
def explore_node(
    node_id: Optional[str] = Query(None, description="Root entity ID to explore (defaults to primary entity)"),
    hops: int = Query(2, ge=1, le=4, description="Number of hops"),
    max_nodes: int = Query(25, ge=5, le=200, description="Maximum nodes limit (10, 25, 50, 100)"),
    smart_ranking: bool = Query(True, description="Smart ranking by multiplicity, confidence, recency, and centrality"),
    suspicious_only: bool = Query(False, description="Highlight and isolate potentially suspicious activity"),
    categories: Optional[str] = Query(None, description="Comma-separated category filters (CALLS,FINANCIAL,CASES,PHONES,VEHICLES,LOCATIONS,ORGANIZATIONS,ASSOCIATIONS)"),
    rel_type: Optional[str] = Query(None, description="Optional specific relationship type filter")
):
    """Explores an uncluttered, evidence-grounded neighborhood around any entity node."""
    if node_id and not graph_store.undirected_graph.has_node(node_id):
        raise HTTPException(status_code=404, detail=f"Entity {node_id} not found in graph.")
    
    cat_list = [c.strip() for c in categories.split(",")] if categories else None
    rel_filter = [rel_type] if rel_type else None
    
    return graph_store.get_subgraph(
        center_node_id=node_id,
        max_hops=hops,
        categories=cat_list,
        rel_types=rel_filter,
        max_nodes=max_nodes,
        smart_ranking=smart_ranking,
        suspicious_only=suspicious_only
    )

@router.post("/path", response_model=ShortestPathResponse)
def find_graph_path(req: ShortestPathRequest):
    """Finds shortest investigative path between two entities with complete evidence trail."""
    return graph_store.find_shortest_path(
        source_id=req.source_id,
        target_id=req.target_id,
        max_hops=req.max_hops or 4
    )
