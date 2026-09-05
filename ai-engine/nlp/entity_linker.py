from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from datetime import datetime

import os, sys
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.models.entities import Person, Location, Organization, Phone, Vehicle
from backend.app.core.graph_store import graph_store

class EntityLinker:
    """
    Automatic AI-driven entity resolution system.
    Finds fuzzy connections between NLP-extracted entities (from documents) and
    verified SQL master records (from manual entry).
    """
    
    def __init__(self, match_threshold: float = 85.0):
        self.match_threshold = match_threshold

    def link_nlp_to_sql(self, db: Session, nlp_entities: List[Dict[str, Any]], doc_id: str):
        """
        Takes a list of NLP-extracted entities and tries to resolve them to
        existing verified SQL master records.
        """
        # Fetch verified master records
        persons = db.query(Person).all()
        locations = db.query(Location).all()
        orgs = db.query(Organization).all()
        phones = db.query(Phone).all()
        vehicles = db.query(Vehicle).all()

        for ent in nlp_entities:
            et = ent.get("entity_type")
            text = ent.get("normalized_value") or ent.get("extracted_text") or ""
            if not text or (ent.get("confidence") or 0) < 0.75:
                continue

            # NLP Node ID format from documents.py
            node_type = self._get_graph_type(et)
            if not node_type:
                continue
                
            nlp_node_id = f"NLP-{node_type[:3].upper()}-{text[:40].replace(' ','_').replace('/','_')}"

            match_id = None
            match_score = 0.0

            if et == "PERSON":
                match_id, match_score = self._fuzzy_match(text, [(p.person_id, p.name) for p in persons])
            elif et == "LOCATION":
                match_id, match_score = self._fuzzy_match(text, [(l.location_id, l.name) for l in locations])
            elif et == "ORGANIZATION":
                match_id, match_score = self._fuzzy_match(text, [(o.org_id, o.name) for o in orgs])
            elif et == "PHONE":
                match_id, match_score = self._fuzzy_match(text, [(ph.phone_id, ph.phone_number) for ph in phones])
            elif et == "VEHICLE":
                match_id, match_score = self._fuzzy_match(text, [(v.vehicle_id, v.plate_number) for v in vehicles])

            if match_id and match_score >= self.match_threshold:
                self._draw_resolution_edge(nlp_node_id, match_id, match_score, source_doc=doc_id)

    def link_sql_to_nlp(self, entity_id: str, entity_name: str, entity_type: str):
        """
        Takes a newly created verified SQL record and scans the entire graph
        for any orphaned NLP nodes that might match it.
        """
        if not entity_name:
            return

        # Fetch all nodes in the graph of the same general type
        nlp_candidates = []
        for n_id, data in graph_store.graph.nodes(data=True):
            if n_id.startswith("NLP-") and data.get("type", "").upper() == entity_type.upper():
                nlp_candidates.append((n_id, data.get("label", "")))

        if not nlp_candidates:
            return

        match_id, match_score = self._fuzzy_match(entity_name, nlp_candidates)
        if match_id and match_score >= self.match_threshold:
            self._draw_resolution_edge(match_id, entity_id, match_score, "Manual Entry Link")

    def _fuzzy_match(self, query: str, candidates: List[tuple]) -> tuple[Optional[str], float]:
        """Returns the (candidate_id, score) of the best fuzzy match."""
        best_id = None
        best_score = 0.0
        query_clean = str(query).lower().strip()
        
        for cand_id, cand_text in candidates:
            cand_clean = str(cand_text).lower().strip()
            score = fuzz.token_sort_ratio(query_clean, cand_clean)
            if score > best_score:
                best_score = score
                best_id = cand_id
                
        return best_id, best_score

    def _get_graph_type(self, et: str) -> Optional[str]:
        type_map = {
            "PERSON": "Person", "LOCATION": "Location", "ORGANIZATION": "Organization",
            "PHONE": "Phone", "VEHICLE": "Vehicle"
        }
        return type_map.get(et)

    def _draw_resolution_edge(self, nlp_node_id: str, verified_node_id: str, score: float, source_doc: str):
        """Draws a POTENTIAL_MATCH edge in the knowledge graph."""
        try:
            # Check if both nodes exist
            if not graph_store.graph.has_node(nlp_node_id) or not graph_store.graph.has_node(verified_node_id):
                return
                
            edge_id = f"RESOLVE-{nlp_node_id}-{verified_node_id}"
            
            # Avoid duplicate edges
            if graph_store.graph.has_edge(nlp_node_id, verified_node_id):
                return
                
            graph_store.add_relationship_edge(
                edge_id=edge_id,
                source_id=nlp_node_id,
                target_id=verified_node_id,
                relationship_type="POTENTIAL_MATCH",
                confidence=score / 100.0,
                date=datetime.utcnow().strftime("%Y-%m-%d"),
                evidence_id=source_doc,
                notes=f"AI Auto-Resolution (Fuzzy Match: {score:.1f}%)"
            )
            print(f"[EntityLinker] Linked {nlp_node_id} to {verified_node_id} (Score: {score:.1f})")
        except Exception as e:
            print(f"[EntityLinker] Error drawing resolution edge: {e}")

entity_linker = EntityLinker(match_threshold=88.0)
