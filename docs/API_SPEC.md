# CrimeGraph AI — REST API Specification

All endpoints are prefixed with `/api`.

---

## 1. Dashboard & Global Search
- `GET /api/dashboard/summary`: Summary KPIs, crime distributions, top analytical leads, recent alerts, timeline trends.
- `GET /api/search?q={query}`: Fuzzy multi-entity search across Persons, Cases, Phones, Vehicles, Locations, Organizations, and Evidence.

## 2. Cases
- `GET /api/cases`: List all active criminal operations.
- `GET /api/cases/{case_id}`: Detailed dossier with connected entities, evidence records, and active alerts.

## 3. Persons of Interest
- `GET /api/persons`: List all tracked persons with priority scores.
- `GET /api/persons/{person_id}`: Comprehensive dossier with 5-factor priority score breakdown, centrality metrics, and multi-modal connections.

## 4. Knowledge Graph
- `GET /api/graph/full`: Returns all nodes and edges in the Knowledge Graph.
- `GET /api/graph/person/{person_id}?hops=2`: K-hop ego subgraph around an entity.
- `GET /api/graph/case/{case_id}?hops=2`: Subgraph of entities tied to a specific case.
- `GET /api/graph/explore?node_id={id}&hops=1`: Neighborhood exploration.
- `POST /api/graph/path`: Multi-hop shortest path search between two entities with audited evidence trail.

## 5. Graph Analytics
- `GET /api/analytics/centrality`: Degree, betweenness, and PageRank with investigator explanations.
- `GET /api/analytics/communities`: Louvain modularity clusters.
- `GET /api/analytics/bridges`: Articulation points connecting distinct criminal cells.
- `GET /api/analytics/metrics`: High-level graph topology metrics.

## 6. Alerts & Anomaly Surveillance
- `GET /api/alerts`: List statistical anomaly alerts (filter by `severity`, `case_id`, `status`).
- `GET /api/alerts/{alert_id}`: Detailed alert metadata and supporting records.
- `POST /api/alerts/{alert_id}/resolve`: Mark alert reviewed or dismissed.

## 7. Timeline
- `GET /api/timeline/all`: Chronological multi-modal activity stream.
- `GET /api/timeline/{case_id}`: Case-specific timeline.

## 8. Documents & NLP Ingestion
- `GET /api/documents`: List ingested intelligence reports.
- `GET /api/documents/{document_id}`: Full report text with highlighted entity spans.
- `POST /api/documents/upload`: Upload TXT/PDF intelligence report and run automated NLP extraction.
- `POST /api/documents/{document_id}/analyze`: Re-run NLP entity and relationship extraction.

## 9. Evidence Traceability
- `GET /api/evidence`: Evidence catalog.
- `GET /api/evidence/{evidence_id}`: Verified evidence item.
- `GET /api/evidence/chain/{entity_id}`: Complete audited evidence chain linked to an entity.

## 10. Investigation Assistant
- `POST /api/investigation/query`: Natural language graph-grounded Q&A engine with evidence citations.

