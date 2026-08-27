import json
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, DateTime, Date, Numeric, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    case_type = Column(String(100), nullable=True)
    status = Column(String(50), default="Active Investigation")
    priority = Column(String(20), default="Medium")
    lead_officer = Column(String(100), nullable=True)
    date_registered = Column(DateTime, nullable=True)
    incident_date = Column(DateTime, nullable=True)
    estimated_value = Column(Numeric(15, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="case")
    evidence_items = relationship("Evidence", back_populates="case")
    alerts = relationship("Alert", back_populates="case")

class Person(Base):
    __tablename__ = "persons"

    person_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    aliases = Column(String(255), nullable=True)
    dob = Column(Date, nullable=True)
    nationality = Column(String(100), nullable=True)
    role = Column(String(150), nullable=True)
    primary_location = Column(String(150), nullable=True)
    risk_level = Column(String(50), default="Medium")
    avatar_url = Column(Text, nullable=True)
    priority_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Phone(Base):
    __tablename__ = "phones"

    phone_id = Column(String(50), primary_key=True, index=True)
    phone_number = Column(String(50), nullable=False, unique=True, index=True)
    imei = Column(String(50), nullable=True)
    imsi = Column(String(50), nullable=True)
    telecom_circle = Column(String(100), nullable=True)
    operator = Column(String(100), nullable=True)
    registered_owner = Column(String(150), nullable=True)
    is_burner = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(String(50), primary_key=True, index=True)
    plate_number = Column(String(50), nullable=False, unique=True, index=True)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    registered_owner = Column(String(150), nullable=True)
    vehicle_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Location(Base):
    __tablename__ = "locations"

    location_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Organization(Base):
    __tablename__ = "organizations"

    org_id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    registration_no = Column(String(100), nullable=True)
    jurisdiction = Column(String(100), nullable=True)
    org_type = Column(String(100), nullable=True)
    flagged_status = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"

    document_id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=True)
    source_agency = Column(String(150), nullable=True)
    author = Column(String(150), nullable=True)
    content = Column(Text, nullable=True)
    content_summary = Column(Text, nullable=True)
    classification = Column(String(100), nullable=True)
    file_type = Column(String(20), default="TXT")
    extracted_entities = Column(JSON, nullable=True)
    extracted_relationships = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="documents")
    evidence_items = relationship("Evidence", back_populates="document")

class Evidence(Base):
    __tablename__ = "evidence"

    evidence_id = Column(String(50), primary_key=True, index=True)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="SET NULL"), nullable=True)
    document_id = Column(String(50), ForeignKey("documents.document_id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    evidence_type = Column(String(100), nullable=False)
    source_record = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    timestamp = Column(DateTime, nullable=True)
    raw_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    document = relationship("Document", back_populates="evidence_items")
    alerts = relationship("Alert", back_populates="supporting_evidence")

class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(50), primary_key=True, index=True)
    entity_id = Column(String(50), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False) # HIGH, MEDIUM, LOW
    reason = Column(Text, nullable=False)
    supporting_evidence_id = Column(String(50), ForeignKey("evidence.evidence_id", ondelete="SET NULL"), nullable=True)
    supporting_records = Column(JSON, nullable=True)
    confidence = Column(Float, default=0.9)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="ACTIVE") # ACTIVE, REVIEWED, DISMISSED

    # Relationships
    case = relationship("Case", back_populates="alerts")
    supporting_evidence = relationship("Evidence", back_populates="alerts")

class EntityResolution(Base):
    __tablename__ = "entity_resolutions"

    resolution_id = Column(String(50), primary_key=True, index=True)
    primary_entity_id = Column(String(50), nullable=False)
    candidate_entity_id = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    name_similarity = Column(Float, nullable=True)
    phone_similarity = Column(Float, nullable=True)
    context_similarity = Column(Float, nullable=True)
    status = Column(String(50), default="PENDING") # PENDING, MERGED, REJECTED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CDRRecord(Base):
    __tablename__ = "cdr_records"

    cdr_id = Column(String(50), primary_key=True, index=True)
    caller_id = Column(String(50), nullable=True, index=True)
    caller_phone = Column(String(50), nullable=True)
    receiver_id = Column(String(50), nullable=True, index=True)
    receiver_phone = Column(String(50), nullable=True)
    timestamp = Column(DateTime, nullable=True, index=True)
    duration_sec = Column(Integer, nullable=True)
    cell_tower_location = Column(String(150), nullable=True)
    call_type = Column(String(50), nullable=True)
    flagged_status = Column(String(150), nullable=True)

class TransactionRecord(Base):
    __tablename__ = "transaction_records"

    tx_id = Column(String(50), primary_key=True, index=True)
    sender_id = Column(String(50), nullable=True, index=True)
    sender_name = Column(String(150), nullable=True)
    receiver_id = Column(String(50), nullable=True, index=True)
    receiver_name = Column(String(150), nullable=True)
    amount = Column(Numeric(15, 2), nullable=True)
    currency = Column(String(10), default="INR")
    channel = Column(String(100), nullable=True)
    bank_reference = Column(String(100), nullable=True)
    timestamp = Column(DateTime, nullable=True, index=True)
    category = Column(String(100), nullable=True)
    flagged_status = Column(String(150), nullable=True)
    anomaly_multiplier = Column(String(20), nullable=True)
