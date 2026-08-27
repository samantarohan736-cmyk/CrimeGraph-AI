# CrimeGraph AI — Step-by-Step Live Demonstration Script

Follow this workflow to demonstrate CrimeGraph AI:

---

### Step 1: Open Dashboard
- **URL**: `http://localhost:5173/`
- **What to show**:
  - Live statistics calculated directly from the database (3 Active Cases, 12 Persons of Interest, 44 Graph Nodes, 7 Anomaly Alerts).
  - Crime distribution pie chart and monthly CDR / Hawala flow trends.
  - **Top Investigation Leads Table**: Note that persons are ranked by transparent *Investigation Priority Score* (e.g. Rahul Sharma at 84/100) and explicitly labeled as analytical leads, NOT criminal verdicts.

---

### Step 2: Open Case C042 (Operation Golden Hawala Syndicate)
- Click on **Case Files** or **C042** in the table.
- **What to show**:
  - Multi-crore Hawala laundering operation overview.
  - Connected Nodal Entities (Rahul Sharma, Vikram Malhotra, Priya Nair, Amit Patel).
  - Embedded interactive Case Subgraph.
  - Associated intelligence documents and evidence catalog.

---

### Step 3: Open Network Analysis
- Click **Network Analysis** in the left sidebar.
- **What to show**:
  - Interactive Cytoscape.js canvas showing multi-modal entities (Persons, Cases, Phones, Vehicles, Locations, Organizations).
  - Switch overlay modes:
    - **Entity Types** (Color-coded)
    - **Communities** (Louvain modularity clusters: Hawala cluster, Contraband Logistics cluster, Cyber Extortion cluster)
    - **Centrality Heatmap** (Nodes sized and colored by betweenness centrality)
  - Change layouts (COSE force-directed, concentric circles, hierarchical tree).
  - Click on a node (e.g. `P001`) to open the **Node Details Drawer** showing direct links, betweenness score, and Investigation Priority Meter.
  - Click on an edge to inspect relationship confidence and evidence citations.

---

### Step 4: Identify Bridge Node (Articulation Point)
- In Network Analysis, highlight bridge node **Rahul Sharma (P001)**.
- Explain: *"This entity has high betweenness centrality (0.450) and bridges the Hawala Financial Syndicate (C042) with the Maritime Contraband Ring (C019) at JNPT Port."*

---

### Step 5: Open Person Profile Dossier
- Click **Full Profile** on P001 or navigate to `/persons/P001`.
- **What to show**:
  - **Investigation Priority Score: 84/100 (CRITICAL PRIORITY)**.
  - Show the **5-Factor Breakdown**:
    1. Network Centrality & Bridge Role (+25.2 pts, 30% wt)
    2. Cross-Case Association (+20.0 pts, 25% wt)
    3. Communication Spike Anomaly (+13.8 pts, 15% wt)
    4. Transaction Surge Anomaly (+13.5 pts, 15% wt)
    5. Temporal Off-Hours Patterns (+12.8 pts, 15% wt)
  - View the explicit **"Why this entity is prioritized"** dossier.
  - View the **Transaction Anomaly** (TX-01082: INR 75,00,000, 7.4x above historical median).
  - View the **Communication Spike** (420% surge over baseline, nocturnal burner phone calls).
  - Audited Evidence Trail (`CDR-182`, `TX-01082`, `EVD-SURV-102`, `EVD-FIR-042`).

---

### Step 6: Multi-Hop Investigation & Shortest Path
- Open **Network Analysis** -> Click **Multi-Hop Path** button (or ask via Assistant).
- Select Source: **Rahul Sharma (P001)**, Target: **Case C042**.
- Click **Trace Path & Evidence**.
- **What to show**:
  - Visual step-by-step traversal.
  - Complete evidence chain along every hop.
  - Path highlighted in golden amber on the graph canvas.

---

### Step 7: Ask Investigation Assistant
- Navigate to **Investigation Assistant** (`/assistant`).
- Click the preset: *"How is Rahul Sharma connected to Case C042?"*
- **What to show**:
  - Instant graph-grounded answer citing exact node links.
  - Structured findings with confidence scores.
  - Underlying evidence citations (`CDR-182`, `EVD-FIR-042`).
  - Always-present Responsible AI disclaimer.
- Try other smart queries: *"Who are the most connected entities?"*, *"Which person bridges two communities?"*, *"Show suspicious transaction activity"*.

---

### Step 8: Document Ingestion & Entity Resolution
- Navigate to **Intel & Documents** (`/documents`):
  - View intelligence report with highlighted named entities (PERSON, PHONE, VEHICLE, LOCATION, ORG, AMOUNT).
  - Click **Re-Run NLP** to demonstrate real-time entity and relationship extraction.
- Navigate to **Entity Resolution** (`/entity-resolution`):
  - Show candidate match (e.g. `Rahul Sharma` vs `R. Sharma` with 91% confidence).
  - Show similarity breakdown (Name: 88%, Phone: 100%, Context: 90%).
  - Click **Approve Link / Merge** to demonstrate human-in-the-loop validation.
