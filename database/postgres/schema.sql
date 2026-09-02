-- CrimeGraph AI: PostgreSQL Database Schema
-- Relational intelligence store for cases, documents, evidence, alerts, and entity metadata

CREATE TABLE IF NOT EXISTS cases (
    case_id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active Investigation',
    priority VARCHAR(20) DEFAULT 'Medium',
    lead_officer VARCHAR(100),
    date_registered TIMESTAMP,
    incident_date TIMESTAMP,
    estimated_value NUMERIC(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS persons (
    person_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    aliases VARCHAR(255),
    dob DATE,
    nationality VARCHAR(100),
    role VARCHAR(150),
    primary_location VARCHAR(150),
    risk_level VARCHAR(50),
    avatar_url TEXT,
    priority_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS phones (
    phone_id VARCHAR(50) PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    imei VARCHAR(50),
    imsi VARCHAR(50),
    telecom_circle VARCHAR(100),
    operator VARCHAR(100),
    registered_owner VARCHAR(150),
    is_burner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    make VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    registered_owner VARCHAR(150),
    vehicle_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    location_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    location_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
    org_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    registration_no VARCHAR(100),
    jurisdiction VARCHAR(100),
    org_type VARCHAR(100),
    flagged_status VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    document_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) REFERENCES cases(case_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255),
    source_agency VARCHAR(150),
    author VARCHAR(150),
    content TEXT,
    content_summary TEXT,
    classification VARCHAR(100),
    file_type VARCHAR(20),
    extracted_entities JSONB,
    extracted_relationships JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence (
    evidence_id VARCHAR(50) PRIMARY KEY,
    case_id VARCHAR(50) REFERENCES cases(case_id) ON DELETE SET NULL,
    document_id VARCHAR(50) REFERENCES documents(document_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(100) NOT NULL,
    source_record VARCHAR(100),
    description TEXT,
    confidence FLOAT DEFAULT 1.0,
    timestamp TIMESTAMP,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(50) PRIMARY KEY,
    entity_id VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    case_id VARCHAR(50) REFERENCES cases(case_id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- HIGH, MEDIUM, LOW
    reason TEXT NOT NULL,
    supporting_evidence_id VARCHAR(50) REFERENCES evidence(evidence_id) ON DELETE SET NULL,
    supporting_records JSONB,
    confidence FLOAT DEFAULT 0.9,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE' -- ACTIVE, REVIEWED, DISMISSED
);

CREATE TABLE IF NOT EXISTS entity_resolutions (
    resolution_id VARCHAR(50) PRIMARY KEY,
    primary_entity_id VARCHAR(50) NOT NULL,
    candidate_entity_id VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    name_similarity FLOAT,
    phone_similarity FLOAT,
    context_similarity FLOAT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, MERGED, REJECTED
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cdr_records (
    cdr_id VARCHAR(50) PRIMARY KEY,
    caller_id VARCHAR(50),
    caller_phone VARCHAR(50),
    receiver_id VARCHAR(50),
    receiver_phone VARCHAR(50),
    timestamp TIMESTAMP,
    duration_sec INT,
    cell_tower_location VARCHAR(150),
    call_type VARCHAR(50),
    flagged_status VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS transaction_records (
    tx_id VARCHAR(50) PRIMARY KEY,
    sender_id VARCHAR(50),
    sender_name VARCHAR(150),
    receiver_id VARCHAR(50),
    receiver_name VARCHAR(150),
    amount NUMERIC(15, 2),
    currency VARCHAR(10),
    channel VARCHAR(100),
    bank_reference VARCHAR(100),
    timestamp TIMESTAMP,
    category VARCHAR(100),
    flagged_status VARCHAR(150),
    anomaly_multiplier VARCHAR(20)
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_case ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_cdr_timestamp ON cdr_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transaction_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
