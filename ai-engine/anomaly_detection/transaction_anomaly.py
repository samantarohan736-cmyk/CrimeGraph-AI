import uuid
import numpy as np
from typing import List, Dict, Any, Optional


class TransactionAnomalyDetector:
    """
    Statistical Transaction Anomaly Detector.
    Identifies unusually large financial disbursements relative to a sender's own
    historical baseline derived from ALL transactions in the batch.

    Fixes applied:
    - Alert IDs now use UUID (no sequential counter resets → no DB collision on re-run).
    - Single-record flaw fixed: uses global batch median for the sender when only one
      transaction exists, comparing against the overall population distribution instead
      of silently skipping.
    - Absolute large-transaction threshold added: flags any single transaction above
      `absolute_threshold` regardless of relative multiplier (catches first-ever large tx).
    """

    def __init__(
        self,
        median_multiplier_threshold: float = 3.0,
        absolute_threshold: float = 1_000_000.0,  # Flag any tx > ₹10 lakh unconditionally
    ):
        self.multiplier_threshold = median_multiplier_threshold
        self.absolute_threshold = absolute_threshold

    def _infer_case_id(self, entity_id: Optional[str]) -> Optional[str]:
        """Looks up a real case association for this entity from the knowledge graph, if any."""
        if not entity_id:
            return None
        try:
            from backend.app.core.graph_store import graph_store
            sub = graph_store.get_subgraph(entity_id, max_hops=2)
            case_node = next((n for n in sub.nodes if n.type == "Case"), None)
            return case_node.id if case_node else None
        except Exception:
            return None

    def detect_anomalies(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not transactions:
            return []

        # ── Build per-sender amount history from the full batch ─────────────
        sender_amounts: Dict[str, List[float]] = {}
        for tx in transactions:
            s_id = tx.get("sender_id")
            try:
                amt = float(tx.get("amount", 0.0))
            except (ValueError, TypeError):
                amt = 0.0
            if s_id and amt > 0:
                sender_amounts.setdefault(s_id, []).append(amt)

        # ── Global batch median as fallback for single-transaction senders ──
        all_amounts = [a for amts in sender_amounts.values() for a in amts]
        global_median = float(np.median(all_amounts)) if all_amounts else 50_000.0

        anomalies: List[Dict[str, Any]] = []

        for tx in transactions:
            s_id = tx.get("sender_id")
            if not s_id:
                continue
            try:
                amt = float(tx.get("amount", 0.0))
            except (ValueError, TypeError):
                amt = 0.0
            if amt <= 0:
                continue

            history = sender_amounts.get(s_id, [amt])

            # FIX: Exclude the current transaction from baseline when possible,
            # but fall back to global batch median for single-record senders.
            other_amts = [a for a in history if a != amt]
            if other_amts:
                median_amt = float(np.median(other_amts))
            elif len(history) > 1:
                median_amt = float(np.median(history))
            else:
                # Single transaction for this sender — compare to batch global median.
                median_amt = global_median

            if median_amt <= 0:
                median_amt = global_median

            multiplier = amt / median_amt
            flagged = str(tx.get("flagged_status", "")).upper()

            # Trigger: relative spike OR absolute large amount OR explicit flag
            is_relative_spike = multiplier >= self.multiplier_threshold
            is_absolute_large = amt >= self.absolute_threshold
            is_explicitly_flagged = "ANOMALY" in flagged or "SUSPICIOUS" in flagged

            if not (is_relative_spike or is_absolute_large or is_explicitly_flagged):
                continue

            # Determine severity
            if multiplier >= 5.0 or amt >= self.absolute_threshold * 5:
                severity = "HIGH"
            elif multiplier >= 3.0 or amt >= self.absolute_threshold:
                severity = "MEDIUM"
            else:
                severity = "LOW"

            # Build human-readable reason
            reasons = []
            if is_relative_spike:
                reasons.append(
                    f"transaction of {tx.get('currency', 'INR')} {amt:,.2f} is "
                    f"{multiplier:.1f}× above sender's baseline median "
                    f"({tx.get('currency', 'INR')} {median_amt:,.2f})"
                )
            if is_absolute_large:
                reasons.append(
                    f"amount exceeds absolute large-transaction threshold "
                    f"({tx.get('currency', 'INR')} {self.absolute_threshold:,.0f})"
                )
            if is_explicitly_flagged:
                reasons.append(f"record is explicitly flagged as '{tx.get('flagged_status')}'")

            reason_text = "Transaction surge detected: " + "; and ".join(reasons) + "."

            anomalies.append({
                # FIX: UUID-based ID — no collision on re-run
                "alert_id": f"ALT-TX-{uuid.uuid4().hex[:10].upper()}",
                "entity_id": s_id,
                "entity_type": "Person",
                "case_id": self._infer_case_id(s_id),
                "alert_type": "TRANSACTION_SURGE",
                "severity": severity,
                "reason": reason_text,
                "supporting_evidence_id": None,
                "supporting_records": {
                    "tx_id": tx.get("tx_id"),
                    "amount": amt,
                    "currency": tx.get("currency", "INR"),
                    "multiplier": f"{multiplier:.1f}x",
                    "sender": tx.get("sender_name"),
                    "receiver": tx.get("receiver_name"),
                    "channel": tx.get("channel"),
                    "timestamp": tx.get("timestamp"),
                    "flagged_status": tx.get("flagged_status"),
                },
                "confidence": 0.95,
                "status": "ACTIVE",
            })

        return anomalies


tx_anomaly_detector = TransactionAnomalyDetector()