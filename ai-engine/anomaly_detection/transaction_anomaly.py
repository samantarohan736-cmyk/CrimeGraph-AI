import numpy as np
from typing import List, Dict, Any

class TransactionAnomalyDetector:
    """
    Statistical Transaction Anomaly Detector.
    Identifies unusually large financial disbursements and sudden surges relative to baseline.
    """
    def __init__(self, median_multiplier_threshold: float = 3.0):
        self.multiplier_threshold = median_multiplier_threshold

    def detect_anomalies(self, transactions: List[Dict[str, Any]], person_cases_map: Dict[str, List[str]] = None) -> List[Dict[str, Any]]:
        if not transactions:
            return []

        person_cases_map = person_cases_map or {}

        # Group amounts by sender
        sender_amounts = {}
        for tx in transactions:
            s_id = tx.get("sender_id") or tx.get("source_id")
            amt = float(tx.get("amount", 0.0))
            if s_id and amt > 0:
                sender_amounts.setdefault(s_id, []).append(amt)

        anomalies = []
        alert_seq = 101

        for tx in transactions:
            s_id = tx.get("sender_id") or tx.get("source_id")
            r_id = tx.get("receiver_id") or tx.get("target_id")
            amt = float(tx.get("amount", 0.0))
            history = sender_amounts.get(s_id, [amt])
            
            # Calculate historical median excluding current if possible
            other_amts = [a for a in history if a != amt]
            median_amt = float(np.median(other_amts)) if other_amts else float(np.median(history))
            if median_amt <= 0:
                median_amt = 50000.0

            multiplier = amt / median_amt if median_amt > 0 else 1.0
            is_flagged = (
                str(tx.get("flagged_anomaly", "")).upper() in ["TRUE", "1", "YES"] or
                "ANOMALY" in str(tx.get("flagged_status", "")).upper() or
                multiplier >= self.multiplier_threshold
            )

            if is_flagged:
                severity = "HIGH" if multiplier >= 5.0 else ("MEDIUM" if multiplier >= 2.5 else "LOW")
                associated_cases = person_cases_map.get(s_id, [])
                case_id = associated_cases[0] if associated_cases else (tx.get("case_id") or "C001")
                
                anomalies.append({
                    "alert_id": f"ALT-TX-{alert_seq}",
                    "entity_id": s_id,
                    "entity_type": "Person",
                    "case_id": case_id,
                    "alert_type": "TRANSACTION_SURGE",
                    "severity": severity,
                    "reason": f"Transaction amount of {tx.get('currency', 'INR')} {amt:,.2f} is {multiplier:.1f}x above baseline median ({tx.get('currency', 'INR')} {median_amt:,.2f}).",
                    "supporting_evidence_id": tx.get("tx_id"),
                    "supporting_records": {
                        "tx_id": tx.get("tx_id"),
                        "amount": amt,
                        "currency": tx.get("currency", "INR"),
                        "multiplier": f"{multiplier:.1f}x",
                        "sender": tx.get("sender_name") or s_id,
                        "receiver": tx.get("receiver_name") or r_id,
                        "channel": tx.get("channel"),
                        "timestamp": tx.get("timestamp")
                    },
                    "confidence": 0.95,
                    "status": "ACTIVE"
                })
                alert_seq += 1

        return anomalies

tx_anomaly_detector = TransactionAnomalyDetector()
