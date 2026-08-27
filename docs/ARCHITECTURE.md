# CrimeGraph AI — System Architecture

**CrimeGraph AI** is an AI-powered, explainable criminal network intelligence and investigation assistant built for defense analysts and law enforcement agencies.

---

## 1. High-Level Architectural Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                    |
|   React + Vite + Tailwind CSS + Cytoscape.js Network Graph + Recharts Visuals     |
|   (Dashboard, Network Explorer, Case Dossiers, POI Dossiers, Anomaly Feeds, Q&A) |
+------------------------------------------+----------------------------------------+
                                           | HTTP REST API (/api/*)
                                           v
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                    |
|   Routers: /dashboard, /cases, /persons, /graph, /analytics, /alerts, /timeline   |
|   Services: Graph Service, Anomaly Service, Scorer Service, Assistant Service     |
+---------------------+--------------------+--------------------+-------------------+
                      |                    |                    |
                      v                    v                    v
+-----------------------------+ +---------------------+ +---------------------------+
|      AI / NLP ENGINE        | |   KNOWLEDGE GRAPH   | |     RELATIONAL STORE      |
|  - Hybrid Regex + NLP Extr. | | - In-Memory / Neo4j | | - SQLite (Zero-friction)  |
|  - RapidFuzz Entity Resolv. | | - Louvain Partition | | - PostgreSQL (Production) |
|  - Statistical Anomaly Det. | | - Betweenness Cent. | | - Cases, Documents, Alerts|
|  - Priority Scorer (0-100)  | | - Multi-Hop Search  | | - Transactions, CDRs, EVD |
+-----------------------------+ +---------------------+ +---------------------------+
```

---

## 2. Core Subsystems

### A. AI / NLP Ingestion Engine
1. **Hybrid Entity Extractor**: Combines deterministic regex patterns with linguistic tokenization to extract `PERSON`, `PHONE`, `VEHICLE`, `LOCATION`, `ORGANIZATION`, `CASE`, `DATE`, `AMOUNT` with character offsets and confidence metrics.
2. **Entity Resolution Engine**: Uses RapidFuzz token matching, phone matching, and spatial/case overlap to produce non-destructive candidate merges for human review.
3. **Statistical Anomaly Detectors**:
   - **Transaction Surge**: Compares transfers against historical medians (e.g. 7.4x median surge detection).
   - **Communication Anomaly**: Detects 420% frequency surges and nocturnal burner SIM coordination.
   - **Temporal Anomaly**: Flags off-hours cluster activity (01:00 AM - 04:30 AM).

### B. Knowledge Graph Architecture
- Graph representations support nodes (`Person`, `Phone`, `Vehicle`, `Location`, `Organization`, `Case`) and edges (`USES_PHONE`, `OWNS_VEHICLE`, `VISITED`, `WORKS_FOR`, `CALLED`, `TRANSFERRED_TO`, `ASSOCIATED_WITH_CASE`).
- Supports k-hop ego expansion, Louvain modularity community detection, betweenness centrality, PageRank, and shortest path finding.
- Dual-mode: Native Neo4j Bolt driver or embedded NetworkX Graph with zero configuration required.

### C. Investigation Priority Scoring (0-100)
Transparent composite ranking calculated from:
- Network Centrality & Bridge Articulation (30%)
- Cross-Case Involvement (25%)
- Communication Spike Anomalies (15%)
- Transaction Disbursement Surges (15%)
- Nocturnal / Temporal Activity (15%)
- Includes mandatory disclaimer: *"This is an analytical prioritization score, not a determination of guilt or criminality."*
