from __future__ import annotations

import argparse
import csv
import json
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.agents.identity_agent import IdentityAgent
else:
    from backend.agents.identity_agent import IdentityAgent


def _safe_str(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _parse_any_datetime(raw: Any) -> str | None:
    text = _safe_str(raw)
    if not text:
        return None

    # Direct ISO support, including trailing Z.
    if "T" in text or "-" in text:
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00")).isoformat()
        except ValueError:
            pass

    # Common C-CDA HL7 TS forms: YYYYMMDD, YYYYMMDDHHMM, YYYYMMDDHHMMSS(+/-ZZZZ).
    core = text
    suffix = ""
    if len(text) > 14 and text[14] in {"+", "-"}:
        core = text[:14]
        suffix = text[14:]
    if core.isdigit() and len(core) in {8, 12, 14}:
        fmt = {8: "%Y%m%d", 12: "%Y%m%d%H%M", 14: "%Y%m%d%H%M%S"}[len(core)]
        try:
            parsed = datetime.strptime(core, fmt).isoformat(timespec="seconds")
            return f"{parsed}{suffix}" if suffix else parsed
        except ValueError:
            pass

    # Fallback date-only.
    if len(text) >= 10:
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").isoformat(timespec="seconds")
        except ValueError:
            pass

    return None


def _extract_uuid_from_filename(path: Path) -> str | None:
    parts = path.stem.split("_")
    if not parts:
        return None
    tail = parts[-1]
    if len(tail) == 36 and tail.count("-") == 4:
        return tail.lower()
    return None


class TemporalEvolutionAgent:
    """
    Builds chronological patient evolution from CSV, C-CDA and FHIR sources.

    - Normalizes time from CSV START/STOP/DATE fields.
    - Normalizes time from C-CDA effectiveTime, low/high, time, author/time.
    - Normalizes time from FHIR effectiveDateTime, issued, onset[x], recordedDate,
      and period.start/end.
    """

    def __init__(self, data_root: str | Path = "data") -> None:
        self.data_root = Path(data_root)
        self.csv_dir = self.data_root / "csv"
        self.doc_dirs = {
            "ccda": self.data_root / "ccda",
            "fhir": self.data_root / "fhir",
            "fhir_dstu2": self.data_root / "fhir_dstu2",
            "fhir_stu3": self.data_root / "fhir_stu3",
        }
        self.ccda_ns = {"c": "urn:hl7-org:v3"}
        self.identity_agent = IdentityAgent(self.data_root)
        self._event_idx = 0

    def _next_event_id(self) -> str:
        self._event_idx += 1
        return f"ev_{self._event_idx:06d}"

    def _new_event(
        self,
        *,
        category: str,
        subtype: str,
        source_dataset: str,
        source_file: str,
        time_start: str | None,
        time_end: str | None = None,
        description: str | None = None,
        code: str | None = None,
        value: str | None = None,
        unit: str | None = None,
        flagged_abnormal: bool = False,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "event_id": self._next_event_id(),
            "category": category,
            "subtype": subtype,
            "time_start": time_start,
            "time_end": time_end,
            "description": description,
            "code": code,
            "value": value,
            "unit": unit,
            "flagged_abnormal": flagged_abnormal,
            "source_dataset": source_dataset,
            "source_file": source_file,
            "context": context or {},
        }

    def _load_csv_rows(self, filename: str) -> list[dict[str, str]]:
        path = self.csv_dir / filename
        if not path.exists():
            return []
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def _doc_paths_for_patient(self, patient_uuid: str | None) -> list[tuple[str, Path]]:
        if not patient_uuid:
            return []
        out: list[tuple[str, Path]] = []
        for dtype, folder in self.doc_dirs.items():
            for p in sorted(folder.glob(f"*{patient_uuid}*")):
                out.append((dtype, p))
        return out

    def _build_csv_events(self, patient_uuid: str | None) -> list[dict[str, Any]]:
        if not patient_uuid:
            return []
        pid = patient_uuid.lower()
        events: list[dict[str, Any]] = []

        def _filter_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
            return [r for r in rows if _safe_str(r.get("PATIENT")).lower() == pid]

        encounters = _filter_rows(self._load_csv_rows("encounters.csv"))
        for row in encounters:
            start = _parse_any_datetime(row.get("START"))
            end = _parse_any_datetime(row.get("STOP"))
            encounter_id = _safe_str(row.get("Id"))
            desc = _safe_str(row.get("DESCRIPTION"))
            reason = _safe_str(row.get("REASONDESCRIPTION"))
            code = _safe_str(row.get("CODE")) or None

            events.append(
                self._new_event(
                    category="admission_discharge",
                    subtype="encounter_cycle",
                    source_dataset="csv",
                    source_file="data/csv/encounters.csv",
                    time_start=start,
                    time_end=end,
                    description=desc or "Encounter",
                    code=code,
                    context={
                        "encounter_id": encounter_id,
                        "encounter_class": _safe_str(row.get("ENCOUNTERCLASS")) or None,
                        "provider_id": _safe_str(row.get("PROVIDER")) or None,
                        "organization_id": _safe_str(row.get("ORGANIZATION")) or None,
                        "payer_id": _safe_str(row.get("PAYER")) or None,
                        "reason": reason or None,
                    },
                )
            )
            if start:
                events.append(
                    self._new_event(
                        category="admission_discharge",
                        subtype="admission",
                        source_dataset="csv",
                        source_file="data/csv/encounters.csv",
                        time_start=start,
                        description=desc or "Encounter admission",
                        code=code,
                        context={"encounter_id": encounter_id},
                    )
                )
            if end:
                events.append(
                    self._new_event(
                        category="admission_discharge",
                        subtype="discharge",
                        source_dataset="csv",
                        source_file="data/csv/encounters.csv",
                        time_start=end,
                        description=desc or "Encounter discharge",
                        code=code,
                        context={"encounter_id": encounter_id},
                    )
                )

        conditions = _filter_rows(self._load_csv_rows("conditions.csv"))
        for row in conditions:
            start = _parse_any_datetime(row.get("START"))
            stop = _parse_any_datetime(row.get("STOP"))
            desc = _safe_str(row.get("DESCRIPTION")) or "Condition"
            code = _safe_str(row.get("CODE")) or None
            encounter_id = _safe_str(row.get("ENCOUNTER")) or None

            if start:
                events.append(
                    self._new_event(
                        category="diagnosis_onset",
                        subtype="diagnosis_start",
                        source_dataset="csv",
                        source_file="data/csv/conditions.csv",
                        time_start=start,
                        description=desc,
                        code=code,
                        context={"encounter_id": encounter_id},
                    )
                )
            if stop:
                events.append(
                    self._new_event(
                        category="diagnosis_onset",
                        subtype="diagnosis_resolved",
                        source_dataset="csv",
                        source_file="data/csv/conditions.csv",
                        time_start=stop,
                        description=desc,
                        code=code,
                        context={"encounter_id": encounter_id},
                    )
                )

        medications = _filter_rows(self._load_csv_rows("medications.csv"))
        med_by_name: dict[str, list[tuple[str, str | None]]] = defaultdict(list)
        for row in medications:
            start = _parse_any_datetime(row.get("START"))
            stop = _parse_any_datetime(row.get("STOP"))
            name = _safe_str(row.get("DESCRIPTION")) or "Medication"
            reason = _safe_str(row.get("REASONDESCRIPTION")) or None
            code = _safe_str(row.get("CODE")) or None
            if start:
                events.append(
                    self._new_event(
                        category="treatment_change",
                        subtype="medication_start",
                        source_dataset="csv",
                        source_file="data/csv/medications.csv",
                        time_start=start,
                        description=name,
                        code=code,
                        context={"reason": reason, "encounter_id": _safe_str(row.get("ENCOUNTER")) or None},
                    )
                )
                med_by_name[name].append((start, "start"))
            if stop:
                events.append(
                    self._new_event(
                        category="treatment_change",
                        subtype="medication_stop",
                        source_dataset="csv",
                        source_file="data/csv/medications.csv",
                        time_start=stop,
                        description=name,
                        code=code,
                        context={"reason": reason, "encounter_id": _safe_str(row.get("ENCOUNTER")) or None},
                    )
                )
                med_by_name[name].append((stop, "stop"))

        for med_name, points in med_by_name.items():
            starts = sorted([t for t, kind in points if kind == "start" and t])
            if len(starts) > 1:
                events.append(
                    self._new_event(
                        category="treatment_change",
                        subtype="medication_restart_or_change",
                        source_dataset="csv",
                        source_file="data/csv/medications.csv",
                        time_start=starts[-1],
                        description=med_name,
                        context={"starts_observed": len(starts)},
                    )
                )

        observations = _filter_rows(self._load_csv_rows("observations.csv"))
        for row in observations:
            t = _parse_any_datetime(row.get("DATE"))
            desc = _safe_str(row.get("DESCRIPTION")) or "Observation"
            value = _safe_str(row.get("VALUE")) or None
            unit = _safe_str(row.get("UNITS")) or None
            code = _safe_str(row.get("CODE")) or None
            events.append(
                self._new_event(
                    category="lab_trend",
                    subtype="observation",
                    source_dataset="csv",
                    source_file="data/csv/observations.csv",
                    time_start=t,
                    description=desc,
                    code=code,
                    value=value,
                    unit=unit,
                    context={"encounter_id": _safe_str(row.get("ENCOUNTER")) or None, "type": _safe_str(row.get("TYPE")) or None},
                )
            )

        procedures = _filter_rows(self._load_csv_rows("procedures.csv"))
        for row in procedures:
            t = _parse_any_datetime(row.get("DATE"))
            events.append(
                self._new_event(
                    category="treatment_change",
                    subtype="procedure",
                    source_dataset="csv",
                    source_file="data/csv/procedures.csv",
                    time_start=t,
                    description=_safe_str(row.get("DESCRIPTION")) or "Procedure",
                    code=_safe_str(row.get("CODE")) or None,
                    context={"reason": _safe_str(row.get("REASONDESCRIPTION")) or None},
                )
            )

        careplans = _filter_rows(self._load_csv_rows("careplans.csv"))
        for row in careplans:
            start = _parse_any_datetime(row.get("START"))
            stop = _parse_any_datetime(row.get("STOP"))
            events.append(
                self._new_event(
                    category="treatment_change",
                    subtype="careplan_cycle",
                    source_dataset="csv",
                    source_file="data/csv/careplans.csv",
                    time_start=start,
                    time_end=stop,
                    description=_safe_str(row.get("DESCRIPTION")) or "Care Plan",
                    code=_safe_str(row.get("CODE")) or None,
                )
            )

        immunizations = _filter_rows(self._load_csv_rows("immunizations.csv"))
        for row in immunizations:
            t = _parse_any_datetime(row.get("DATE"))
            events.append(
                self._new_event(
                    category="treatment_change",
                    subtype="immunization",
                    source_dataset="csv",
                    source_file="data/csv/immunizations.csv",
                    time_start=t,
                    description=_safe_str(row.get("DESCRIPTION")) or "Immunization",
                    code=_safe_str(row.get("CODE")) or None,
                )
            )

        return events

    def _build_ccda_events(self, ccda_paths: list[Path]) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        target_time_tags = {"effectiveTime", "low", "high", "time"}
        clinical_context_tags = {"encounter", "observation", "procedure", "substanceAdministration", "act", "organizer"}

        for path in ccda_paths:
            try:
                root = ET.parse(path).getroot()
            except ET.ParseError:
                continue

            parent_map = {child: parent for parent in root.iter() for child in parent}

            def local_tag(node: ET.Element) -> str:
                return node.tag.split("}", 1)[-1]

            def nearest_section_title(node: ET.Element) -> str | None:
                cur = node
                while cur in parent_map:
                    cur = parent_map[cur]
                    if local_tag(cur) == "section":
                        title = cur.find("c:title", self.ccda_ns)
                        if title is not None and title.text and title.text.strip():
                            return title.text.strip()
                        return None
                return None

            def nearest_clinical_context(node: ET.Element) -> ET.Element | None:
                cur = node
                while cur in parent_map:
                    cur = parent_map[cur]
                    if local_tag(cur) in clinical_context_tags:
                        return cur
                return None

            for node in root.iter():
                tag = local_tag(node)
                if tag not in target_time_tags:
                    continue
                raw_time = node.attrib.get("value")
                if not raw_time and node.text:
                    raw_time = node.text
                time_value = _parse_any_datetime(raw_time)
                if not time_value:
                    continue

                ctx = nearest_clinical_context(node)
                ctx_tag = local_tag(ctx) if ctx is not None else None
                code = None
                display = None
                if ctx is not None:
                    code_node = ctx.find("c:code", self.ccda_ns)
                    if code_node is not None:
                        code = _safe_str(code_node.attrib.get("code")) or None
                        display = _safe_str(code_node.attrib.get("displayName")) or None

                subtype = f"ccda_{tag}"
                if tag == "low":
                    subtype = "ccda_period_start"
                elif tag == "high":
                    subtype = "ccda_period_end"
                elif tag == "time":
                    subtype = "ccda_time"
                elif tag == "effectiveTime":
                    subtype = "ccda_effective_time"

                events.append(
                    self._new_event(
                        category="clinical_context_time",
                        subtype=subtype,
                        source_dataset="ccda",
                        source_file=str(path),
                        time_start=time_value,
                        description=display or ctx_tag or "C-CDA time point",
                        code=code,
                        context={
                            "section_title": nearest_section_title(node),
                            "context_tag": ctx_tag,
                            "time_tag": tag,
                            "raw_time": raw_time,
                        },
                    )
                )
        return events

    def _extract_fhir_times(self, resource: dict[str, Any]) -> list[tuple[str, str | None, str | None]]:
        out: list[tuple[str, str | None, str | None]] = []
        # Requested fields.
        if resource.get("effectiveDateTime"):
            out.append(("effectiveDateTime", _parse_any_datetime(resource.get("effectiveDateTime")), None))
        if resource.get("issued"):
            out.append(("issued", _parse_any_datetime(resource.get("issued")), None))
        if resource.get("recordedDate"):
            out.append(("recordedDate", _parse_any_datetime(resource.get("recordedDate")), None))
        if resource.get("onsetDateTime"):
            out.append(("onsetDateTime", _parse_any_datetime(resource.get("onsetDateTime")), None))
        if isinstance(resource.get("onsetPeriod"), dict):
            onset = resource["onsetPeriod"]
            out.append(("onsetPeriod", _parse_any_datetime(onset.get("start")), _parse_any_datetime(onset.get("end"))))
        if isinstance(resource.get("period"), dict):
            period = resource["period"]
            out.append(("period", _parse_any_datetime(period.get("start")), _parse_any_datetime(period.get("end"))))
        return [x for x in out if x[1] or x[2]]

    def _build_fhir_events(self, fhir_paths: list[tuple[str, Path]]) -> list[dict[str, Any]]:
        events: list[dict[str, Any]] = []
        abnormal_codes = {"H", "HH", "L", "LL", "A", "AA"}

        for dataset_type, path in fhir_paths:
            if path.suffix.lower() != ".json":
                continue
            try:
                bundle = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue

            for entry in bundle.get("entry", []):
                resource = entry.get("resource") or {}
                rtype = _safe_str(resource.get("resourceType")) or "Resource"
                rid = _safe_str(resource.get("id")) or None

                code_obj = resource.get("code") or {}
                coding = (code_obj.get("coding") or [{}])[0]
                code = _safe_str(coding.get("code")) or None
                display = (
                    _safe_str(code_obj.get("text"))
                    or _safe_str(coding.get("display"))
                    or _safe_str(resource.get("description"))
                    or rtype
                )

                # Core normalized times requested by the spec.
                points = self._extract_fhir_times(resource)

                # Some resources (Encounter) carry period in nested structures.
                if rtype == "Encounter" and not points:
                    period = resource.get("period") or {}
                    points = [("period", _parse_any_datetime(period.get("start")), _parse_any_datetime(period.get("end")))]

                is_abnormal = False
                if rtype == "Observation":
                    for interp in resource.get("interpretation", []) or []:
                        for c in interp.get("coding", []) or []:
                            if _safe_str(c.get("code")).upper() in abnormal_codes:
                                is_abnormal = True
                                break

                category = "clinical_context_time"
                subtype = f"{rtype.lower()}_time"
                if rtype == "Condition":
                    category = "diagnosis_onset"
                    subtype = "condition_event"
                elif rtype in {"MedicationRequest", "MedicationStatement", "MedicationAdministration"}:
                    category = "treatment_change"
                    subtype = "medication_event"
                elif rtype in {"Procedure", "CarePlan", "ServiceRequest"}:
                    category = "treatment_change"
                    subtype = f"{rtype.lower()}_event"
                elif rtype == "Encounter":
                    category = "admission_discharge"
                    subtype = "encounter_cycle"
                elif rtype == "Observation":
                    category = "lab_trend"
                    subtype = "observation"

                value = None
                unit = None
                if rtype == "Observation":
                    q = resource.get("valueQuantity") or {}
                    if q:
                        value = _safe_str(q.get("value")) or None
                        unit = _safe_str(q.get("unit")) or None
                    elif resource.get("valueString") is not None:
                        value = _safe_str(resource.get("valueString")) or None

                for label, t_start, t_end in points:
                    if not t_start and not t_end:
                        continue
                    events.append(
                        self._new_event(
                            category=category,
                            subtype=f"{subtype}:{label}",
                            source_dataset=dataset_type,
                            source_file=str(path),
                            time_start=t_start or t_end,
                            time_end=t_end if t_start else None,
                            description=display,
                            code=code,
                            value=value,
                            unit=unit,
                            flagged_abnormal=is_abnormal,
                            context={"resource_type": rtype, "resource_id": rid},
                        )
                    )
        return events

    def _build_export_events(self, identifier: str) -> list[dict[str, Any]]:
        """
        Optional enrichment from patients-export-*.csv when patient_id/MRN is used.
        """
        events: list[dict[str, Any]] = []
        exports = sorted(self.data_root.glob("patients-export-*.csv"), key=lambda p: p.stat().st_mtime)
        if not exports:
            return events
        export_path = exports[-1]

        with export_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle, delimiter=";")
            for row in reader:
                raw = row.get("patient_data")
                if not raw:
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                pid = _safe_str(payload.get("patient_id"))
                mrn = _safe_str(payload.get("medical_record_number"))
                if identifier not in {pid, mrn}:
                    continue

                for diag in payload.get("diagnoses", []) or []:
                    t = _parse_any_datetime(diag.get("date_diagnosed"))
                    if not t:
                        continue
                    events.append(
                        self._new_event(
                            category="diagnosis_onset",
                            subtype="diagnosis_start",
                            source_dataset="profile_export",
                            source_file=str(export_path),
                            time_start=t,
                            description=_safe_str(diag.get("condition")) or "Diagnosis",
                            code=_safe_str(diag.get("icd_code")) or None,
                            context={"status": _safe_str(diag.get("status")) or None},
                        )
                    )

                for med in payload.get("current_medications", []) or []:
                    t = _parse_any_datetime(med.get("prescribed_at"))
                    if not t:
                        continue
                    events.append(
                        self._new_event(
                            category="treatment_change",
                            subtype="medication_start",
                            source_dataset="profile_export",
                            source_file=str(export_path),
                            time_start=t,
                            description=_safe_str(med.get("name")) or "Medication",
                            context={"dosage": _safe_str(med.get("dosage")) or None},
                        )
                    )

                for lab in payload.get("lab_results", []) or []:
                    t = _parse_any_datetime(lab.get("date_performed"))
                    if not t:
                        continue
                    events.append(
                        self._new_event(
                            category="lab_trend",
                            subtype="observation",
                            source_dataset="profile_export",
                            source_file=str(export_path),
                            time_start=t,
                            description=_safe_str(lab.get("test_name")) or "Lab",
                            value=_safe_str(lab.get("result")) or None,
                            unit=_safe_str(lab.get("unit")) or None,
                            flagged_abnormal=bool(lab.get("flagged")),
                        )
                    )

                admission = _parse_any_datetime(payload.get("admission_date"))
                if admission:
                    events.append(
                        self._new_event(
                            category="admission_discharge",
                            subtype="admission",
                            source_dataset="profile_export",
                            source_file=str(export_path),
                            time_start=admission,
                            description="Admission date",
                        )
                    )
                break
        return events

    def _abnormal_lab_episodes(self, timeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
        lab_events = [e for e in timeline if e["category"] == "lab_trend" and e.get("time_start")]
        groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for e in lab_events:
            key = (e.get("description") or "unknown").strip().lower()
            groups[key].append(e)

        episodes: list[dict[str, Any]] = []
        for test, items in groups.items():
            items.sort(key=lambda x: x.get("time_start") or "")
            numeric = []
            abnormal_points = []
            for it in items:
                if it.get("flagged_abnormal"):
                    abnormal_points.append(it)
                try:
                    numeric.append((it["time_start"], float(str(it.get("value")))))
                except (TypeError, ValueError):
                    continue

            if abnormal_points:
                episodes.append(
                    {
                        "episode_type": "abnormal_lab_flag",
                        "test_name": items[0].get("description"),
                        "time_start": abnormal_points[0]["time_start"],
                        "time_end": abnormal_points[-1]["time_start"],
                        "event_ids": [x["event_id"] for x in abnormal_points],
                        "details": {"flags_count": len(abnormal_points)},
                    }
                )

            if len(numeric) >= 3:
                first_t, first_v = numeric[0]
                last_t, last_v = numeric[-1]
                if first_v != 0:
                    change_ratio = (last_v - first_v) / abs(first_v)
                    if abs(change_ratio) >= 0.2:
                        trend = "increasing" if change_ratio > 0 else "decreasing"
                        episodes.append(
                            {
                                "episode_type": "abnormal_lab_trend",
                                "test_name": items[0].get("description"),
                                "time_start": first_t,
                                "time_end": last_t,
                                "event_ids": [x["event_id"] for x in items],
                                "details": {
                                    "trend": trend,
                                    "relative_change": round(change_ratio, 3),
                                    "points": len(numeric),
                                },
                            }
                        )
        return episodes

    def _build_episodes(self, timeline: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        diagnosis_onset = [
            {
                "episode_type": "diagnosis_onset",
                "time_start": e.get("time_start"),
                "description": e.get("description"),
                "code": e.get("code"),
                "event_ids": [e.get("event_id")],
            }
            for e in timeline
            if e["category"] == "diagnosis_onset" and "start" in (e.get("subtype") or "")
        ]

        treatment_change = [
            {
                "episode_type": "treatment_change",
                "time_start": e.get("time_start"),
                "time_end": e.get("time_end"),
                "description": e.get("description"),
                "subtype": e.get("subtype"),
                "event_ids": [e.get("event_id")],
            }
            for e in timeline
            if e["category"] == "treatment_change"
            and any(k in (e.get("subtype") or "") for k in ["start", "stop", "change", "restart", "procedure", "careplan"])
        ]

        admission_discharge_cycles = [
            {
                "episode_type": "admission_discharge_cycle",
                "time_start": e.get("time_start"),
                "time_end": e.get("time_end"),
                "description": e.get("description"),
                "source_dataset": e.get("source_dataset"),
                "event_ids": [e.get("event_id")],
            }
            for e in timeline
            if e["category"] == "admission_discharge" and "cycle" in (e.get("subtype") or "")
        ]

        abnormal_lab_trend = self._abnormal_lab_episodes(timeline)

        return {
            "diagnosis_onset": diagnosis_onset,
            "treatment_change": treatment_change,
            "abnormal_lab_trend": abnormal_lab_trend,
            "admission_discharge_cycles": admission_discharge_cycles,
        }

    def build(self, identifier: str) -> dict[str, Any]:
        resolved = self.identity_agent.resolve_one(identifier)
        patient_uuid = resolved.csv_patient_uuid if resolved else None

        csv_events = self._build_csv_events(patient_uuid)
        doc_paths = self._doc_paths_for_patient(patient_uuid)
        ccda_paths = [p for dtype, p in doc_paths if dtype == "ccda"]
        fhir_paths = [(dtype, p) for dtype, p in doc_paths if dtype != "ccda"]
        ccda_events = self._build_ccda_events(ccda_paths)
        fhir_events = self._build_fhir_events(fhir_paths)
        export_events = self._build_export_events(identifier)

        timeline = csv_events + ccda_events + fhir_events + export_events
        timeline = [e for e in timeline if e.get("time_start")]
        timeline.sort(key=lambda e: (e.get("time_start") or "", e.get("event_id") or ""))

        episodes = self._build_episodes(timeline)

        return {
            "identity": resolved.to_dict() if resolved else None,
            "timeline": timeline,
            "episodes": episodes,
            "source_counts": {
                "csv_events": len(csv_events),
                "ccda_events": len(ccda_events),
                "fhir_events": len(fhir_events),
                "profile_export_events": len(export_events),
                "timeline_total": len(timeline),
                "diagnosis_onset_episodes": len(episodes["diagnosis_onset"]),
                "treatment_change_episodes": len(episodes["treatment_change"]),
                "abnormal_lab_trend_episodes": len(episodes["abnormal_lab_trend"]),
                "admission_discharge_cycle_episodes": len(episodes["admission_discharge_cycles"]),
            },
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build chronological clinical evolution across CSV, C-CDA and FHIR.")
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or medical_record_number.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional JSON output path.")
    args = parser.parse_args()

    agent = TemporalEvolutionAgent(args.data_root)
    evolution = agent.build(args.identifier)
    print(json.dumps(evolution, indent=2))

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(evolution, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
