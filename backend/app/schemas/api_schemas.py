from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime, date

# ----------------- Entity Schemas -----------------

class PersonBase(BaseModel):
    person_id: str
    name: str
    aliases: Optional[str] = None
    dob: Optional[date] = None
    nationality: Optional[str] = None
    role: Optional[str] = None
    primary_location: Optional[str] = None
    risk_level: Optional[str] = "Medium"
    avatar_url: Optional[str] = None
    priority_score: Optional[float] = 0.0

class PersonOut(PersonBase):
    model_config = ConfigDict(from_attributes=True)

class PriorityFactor(BaseModel):
    factor_name: str
    score: float
    weight: float
    contribution: float
    description: str
    supporting_evidence: List[str] = []

class PersonDetailOut(PersonOut):
    associated_cases: List[Dict[str, Any]] = []
    phones: List[Dict[str, Any]] = []
    vehicles: List[Dict[str, Any]] = []
    organizations: List[Dict[str, Any]] = []
    locations: List[Dict[str, Any]] = []
    connections: List[Dict[str, Any]] = []
    degree_centrality: float = 0.0
    betweenness_centrality: float = 0.0
    pagerank: float = 0.0
    community_id: int = 0
    priority_factors: List[PriorityFactor] = []
    priority_explanation: str = ""
    active_alerts: List[Dict[str, Any]] = []
    disclaimer: str = "This is an analytical prioritization score, not a determination of guilt or criminality."

class CaseBase(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    case_type: Optional[str] = None
    status: Optional[str] = "Active Investigation"
    priority: Optional[str] = "Medium"
    lead_officer: Optional[str] = None
    date_registered: Optional[datetime] = None
    incident_date: Optional[datetime] = None
    estimated_value: Optional[float] = None

class CaseOut(CaseBase):
    entity_count: Optional[int] = 0
    alert_count: Optional[int] = 0
    document_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)

class CaseDetailOut(CaseOut):
    persons: List[Dict[str, Any]] = []
    locations: List[Dict[str, Any]] = []
    vehicles: List[Dict[str, Any]] = []
    organizations: List[Dict[str, Any]] = []
    documents: List[Dict[str, Any]] = []
    evidence_items: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []

# ----------------- Graph Schemas -----------------

class GraphNode(BaseModel):
    id: str
    label: str
    type: str # Person, Phone, Vehicle, Location, Organization, Case
    properties: Dict[str, Any] = {}
    degree: Optional[int] = 0
    betweenness: Optional[float] = 0.0
    community: Optional[int] = 0
    is_bridge: Optional[bool] = False
    priority_score: Optional[float] = 0.0

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str
    date: Optional[str] = None
    confidence: Optional[float] = 1.0
    evidence_id: Optional[str] = None
    notes: Optional[str] = None

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int

class ShortestPathRequest(BaseModel):
    source_id: str
    target_id: str
    max_hops: Optional[int] = 4

class ShortestPathResponse(BaseModel):
    found: bool
    hops: int
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    evidence_chain: List[Dict[str, Any]] = []
    path_summary: str = ""

# ----------------- Analytics Schemas -----------------

class CentralityMetric(BaseModel):
    node_id: str
    label: str
    type: str
    degree: int
    degree_centrality: float
    betweenness_centrality: float
    pagerank: float
    explanation: str

class CommunityInfo(BaseModel):
    community_id: int
    name: str
    size: int
    key_entities: List[str]
    dominant_crime_theme: str
    members: List[GraphNode]

class BridgeNodeInfo(BaseModel):
    node_id: str
    label: str
    type: str
    bridged_communities: List[int]
    bridged_themes: List[str]
    betweenness: float
    explanation: str
    critical_links: List[GraphEdge]

class NetworkOverviewMetrics(BaseModel):
    total_nodes: int
    total_edges: int
    network_density: float
    average_clustering: float
    connected_components: int
    louvain_communities_count: int
    metric_explanations: Dict[str, str]

# ----------------- Alert & Evidence Schemas -----------------

class AlertOut(BaseModel):
    alert_id: str
    entity_id: str
    entity_name: Optional[str] = None
    entity_type: str
    case_id: Optional[str] = None
    case_title: Optional[str] = None
    alert_type: str
    severity: str # HIGH, MEDIUM, LOW
    reason: str
    supporting_evidence_id: Optional[str] = None
    supporting_records: Optional[Dict[str, Any]] = None
    confidence: float
    timestamp: datetime
    status: str
    model_config = ConfigDict(from_attributes=True)

class EvidenceOut(BaseModel):
    evidence_id: str
    case_id: Optional[str] = None
    document_id: Optional[str] = None
    title: str
    evidence_type: str
    source_record: Optional[str] = None
    description: Optional[str] = None
    confidence: float
    timestamp: Optional[datetime] = None
    raw_payload: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Timeline Schemas -----------------

class TimelineEvent(BaseModel):
    event_id: str
    timestamp: str
    event_type: str # CASE_INCIDENT, CALL, TRANSACTION, SURVEILLANCE_VISIT, DOCUMENT_FILED
    title: str
    description: str
    entity_ids: List[str] = []
    case_id: Optional[str] = None
    severity: Optional[str] = "Normal"
    evidence_id: Optional[str] = None

# ----------------- Document & NLP Schemas -----------------

class ExtractedEntity(BaseModel):
    entity_type: str # PERSON, PHONE, VEHICLE, LOCATION, ORG, CASE, DATE, AMOUNT
    extracted_text: str
    normalized_value: str
    start_char: int
    end_char: int
    confidence: float

class ExtractedRelationship(BaseModel):
    source_text: str
    target_text: str
    relationship_type: str
    confidence: float
    evidence_span: str

class DocumentAnalyzeResponse(BaseModel):
    document_id: str
    title: str
    content_summary: str
    entities: List[ExtractedEntity]
    relationships: List[ExtractedRelationship]
    new_graph_candidates: List[Dict[str, Any]] = []

# ----------------- Investigation Assistant Schemas -----------------

class AssistantQueryRequest(BaseModel):
    query: str
    case_id: Optional[str] = None
    focused_entity_id: Optional[str] = None

class AssistantQueryResponse(BaseModel):
    query: str
    answer: str
    structured_findings: List[str]
    supporting_entities: List[GraphNode]
    supporting_edges: List[GraphEdge]
    cited_evidence_ids: List[str]
    confidence: float
    disclaimer: str = "CrimeGraph AI provides analytical leads and does not determine guilt, criminality, or intent. Findings should be reviewed by authorized investigators."

# ----------------- Search & Entity Resolution -----------------

class SearchResultItem(BaseModel):
    id: str
    title: str
    subtitle: str
    category: str # Person, Case, Phone, Vehicle, Location, Org, Evidence
    relevance_score: float
    match_field: str

class GlobalSearchResponse(BaseModel):
    query: str
    total_results: int
    results_by_category: Dict[str, List[SearchResultItem]]

