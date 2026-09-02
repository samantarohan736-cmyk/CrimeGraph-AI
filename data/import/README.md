# Bulk Import Staging Folder

This folder is empty by default and **nothing here is loaded automatically**. Drop
CSV files matching the schemas below, then run:

```bash
python ai-engine/ingestion/master_pipeline.py
```

This loads structured records into PostgreSQL, writes entities and relationships into
the Neo4j knowledge graph, runs anomaly detection, and (re)computes Investigation
Priority Scores. It's safe to re-run — existing rows are matched by primary key and
skipped, so you can drop in new files incrementally as real feeds become available
(see the README's "Future Connectors" section).

Every file below is optional; the pipeline only processes files that exist.

| File                 | Required columns                              | Notes |
|-----------------------|------------------------------------------------|-------|
| `cases.csv`            | `case_id`, `title`                             | + `description`, `case_type`, `status`, `priority`, `lead_officer`, `date_registered` (`YYYY-MM-DD`), `incident_date`, `estimated_value` |
| `persons.csv`          | `person_id`, `name`                            | + `aliases`, `dob` (`YYYY-MM-DD`), `nationality`, `role`, `primary_location`, `risk_level` |
| `phones.csv`           | `phone_id`, `phone_number`                     | + `imei`, `imsi`, `telecom_circle`, `operator`, `registered_owner`, `is_burner` (`True`/`False`) |
| `vehicles.csv`         | `vehicle_id`, `plate_number`                   | + `make`, `model`, `color`, `vehicle_type`, `registered_owner` |
| `locations.csv`        | `location_id`, `name`                          | + `address`, `latitude`, `longitude`, `location_type` |
| `organizations.csv`    | `org_id`, `name`                               | + `registration_no`, `jurisdiction`, `org_type`, `flagged_status` |
| `relationships.csv`    | `rel_id`, `source_id`, `target_id`             | + `relationship_type`, `confidence` (0-1), `date`, `evidence_id`, `notes`. `source_id`/`target_id` must match IDs from the entity files above. This is what actually links entities together in the graph — an entity with no relationship row is an isolated node. |
| `cdr.csv`              | `cdr_id`, `caller_phone`, `receiver_phone`     | + `caller_id`, `receiver_id`, `timestamp` (`YYYY-MM-DD HH:MM:SS`), `duration_sec`, `cell_tower_location`, `call_type`, `flagged_status` |
| `transactions.csv`     | `tx_id`, `sender_name`, `amount`               | + `sender_id`, `receiver_id`, `receiver_name`, `currency`, `channel`, `bank_reference`, `timestamp`, `category`, `flagged_status`, `anomaly_multiplier` |
| `reports.csv`          | `report_id`, `title`, `filename`               | `filename` must reference a text file placed in this same folder. Runs NLP entity extraction on ingestion. + `case_id`, `source_agency`, `author`, `content_summary`, `classification` |
| `evidence.csv`         | `evidence_id`, `title`, `evidence_type`        | + `case_id`, `source_record`, `description`, `confidence` (0-1). Only rows you actually provide are catalogued — nothing is fabricated. |

Investigation Priority Scores and each person's associated cases are derived live from
the graph (via `relationships.csv`), not from a hardcoded mapping — so scoring reflects
whatever data you actually import.
