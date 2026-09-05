import re
from typing import List, Dict, Any, Optional

# Structural regex patterns — language/format-based, NOT demo-specific.
# These work on any real case data regardless of who the persons are.
PATTERNS = {
    "PHONE": [
        r"(?:\+?91[-.\s]?)?\d{5}[-.\s]?\d{5}",           # Indian mobile (+91 prefix optional)
        r"\+971[-.\s]?\d{2}[-.\s]?\d{7}",                  # UAE
        r"\+44[-.\s]?\d{4}[-.\s]?\d{6}",                   # UK
        r"\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", # US
        r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}",  # Generic intl
    ],
    "VEHICLE": [
        # Indian vehicle registration patterns
        r"[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4}",
        r"MH[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
        r"GJ[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
        r"DL[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
        r"KA[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
        r"TN[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}",
    ],
    "CASE": [
        r"\b(?:FIR[-\s]?(?:No\.?[-\s]?)?\d+[/\\-]?\d*)\b",       # FIR No. 123/2024
        r"\b(?:Case[-\s]?No\.?[-\s]?[A-Za-z0-9/\-]+)\b",          # Case No. XYZ-001
        r"\b(?:Operation\s+[A-Za-z][A-Za-z0-9\s]{2,30})\b",        # Operation Cobra
        r"\b[A-Z]{1,2}\d{3,5}\b",                                    # Short alphanumeric IDs
    ],
    "DATE": [
        r"\b\d{4}-\d{2}-\d{2}\b",                               # 2024-01-15
        r"\b\d{2}/\d{2}/\d{4}\b",                               # 15/01/2024
        r"\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b",
        r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b",
    ],
    "AMOUNT": [
        r"\b(?:INR|Rs\.?|USD|\$|AED|EUR|GBP|USDT|BTC)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:Crore|Lakh|Million|Billion|Thousand|k|Lakhs|Crores))?\b",
        r"\b[\d,]+(?:\.\d{1,2})?\s*(?:USDT|BTC|ETH|AED|Lakhs|Crore|Crores|Lakh|Million|Billion)\b",
        r"\bRs\.?\s*[\d,]+(?:\.\d{1,2})?\b",
    ],
}

# Compile vehicle patterns once for performance
_VEHICLE_RX = [re.compile(p) for p in PATTERNS["VEHICLE"]]
_PHONE_RX = [re.compile(p) for p in PATTERNS["PHONE"]]


class HybridEntityExtractor:
    """
    Hybrid NLP & Rule-Based Entity Extractor for Law Enforcement Intelligence.

    Strategy (in priority order):
      1. spaCy NER  — general-purpose PERSON/ORG/GPE/LOC from the actual document text
      2. DB-aware supplementary patterns — names/orgs/locations of entities already in the system
      3. Structural regex — phone numbers, vehicle plates, case IDs, dates, monetary amounts

    The old hardcoded demo name/location/org lists have been removed. The extractor now
    works on any real case data and dynamically loads known-entity names from the database
    when a DB session is provided (see load_known_entities_from_db).
    """

    def __init__(self):
        self._spacy_nlp = None
        self._known_persons: List[str] = []
        self._known_locations: List[str] = []
        self._known_orgs: List[str] = []

    @property
    def spacy_nlp(self):
        if self._spacy_nlp is None:
            try:
                import spacy
                self._spacy_nlp = spacy.load("en_core_web_sm")
                print("[EntityExtractor] spaCy en_core_web_sm loaded.")
            except OSError:
                print("[EntityExtractor] Warning: spaCy model 'en_core_web_sm' not found. "
                      "Run: python -m spacy download en_core_web_sm")
                self._spacy_nlp = False
            except Exception as e:
                print(f"[EntityExtractor] Warning: could not load spaCy: {e}")
                self._spacy_nlp = False
        return self._spacy_nlp if self._spacy_nlp is not False else None

    def load_known_entities_from_db(self, db) -> None:
        """
        Load names currently stored in the DB as supplementary match patterns.
        Call this before extraction when a DB session is available so that already-known
        entities (short codenames, aliases, org abbreviations) are also caught.
        """
        try:
            from backend.app.models.entities import Person, Location, Organization
            self._known_persons = [
                p.name for p in db.query(Person.name).all()
            ] + [
                alias.strip()
                for p in db.query(Person.aliases).filter(Person.aliases.isnot(None)).all()
                for alias in (p.aliases or "").split(",") if alias.strip()
            ]
            self._known_locations = [l.name for l in db.query(Location.name).all()]
            self._known_orgs = [o.name for o in db.query(Organization.name).all()]
        except Exception as e:
            print(f"[EntityExtractor] Could not load known entities from DB: {e}")

    def extract_entities(self, text: str, source_doc: str = "", db=None) -> List[Dict[str, Any]]:
        if db is not None:
            self.load_known_entities_from_db(db)

        entities: List[Dict[str, Any]] = []
        seen_spans: set = set()

        if not text or not text.strip():
            return entities

        # ---- 1. spaCy general NER (primary) ----
        nlp = self.spacy_nlp
        if nlp is not None:
            spacy_label_map = {
                "PERSON": "PERSON",
                "ORG": "ORGANIZATION",
                "GPE": "LOCATION",
                "LOC": "LOCATION",
                "FAC": "LOCATION",
            }
            try:
                doc_nlp = nlp(text[:1_000_000])  # spaCy has a max length guard
                for ent in doc_nlp.ents:
                    mapped = spacy_label_map.get(ent.label_)
                    if not mapped:
                        continue
                    # Filter out very short tokens that are almost certainly noise
                    if len(ent.text.strip()) < 2:
                        continue
                    span = (ent.start_char, ent.end_char)
                    if span not in seen_spans:
                        seen_spans.add(span)
                        entities.append({
                            "entity_type": mapped,
                            "extracted_text": ent.text,
                            "normalized_value": ent.text.strip(),
                            "start_char": ent.start_char,
                            "end_char": ent.end_char,
                            "confidence": 0.85,
                            "source_doc": source_doc
                        })
            except Exception as e:
                print(f"[EntityExtractor] spaCy inference error: {e}")

        # ---- 2. DB-aware supplementary patterns ----
        for name in sorted(self._known_persons, key=len, reverse=True):
            if len(name) < 2:
                continue
            for m in re.finditer(rf"\b{re.escape(name)}\b", text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "PERSON",
                        "extracted_text": m.group(0),
                        "normalized_value": name,
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.96, "source_doc": source_doc
                    })

        for loc in sorted(self._known_locations, key=len, reverse=True):
            if len(loc) < 3:
                continue
            for m in re.finditer(rf"\b{re.escape(loc)}\b", text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "LOCATION",
                        "extracted_text": m.group(0),
                        "normalized_value": loc,
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.94, "source_doc": source_doc
                    })

        for org in sorted(self._known_orgs, key=len, reverse=True):
            if len(org) < 3:
                continue
            for m in re.finditer(rf"\b{re.escape(org)}\b", text, re.IGNORECASE):
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "ORGANIZATION",
                        "extracted_text": m.group(0),
                        "normalized_value": org,
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.95, "source_doc": source_doc
                    })

        # ---- 3. Regex — Phone Numbers ----
        for rx in _PHONE_RX:
            for m in rx.finditer(text):
                val = m.group(0).strip()
                digits_only = re.sub(r"\D", "", val)
                if len(digits_only) < 9:
                    continue
                span = (m.start(), m.end())
                if not any(s[0] <= span[0] and s[1] >= span[1] for s in seen_spans):
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "PHONE",
                        "extracted_text": val,
                        "normalized_value": re.sub(r"[\s\(\)\-\.]", "", val),
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.98, "source_doc": source_doc
                    })

        # ---- 4. Regex — Vehicles ----
        for rx in _VEHICLE_RX:
            for m in rx.finditer(text):
                val = m.group(0).strip()
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "VEHICLE",
                        "extracted_text": val,
                        "normalized_value": val.upper().replace(" ", "-"),
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.97, "source_doc": source_doc
                    })

        # ---- 5. Regex — Case IDs ----
        for c_regex in PATTERNS["CASE"]:
            for m in re.finditer(c_regex, text, re.IGNORECASE):
                val = m.group(0).strip()
                if len(val) < 4:
                    continue
                span = (m.start(), m.end())
                if span not in seen_spans:
                    seen_spans.add(span)
                    entities.append({
                        "entity_type": "CASE",
                        "extracted_text": val,
                        "normalized_value": val.upper(),
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.90, "source_doc": source_doc
                    })

        # ---- 6. Regex — Monetary Amounts ----
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
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.92, "source_doc": source_doc
                    })

        # ---- 7. Regex — Dates ----
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
                        "start_char": m.start(), "end_char": m.end(),
                        "confidence": 0.90, "source_doc": source_doc
                    })

        entities.sort(key=lambda x: x["start_char"])
        return entities


# Global extractor instance — shared across requests
entity_extractor = HybridEntityExtractor()
