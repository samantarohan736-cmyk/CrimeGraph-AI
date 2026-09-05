from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.entities import Phone, Vehicle, Location, Organization

router = APIRouter()

@router.get("/phones")
def list_phones(db: Session = Depends(get_db)):
    phones = db.query(Phone).order_by(Phone.created_at.desc()).all()
    return [
        {
            "phone_id": p.phone_id,
            "phone_number": p.phone_number,
            "registered_owner": p.registered_owner,
            "operator": p.operator,
            "is_burner": p.is_burner,
            "created_at": p.created_at
        } for p in phones
    ]

@router.get("/vehicles")
def list_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).order_by(Vehicle.created_at.desc()).all()
    return [
        {
            "vehicle_id": v.vehicle_id,
            "plate_number": v.plate_number,
            "make_model": v.make_model,
            "registered_owner": v.registered_owner,
            "created_at": v.created_at
        } for v in vehicles
    ]

@router.get("/locations")
def list_locations(db: Session = Depends(get_db)):
    locations = db.query(Location).order_by(Location.created_at.desc()).all()
    return [
        {
            "location_id": l.location_id,
            "name": l.name,
            "address": l.address,
            "location_type": l.location_type,
            "created_at": l.created_at
        } for l in locations
    ]

@router.get("/organizations")
def list_organizations(db: Session = Depends(get_db)):
    organizations = db.query(Organization).order_by(Organization.created_at.desc()).all()
    return [
        {
            "org_id": o.org_id,
            "name": o.name,
            "org_type": o.org_type,
            "industry": o.industry,
            "created_at": o.created_at
        } for o in organizations
    ]
