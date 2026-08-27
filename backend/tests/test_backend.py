import os
import sys
import pytest
from fastapi.testclient import TestClient

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
AI_ENGINE_DIR = os.path.join(ROOT_DIR, "ai-engine")
if AI_ENGINE_DIR not in sys.path:
    sys.path.insert(0, AI_ENGINE_DIR)

from backend.app.main import app
from backend.app.core.graph_store import graph_store
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.entities import Case, Person, Alert
from anomaly_detection.transaction_anomaly import tx_anomaly_detector
from anomaly_detection.cdr_anomaly import cdr_anomaly_detector
from scoring.priority_scorer import priority_scorer
from nlp.entity_extractor import entity_extractor
from ingestion.master_pipeline import pipeline

@pytest.fixture(scope="session", autouse=True)
def setup_database_and_graph():
    pipeline.run()
    graph_store.load_from_dataset()

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "CrimeGraph AI"
    assert "disclaimer" in data

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["total_cases"] >= 3
    assert data["metrics"]["total_persons"] >= 12
    assert len(data["top_leads"]) > 0
    assert len(data["crime_distribution"]) > 0

def test_cases_endpoints():
    response = client.get("/api/cases")
    assert response.status_code == 200
    cases = response.json()
    assert len(cases) >= 3
    
    # Check Case C042 details
    c042 = client.get("/api/cases/C042")
    assert c042.status_code == 200
    c_data = c042.json()
    assert c_data["case_id"] == "C042"
    assert len(c_data["persons"]) > 0

def test_person_profile_and_priority():
    response = client.get("/api/persons/P001")
    assert response.status_code == 200
    p_data = response.json()
    assert p_data["person_id"] == "P001"
    assert p_data["name"] == "Rahul Sharma"
    assert p_data["priority_score"] >= 80
    assert len(p_data["priority_factors"]) == 5
    assert "analytical prioritization score" in p_data["disclaimer"]

def test_graph_endpoints():
    # Full graph
    full = client.get("/api/graph/full")
    assert full.status_code == 200
    g_data = full.json()
    assert g_data["total_nodes"] >= 40
    assert g_data["total_edges"] >= 40

    # Person Subgraph
    p_graph = client.get("/api/graph/person/P001?hops=1")
    assert p_graph.status_code == 200
    assert len(p_graph.json()["nodes"]) > 0

    # Case Subgraph
    c_graph = client.get("/api/graph/case/C042?hops=2")
    assert c_graph.status_code == 200

def test_shortest_path():
    payload = {"source_id": "P001", "target_id": "C042", "max_hops": 3}
    response = client.post("/api/graph/path", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["hops"] >= 1
    assert len(data["evidence_chain"]) >= 1

def test_analytics_endpoints():
    # Centrality
    cent = client.get("/api/analytics/centrality")
    assert cent.status_code == 200
    assert len(cent.json()) > 0

    # Communities
    comm = client.get("/api/analytics/communities")
    assert comm.status_code == 200
    assert len(comm.json()) >= 3

    # Bridges
    bridges = client.get("/api/analytics/bridges")
    assert bridges.status_code == 200
    bridge_ids = [b["node_id"] for b in bridges.json()]
    assert "P001" in bridge_ids

def test_alerts_endpoints():
    alerts = client.get("/api/alerts")
    assert alerts.status_code == 200
    assert len(alerts.json()) >= 5

def test_investigation_assistant():
    payload = {"query": "How is Rahul Sharma connected to Case C042?"}
    response = client.post("/api/investigation/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["structured_findings"]) > 0
    assert len(data["cited_evidence_ids"]) > 0
    assert "analytical leads" in data["disclaimer"]

def test_global_search():
    response = client.get("/api/search?q=Rahul")
    assert response.status_code == 200
    data = response.json()
    assert len(data["results_by_category"]["Persons"]) > 0

def test_documents_and_nlp():
    docs_res = client.get("/api/documents")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) >= 1
    
    first_doc_id = docs[0]["document_id"]
    analyze_res = client.post(f"/api/documents/{first_doc_id}/analyze")
    assert analyze_res.status_code == 200
    a_data = analyze_res.json()
    assert len(a_data["entities"]) > 0
