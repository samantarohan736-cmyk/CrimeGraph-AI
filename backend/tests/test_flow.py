import os
import sys
import io
import pytest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from fastapi.testclient import TestClient
from backend.app.main import app

from backend.app.core.graph_store import graph_store
from backend.app.core.database import SessionLocal
from backend.app.models.entities import Document, Evidence, Person, Case

client = TestClient(app)

def test_full_flow_fir_upload_and_cross_referencing():
    """
    Validates User Requirement 1:
    Police uploads FIR / police report (TXT or PDF)
    -> Automatically extracts text
    -> NLP extracts entities (Persons, Phones, Vehicles, Locations, Organizations, Cases)
    -> Cross-references against criminal records CSVs (e.g. Varun Jain, P001, West Bengal)
    -> Automatically identifies relationships
    -> Generates and stores the entities and relationships in Neo4j / Knowledge Graph.
    """
    fir_text = """
    FIRST INFORMATION REPORT (FIR)
    Incident Report No: FIR/KOL/2026/089
    Station: Central Cyber & Narcotics Bureau
    
    During ongoing surveillance of Case C001, suspect Varun Jain was observed meeting
    with Priya Patel near Riverside Complex in Howrah.
    Suspect was operating vehicle WB01AB1234 registered in the region.
    Phone call records indicate multiple high-volume voice calls to mobile 9876543210.
    A financial wire transfer of INR 450000 was confirmed by intelligence units.
    """
    
    file_bytes = fir_text.encode("utf-8")
    files = {
        "file": ("FIR_VERIFICATION_TEST.txt", io.BytesIO(file_bytes), "text/plain")
    }
    data = {
        "title": "FIR Surveillance Memo - Case C001 Syndicate Link",
        "case_id": "C001",
        "source_agency": "Central Cyber & Narcotics Bureau",
        "author": "Inspector S. Roy",
        "classification": "CONFIDENTIAL INVESTIGATIVE RECORD"
    }

    response = client.post("/api/documents/upload", files=files, data=data)
    assert response.status_code == 200, response.text
    res_data = response.json()
    
    doc_id = res_data["document_id"]
    assert res_data["entities_extracted"] > 0
    assert res_data["relationships_extracted"] > 0
    assert "matched_criminal_records" in res_data
    
    # Verify graph store contains the newly added document node and links
    assert graph_store.graph.has_node(doc_id)
    doc_node = graph_store.nodes_data[doc_id]
    assert doc_node["type"] == "Document"
    assert doc_node["case_id"] == "C001"

    # Verify document is linked to Case C001 in graph
    subgraph = graph_store.get_case_subgraph("C001", hops=2)
    node_ids = {n.id for n in subgraph.nodes}
    assert doc_id in node_ids or "C001" in node_ids

def test_derived_relationships_without_relationships_csv():
    """
    Validates User Requirement 2 & 3:
    Structured CSV data used as source without relationships.csv.
    Relationships automatically derived from CDRs, transactions, cases, vehicles, reports, etc.
    """
    # 1. Check relationships loaded
    assert graph_store.graph.number_of_edges() > 2000
    
    # 2. Verify specific derived edge types exist
    edge_types = {e.get("relationship") for e in graph_store.edges_data}
    assert "CALLED" in edge_types
    assert "TRANSFERRED_TO" in edge_types
    assert "OWNS_PHONE" in edge_types
    assert "OWNS_VEHICLE" in edge_types
    assert "INVOLVED_IN" in edge_types
    assert "LOCATED_IN" in edge_types
    assert "FILED_FOR_CASE" in edge_types

    # 3. Verify Cypher seed script export exists and is non-empty
    seed_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "database", "neo4j", "seed_import.cypher"
    )
    assert os.path.exists(seed_file)
    assert os.path.getsize(seed_file) > 10000

def test_ai_graph_analytics_and_evidence():
    """
    Validates User Requirement 4:
    AI/Graph Analysis: community detection, betweenness, bridge nodes, anomalies with underlying evidence.
    """
    # Communities
    communities = graph_store.detect_communities()
    assert len(communities) > 0

    # Centralities
    centralities = graph_store.calculate_centralities()
    assert len(centralities) > 0

    # Bridges
    bridges = graph_store.find_bridge_nodes()
    assert len(bridges) > 0
    assert len(bridges[0].bridged_communities) >= 2
    assert len(bridges[0].explanation) > 0

    # Suspicion and reasons
    node_id = list(graph_store.nodes_data.keys())[0]
    node_data = graph_store.nodes_data[node_id]
    is_suspicious, reasons = graph_store.evaluate_node_suspicion(node_id, node_data, 0.5, 10)
    assert isinstance(reasons, list)

def test_investigator_k_hop_exploration():
    """
    Validates User Requirement 5:
    Search person/case and explore 1-hop / 2-hop connections without graph clutter.
    """
    # 1-hop via core engine
    subgraph_1 = graph_store.get_subgraph("P001", max_hops=1, max_nodes=25)
    assert len(subgraph_1.nodes) <= 26
    assert subgraph_1.total_nodes > 0

    # 2-hop via core engine
    subgraph_2 = graph_store.get_subgraph("P001", max_hops=2, max_nodes=25)
    assert len(subgraph_2.nodes) <= 26
    assert subgraph_2.total_nodes >= len(subgraph_1.nodes)

    # 1-hop and 2-hop via API routes
    res_1 = client.get("/api/graph/person/P001?hops=1&max_nodes=25")
    assert res_1.status_code == 200
    assert len(res_1.json()["nodes"]) <= 26

    res_2 = client.get("/api/graph/person/P001?hops=2&max_nodes=25")
    assert res_2.status_code == 200
    assert len(res_2.json()["nodes"]) <= 26


