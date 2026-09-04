from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

class CDRAnomalyDetector:
    """
    Communication Spike & Night-Calling Anomaly Detector.
    Detects sudden increases in call frequency and off-hours calling clusters purely
    from the CDR records actually passed in - no fixed narrative text, no fabricated
    fallback IDs, and no dependency on a pre-baked 'flagged_status' label.
    """
    def __init__(self, spike_percentage_threshold: float = 200.0, baseline_window_days: int = 7):
        self.spike_threshold = spike_percentage_threshold
        self.baseline_window_days = baseline_window_days

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

    def detect_anomalies(self, cdrs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        anomalies = []
        alert_seq = 1

        caller_daily_counts: Dict[str, Dict[str, list]] = {}
        night_calls_by_caller: Dict[str, list] = {}
        all_dates = []

        for record in cdrs:
            caller_id = record.get("caller_id")
            ts_str = record.get("timestamp")
            if not caller_id or not ts_str:
                continue
            try:
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                continue

            all_dates.append(dt)
            day_key = dt.strftime("%Y-%m-%d")
            caller_daily_counts.setdefault(caller_id, {}).setdefault(day_key, []).append(record)

            if 0 <= dt.hour <= 5:
                night_calls_by_caller.setdefault(caller_id, []).append(record)

        # Baseline cutoff derived from the data's own date range, not a fixed calendar date.
        baseline_cutoff = None
        if all_dates:
            baseline_cutoff = (max(all_dates) - timedelta(days=self.baseline_window_days)).strftime("%Y-%m-%d")

        # 1. Communication spikes vs. each caller's own recent-history baseline
        for caller_id, days in caller_daily_counts.items():
            baseline_counts = [
                len(records) for day, records in days.items()
                if baseline_cutoff is None or day < baseline_cutoff
            ]
            if not baseline_counts:
                continue
            avg_baseline = sum(baseline_counts) / len(baseline_counts)
            if avg_baseline <= 0:
                continue

            for day, records in days.items():
                if baseline_cutoff and day < baseline_cutoff:
                    continue
                count = len(records)
                spike_pct = ((count - avg_baseline) / avg_baseline) * 100.0
                if spike_pct >= self.spike_threshold and count >= 5:
                    anomalies.append({
                        "alert_id": f"ALT-CDR-{alert_seq:03d}",
                        "entity_id": caller_id,
                        "entity_type": "Person",
                        "case_id": self._infer_case_id(caller_id),
                        "alert_type": "COMMUNICATION_SPIKE",
                        "severity": "HIGH" if spike_pct > 350 else "MEDIUM",
                        "reason": f"Call frequency increased by {int(spike_pct)}% over recent baseline on {day} "
                                  f"({count} calls vs. average of {avg_baseline:.1f}).",
                        "supporting_evidence_id": records[0].get("cdr_id"),
                        "supporting_records": {
                            "date": day, "daily_call_count": count,
                            "baseline_avg": round(avg_baseline, 1), "increase_pct": f"{int(spike_pct)}%",
                            "cell_tower": records[0].get("cell_tower_location"),
                            "sample_record": records[0].get("cdr_id")
                        },
                        "confidence": 0.9,
                        "status": "ACTIVE"
                    })
                    alert_seq += 1

        # 2. Off-hours (00:00-05:00) calling clusters, per caller
        for caller_id, calls in night_calls_by_caller.items():
            if len(calls) < 3:
                continue
            rep = calls[0]
            times = sorted(c.get("timestamp") for c in calls if c.get("timestamp"))
            anomalies.append({
                "alert_id": f"ALT-TIME-{alert_seq:03d}",
                "entity_id": caller_id,
                "entity_type": "Person",
                "case_id": self._infer_case_id(caller_id),
                "alert_type": "TEMPORAL_OFF_HOURS_BURST",
                "severity": "MEDIUM",
                "reason": f"{len(calls)} call(s) recorded during off-hours (00:00-05:00)"
                          + (f", between {times[0]} and {times[-1]}." if times else "."),
                "supporting_evidence_id": rep.get("cdr_id"),
                "supporting_records": {
                    "call_count": len(calls),
                    "first_call": times[0] if times else None,
                    "last_call": times[-1] if times else None,
                    "cell_tower": rep.get("cell_tower_location"),
                    "cdr_id": rep.get("cdr_id")
                },
                "confidence": 0.85,
                "status": "ACTIVE"
            })
            alert_seq += 1

        return anomalies

cdr_anomaly_detector = CDRAnomalyDetector()