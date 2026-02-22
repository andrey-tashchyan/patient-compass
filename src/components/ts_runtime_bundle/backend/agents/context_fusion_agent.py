from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.agents.temporal_evolution_agent import TemporalEvolutionAgent
else:
    from backend.agents.temporal_evolution_agent import TemporalEvolutionAgent


def _s(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _dt(raw: Any) -> datetime | None:
    text = _s(raw)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            return parsed.astimezone().replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


class ContextFusionAgent:
    """
    Enriches timeline events with clinical context and explicit provenance:
    - encounter class/provider/facility/reason
    - related diagnosis, medication, lab, procedure
    - source_file/source_type/row-or-resource ids
    """

    def __init__(self, data_root: str | Path = "data") -> None:
        self.data_root = Path(data_root)
        self.csv_dir = self.data_root / "csv"
        self.temporal = TemporalEvolutionAgent(self.data_root)

    def _rows(self, filename: str) -> list[dict[str, str]]:
        path = self.csv_dir / filename
        if not path.exists():
            return []
        with path.open(newline="", encoding="utf-8") as h:
            return list(csv.DictReader(h))

    def _indexes(self, patient_uuid: str | None) -> dict[str, Any]:
        if not patient_uuid:
            return {
                "encounters": {},
                "providers": {},
                "organizations": {},
                "conditions": [],
                "medications": [],
                "labs": [],
                "procedures": [],
            }
        pid = patient_uuid.lower()

        providers = {r["Id"]: r for r in self._rows("providers.csv") if _s(r.get("Id"))}
        orgs = {r["Id"]: r for r in self._rows("organizations.csv") if _s(r.get("Id"))}

        encounters = {}
        for r in self._rows("encounters.csv"):
            if _s(r.get("PATIENT")).lower() != pid:
                continue
            rid = _s(r.get("Id"))
            if rid:
                encounters[rid] = r

        conditions = []
        for r in self._rows("conditions.csv"):
            if _s(r.get("PATIENT")).lower() != pid:
                continue
            conditions.append(
                {
                    "description": _s(r.get("DESCRIPTION")) or "Condition",
                    "code": _s(r.get("CODE")) or None,
                    "start": _dt(r.get("START")),
                    "stop": _dt(r.get("STOP")),
                    "encounter_id": _s(r.get("ENCOUNTER")) or None,
                }
            )

        medications = []
        for r in self._rows("medications.csv"):
            if _s(r.get("PATIENT")).lower() != pid:
                continue
            medications.append(
                {
                    "description": _s(r.get("DESCRIPTION")) or "Medication",
                    "code": _s(r.get("CODE")) or None,
                    "start": _dt(r.get("START")),
                    "stop": _dt(r.get("STOP")),
                    "encounter_id": _s(r.get("ENCOUNTER")) or None,
                    "reason_code": _s(r.get("REASONCODE")) or None,
                    "reason_description": _s(r.get("REASONDESCRIPTION")) or None,
                }
            )

        labs = []
        for r in self._rows("observations.csv"):
            if _s(r.get("PATIENT")).lower() != pid:
                continue
            labs.append(
                {
                    "description": _s(r.get("DESCRIPTION")) or "Observation",
                    "code": _s(r.get("CODE")) or None,
                    "date": _dt(r.get("DATE")),
                    "value": _s(r.get("VALUE")) or None,
                    "units": _s(r.get("UNITS")) or None,
                    "encounter_id": _s(r.get("ENCOUNTER")) or None,
                }
            )

        procedures = []
        for r in self._rows("procedures.csv"):
            if _s(r.get("PATIENT")).lower() != pid:
                continue
            procedures.append(
                {
                    "description": _s(r.get("DESCRIPTION")) or "Procedure",
                    "code": _s(r.get("CODE")) or None,
                    "date": _dt(r.get("DATE")),
                    "encounter_id": _s(r.get("ENCOUNTER")) or None,
                    "reason_code": _s(r.get("REASONCODE")) or None,
                    "reason_description": _s(r.get("REASONDESCRIPTION")) or None,
                }
            )

        return {
            "encounters": encounters,
            "providers": providers,
            "organizations": orgs,
            "conditions": conditions,
            "medications": medications,
            "labs": labs,
            "procedures": procedures,
        }

    def _encounter_for_event(self, event_dt: datetime | None, event: dict[str, Any], idx: dict[str, Any]) -> dict[str, str] | None:
        eid = _s((event.get("context") or {}).get("encounter_id"))
        if eid and eid in idx["encounters"]:
            return idx["encounters"][eid]
        if event_dt is None:
            return None
        # Try range containment first.
        for enc in idx["encounters"].values():
            st = _dt(enc.get("START"))
            sp = _dt(enc.get("STOP"))
            if st and sp and st <= event_dt <= sp:
                return enc
        # Fallback nearest start date.
        nearest = None
        best_delta = None
        for enc in idx["encounters"].values():
            st = _dt(enc.get("START"))
            if not st:
                continue
            delta = abs((event_dt - st).total_seconds())
            if best_delta is None or delta < best_delta:
                best_delta = delta
                nearest = enc
        return nearest

    def _active_in_window(self, item_start: datetime | None, item_stop: datetime | None, t: datetime | None) -> bool:
        if t is None:
            return False
        if item_start and t < item_start:
            return False
        if item_stop and t > item_stop:
            return False
        return item_start is not None

    def _nearby(self, source_time: datetime | None, target_time: datetime | None, days: int = 7) -> bool:
        if source_time is None or target_time is None:
            return False
        return abs(source_time - target_time) <= timedelta(days=days)

    def _related_context(self, event: dict[str, Any], event_dt: datetime | None, idx: dict[str, Any]) -> dict[str, Any]:
        encounter = self._encounter_for_event(event_dt, event, idx)

        provider_name = None
        facility_name = None
        encounter_class = None
        reason_code = None
        reason_description = None
        encounter_id = None
        if encounter:
            encounter_id = _s(encounter.get("Id")) or None
            encounter_class = _s(encounter.get("ENCOUNTERCLASS")) or None
            reason_code = _s(encounter.get("REASONCODE")) or None
            reason_description = _s(encounter.get("REASONDESCRIPTION")) or None
            prov_id = _s(encounter.get("PROVIDER"))
            org_id = _s(encounter.get("ORGANIZATION"))
            provider_name = _s((idx["providers"].get(prov_id) or {}).get("NAME")) or None
            facility_name = _s((idx["organizations"].get(org_id) or {}).get("NAME")) or None

        related_diagnosis = [
            {"condition": c["description"], "code": c["code"]}
            for c in idx["conditions"]
            if self._active_in_window(c["start"], c["stop"], event_dt)
            or (encounter_id and c.get("encounter_id") == encounter_id)
        ][:6]
        related_medication = [
            {"medication": m["description"], "code": m["code"]}
            for m in idx["medications"]
            if self._active_in_window(m["start"], m["stop"], event_dt)
            or (encounter_id and m.get("encounter_id") == encounter_id)
        ][:6]
        related_lab = [
            {"lab": l["description"], "code": l["code"], "value": l["value"], "units": l["units"]}
            for l in idx["labs"]
            if (encounter_id and l.get("encounter_id") == encounter_id) or self._nearby(l.get("date"), event_dt, days=7)
        ][:8]
        related_procedure = [
            {"procedure": p["description"], "code": p["code"]}
            for p in idx["procedures"]
            if (encounter_id and p.get("encounter_id") == encounter_id) or self._nearby(p.get("date"), event_dt, days=7)
        ][:6]

        return {
            "encounter_id": encounter_id,
            "encounter_class": encounter_class,
            "provider": provider_name,
            "facility": facility_name,
            "reason_code": reason_code,
            "reason_description": reason_description,
            "related_diagnosis": related_diagnosis,
            "related_medication": related_medication,
            "related_lab": related_lab,
            "related_procedure": related_procedure,
        }

    def _provenance(self, event: dict[str, Any]) -> dict[str, Any]:
        ctx = event.get("context") or {}
        return {
            "source_file": event.get("source_file"),
            "source_type": event.get("source_dataset"),
            "event_id": event.get("event_id"),
            "row_or_resource_id": ctx.get("resource_id") or ctx.get("encounter_id"),
            "resource_type": ctx.get("resource_type"),
        }

    def build(self, identifier: str) -> dict[str, Any]:
        temporal = self.temporal.build(identifier)
        identity = temporal.get("identity")
        patient_uuid = (identity or {}).get("csv_patient_uuid")
        idx = self._indexes(patient_uuid)

        fused = []
        for e in temporal.get("timeline", []):
            e_dt = _dt(e.get("time_start"))
            enriched = dict(e)
            enriched["clinical_context"] = self._related_context(e, e_dt, idx)
            enriched["provenance"] = self._provenance(e)
            fused.append(enriched)

        return {
            "identity": identity,
            "timeline": fused,
            "episodes": temporal.get("episodes", {}),
            "source_counts": {
                "input_timeline_events": len(temporal.get("timeline", [])),
                "fused_timeline_events": len(fused),
            },
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich timeline events with clinical context and provenance.")
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or MRN.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional JSON output path.")
    args = parser.parse_args()

    agent = ContextFusionAgent(args.data_root)
    payload = agent.build(args.identifier)
    print(json.dumps(payload, indent=2))

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
