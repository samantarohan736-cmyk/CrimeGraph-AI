from fastapi import APIRouter
from typing import List
from backend.app.core.graph_store import graph_store
from backend.app.schemas.api_schemas import (
    CentralityMetric, CommunityInfo, BridgeNodeInfo, NetworkOverviewMetrics
)

router = APIRouter(prefix="/analytics", tags=["Graph Analytics"])

@router.get("/centrality", response_model=List[CentralityMetric])
def get_centrality_metrics():
    """
    Computes degree centrality, betweenness centrality, and PageRank for all entities.
    Returns plain-English explanations for each metric.
    """
    centralities = graph_store.calculate_centralities()
    results = []
    
    for n_id, m in centralities.items():
        data = graph_store.nodes_data.get(n_id, {})
        deg = graph_store.undirected_graph.degree(n_id) if graph_store.undirected_graph.has_node(n_id) else 0
        b_score = m.get("betweenness", 0.0)
        
        explanation = (
            f"Entity holds {deg} direct connections. "
            f"Betweenness ({b_score:.3f}) indicates {'critical brokerage position on information paths' if b_score > 0.15 else 'moderate intermediary positioning'}."
        )

        results.append(CentralityMetric(
            node_id=n_id,
            label=data.get("label", n_id),
            type=data.get("type", "Entity"),
            degree=deg,
            degree_centrality=round(m.get("degree_centrality", 0.0), 3),
            betweenness_centrality=round(b_score, 3),
            pagerank=round(m.get("pagerank", 0.0), 4),
            explanation=explanation
        ))

    results.sort(key=lambda x: x.betweenness_centrality + x.degree_centrality, reverse=True)
    return results

@router.get("/communities", response_model=List[CommunityInfo])
def get_communities():
    """Detects Louvain modularity communities across criminal syndicates."""
    return graph_store.get_community_details()

@router.get("/bridges", response_model=List[BridgeNodeInfo])
def get_bridge_entities():
    """Identifies critical bridge nodes and articulation points between sub-networks."""
    return graph_store.find_bridge_nodes()

@router.get("/metrics", response_model=NetworkOverviewMetrics)
def get_network_overview_metrics():
    """Returns global network topology metrics and definitions."""
    return graph_store.get_network_overview()
