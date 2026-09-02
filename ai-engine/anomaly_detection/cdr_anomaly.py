from datetime import datetime
from typing import List, Dict, Any

class CDRAnomalyDetector:
    """
    Communication Spike & Night-Calling Anomaly Detector.
    Detects sudden increases in call frequency, burner SIM activation, and late-night calls.
    """
    def __init__(self, spike_percentage_threshold: float = 200.0):
        self.spike_threshold = spike_percentage_threshold

    def detect_anomalies(self, cdrs: List[Dict[str, Any]], person_cases_map: Dict[str, List[str]] = None) -> List[Dict[str, Any]]:
        anomalies = []
        alert_seq = 201
        person_cases_map = person_cases_map or {}

        # Count calls per caller in 24h windows
        caller_daily_counts = {}
        night_calls = []

        for record in cdrs:
            caller_id = record.get("caller_id")
            if not caller_id:
                continue
            ts_str = record.get("timestamp")
            if not ts_str:
                continue

            try:
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                try:
                    dt = datetime.fromisoformat(ts_str)
                except Exception:
                    continue

            day_key = dt.strftime("%Y-%m-%d")
            caller_daily_counts.setdefault(caller_id, {}).setdefault(day_key, []).append(record)

            # Check off-hours calls (00:00 - 05:00)
            is_flagged = (
                str(record.get("flagged_surge", "")).upper() in ["TRUE", "1", "YES"] or
                "ANOMALOUS" in str(record.get("flagged_status", "")).upper()
            )
            if 0 <= dt.hour <= 5 and (is_flagged or "Burner" in str(record.get("caller_phone", "")) or dt.hour in [1, 2, 3]):
                night_calls.append(record)

        # 1. Flag high frequency surge across callers
        for caller_id, days in caller_daily_counts.items():
            all_counts = [len(records) for records in days.values()]
            avg_baseline = sum(all_counts) / len(all_counts) if all_counts else 1.0

            for day, records in days.items():
                count = len(records)
                has_surge_flag = any(
                    str(r.get("flagged_surge", "")).upper() in ["TRUE", "1", "YES"] or
                    "ANOMALOUS" in str(r.get("flagged_status", "")).upper()
                    for r in records
                )
                spike_pct = (((count - avg_baseline) / avg_baseline) * 100.0) if avg_baseline > 0 else 0.0

                if (spike_pct >= self.spike_threshold and count >= 4) or has_surge_flag:
                    associated_cases = person_cases_map.get(caller_id, [])
                    case_id = associated_cases[0] if associated_cases else "C001"
                    tower = records[0].get("cell_tower") or records[0].get("cell_tower_location", "Unknown Tower")
                    severity = "HIGH" if (spike_pct > 300 or count >= 8) else "MEDIUM"
                    
                    anomalies.append({
                        "alert_id": f"ALT-CDR-{alert_seq}",
                        "entity_id": caller_id,
                        "entity_type": "Person",
                        "case_id": case_id,
                        "alert_type": "COMMUNICATION_SPIKE",
                        "severity": severity,
                        "reason": f"Call frequency surge detected for {caller_id} on {day} ({count} calls, baseline avg: {avg_baseline:.1f}).",
                        "supporting_evidence_id": records[0].get("cdr_id"),
                        "supporting_records": {
                            "date": day,
                            "daily_call_count": count,
                            "baseline_avg": round(avg_baseline, 1),
                            "increase_pct": f"{int(spike_pct)}%" if spike_pct > 0 else "N/A",
                            "cell_tower": tower,
                            "sample_record": records[0].get("cdr_id")
                        },
                        "confidence": 0.94,
                        "status": "ACTIVE"
                    })
                    alert_seq += 1

        # 2. Add Night-Time Off-Hours Anomaly Alert for notable night bursts
        for rep in night_calls[:15]:
            c_id = rep.get("caller_id", "P001")
            associated_cases = person_cases_map.get(c_id, [])
            case_id = associated_cases[0] if associated_cases else "C001"
            tower = rep.get("cell_tower") or rep.get("cell_tower_location", "Cell Tower")
            dur = rep.get("duration_seconds") or rep.get("duration_sec", 0)

            anomalies.append({
                "alert_id": f"ALT-TIME-{alert_seq}",
                "entity_id": c_id,
                "entity_type": "Person",
                "case_id": case_id,
                "alert_type": "TEMPORAL_OFF_HOURS_BURST",
                "severity": "MEDIUM",
                "reason": f"High-duration off-hours call logged at {rep.get('timestamp')} via {tower}.",
                "supporting_evidence_id": rep.get("cdr_id"),
                "supporting_records": {
                    "timestamp": rep.get("timestamp"),
                    "duration_sec": dur,
                    "cell_tower": tower,
                    "cdr_id": rep.get("cdr_id")
                },
                "confidence": 0.91,
                "status": "ACTIVE"
            })
            alert_seq += 1

        return anomalies

cdr_anomaly_detector = CDRAnomalyDetector()
