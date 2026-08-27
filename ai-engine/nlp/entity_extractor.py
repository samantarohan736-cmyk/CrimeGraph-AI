import re
from typing import List, Dict, Any

# Deterministic and NLP regex patterns for criminal intelligence
PATTERNS = {
    "PHONE": [
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}",
        r"\+91[-.\s]?\d{5}[-.\s]?\d{5}",
        r"\+971[-.\s]?\d{2}[-.\s]?\d{7}",
        r"\+44[-.\s]?\d{4}[-.\s]?\d{6}"
    ],
    "VEHICLE": [
        r"[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}",
        r"MH[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
        r"GJ[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}"
    ],
    "CASE": [
        r"\b(?:Case\s*)?C0\d{2}\b",
        r"\b(?:Operation\s+[A-Za-z0-9\s]+)\b",
        r"\b(?:FIR[-\s]?[A-Za-z0-9\/\-]+)\b"
    ],
    "DATE": [
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{2}\/\d{2}\/\d{4}\b",
        r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b"
    ],
    "AMOUNT": [
        r"\b(?:INR|Rs\.?|USD|\$|AED|EUR|USDT)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:Crore|Lakh|Million|k|Lakhs))?\b",
        r"\b[\d,]+\s*(?:USDT|BTC|ETH|AED|Lakhs|Crore)\b"
    ],
    "PERSON_NAMES": [
        "Rahul Sharma", "Vikram Malhotra", "Tariq Khan", "Priya Nair", "David Miller",
        "Amit Patel", "Sanjay Roy", "Neha Kapoor", "Rashid Al-Falasi", "Karan Verma",
        "Sunil Mehta", "Zubair Ahmed", "RS", "Victor", "Tiger", "Bablu"
    ],
    "LOCATIONS": [
        "JNPT Port", "JNPT Port Container Terminal 3", "BKC Diamond Tower", "BKC Diamond & Financial Tower",
        "Panvel Logistics Hub", "Panvel Warehouse 14", "Dubai Gold Souk", "Colaba Safehouse",
        "Colaba Apartment 4B", "Surat Diamond Bourse", "Anjuna Beach Villa", "Zaveri Bazaar Cash Drop Office",
        "Nhava Sheva", "Mumbai", "Dubai", "Goa", "Surat", "Panvel"
    ],
    "ORGANIZATIONS": [
        "BlueStar Marine Logistics LLP", "BlueStar Logistics", "Al-Noor Import Export FZE",
        "Al-Noor Import Export", "Apex Forex & Remittance Services", "Apex Forex",
        "CyberShield Digital Asset Consulting", "CyberShield", "KV Freightlines Pvt Ltd",
        "KV Freightlines", "Directorate of Revenue Intelligence", "DRI", "Crime Branch Unit-3",
        "Economic Offences Wing", "EOW", "State Cyber Cell"
    ]
}

class HybridEntityExtractor:
    """
    Hybrid NLP & Rule-Based Entity Extractor for Law Enforcement Intelligence.
    Extracts PERSON, PHONE, VEHICLE, LOCATION, ORG, CASE, DATE, AMOUNT with character spans & confidence.
    """
    def __init__(self):
        self._spacy_nlp = None

    @property
    def spacy_nlp(self):
        if self._spacy_nlp is None:
            try:
                import spacy
                self._spacy_nlp = spacy.load("en_core_web_sm")
            except Exception:
                self._spacy_nlp = False
        return self._spacy_nlp if self._spacy_nlp is not False else None

    def extract_entities(self, text: str, source_doc: str = "") -> List[Dict[str, Any]]:
        entities = []
        seen_spans = set()

        # 1. Custom Known Person Entities with Aliases
        for name in PATTERNS["PERSON_NAMES"]:
            pattern = rf"\b{re.escape(name)}\b"
            for m in re.finditer(pattern, text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "PERSON",
                        "extracted_text": m.group(0),
                        "normalized_value": name,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.96,
                        "source_doc": source_doc
                    })

        # 2. Known Locations
        for loc in PATTERNS["LOCATIONS"]:
            pattern = rf"\b{re.escape(loc)}\b"
            for m in re.finditer(pattern, text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "LOCATION",
                        "extracted_text": m.group(0),
                        "normalized_value": loc,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.94,
                        "source_doc": source_doc
                    })

        # 3. Known Organizations
        for org in PATTERNS["ORGANIZATIONS"]:
            pattern = rf"\b{re.escape(org)}\b"
            for m in re.finditer(pattern, text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "ORGANIZATION",
                        "extracted_text": m.group(0),
                        "normalized_value": org,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.95,
                        "source_doc": source_doc
                    })

        # 4. Regex Phone Numbers
        for p_regex in PATTERNS["PHONE"]:
            for m in re.finditer(p_regex, text):
                val = m.group(0).strip()
                if len(re.sub(r"\D", "", val)) >= 9:
                    span = (m.start(), m.end())
                    if not any(s[0] <= span[0] and s[1] >= span[1] for s in seen_spans):
                        seen_spans.add(span)
                        entities.append({
                            "entity_type": "PHONE",
                            "extracted_text": val,
                            "normalized_value": re.sub(r"[\s\(\)]", "", val),
                            "start_char": m.start(),
                            "end_char": m.end(),
                            "confidence": 0.98,
                            "source_doc": source_doc
                        })

        # 5. Regex Vehicles
        for v_regex in PATTERNS["VEHICLE"]:
            for m in re.finditer(v_regex, text):
                val = m.group(0).strip()
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "VEHICLE",
                        "extracted_text": val,
                        "normalized_value": val.upper().replace(" ", "-"),
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.97,
                        "source_doc": source_doc
                    })

        # 6. Regex Cases
        for c_regex in PATTERNS["CASE"]:
            for m in re.finditer(c_regex, text, re.IGNORECASE):
                val = m.group(0).strip()
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "CASE",
                        "extracted_text": val,
                        "normalized_value": val.upper(),
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.95,
                        "source_doc": source_doc
                    })

        # 7. Regex Amounts
        for a_regex in PATTERNS["AMOUNT"]:
            for m in re.finditer(a_regex, text, re.IGNORECASE):
                val = m.group(0).strip()
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "AMOUNT",
                        "extracted_text": val,
                        "normalized_value": val,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.92,
                        "source_doc": source_doc
                    })

        # 8. Regex Dates
        for d_regex in PATTERNS["DATE"]:
            for m in re.finditer(d_regex, text, re.IGNORECASE):
                val = m.group(0).strip()
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "DATE",
                        "extracted_text": val,
                        "normalized_value": val,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "confidence": 0.90,
                        "source_doc": source_doc
                    })

        # Sort entities by appearance in document
        entities.sort(key=lambda x: x["start_char"])
        return entities

# Global Extractor Instance
entity_extractor = HybridEntityExtractor()
