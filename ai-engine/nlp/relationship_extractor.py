import re
from typing import List, Dict, Any

class RelationshipExtractor:
    """
    Contextual Relationship Extractor.
    Extracts semantic links between entities mentioned in unstructured intelligence reports.
    """
    def __init__(self):
        self.rel_patterns = [
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:called|phoned|contacted|dialed)\s+(?P<tgt>[A-Z][a-zA-Z\s]+|\+?\d[\d\-\s]+)", "CALLED", 0.94),
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:visited|arrived at|entered|frequented)\s+(?P<tgt>[A-Z][a-zA-Z0-9\s]+(?:Tower|Safehouse|Port|Terminal|Hub|Bourse|Office|Villa))", "VISITED", 0.93),
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:transferred|wired|sent|paid)\s+(?:INR|USD|AED|USDT)?\s*[\d,]+\s*(?:to|towards)\s+(?P<tgt>[A-Z][a-zA-Z\s]+)", "TRANSFERRED_TO", 0.95),
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:owns|operates|directs|manages|founded)\s+(?P<tgt>[A-Z][a-zA-Z\s]+(?:LLP|FZE|Pvt Ltd|Consulting|Services|Logistics|Trading))", "WORKS_FOR", 0.92),
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:drives|operating vehicle|registered with)\s+(?P<tgt>[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4})", "OWNS_VEHICLE", 0.96),
            (r"(?P<src>[A-Z][a-zA-Z\s]+?)\s+(?:associated with|linked to|named in)\s+(?P<tgt>Case\s*C0\d{2}|C0\d{2})", "ASSOCIATED_WITH_CASE", 0.95)
        ]

    def extract_relationships(self, text: str, doc_id: str = "") -> List[Dict[str, Any]]:
        relationships = []
        for pattern, rel_type, base_conf in self.rel_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                src = m.group("src").strip() if "src" in m.groupdict() else ""
                tgt = m.group("tgt").strip() if "tgt" in m.groupdict() else ""
                if src and tgt and len(src) > 2 and len(tgt) > 2:
                    relationships.append({
                        "source_text": src,
                        "target_text": tgt,
                        "relationship_type": rel_type,
                        "confidence": base_conf,
                        "evidence_span": m.group(0).strip(),
                        "doc_id": doc_id
                    })
        return relationships

relationship_extractor = RelationshipExtractor()
