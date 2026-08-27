from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from rapidfuzz import fuzz
from backend.app.core.database import get_db
from backend.app.core.graph_store import graph_store
from backend.app.models.entities import Person, Case, Phone, Vehicle, Location, Organization, Evidence
from backend.app.schemas.api_schemas import GlobalSearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("", response_model=GlobalSearchResponse)
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """
    Global fuzzy & partial search across all criminal intelligence entities:
    - Persons, Cases, Phones, Vehicles, Locations, Organizations, Evidence
    """
    query_str = q.lower().strip()
    results_by_category: Dict[str, List[SearchResultItem]] = {
        "Persons": [],
        "Cases": [],
        "Phones": [],
        "Vehicles": [],
        "Locations": [],
        "Organizations": [],
        "Evidence": []
    }
    total_matches = 0

    # 1. Persons
    for p in db.query(Person).all():
        score = max(
            fuzz.partial_ratio(query_str, p.name.lower()),
            fuzz.partial_ratio(query_str, (p.aliases or "").lower()),
            100 if query_str in p.person_id.lower() else 0
        )
        if score > 60:
            results_by_category["Persons"].append(SearchResultItem(
                id=p.person_id,
                title=p.name,
                subtitle=f"{p.role or 'Nodal Entity'} | Priority: {int(p.priority_score or 0)}/100 | Loc: {p.primary_location}",
                category="Persons",
                relevance_score=score / 100.0,
                match_field="Name / Aliases" if score > 70 else "ID"
            ))
            total_matches += 1

    # 2. Cases
    for c in db.query(Case).all():
        score = max(
            fuzz.partial_ratio(query_str, c.title.lower()),
            fuzz.partial_ratio(query_str, (c.description or "").lower()),
            100 if query_str in c.case_id.lower() else 0
        )
        if score > 60:
            results_by_category["Cases"].append(SearchResultItem(
                id=c.case_id,
                title=f"{c.case_id}: {c.title}",
                subtitle=f"Type: {c.case_type} | Status: {c.status} | Lead: {c.lead_officer}",
                category="Cases",
                relevance_score=score / 100.0,
                match_field="Title / Description"
            ))
            total_matches += 1

    # 3. Phones
    for ph in db.query(Phone).all():
        score = max(
            fuzz.partial_ratio(query_str, ph.phone_number.lower()),
            fuzz.partial_ratio(query_str, (ph.registered_owner or "").lower()),
            100 if query_str in ph.phone_id.lower() else 0
        )
        if score > 65:
            results_by_category["Phones"].append(SearchResultItem(
                id=ph.phone_id,
                title=ph.phone_number,
                subtitle=f"Owner: {ph.registered_owner} | Circle: {ph.telecom_circle} {'(Burner)' if ph.is_burner else ''}",
                category="Phones",
                relevance_score=score / 100.0,
                match_field="Phone Number"
            ))
            total_matches += 1

    # 4. Vehicles
    for v in db.query(Vehicle).all():
        score = max(
            fuzz.partial_ratio(query_str, v.plate_number.lower()),
            fuzz.partial_ratio(query_str, f"{v.make} {v.model}".lower()),
            100 if query_str in v.vehicle_id.lower() else 0
        )
        if score > 65:
            results_by_category["Vehicles"].append(SearchResultItem(
                id=v.vehicle_id,
                title=f"{v.plate_number} ({v.make} {v.model})",
                subtitle=f"Color: {v.color} | Type: {v.vehicle_type} | Owner: {v.registered_owner}",
                category="Vehicles",
                relevance_score=score / 100.0,
                match_field="Plate Number"
            ))
            total_matches += 1

    # 5. Locations
    for l in db.query(Location).all():
        score = max(
            fuzz.partial_ratio(query_str, l.name.lower()),
            fuzz.partial_ratio(query_str, (l.address or "").lower()),
            100 if query_str in l.location_id.lower() else 0
        )
        if score > 65:
            results_by_category["Locations"].append(SearchResultItem(
                id=l.location_id,
                title=l.name,
                subtitle=f"Type: {l.location_type} | Addr: {l.address}",
                category="Locations",
                relevance_score=score / 100.0,
                match_field="Location Name"
            ))
            total_matches += 1

    # 6. Organizations
    for o in db.query(Organization).all():
        score = max(
            fuzz.partial_ratio(query_str, o.name.lower()),
            fuzz.partial_ratio(query_str, (o.flagged_status or "").lower()),
            100 if query_str in o.org_id.lower() else 0
        )
        if score > 65:
            results_by_category["Organizations"].append(SearchResultItem(
                id=o.org_id,
                title=o.name,
                subtitle=f"Type: {o.org_type} | Status: {o.flagged_status} | Reg: {o.registration_no}",
                category="Organizations",
                relevance_score=score / 100.0,
                match_field="Org Name"
            ))
            total_matches += 1

    # 7. Evidence
    for e in db.query(Evidence).all():
        score = max(
            fuzz.partial_ratio(query_str, e.title.lower()),
            fuzz.partial_ratio(query_str, (e.description or "").lower()),
            100 if query_str in e.evidence_id.lower() else 0
        )
        if score > 65:
            results_by_category["Evidence"].append(SearchResultItem(
                id=e.evidence_id,
                title=f"{e.evidence_id}: {e.title}",
                subtitle=f"Type: {e.evidence_type} | Case: {e.case_id} | Conf: {int(e.confidence*100)}%",
                category="Evidence",
                relevance_score=score / 100.0,
                match_field="Evidence Description"
            ))
            total_matches += 1

    return GlobalSearchResponse(
        query=q,
        total_results=total_matches,
        results_by_category=results_by_category
    )
