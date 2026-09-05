import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional


class CDRAnomalyDetector:
    """
    Communication Spike & Night-Calling Anomaly Detector.
    Detects sudden increases in call frequency and off-hours calling clusters purely
    from the CDR records actually passed in.

    Fixes applied:
    - Alert IDs now use UUID (no sequential counter resets → no DB collision on re-run)
    - Baseline fallback: if all data falls inside the baseline window (small/demo datasets),
      the detector uses the caller's own global mean as the baseline instead of skipping.
    - Night-call threshold is configurable via constructor.
    """

    def __init__(
        self,
        spike_percentage_threshold: float = 200.0,
        baseline_window_days: int = 7,
        night_call_min_count: int = 3,
        night_start_hour: int = 0,
        night_end_hour: int = 5,
    ):
        self.spike_threshold = spike_percentage_threshold
        self.baseline_window_days = baseline_window_days
        self.night_call_min_count = night_call_min_count
        self.night_start_hour = night_start_hour
        self.night_end_hour = night_end_hour

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

            if self.night_start_hour <= dt.hour <= self.night_end_hour:
                night_calls_by_caller.setdefault(caller_id, []).append(record)

        # Baseline cutoff: derived from the data's own date range.
        baseline_cutoff = None
        if all_dates:
            baseline_cutoff = (
                max(all_dates) - timedelta(days=self.baseline_window_days)
            ).strftime("%Y-%m-%d")

        # ── 1. Communication spike detection ────────────────────────────────
        for caller_id, days in caller_daily_counts.items():
            pre_baseline_counts = [
                len(records)
                for day, records in days.items()
                if baseline_cutoff is None or day < baseline_cutoff
            ]

            # FIX: If all data is within the window (small/demo dataset),
            # fall back to the caller's own global mean across all days.
            if not pre_baseline_counts:
                all_counts = [len(r) for r in days.values()]
                if len(all_counts) < 2:
                    # Only 1 day of data — nothing to compare against, skip.
                    continue
                avg_baseline = sum(all_counts) / len(all_counts)
            else:
                avg_baseline = sum(pre_baseline_counts) / len(pre_baseline_counts)

            if avg_baseline <= 0:
                continue

            for day, records in days.items():
                # In fallback mode (no pre_baseline_counts), evaluate all days.
                if pre_baseline_counts and baseline_cutoff and day < baseline_cutoff:
                    continue
                count = len(records)
                spike_pct = ((count - avg_baseline) / avg_baseline) * 100.0
                if spike_pct >= self.spike_threshold and count >= 5:
                    anomalies.append({
                        # FIX: UUID-based ID — no collision on re-run
                        "alert_id": f"ALT-CDR-{uuid.uuid4().hex[:10].upper()}",
                        "entity_id": caller_id,
                        "entity_type": "Person",
                        "case_id": self._infer_case_id(caller_id),
                        "alert_type": "COMMUNICATION_SPIKE",
                        "severity": "HIGH" if spike_pct > 350 else "MEDIUM",
                        "reason": (
                            f"Call frequency increased by {int(spike_pct)}% over recent baseline on {day} "
                            f"({count} calls vs. average of {avg_baseline:.1f})."
                        ),
                        "supporting_evidence_id": None,
                        "supporting_records": {
                            "date": day,
                            "daily_call_count": count,
                            "baseline_avg": round(avg_baseline, 1),
                            "increase_pct": f"{int(spike_pct)}%",
                            "cell_tower": records[0].get("cell_tower_location"),
                            "sample_record": records[0].get("cdr_id"),
                        },
                        "confidence": 0.9,
                        "status": "ACTIVE",
                    })

        # ── 2. Off-hours (night) calling cluster detection ───────────────────
        for caller_id, calls in night_calls_by_caller.items():
            if len(calls) < self.night_call_min_count:
                continue
            rep = calls[0]
            times = sorted(c.get("timestamp") for c in calls if c.get("timestamp"))
            anomalies.append({
                # FIX: UUID-based ID
                "alert_id": f"ALT-TIME-{uuid.uuid4().hex[:10].upper()}",
                "entity_id": caller_id,
                "entity_type": "Person",
                "case_id": self._infer_case_id(caller_id),
                "alert_type": "TEMPORAL_OFF_HOURS_BURST",
                "severity": "MEDIUM",
                "reason": (
                    f"{len(calls)} call(s) recorded during off-hours "
                    f"({self.night_start_hour:02d}:00–{self.night_end_hour:02d}:59)"
                    + (f", between {times[0]} and {times[-1]}." if times else ".")
                ),
                "supporting_evidence_id": None,
                "supporting_records": {
                    "call_count": len(calls),
                    "first_call": times[0] if times else None,
                    "last_call": times[-1] if times else None,
                    "cell_tower": rep.get("cell_tower_location"),
                    "cdr_id": rep.get("cdr_id"),
                },
                "confidence": 0.85,
                "status": "ACTIVE",
            })

        return anomalies


cdr_anomaly_detector = CDRAnomalyDetector()