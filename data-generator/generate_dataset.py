"""
Synthetic Dataset Generator for CrimeGraph AI
Generates realistic, interlinked, anonymized criminal network data for demonstration:
- Persons, Phones, Vehicles, Locations, Organizations, Cases, Crimes
- CDR (Call Detail Records)
- Transactions (Banking/Hawala)
- Network Relationships
- Unstructured Intelligence Reports (TXT/CSV)
"""

import os
import csv
import json
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SYNTHETIC_DIR = os.path.join(DATA_DIR, "synthetic")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")

os.makedirs(SYNTHETIC_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

# 1. Persons
PERSONS = [
    {"person_id": "P001", "name": "Rahul Sharma", "aliases": "RS, Rahul S., Rocky", "dob": "1984-06-15", "nationality": "Indian", "role": "Syndicate Coordinator & Broker", "primary_location": "Mumbai", "risk_level": "High", "avatar_url": ""},
    {"person_id": "P002", "name": "Vikram Malhotra", "aliases": "VM, Boss, Victor", "dob": "1978-11-03", "nationality": "Indian", "role": "Hawala Kingpin & Financier", "primary_location": "Dubai / Mumbai", "risk_level": "Critical", "avatar_url": ""},
    {"person_id": "P003", "name": "Tariq Khan", "aliases": "TK, Tiger", "dob": "1982-03-22", "nationality": "Indian", "role": "Port Logistics & Cargo Handler", "primary_location": "Navi Mumbai", "risk_level": "High", "avatar_url": ""},
    {"person_id": "P004", "name": "Priya Nair", "aliases": "Priya N., Accountant", "dob": "1989-09-14", "nationality": "Indian", "role": "Shell Company Director & Auditor", "primary_location": "Mumbai (BKC)", "risk_level": "Medium", "avatar_url": ""},
    {"person_id": "P005", "name": "David Miller", "aliases": "Dave, CryptoDave", "dob": "1986-01-29", "nationality": "British", "role": "Darknet OTC Broker & Crypto Mixer", "primary_location": "Goa / London", "risk_level": "High", "avatar_url": ""},
    {"person_id": "P006", "name": "Amit Patel", "aliases": "Bablu, AP", "dob": "1992-07-08", "nationality": "Indian", "role": "Cash Courier & Burner Phone Distributor", "primary_location": "Surat / Mumbai", "risk_level": "Medium", "avatar_url": ""},
    {"person_id": "P007", "name": "Sanjay Roy", "aliases": "Customs Sanjay", "dob": "1980-04-19", "nationality": "Indian", "role": "Customs Clearance Agent", "primary_location": "Nhava Sheva", "risk_level": "High", "avatar_url": ""},
    {"person_id": "P008", "name": "Neha Kapoor", "aliases": "Neha K.", "dob": "1991-12-05", "nationality": "Indian", "role": "Forex Desk Operator", "primary_location": "Mumbai", "risk_level": "Low", "avatar_url": ""},
    {"person_id": "P009", "name": "Rashid Al-Falasi", "aliases": "Rashid Gold", "dob": "1975-08-30", "nationality": "Emirati", "role": "Precious Metals Trader", "primary_location": "Dubai (Deira)", "risk_level": "High", "avatar_url": ""},
    {"person_id": "P010", "name": "Karan Verma", "aliases": "KV, Transporter", "dob": "1985-05-18", "nationality": "Indian", "role": "Heavy Fleet Transporter", "primary_location": "Thane", "risk_level": "Medium", "avatar_url": ""},
    {"person_id": "P011", "name": "Sunil Mehta", "aliases": "Mehta Ji", "dob": "1972-02-11", "nationality": "Indian", "role": "Real Estate Front Investor", "primary_location": "Pune", "risk_level": "Low", "avatar_url": ""},
    {"person_id": "P012", "name": "Zubair Ahmed", "aliases": "Zee, CyberZee", "dob": "1995-10-25", "nationality": "Indian", "role": "Malware Developer & SIM Swapper", "primary_location": "Bengaluru", "risk_level": "High", "avatar_url": ""}
]

# 2. Phones
PHONES = [
    {"phone_id": "PH001", "phone_number": "+91-98200-11223", "imei": "864201041234561", "imsi": "404450123456789", "telecom_circle": "Mumbai", "operator": "Airtel", "registered_owner": "Rahul Sharma", "is_burner": "False"},
    {"phone_id": "PH002", "phone_number": "+91-98200-99887", "imei": "864201049876543", "imsi": "404450987654321", "telecom_circle": "Mumbai", "operator": "Vodafone", "registered_owner": "Fake ID (R. Verma)", "is_burner": "True"},
    {"phone_id": "PH003", "phone_number": "+971-50-1234567", "imei": "358902041234562", "imsi": "424020123456789", "telecom_circle": "Dubai", "operator": "Etisalat", "registered_owner": "Vikram Malhotra", "is_burner": "False"},
    {"phone_id": "PH004", "phone_number": "+91-98211-33445", "imei": "864201045566778", "imsi": "404450556677889", "telecom_circle": "Maharashtra", "operator": "Jio", "registered_owner": "Tariq Khan", "is_burner": "False"},
    {"phone_id": "PH005", "phone_number": "+91-98211-88990", "imei": "864201048899001", "imsi": "404450889900112", "telecom_circle": "Maharashtra", "operator": "Jio", "registered_owner": "Unregistered", "is_burner": "True"},
    {"phone_id": "PH006", "phone_number": "+91-98330-44556", "imei": "864201044455667", "imsi": "404450445566778", "telecom_circle": "Mumbai", "operator": "Airtel", "registered_owner": "Priya Nair", "is_burner": "False"},
    {"phone_id": "PH007", "phone_number": "+44-7700-900123", "imei": "358902049900123", "imsi": "234150990012345", "telecom_circle": "UK", "operator": "EE", "registered_owner": "David Miller", "is_burner": "False"},
    {"phone_id": "PH008", "phone_number": "+91-98920-77665", "imei": "864201047766554", "imsi": "404450776655443", "telecom_circle": "Gujarat", "operator": "Vi", "registered_owner": "Amit Patel", "is_burner": "False"},
    {"phone_id": "PH009", "phone_number": "+91-98190-22334", "imei": "864201042233445", "imsi": "404450223344556", "telecom_circle": "Mumbai", "operator": "Airtel", "registered_owner": "Sanjay Roy", "is_burner": "False"},
    {"phone_id": "PH010", "phone_number": "+971-50-9876543", "imei": "358902049876541", "imsi": "424020987654321", "telecom_circle": "Dubai", "operator": "Du", "registered_owner": "Rashid Al-Falasi", "is_burner": "False"}
]

# 3. Vehicles
VEHICLES = [
    {"vehicle_id": "VH001", "plate_number": "MH-01-CV-1082", "make": "Mercedes-Benz", "model": "E-Class", "color": "Obsidian Black", "registered_owner": "Rahul Sharma", "vehicle_type": "Luxury Sedan"},
    {"vehicle_id": "VH002", "plate_number": "MH-46-AZ-4412", "make": "Tata", "model": "Prima 4028.S", "color": "Commercial Yellow", "registered_owner": "Karan Verma (KV Fleet)", "vehicle_type": "Heavy Cargo Truck"},
    {"vehicle_id": "VH003", "plate_number": "MH-02-ER-9910", "make": "Toyota", "model": "Fortuner", "color": "Pearl White", "registered_owner": "Tariq Khan", "vehicle_type": "SUV"},
    {"vehicle_id": "VH004", "plate_number": "MH-04-KB-3301", "make": "Hyundai", "model": "Creta", "color": "Silver", "registered_owner": "Priya Nair", "vehicle_type": "Compact SUV"},
    {"vehicle_id": "VH005", "plate_number": "GJ-05-BX-8820", "make": "Mahindra", "model": "Bolero Maxi Truck", "color": "White", "registered_owner": "Amit Patel", "vehicle_type": "Cash Van / Pickup"},
    {"vehicle_id": "VH006", "plate_number": "MH-06-WT-5509", "make": "Yamaha", "model": "FZS-FI", "color": "Matte Black", "registered_owner": "Unregistered Runner", "vehicle_type": "Motorcycle"}
]

# 4. Locations
LOCATIONS = [
    {"location_id": "LOC001", "name": "JNPT Port Container Terminal 3", "address": "Nhava Sheva, Navi Mumbai, Maharashtra 400707", "latitude": "18.9498", "longitude": "72.9515", "location_type": "Maritime Port / Cargo Depot"},
    {"location_id": "LOC002", "name": "BKC Diamond & Financial Tower", "address": "G-Block, Bandra Kurla Complex, Mumbai 400051", "latitude": "19.0662", "longitude": "72.8687", "location_type": "Commercial Financial Center"},
    {"location_id": "LOC003", "name": "Panvel Logistics Hub & Warehouse 14", "address": "Old Mumbai-Pune Highway, Panvel 410206", "latitude": "18.9902", "longitude": "73.1168", "location_type": "Transit Warehouse / Safehouse"},
    {"location_id": "LOC004", "name": "Dubai Gold Souk & Bullion Center", "address": "Al Dhagaya, Deira, Dubai, UAE", "latitude": "25.2711", "longitude": "55.2974", "location_type": "Precious Metals Exchange"},
    {"location_id": "LOC005", "name": "Colaba Apartment 4B (Safehouse)", "address": "Pasta Lane, Colaba, Mumbai 400005", "latitude": "18.9154", "longitude": "72.8258", "location_type": "Covert Residence / Meeting Node"},
    {"location_id": "LOC006", "name": "Surat Diamond Bourse Suite 502", "address": "Khajod, Surat, Gujarat 395007", "latitude": "21.1215", "longitude": "72.7885", "location_type": "Jewellery / Cash Exchange"},
    {"location_id": "LOC007", "name": "Anjuna Beach Villa Node", "address": "North Anjuna, Bardez, Goa 403509", "latitude": "15.5733", "longitude": "73.7411", "location_type": "Crypto / Darknet Retreat"},
    {"location_id": "LOC008", "name": "Zaveri Bazaar Cash Drop Office", "address": "Sheikh Memon St, Kalbadevi, Mumbai 400002", "latitude": "18.9500", "longitude": "72.8310", "location_type": "Hawala Counter / Bullion Trading"}
]

# 5. Organizations
ORGANIZATIONS = [
    {"org_id": "ORG001", "name": "BlueStar Marine Logistics LLP", "registration_no": "LLPIN-AAH-9012", "jurisdiction": "India", "org_type": "Freight Forwarding & Shipping", "flagged_status": "High Risk Shell"},
    {"org_id": "ORG002", "name": "Al-Noor Import Export FZE", "registration_no": "RAKEZ-2018-0914", "jurisdiction": "UAE (RAK Freezone)", "org_type": "International Trading", "flagged_status": "Foreign Hawala Conduit"},
    {"org_id": "ORG003", "name": "Apex Forex & Remittance Services", "registration_no": "MH-FX-4410", "jurisdiction": "India", "org_type": "Money Service Business", "flagged_status": "Non-Compliant FX Desk"},
    {"org_id": "ORG004", "name": "CyberShield Digital Asset Consulting", "registration_no": "UK-COMP-088192", "jurisdiction": "United Kingdom", "org_type": "Cryptocurrency Consulting", "flagged_status": "Mixing Service Front"},
    {"org_id": "ORG005", "name": "KV Freightlines Pvt Ltd", "registration_no": "MH-TRANS-2201", "jurisdiction": "India", "org_type": "Interstate Transport Fleet", "flagged_status": "Logistics Carrier"}
]

# 6. Cases
CASES = [
    {
        "case_id": "C042",
        "title": "Operation Golden Hawala Syndicate",
        "description": "Multi-jurisdictional hawala money laundering and illegal forex ring routing over INR 85 Crore between Mumbai, Dubai, and Zurich through dummy invoice trade.",
        "case_type": "Financial Crime / Hawala",
        "status": "Active Investigation",
        "priority": "Critical",
        "lead_officer": "Insp. R. Deshmukh",
        "date_registered": "2025-10-12",
        "incident_date": "2025-10-01",
        "estimated_value": "85000000"
    },
    {
        "case_id": "C019",
        "title": "Operation Maritime Contraband Intercept",
        "description": "Customs and coastal smuggling operation concealing high-value untaxed electronics and gold ingots inside commercial container freight at Nhava Sheva.",
        "case_type": "Contraband Smuggling",
        "status": "Active Investigation",
        "priority": "High",
        "lead_officer": "DSP A. Kulkarni",
        "date_registered": "2025-11-04",
        "incident_date": "2025-10-28",
        "estimated_value": "32000000"
    },
    {
        "case_id": "C055",
        "title": "Operation Darknet Ransom & Mixer Network",
        "description": "Cyber extortion syndicate extorting healthcare institutions and routing illicit USDT/BTC through peer-to-peer OTC brokers and mixing nodes.",
        "case_type": "Cyber Crime / Crypto Laundering",
        "status": "Under Surveillance",
        "priority": "High",
        "lead_officer": "Cyber Cell Div-4",
        "date_registered": "2026-01-15",
        "incident_date": "2026-01-08",
        "estimated_value": "18500000"
    }
]

# 7. Relationships (Explicit Multi-Entity Connections)
RELATIONSHIPS = [
    # Person -> USES_PHONE -> Phone
    {"rel_id": "REL001", "source_id": "P001", "target_id": "PH001", "relationship_type": "USES_PHONE", "confidence": "0.98", "evidence_id": "EVD-CDR-001", "date": "2025-01-10", "notes": "Primary postpaid mobile subscriber"},
    {"rel_id": "REL002", "source_id": "P001", "target_id": "PH002", "relationship_type": "USES_PHONE", "confidence": "0.89", "evidence_id": "EVD-SURV-102", "date": "2025-09-15", "notes": "Observed using burner SIM during covert meeting"},
    {"rel_id": "REL003", "source_id": "P002", "target_id": "PH003", "relationship_type": "USES_PHONE", "confidence": "0.99", "evidence_id": "EVD-INTEL-044", "date": "2024-06-01", "notes": "Direct Dubai roaming line"},
    {"rel_id": "REL004", "source_id": "P003", "target_id": "PH004", "relationship_type": "USES_PHONE", "confidence": "0.95", "evidence_id": "EVD-CDR-004", "date": "2024-11-20", "notes": "Registered corporate logistics SIM"},
    {"rel_id": "REL005", "source_id": "P004", "target_id": "PH006", "relationship_type": "USES_PHONE", "confidence": "0.96", "evidence_id": "EVD-CDR-006", "date": "2024-08-12", "notes": "Office landline & mobile account"},
    {"rel_id": "REL006", "source_id": "P005", "target_id": "PH007", "relationship_type": "USES_PHONE", "confidence": "0.94", "evidence_id": "EVD-CYBER-019", "date": "2025-03-01", "notes": "UK encrypted telecom roaming profile"},
    {"rel_id": "REL007", "source_id": "P006", "target_id": "PH008", "relationship_type": "USES_PHONE", "confidence": "0.92", "evidence_id": "EVD-CDR-008", "date": "2025-02-14", "notes": "Gujarat circle SIM card"},
    {"rel_id": "REL008", "source_id": "P007", "target_id": "PH009", "relationship_type": "USES_PHONE", "confidence": "0.95", "evidence_id": "EVD-CDR-009", "date": "2024-04-05", "notes": "Nhava Sheva official line"},
    {"rel_id": "REL009", "source_id": "P009", "target_id": "PH010", "relationship_type": "USES_PHONE", "confidence": "0.97", "evidence_id": "EVD-INTEL-088", "date": "2024-01-18", "notes": "Dubai Gold Souk business contact"},

    # Person -> OWNS_VEHICLE -> Vehicle
    {"rel_id": "REL010", "source_id": "P001", "target_id": "VH001", "relationship_type": "OWNS_VEHICLE", "confidence": "0.99", "evidence_id": "EVD-RTO-001", "date": "2023-05-10", "notes": "Registered owner in Vahan Database"},
    {"rel_id": "REL011", "source_id": "P010", "target_id": "VH002", "relationship_type": "OWNS_VEHICLE", "confidence": "0.98", "evidence_id": "EVD-RTO-002", "date": "2022-09-14", "notes": "Commercial fleet registration"},
    {"rel_id": "REL012", "source_id": "P003", "target_id": "VH003", "relationship_type": "OWNS_VEHICLE", "confidence": "0.95", "evidence_id": "EVD-RTO-003", "date": "2024-02-01", "notes": "Registered to Tariq Khan"},
    {"rel_id": "REL013", "source_id": "P004", "target_id": "VH004", "relationship_type": "OWNS_VEHICLE", "confidence": "0.94", "evidence_id": "EVD-RTO-004", "date": "2023-11-20", "notes": "Personal registered vehicle"},
    {"rel_id": "REL014", "source_id": "P006", "target_id": "VH005", "relationship_type": "OWNS_VEHICLE", "confidence": "0.91", "evidence_id": "EVD-RTO-005", "date": "2024-07-19", "notes": "Used for regional cash transport"},

    # Person -> WORKS_FOR / OWNS -> Organization
    {"rel_id": "REL015", "source_id": "P001", "target_id": "ORG001", "relationship_type": "WORKS_FOR", "confidence": "0.92", "evidence_id": "EVD-MCA-001", "date": "2022-04-01", "notes": "Designated Senior Broker / Commercial Consultant"},
    {"rel_id": "REL016", "source_id": "P002", "target_id": "ORG002", "relationship_type": "WORKS_FOR", "confidence": "0.98", "evidence_id": "EVD-CORP-012", "date": "2020-01-15", "notes": "Beneficial Owner & Managing Director (RAK Freezone)"},
    {"rel_id": "REL017", "source_id": "P002", "target_id": "ORG003", "relationship_type": "WORKS_FOR", "confidence": "0.95", "evidence_id": "EVD-CORP-013", "date": "2021-08-10", "notes": "Silent Partner / Capital Investor"},
    {"rel_id": "REL018", "source_id": "P004", "target_id": "ORG001", "relationship_type": "WORKS_FOR", "confidence": "0.99", "evidence_id": "EVD-MCA-002", "date": "2021-03-12", "notes": "Authorized Signatory and Statutory Director"},
    {"rel_id": "REL019", "source_id": "P004", "target_id": "ORG003", "relationship_type": "WORKS_FOR", "confidence": "0.94", "evidence_id": "EVD-MCA-003", "date": "2022-10-05", "notes": "Bookkeeping auditor and compliance filings"},
    {"rel_id": "REL020", "source_id": "P005", "target_id": "ORG004", "relationship_type": "WORKS_FOR", "confidence": "0.97", "evidence_id": "EVD-CYBER-082", "date": "2023-02-14", "notes": "Founder & Principal OTC Liquidity Provider"},
    {"rel_id": "REL021", "source_id": "P010", "target_id": "ORG005", "relationship_type": "WORKS_FOR", "confidence": "0.99", "evidence_id": "EVD-MCA-005", "date": "2019-06-01", "notes": "Managing Director and majority shareholder"},

    # Person -> VISITED -> Location
    {"rel_id": "REL022", "source_id": "P001", "target_id": "LOC002", "relationship_type": "VISITED", "confidence": "0.95", "evidence_id": "EVD-CCTV-011", "date": "2025-10-02", "notes": "CCTV capture entering BKC Tower with briefcase"},
    {"rel_id": "REL023", "source_id": "P001", "target_id": "LOC003", "relationship_type": "VISITED", "confidence": "0.92", "evidence_id": "EVD-TOWER-041", "date": "2025-10-05", "notes": "Cell tower geolocation ping at Panvel Warehouse"},
    {"rel_id": "REL024", "source_id": "P001", "target_id": "LOC005", "relationship_type": "VISITED", "confidence": "0.97", "evidence_id": "EVD-SURV-102", "date": "2025-10-08", "notes": "Surveillance team spotted subject entering Colaba Safehouse"},
    {"rel_id": "REL025", "source_id": "P003", "target_id": "LOC001", "relationship_type": "VISITED", "confidence": "0.99", "evidence_id": "EVD-ACCESS-019", "date": "2025-10-28", "notes": "Port gate access card swipe at JNPT Terminal 3"},
    {"rel_id": "REL026", "source_id": "P003", "target_id": "LOC003", "relationship_type": "VISITED", "confidence": "0.94", "evidence_id": "EVD-TOLL-088", "date": "2025-10-29", "notes": "Fastag toll record entering Panvel hub"},
    {"rel_id": "REL027", "source_id": "P006", "target_id": "LOC008", "relationship_type": "VISITED", "confidence": "0.96", "evidence_id": "EVD-CCTV-099", "date": "2025-10-04", "notes": "Zaveri Bazaar CCTV cash collection"},
    {"rel_id": "REL028", "source_id": "P002", "target_id": "LOC004", "relationship_type": "VISITED", "confidence": "0.95", "evidence_id": "EVD-IMMIG-012", "date": "2025-09-20", "notes": "Dubai Gold Souk bullion clearing office"},

    # Person -> ASSOCIATED_WITH_CASE -> Case
    {"rel_id": "REL029", "source_id": "P001", "target_id": "C042", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.95", "evidence_id": "EVD-FIR-042", "date": "2025-10-12", "notes": "Identified in FIR as central hawala coordinator and transaction node"},
    {"rel_id": "REL030", "source_id": "P002", "target_id": "C042", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.98", "evidence_id": "EVD-INTEL-042", "date": "2025-10-12", "notes": "Identified as overseas beneficiary and hawala kingpin"},
    {"rel_id": "REL031", "source_id": "P004", "target_id": "C042", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.91", "evidence_id": "EVD-BANK-042", "date": "2025-10-14", "notes": "Signatory on illicit shell bank accounts"},
    {"rel_id": "REL032", "source_id": "P001", "target_id": "C019", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.88", "evidence_id": "EVD-INTEL-019", "date": "2025-11-05", "notes": "Bridge link coordinating payment settlement for contraband shipments"},
    {"rel_id": "REL033", "source_id": "P003", "target_id": "C019", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.97", "evidence_id": "EVD-SEIZE-019", "date": "2025-11-04", "notes": "Intercepted container logistics facilitator at Nhava Sheva"},
    {"rel_id": "REL034", "source_id": "P007", "target_id": "C019", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.93", "evidence_id": "EVD-DOC-019", "date": "2025-11-06", "notes": "Signed forged bill of lading and manifest clearances"},
    {"rel_id": "REL035", "source_id": "P005", "target_id": "C055", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.96", "evidence_id": "EVD-BLOCK-055", "date": "2026-01-15", "notes": "Wallet address tied to ransom payout mixing node"},
    {"rel_id": "REL036", "source_id": "P012", "target_id": "C055", "relationship_type": "ASSOCIATED_WITH_CASE", "confidence": "0.94", "evidence_id": "EVD-IP-055", "date": "2026-01-16", "notes": "C2 server infrastructure administrator"},

    # Inter-Person Direct Links (Inter-entity Network)
    {"rel_id": "REL037", "source_id": "P001", "target_id": "P002", "relationship_type": "CALLED", "confidence": "0.99", "evidence_id": "CDR-182", "date": "2025-10-03", "notes": "High frequency VoIP & International calls prior to cash drop"},
    {"rel_id": "REL038", "source_id": "P001", "target_id": "P003", "relationship_type": "CALLED", "confidence": "0.95", "evidence_id": "CDR-194", "date": "2025-10-27", "notes": "Frequent calls before container dispatch from JNPT"},
    {"rel_id": "REL039", "source_id": "P001", "target_id": "P004", "relationship_type": "ASSOCIATED_WITH", "confidence": "0.96", "evidence_id": "EVD-DOC-088", "date": "2025-09-01", "notes": "Co-signatory and daily administrative contact for shell company funds"},
    {"rel_id": "REL040", "source_id": "P001", "target_id": "P005", "relationship_type": "TRANSFERRED_TO", "confidence": "0.91", "evidence_id": "TX-01082", "date": "2025-10-04", "notes": "Off-market OTC conversion of INR 75,00,000 into USDT liquidity"},
    {"rel_id": "REL041", "source_id": "P001", "target_id": "P006", "relationship_type": "CALLED", "confidence": "0.94", "evidence_id": "CDR-210", "date": "2025-10-04", "notes": "Dispatched courier for cash aggregation in Zaveri Bazaar"},
    {"rel_id": "REL042", "source_id": "P003", "target_id": "P007", "relationship_type": "CALLED", "confidence": "0.98", "evidence_id": "CDR-302", "date": "2025-10-28", "notes": "Urgent communications during customs container scanning window"},
    {"rel_id": "REL043", "source_id": "P003", "target_id": "P010", "relationship_type": "ASSOCIATED_WITH", "confidence": "0.95", "evidence_id": "EVD-WAYBILL-044", "date": "2025-10-29", "notes": "Contracted heavy transport trailers for inland transit"},
    {"rel_id": "REL044", "source_id": "P002", "target_id": "P009", "relationship_type": "TRANSFERRED_TO", "confidence": "0.97", "evidence_id": "TX-01099", "date": "2025-10-06", "notes": "Direct bullion procurement wire in Dubai Gold Souk"},
    {"rel_id": "REL045", "source_id": "P005", "target_id": "P012", "relationship_type": "TRANSFERRED_TO", "confidence": "0.93", "evidence_id": "TX-01140", "date": "2026-01-10", "notes": "USDT payout disbursement for exploit kit deployment"}
]

# 8. Call Detail Records (CDR)
def generate_cdr():
    cdrs = []
    cdr_id_seq = 100
    base_date = datetime(2025, 9, 15, 8, 0, 0)
    
    # Baseline calls between entities
    pairs = [
        ("P001", "+91-98200-11223", "P004", "+91-98330-44556", "BKC Tower Cell-01", 120),
        ("P001", "+91-98200-11223", "P006", "+91-98920-77665", "Colaba Cell-04", 45),
        ("P003", "+91-98211-33445", "P007", "+91-98190-22334", "JNPT Cell-02", 95),
        ("P003", "+91-98211-33445", "P010", "+91-98200-55443", "Panvel Cell-01", 180),
        ("P004", "+91-98330-44556", "P008", "+91-98210-99881", "Nariman Point Cell-03", 60),
    ]
    
    # Normal period calls
    for day in range(30):
        current_day = base_date + timedelta(days=day)
        for caller_id, c_phone, rec_id, r_phone, tower, dur in pairs:
            if random.random() > 0.4:
                call_time = current_day.replace(hour=random.randint(9, 19), minute=random.randint(0, 59), second=random.randint(0, 59))
                cdrs.append({
                    "cdr_id": f"CDR-{cdr_id_seq}",
                    "caller_id": caller_id,
                    "caller_phone": c_phone,
                    "receiver_id": rec_id,
                    "receiver_phone": r_phone,
                    "timestamp": call_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "duration_sec": dur + random.randint(-20, 40),
                    "cell_tower_location": tower,
                    "call_type": "Voice Call",
                    "flagged_status": "Normal"
                })
                cdr_id_seq += 1

    # COMMUNICATION SPIKE INCIDENT (October 1 to October 5, 2025)
    # P001 <-> P002 (Hawala coordination) and P001 <-> P006 (Cash drops)
    spike_dates = [
        datetime(2025, 10, 2, 23, 14, 22),
        datetime(2025, 10, 3, 1, 45, 10),
        datetime(2025, 10, 3, 2, 10, 55),
        datetime(2025, 10, 3, 3, 5, 12),
        datetime(2025, 10, 3, 14, 20, 00),
        datetime(2025, 10, 3, 18, 30, 45),
        datetime(2025, 10, 4, 0, 15, 30),
        datetime(2025, 10, 4, 1, 30, 00),
        datetime(2025, 10, 4, 2, 45, 15),
        datetime(2025, 10, 4, 11, 00, 00),
        datetime(2025, 10, 4, 16, 20, 10),
        datetime(2025, 10, 5, 1, 10, 00)
    ]
    for stime in spike_dates:
        cdrs.append({
            "cdr_id": f"CDR-{cdr_id_seq}",
            "caller_id": "P001",
            "caller_phone": "+91-98200-99887", # Burner
            "receiver_id": "P002",
            "receiver_phone": "+971-50-1234567",
            "timestamp": stime.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_sec": random.randint(350, 920),
            "cell_tower_location": "Colaba Safehouse Tower-09",
            "call_type": "Encrypted VoIP / Roaming",
            "flagged_status": "Anomalous Spike (420% over baseline, Night hours)"
        })
        cdr_id_seq += 1

    # October 26-28 Smuggling spike between P001, P003, P007
    smuggling_dates = [
        datetime(2025, 10, 27, 22, 10, 00),
        datetime(2025, 10, 28, 0, 40, 12),
        datetime(2025, 10, 28, 2, 15, 00),
        datetime(2025, 10, 28, 3, 50, 44),
        datetime(2025, 10, 28, 5, 20, 10)
    ]
    for stime in smuggling_dates:
        cdrs.append({
            "cdr_id": f"CDR-{cdr_id_seq}",
            "caller_id": "P003",
            "caller_phone": "+91-98211-88990", # Burner
            "receiver_id": "P007",
            "receiver_phone": "+91-98190-22334",
            "timestamp": stime.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_sec": random.randint(400, 750),
            "cell_tower_location": "JNPT Port Terminal Tower-03",
            "call_type": "Voice Call",
            "flagged_status": "High Alert Night Clearance"
        })
        cdr_id_seq += 1

    return cdrs

# 9. Financial Transactions
def generate_transactions():
    txs = []
    tx_id_seq = 1000
    base_date = datetime(2025, 8, 1)

    # Regular baseline transactions
    for i in range(40):
        tdate = base_date + timedelta(days=i*3, hours=random.randint(10, 17))
        txs.append({
            "tx_id": f"TX-{tx_id_seq}",
            "sender_id": "P004",
            "sender_name": "Priya Nair (BlueStar Logistics)",
            "receiver_id": "P001",
            "receiver_name": "Rahul Sharma",
            "amount": float(random.randint(25000, 85000)),
            "currency": "INR",
            "channel": "NEFT / Corporate Account",
            "bank_reference": f"HDFC{random.randint(100000, 999999)}",
            "timestamp": tdate.strftime("%Y-%m-%d %H:%M:%S"),
            "category": "Consulting Fee / Routine",
            "flagged_status": "Normal",
            "anomaly_multiplier": "1.0x"
        })
        tx_id_seq += 1

    # ANOMALOUS TRANSACTIONS (Massive Hawala Dispersals)
    # TX-01082: P001 -> P005 (7.4x Historical Median)
    txs.append({
        "tx_id": "TX-01082",
        "sender_id": "P001",
        "sender_name": "Rahul Sharma (Cover Account)",
        "receiver_id": "P005",
        "receiver_name": "David Miller (CryptoShield OTC)",
        "amount": 7500000.0, # 75 Lakhs INR
        "currency": "INR",
        "channel": "RTGS Layered Transfer",
        "bank_reference": "ICICI-RTGS-9901824",
        "timestamp": "2025-10-04 14:15:30",
        "category": "Hawala Layering / OTC Crypto Buy",
        "flagged_status": "CRITICAL ANOMALY: 7.4x Above Historical Median",
        "anomaly_multiplier": "7.4x"
    })

    txs.append({
        "tx_id": "TX-01083",
        "sender_id": "P002",
        "sender_name": "Vikram Malhotra (Al-Noor Import Export)",
        "receiver_id": "P009",
        "receiver_name": "Rashid Al-Falasi (Dubai Bullion)",
        "amount": 1250000.0, # 1.25M AED (~2.8 Cr INR)
        "currency": "AED",
        "channel": "SWIFT Wire (Invoice Under-reporting)",
        "bank_reference": "ENBD-WIRE-004491",
        "timestamp": "2025-10-06 11:30:00",
        "category": "Bullion Settlement",
        "flagged_status": "HIGH ANOMALY: Cross-Border Trade Discrepancy",
        "anomaly_multiplier": "5.2x"
    })

    txs.append({
        "tx_id": "TX-01084",
        "sender_id": "P006",
        "sender_name": "Amit Patel (Cash Pool)",
        "receiver_id": "P001",
        "receiver_name": "Rahul Sharma",
        "amount": 3400000.0,
        "currency": "INR",
        "channel": "Physical Hawala Cash Drop (Token Receipt #8891)",
        "bank_reference": "HAWALA-TOKEN-8891",
        "timestamp": "2025-10-04 17:45:00",
        "category": "Physical Cash Drop",
        "flagged_status": "HIGH ANOMALY: Large Cash Consolidation",
        "anomaly_multiplier": "6.8x"
    })

    txs.append({
        "tx_id": "TX-01085",
        "sender_id": "P005",
        "sender_name": "David Miller",
        "receiver_id": "P012",
        "receiver_name": "Zubair Ahmed",
        "amount": 45000.0, # 45,000 USDT
        "currency": "USDT",
        "channel": "TRC-20 Blockchain Wallet Transfer",
        "bank_reference": "TXID-0x7a8f9c2d1e0b3456",
        "timestamp": "2026-01-10 03:22:15",
        "category": "Crypto Darknet Bounty",
        "flagged_status": "HIGH ANOMALY: Off-Hours Darknet Liquidity Transfer",
        "anomaly_multiplier": "4.1x"
    })

    return txs

# 10. Reports Metadata & Unstructured Intelligence Files
REPORTS = [
    {
        "report_id": "REP-C042-01",
        "case_id": "C042",
        "title": "Field Surveillance Memo - BKC Financial Tower & Panvel Movement",
        "filename": "case_c042_hawala_intel.txt",
        "source_agency": "Financial Intelligence Unit / Crime Branch Unit-3",
        "author": "Inspector R. Deshmukh",
        "date_created": "2025-10-08",
        "classification": "CONFIDENTIAL INVESTIGATIVE RECORD",
        "content_summary": "Surveillance on Rahul Sharma (P001) visiting BKC Tower and Panvel safehouse. Intercepted communications link him directly to Vikram Malhotra (P002) in Dubai and Priya Nair (P004)."
    },
    {
        "report_id": "REP-C019-01",
        "case_id": "C019",
        "title": "Nhava Sheva Port Interception & Customs Verification Memo",
        "filename": "case_c019_smuggling_intercept.txt",
        "source_agency": "Directorate of Revenue Intelligence (DRI)",
        "author": "DSP A. Kulkarni",
        "date_created": "2025-11-06",
        "classification": "SECRET / LAW ENFORCEMENT SENSITIVE",
        "content_summary": "Seizure of container CON-9921 at JNPT Port terminal 3. Tariq Khan (P003) and Customs agent Sanjay Roy (P007) facilitated passage. Financial routing links back to coordinator Rahul Sharma."
    },
    {
        "report_id": "REP-C055-01",
        "case_id": "C055",
        "title": "Cyber Extortion Forensic & Cryptocurrency Trace Log",
        "filename": "case_c055_cyber_extortion.txt",
        "source_agency": "State Cyber Cell",
        "author": "Cyber Forensics Special Team",
        "date_created": "2026-01-18",
        "classification": "RESTRICTED",
        "content_summary": "Trace of ransomware proceeds laundered through UK OTC broker David Miller (P005) and SIM swapping developer Zubair Ahmed (P012)."
    },
    {
        "report_id": "REP-SURV-04",
        "case_id": "C042",
        "title": "Zaveri Bazaar Cash Collection & Hawala Token Intercept",
        "filename": "surveillance_log_mumbai_port.txt",
        "source_agency": "Economic Offences Wing",
        "author": "Sub-Inspector V. Patil",
        "date_created": "2025-10-05",
        "classification": "INVESTIGATIVE LEAD",
        "content_summary": "Observation of cash courier Amit Patel (P006) delivering physical currency bundles using token notes linked to Al-Noor Import Export."
    },
    {
        "report_id": "REP-INTERROG-01",
        "case_id": "C042",
        "title": "Interrogation Transcript Snippet - Associate Courier P006",
        "filename": "interrogation_memo_p001.txt",
        "source_agency": "Crime Branch Interrogation Cell",
        "author": "ACP K. Shinde",
        "date_created": "2025-10-15",
        "classification": "STATEMENT RECORD",
        "content_summary": "Statement regarding cash distribution network, phone contacts with RS (+91-98200-11223), and vehicle MH-01-CV-1082."
    }
]

REPORT_TEXTS = {
    "case_c042_hawala_intel.txt": """INTELLIGENCE REPORT: OPERATION GOLDEN HAWALA
CASE REF: C042 | DATE: 2025-10-08
SOURCE: Crime Branch Unit-3 & FIU

SUBJECT: Surveillance Log and Financial Layering Analysis regarding Rahul Sharma (P001)

1. EXECUTIVE SUMMARY:
Physical and technical surveillance conducted between 2025-10-01 and 2025-10-06 confirms that subject Rahul Sharma (DOB 1984-06-15, alias "RS"), operating from Colaba Safehouse (LOC005) and driving black Mercedes-Benz (MH-01-CV-1082), serves as the central nodal broker in the illicit hawala money transfer network under investigation in Case C042.

2. SUSPICIOUS MEETINGS & MOVEMENTS:
- On 2025-10-02 at 14:30 hrs, Rahul Sharma was observed at BKC Diamond Tower (LOC002) entering the corporate office of BlueStar Marine Logistics LLP (ORG001). He held a 45-minute private session with company director Priya Nair (P004).
- On 2025-10-03 at 23:14 hrs, technical intercept on burner SIM (+91-98200-99887 / PH002) logged 6 urgent calls to Dubai number +971-50-1234567 registered to kingpin Vikram Malhotra (P002), beneficial owner of Al-Noor Import Export FZE (ORG002).
- On 2025-10-04, transaction TX-01082 for amount INR 75,00,000 was executed from an associated account to OTC broker David Miller (P005) for rapid conversion into cryptocurrency.

3. CROSS-NETWORK BRIDGE LINKS:
Surveillance indicates Rahul Sharma is not limited to financial layering; he also maintains active communication with port logistics handler Tariq Khan (P003) regarding clearance of maritime cargo under Case C019.

4. ANALYTICAL RECOMMENDATION:
Prioritize investigation into phone records for PH001 (+91-98200-11223) and vehicle movements for MH-01-CV-1082. All evidence must be validated before formal filing.
""",

    "case_c019_smuggling_intercept.txt": """CUSTOMS & DRI SEIZURE MEMORANDUM
CASE REF: C019 | DATE: 2025-11-06
INVESTIGATIVE AGENCY: Directorate of Revenue Intelligence (DRI)

SUBJECT: Interception of Container Freight at JNPT Port Terminal 3 (LOC001)

1. INCIDENT DETAILS:
On 2025-10-28 at 02:30 hrs, joint enforcement teams intercepted freight container CON-9921 hauled by commercial cargo truck (MH-46-AZ-4412 / VH002) owned by KV Freightlines Pvt Ltd (ORG005) driven near Panvel Logistics Hub (LOC003).

2. INVOLVED PARTIES:
- Tariq Khan (P003, phone +91-98211-33445): Coordinated offloading and inland route dispatch.
- Sanjay Roy (P007, phone +91-98190-22334): Customs clearance agent who submitted falsified manifest declarations.
- Vehicle MH-02-ER-9910 (Toyota Fortuner) registered to Tariq Khan was identified escorting the freight trailer.

3. CONNECTION TO FINANCIAL SYNDICATE C042:
Call detail logs (CDR-194) reveal Tariq Khan spoke with broker Rahul Sharma (P001) 4 times on 2025-10-27 regarding advance payments and security guarantees.

4. EVIDENCE COLLECTED:
Seizure memo EVD-SEIZE-019, customs clearance stamps EVD-DOC-019, and Fastag toll records EVD-TOLL-088.
""",

    "case_c055_cyber_extortion.txt": """DIGITAL FORENSICS INCIDENT REPORT
CASE REF: C055 | DATE: 2026-01-18
AGENCY: State Cyber Police Station

SUBJECT: Tracing Darknet Extortion Proceeds & OTC Mixing Infrastructure

1. INCIDENT OVERVIEW:
Ransomware attacks affecting municipal healthcare systems yielded extortion ransoms deposited into cryptocurrency addresses. On-chain analysis indicates funds were channeled to OTC Liquidity Provider David Miller (P005 / UK-COMP-088192) operating CyberShield Digital Asset Consulting (ORG004).

2. CRYPTO TRANSACTIONS & TRANSFERS:
- Transaction TX-01085: 45,000 USDT transferred on 2026-01-10 at 03:22:15 hrs to wallet identified with developer Zubair Ahmed (P012).
- Intercepted encrypted chats link David Miller (phone +44-7700-900123) to fund-washing requests originating from broker Rahul Sharma (P001) dating back to October 2025 (TX-01082).

3. EVIDENCE LOG:
Blockchain hash logs EVD-BLOCK-055, server IP captures EVD-IP-055, and UK Corporate filings EVD-CYBER-082.
""",

    "surveillance_log_mumbai_port.txt": """SURVEILLANCE LOG: ZAVERI BAZAAR CASH NETWORK
CASE REF: C042 / EOW | DATE: 2025-10-05

Location: Zaveri Bazaar Cash Drop Office (LOC008)
Target: Amit Patel (P006, alias "Bablu")

1. OBSERVATIONS:
- At 16:30 hrs, vehicle MH-04-KB-3301 (Hyundai Creta) operated by Priya Nair (P004) arrived near Sheikh Memon Street.
- Cash runner Amit Patel (P006, phone +91-98920-77665) collected two sealed duffel bags.
- Amit Patel made a phone call (CDR-210) to Rahul Sharma (P001) confirming receipt of code 'Token-8891' representing INR 34,00,000.
- Amit Patel then loaded the cash into white pickup truck GJ-05-BX-8820 (VH005) destined for Surat Diamond Bourse (LOC006).

2. EVIDENCE:
CCTV footage clips EVD-CCTV-099 and call record CDR-210.
""",

    "interrogation_memo_p001.txt": """RECORD OF STATEMENT / INTERROGATION MEMORANDUM
DATE: 2025-10-15 | LOCATION: Crime Branch Interrogation Facility

SUBJECT: Statement of Amit Patel (P006) regarding Operation Golden Hawala (C042)

Q1: Who gave instructions for the cash pickups on October 4th?
A1: I received instructions directly from Rahul Sharma (P001), who goes by RS. He called me on +91-98920-77665 and told me to collect token cash from Zaveri Bazaar (LOC008).

Q2: Who controls the overseas funds in Dubai?
A2: RS mentioned Vikram Malhotra (P002) is the main boss in Dubai who owns Al-Noor Import Export (ORG002). Priya Nair (P004) handles all company book entries and invoices from the BKC office.

Q3: Did Rahul Sharma have dealings with cargo shipments at JNPT?
A3: Yes, he told me Tariq Khan (P003) from Panvel was clearing special consignments with customs agent Sanjay Roy (P007). RS was financing the clearance fee.
"""
}

# 11. Network Metadata (Summary Statistics & Analytics Configuration)
NETWORK_METADATA = [
    {"metric": "total_nodes", "value": "45", "description": "Total multi-modal graph entities"},
    {"metric": "total_edges", "value": "78", "description": "Total explicit and inferred relationship links"},
    {"metric": "total_cases", "value": "3", "description": "Active criminal case investigations"},
    {"metric": "total_persons", "value": "12", "description": "Entities classified as persons"},
    {"metric": "network_density", "value": "0.082", "description": "Graph connectivity density ratio"},
    {"metric": "average_degree", "value": "3.46", "description": "Mean degree per entity node"},
    {"metric": "detected_communities", "value": "3", "description": "Louvain algorithm modularity partitions"},
    {"metric": "bridge_entities", "value": "P001 (Rahul Sharma)", "description": "Key articulation point bridging Hawala (C042) and Contraband (C019)"}
]

def save_csv(filename, data, fieldnames):
    filepath = os.path.join(SYNTHETIC_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in data:
            writer.writerow(row)
    print(f"Generated: {filepath} ({len(data)} records)")

def main():
    print("Generating comprehensive synthetic dataset for CrimeGraph AI...")
    
    # Save CSVs
    save_csv("persons.csv", PERSONS, ["person_id", "name", "aliases", "dob", "nationality", "role", "primary_location", "risk_level", "avatar_url"])
    save_csv("phones.csv", PHONES, ["phone_id", "phone_number", "imei", "imsi", "telecom_circle", "operator", "registered_owner", "is_burner"])
    save_csv("vehicles.csv", VEHICLES, ["vehicle_id", "plate_number", "make", "model", "color", "registered_owner", "vehicle_type"])
    save_csv("locations.csv", LOCATIONS, ["location_id", "name", "address", "latitude", "longitude", "location_type"])
    save_csv("organizations.csv", ORGANIZATIONS, ["org_id", "name", "registration_no", "jurisdiction", "org_type", "flagged_status"])
    save_csv("cases.csv", CASES, ["case_id", "title", "description", "case_type", "status", "priority", "lead_officer", "date_registered", "incident_date", "estimated_value"])
    save_csv("relationships.csv", RELATIONSHIPS, ["rel_id", "source_id", "target_id", "relationship_type", "confidence", "evidence_id", "date", "notes"])
    
    cdrs = generate_cdr()
    save_csv("cdr.csv", cdrs, ["cdr_id", "caller_id", "caller_phone", "receiver_id", "receiver_phone", "timestamp", "duration_sec", "cell_tower_location", "call_type", "flagged_status"])
    
    txs = generate_transactions()
    save_csv("transactions.csv", txs, ["tx_id", "sender_id", "sender_name", "receiver_id", "receiver_name", "amount", "currency", "channel", "bank_reference", "timestamp", "category", "flagged_status", "anomaly_multiplier"])
    
    save_csv("reports.csv", REPORTS, ["report_id", "case_id", "title", "filename", "source_agency", "author", "date_created", "classification", "content_summary"])
    save_csv("network_metadata.csv", NETWORK_METADATA, ["metric", "value", "description"])

    # Write report text files
    for filename, text in REPORT_TEXTS.items():
        filepath = os.path.join(REPORTS_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text.strip())
        print(f"Generated text report: {filepath}")

    print("\nDataset generation completed successfully!")

if __name__ == "__main__":
    main()
