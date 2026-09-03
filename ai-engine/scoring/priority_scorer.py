from typing import Dict, List, Any
from backend.app.core.config import settings

class InvestigationPriorityScorer:
    """
    Transparent & Explainable Investigation Priority Scoring Engine.
    Combines Network Centrality (30%), Cross-Case Links (25%), Communication Anomalies (15%),
    Financial Anomalies (15%), and Temporal Activity (15%).
    Never infers guilt or criminality; purely provides analytical triage ranking for investigators.
    """
    DISCLAIMER = "This is an analytical prioritization score, not a determination of guilt or criminality."

    def __init__(self):
        self.w_centrality = settings.WEIGHT_NETWORK_CENTRALITY
        self.w_cross_case = settings.WEIGHT_CROSS_CASE
        self.w_cdr = settings.WEIGHT_COMMUNICATION_ANOMALY
        self.w_tx = settings.WEIGHT_TRANSACTION_ANOMALY
        self.w_time = settings.WEIGHT_TEMPORAL_ACTIVITY

    def calculate_priority_score(
        self,
        person_id: str,
        graph_metrics: Dict[str, Any],
        associated_cases: List[str],
        alerts: List[Dict[str, Any]],
        cdrs: List[Dict[str, Any]],
        transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        
        # 1. Network Centrality Score (0-100)
        betweenness = graph_metrics.get("betweenness", 0.0)
        degree = graph_metrics.get("degree", 0)
        is_bridge = graph_metrics.get("is_bridge", False)
        
        raw_cent = (betweenness * 80.0) + min(degree * 5.0, 30.0) + (20.0 if is_bridge else 0.0)
        cent_score = min(round(raw_cent, 1), 100.0)
        
        # 2. Cross-Case Association Score (0-100)
        case_count = len(associated_cases)
        if case_count >= 3:
            case_score = 95.0
        elif case_count == 2:
            case_score = 80.0
        elif case_count == 1:
            case_score = 45.0
        else:
            case_score = 10.0

        # 3. Communication Anomaly Score (0-100)
        cdr_alerts = [a for a in alerts if a.get("entity_id") == person_id and "COMMUNICATION" in str(a.get("alert_type"))]
        has_night = any("TIME" in str(a.get("alert_type")) for a in alerts if a.get("entity_id") == person_id)
        
        if cdr_alerts and has_night:
            cdr_score = 92.0
        elif cdr_alerts:
            cdr_score = 78.0
        else:
            cdr_score = 25.0

        # 4. Transaction Anomaly Score (0-100)
        tx_alerts = [a for a in alerts if a.get("entity_id") == person_id and "TRANSACTION" in str(a.get("alert_type"))]
        if any(a.get("severity") == "HIGH" for a in tx_alerts):
            tx_score = 90.0
        elif tx_alerts:
            tx_score = 70.0
        else:
            tx_score = 15.0

        # 5. Temporal / Off-Hours Activity (0-100)
        if has_night or any("TEMPORAL" in str(a.get("alert_type")) for a in alerts if a.get("entity_id") == person_id):
            temp_score = 85.0
        else:
            temp_score = 20.0

        # Weighted Total Score (0-100)
        total_score = (
            cent_score * self.w_centrality +
            case_score * self.w_cross_case +
            cdr_score * self.w_cdr +
            tx_score * self.w_tx +
            temp_score * self.w_time
        )
        final_score = int(round(total_score))

        # Explicit Factor Contribution Breakdown - descriptions and evidence citations
        # below are built entirely from what was actually passed in for this person,
        # never a fixed narrative, so they stay honest for whatever real data exists.
        cdr_reasons = [a.get("reason") for a in cdr_alerts if a.get("reason")]
        tx_reasons = [a.get("reason") for a in tx_alerts if a.get("reason")]
        night_alerts = [
            a for a in alerts
            if a.get("entity_id") == person_id and
            ("TIME" in str(a.get("alert_type")) or "TEMPORAL" in str(a.get("alert_type")))
        ]
        night_reasons = [a.get("reason") for a in night_alerts if a.get("reason")]

        cent_desc = f"Betweenness centrality of {betweenness:.3f} across {degree} direct graph connection(s)."
        if is_bridge:
            cent_desc += " Identified as a network bridge entity linking otherwise separate clusters."

        case_desc = (
            f"Directly linked to {case_count} case(s): {', '.join(associated_cases)}."
            if associated_cases else "Not currently linked to any active case in the graph."
        )

        if cdr_reasons:
            cdr_desc = "; ".join(cdr_reasons[:3])
        elif cdr_alerts:
            cdr_desc = f"{len(cdr_alerts)} communication anomaly alert(s) on file for this entity."
        else:
            cdr_desc = "No statistically significant communication anomalies detected for this entity."

        if tx_reasons:
            tx_desc = "; ".join(tx_reasons[:3])
        elif tx_alerts:
            tx_desc = f"{len(tx_alerts)} transaction anomaly alert(s) on file for this entity."
        else:
            tx_desc = "No statistically significant transaction anomalies detected for this entity."

        if night_reasons:
            temp_desc = "; ".join(night_reasons[:3])
        elif has_night:
            temp_desc = "Off-hours / nocturnal activity pattern flagged for this entity."
        else:
            temp_desc = "No off-hours activity pattern detected for this entity."

        factors = [
            {
                "factor_name": "Network Centrality & Bridge Role",
                "score": cent_score,
                "weight": self.w_centrality,
                "contribution": round(cent_score * self.w_centrality, 1),
                "description": cent_desc,
                "supporting_evidence": []
            },
            {
                "factor_name": "Cross-Case Association",
                "score": case_score,
                "weight": self.w_cross_case,
                "contribution": round(case_score * self.w_cross_case, 1),
                "description": case_desc,
                "supporting_evidence": []
            },
            {
                "factor_name": "Communication Spike Anomaly",
                "score": cdr_score,
                "weight": self.w_cdr,
                "contribution": round(cdr_score * self.w_cdr, 1),
                "description": cdr_desc,
                "supporting_evidence": [a.get("supporting_evidence_id") for a in cdr_alerts if a.get("supporting_evidence_id")]
            },
            {
                "factor_name": "Transaction Surge Anomaly",
                "score": tx_score,
                "weight": self.w_tx,
                "contribution": round(tx_score * self.w_tx, 1),
                "description": tx_desc,
                "supporting_evidence": [a.get("supporting_evidence_id") for a in tx_alerts if a.get("supporting_evidence_id")]
            },
            {
                "factor_name": "Temporal Off-Hours Patterns",
                "score": temp_score,
                "weight": self.w_time,
                "contribution": round(temp_score * self.w_time, 1),
                "description": temp_desc,
                "supporting_evidence": [a.get("supporting_evidence_id") for a in night_alerts if a.get("supporting_evidence_id")]
            }
        ]

        active_factor_notes = []
        if is_bridge:
            active_factor_notes.append("network bridge positioning")
        if case_count > 0:
            active_factor_notes.append(f"association with {case_count} case(s)")
        if cdr_alerts:
            active_factor_notes.append("communication anomalies")
        if tx_alerts:
            active_factor_notes.append("transaction anomalies")
        if has_night:
            active_factor_notes.append("off-hours activity")

        explanation = (
            f"Investigation Priority Score is {final_score}/100, driven by " +
            (", ".join(active_factor_notes) if active_factor_notes else "baseline graph position with no anomaly alerts currently on file") +
            "."
        )

        return {
            "score": final_score,
            "priority_rating": "CRITICAL" if final_score >= 80 else ("HIGH" if final_score >= 60 else ("MEDIUM" if final_score >= 40 else "LOW")),
            "factors": factors,
            "explanation": explanation,
            "disclaimer": self.DISCLAIMER
        }

priority_scorer = InvestigationPriorityScorer()