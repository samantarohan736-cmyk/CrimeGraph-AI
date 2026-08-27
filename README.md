# CrimeGraph AI
### AI-Powered Explainable Criminal Network Intelligence & Investigation Assistant

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev)
[![Cytoscape](https://img.shields.io/badge/Graph-Cytoscape.js-06b6d4.svg)](https://js.cytoscape.org)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB.svg)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Problem Statement
Law enforcement and national intelligence analysts face vast volumes of structured records (Call Detail Records, banking transfers, vehicle registries, border logs) and unstructured field intelligence (FIRs, surveillance notes, interrogation transcripts). Connecting the dots across distributed syndicate cells, detecting hidden intermediaries, identifying anomalous surges, and maintaining an audited chain of evidence across multi-hop investigations is challenging and time-intensive.

## 2. Solution Overview
**CrimeGraph AI** is an explainable intelligence assistant that unifies multi-modal structured and unstructured crime data into a dynamic Knowledge Graph. It detects bridge entities, calculates a transparent **Investigation Priority Score (0–100)**, flags statistical communication and financial anomalies, resolves duplicate identities, finds multi-hop investigative paths, and provides a graph-grounded conversational assistant that cites verified evidence records for every finding.

> **Responsible AI Standard**: The system is designed exclusively as an **investigative prioritization and analytical triage platform**. It never declares an entity "guilty" or "criminal" and requires human-in-the-loop validation for all leads.

---

## 3. Architecture

```
                                  USER INTERFACE
    React 18 + Vite + Tailwind CSS + Cytoscape.js Network Graph + Recharts Visuals
                                         |
                                         | REST API (/api/*)
                                         v
                                  FASTAPI BACKEND
     [Dashboard] [Cases] [Persons] [Graph] [Analytics] [Alerts] [Timeline] [Assistant]
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
   AI / NLP ENGINE                KNOWLEDGE GRAPH               RELATIONAL STORE
- Hybrid Regex + NLP Extr.      - Louvain Modularity Clusters - SQLite (Zero-friction)
- RapidFuzz Entity Resolution   - Betweenness Centrality      - PostgreSQL (Enterprise)
- Statistical Anomaly Detectors - Multi-Hop Shortest Paths    - Cases, Evidence, Documents
- Priority Scorer (0-100)       - Neo4j / NetworkX Engine     - Alerts, CDRs, Transactions
```

---

## 4. Key Features

- **Interactive Knowledge Graph (Cytoscape.js)**: Multi-modal graph visualization with 1/2/3-hop radius expansion, community coloring, centrality heatmaps, and slide-out node/edge inspection drawers.
- **Explainable Anomaly Detection**: Statistical detection of transaction surges (e.g. 7.4x median Hawala dispersal), communication spikes (420% surge), and nocturnal coordination.
- **Transparent Investigation Priority Score**: 0–100 composite ranking combining Network Centrality (30%), Cross-Case Overlap (25%), CDR Spikes (15%), Transaction Anomalies (15%), and Temporal Activity (15%) with factor breakdown and disclaimers.
- **Bridge Entity Detection**: Automatically identifies articulation points and gateway entities linking distinct criminal operations (e.g. Hawala and Maritime Smuggling).
- **Multi-Hop Pathfinding**: Computes shortest investigative paths between arbitrary entities and outputs step-by-step audited evidence trails.
- **Graph-Grounded Investigation Assistant**: Natural language Q&A engine grounded in actual application data and knowledge graphs with strict evidence citations.
- **Unstructured NLP Ingestion**: Extracts `PERSON`, `PHONE`, `VEHICLE`, `LOCATION`, `ORGANIZATION`, `CASE`, `DATE`, and `AMOUNT` with character offsets and confidence scores.
- **Human-in-the-Loop Entity Resolution**: Multi-signal similarity scoring (RapidFuzz name tokens, phone matches, context overlap) with manual merge/reject controls.
- **Temporal Timeline**: Chronological stream of calls, wire movements, meetings, and document filings.

---

## 5. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Cytoscape.js, Recharts, Lucide React, Axios, React Router.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy, NetworkX, Neo4j Python driver, psycopg2.
- **AI / NLP**: spaCy, RapidFuzz, scikit-learn, PyMuPDF, NumPy.
- **Storage**: SQLite (Zero-friction embedded default) / PostgreSQL + Neo4j.

---

## 6. Dataset Description

The system includes a rich, interlinked synthetic dataset in `data/synthetic/` and `data/reports/`:
- `persons.csv`: 12 nodal entities (Rahul Sharma, Vikram Malhotra, Tariq Khan, Priya Nair, David Miller, etc.).
- `phones.csv`: 10 telecom SIM profiles (postpaid, burner lines, foreign roaming).
- `vehicles.csv`: 6 registered vehicles (sedans, heavy freight trucks, pickups).
- `locations.csv`: 8 operational nodes (JNPT Port, BKC Diamond Tower, Panvel Hub, Dubai Gold Souk).
- `organizations.csv`: 5 front companies and shipping LLPs.
- `cases.csv`: 3 major active operations (C042 Hawala, C019 Contraband, C055 Cyber Extortion).
- `cdr.csv`: 103 Call Detail Records with timestamps, cell towers, and communication spikes.
- `transactions.csv`: 44 financial transactions showing regular baselines vs. 7.4x surges.
- `relationships.csv`: 45 verified multi-modal graph links with evidence IDs.
- `reports/`: 5 realistic intelligence memos, surveillance logs, and interrogation statements.

---

## 7. Installation & Setup

### Prerequisites
- **Python 3.11+**
- **Node.js v18+ & npm**

### Clone & Install Backend
```bash
# Navigate to project directory
cd d:/CrimeDetect

# Install Python dependencies
pip install -r backend/requirements.txt
```

### Install Frontend
```bash
# Navigate to frontend
cd frontend
npm install
cd ..
```

---

## 8. Running the Application

### Start Backend API Server
```bash
# From workspace root
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend will be live at: **`http://127.0.0.1:8000`** (Swagger docs at `http://127.0.0.1:8000/docs`).

### Start React Frontend
```bash
cd frontend
npm run dev
```
Frontend will be live at: **`http://localhost:5173`**.

---

## 9. Database & Graph Configuration

### Zero-Friction Embedded Mode (Default)
By default, the backend runs with zero external dependencies:
- Relational Database: Embedded SQLite (`data/crimegraph.db`)
- Graph Database: In-Memory Multi-Modal Knowledge Graph with instant graph traversals and Cypher compatibility.

### PostgreSQL & Neo4j Enterprise Mode (Optional)
To connect to local or remote PostgreSQL and Neo4j instances, configure `.env` (or copy from `backend/.env.example`):
```ini
USE_SQLITE=False
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=crimegraph_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

USE_NEO4J=True
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

---

## 10. Data Ingestion & Testing

### Run Master Ingestion Pipeline
To re-generate synthetic datasets and re-run validation, entity resolution, anomaly detection, and priority scoring:
```bash
python ai-engine/ingestion/master_pipeline.py
```

### Run Automated Test Suite
```bash
pytest backend/tests/test_backend.py -v
```

---

## 11. Step-by-Step Demo Flow

1. **Dashboard**: Open `http://localhost:5173`. Inspect real-time KPIs, crime distribution, activity trends, and Top Investigation Leads.
2. **Case Dossier**: Open **Case C042** (*Operation Golden Hawala Syndicate*). Inspect associated entities, alerts, and embedded subgraph.
3. **Interactive Graph**: Open **Network Analysis**. Toggle between **Entity Types**, **Communities**, and **Centrality Heatmap**.
4. **Bridge Identification**: Identify **Rahul Sharma (P001)** as the key articulation node bridging Hawala (C042) and Contraband (C019).
5. **Person Profile**: Open P001 profile. Inspect the **84/100 Investigation Priority Score**, the 5-factor contribution breakdown, and evidence citations (`CDR-182`, `TX-01082`).
6. **Multi-Hop Path**: Trace the 2-hop connection from `P001` to `C042` with audited evidence steps.
7. **AI Assistant**: Query the graph assistant: *"How is Rahul Sharma connected to Case C042?"* or *"Show suspicious transaction activity"*.
8. **Document NLP & Entity Resolution**: Inspect extracted entities from surveillance reports and approve identity deduplication merges.

---

## 12. Responsible AI Statement

CrimeGraph AI is strictly an **investigative decision-support system**.
- **No verdicts**: Scores represent analytical prioritization for resource allocation, not determinations of guilt or criminality.
- **Traceability**: Every alert, relationship, and metric is traceable to raw evidence records.
- **Human-in-the-Loop**: Identity merges and high-severity triage decisions require authorized officer review.

---

## 13. Future Connectors
The ingestion pipeline is designed with modular adapters (`ai-engine/ingestion/`) so authorized connectors (Telecom CDR feeds, Core Banking SWIFT/RTGS APIs, Police CCTNS, Court registries) can be plugged in without refactoring core analytics.
