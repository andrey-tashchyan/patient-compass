from __future__ import annotations

import argparse
import csv
import json
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import asdict
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.agents.identity_agent import IdentityAgent
    from backend.models import (
        Allergy,
        AllergyStatus,
        ContactInfo,
        Diagnosis,
        DiagnosticTest,
        Gender,
        ImagingStudy,
        Insurance,
        LabResult,
        Medication,
        Patient,
        VitalSigns,
    )
else:
    from backend.agents.identity_agent import IdentityAgent
    from backend.models import (
        Allergy,
        AllergyStatus,
        ContactInfo,
        Diagnosis,
        DiagnosticTest,
        Gender,
        ImagingStudy,
        Insurance,
        LabResult,
        Medication,
        Patient,
        VitalSigns,
    )


def _safe_float(value: Any) -> float | None:
    raw = str(value).strip() if value is not None else ""
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _safe_int(value: Any) -> int | None:
    num = _safe_float(value)
    if num is None:
        return None
    return int(round(num))


def _parse_date(raw: Any) -> date | None:
    text = str(raw).strip() if raw is not None else ""
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y%m%d", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    if len(text) >= 10:
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def _parse_datetime(raw: Any) -> datetime | None:
    text = str(raw).strip() if raw is not None else ""
    if not text:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _enum_gender(value: Any) -> Gender:
    raw = str(value).strip().upper() if value is not None else ""
    if raw in {"M", "MALE"}:
        return Gender.MALE
    if raw in {"F", "FEMALE"}:
        return Gender.FEMALE
    return Gender.OTHER


def _enum_allergy_status(value: Any) -> AllergyStatus:
    raw = str(value).strip().upper() if value is not None else ""
    if raw == "SUSPECTED":
        return AllergyStatus.SUSPECTED
    if raw == "DENIED":
        return AllergyStatus.DENIED
    return AllergyStatus.CONFIRMED


def _as_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_as_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _as_jsonable(v) for k, v in value.items()}
    return value


def _hl7_to_date(raw: str | None) -> date | None:
    if not raw:
        return None
    ts = raw.strip()
    if not ts:
        return None
    core = ts[:14]
    if len(core) >= 14 and core[:14].isdigit():
        return _parse_date(core[:14])
    if len(core) >= 8 and core[:8].isdigit():
        return _parse_date(core[:8])
    return None


class ProfileBuilderAgent:
    """Builds a patient profile from CSV + FHIR + C-CDA sources."""

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

    def _load_csv_rows(self, filename: str) -> list[dict[str, str]]:
        path = self.csv_dir / filename
        if not path.exists():
            return []
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def _profile_export_payload(self, identifier: str) -> tuple[dict[str, Any] | None, str | None]:
        candidates = sorted(self.data_root.glob("patients-export-*.csv"), key=lambda p: p.stat().st_mtime)
        if not candidates:
            return (None, None)
        export_path = candidates[-1]
        with export_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle, delimiter=";")
            for row in reader:
                payload_raw = row.get("patient_data")
                if not payload_raw:
                    continue
                try:
                    payload = json.loads(payload_raw)
                except json.JSONDecodeError:
                    continue
                if (
                    identifier == str(payload.get("patient_id", "")).strip()
                    or identifier == str(payload.get("medical_record_number", "")).strip()
                ):
                    return (payload, row.get("created_at"))
        return (None, None)

    def _matching_doc_paths(self, csv_patient_uuid: str | None) -> list[Path]:
        if not csv_patient_uuid:
            return []
        paths: list[Path] = []
        for folder in self.doc_dirs.values():
            paths.extend(sorted(folder.glob(f"*{csv_patient_uuid}*")))
        return paths

    def _obs_to_vital_field(self, description: str) -> str | None:
        d = description.lower()
        if "systolic blood pressure" in d:
            return "blood_pressure_systolic"
        if "diastolic blood pressure" in d:
            return "blood_pressure_diastolic"
        if "heart rate" in d or "pulse" in d:
            return "heart_rate"
        if "body temperature" in d or "temperature" in d:
            return "temperature_fahrenheit"
        if "body mass index" in d or d == "bmi":
            return "bmi"
        return None

    def _build_vitals_from_csv_observations(self, observations: list[dict[str, str]]) -> list[VitalSigns]:
        grouped: dict[str, VitalSigns] = {}
        for row in observations:
            desc = str(row.get("DESCRIPTION", "")).strip()
            field = self._obs_to_vital_field(desc)
            if not field:
                continue
            obs_date = str(row.get("DATE", "")).strip()
            key = obs_date or "unknown"
            vital = grouped.get(key)
            if vital is None:
                vital = VitalSigns(measurement_date=_parse_datetime(obs_date))
                grouped[key] = vital
            if field in {"blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate"}:
                setattr(vital, field, _safe_int(row.get("VALUE")))
            else:
                setattr(vital, field, _safe_float(row.get("VALUE")))
        return [grouped[k] for k in sorted(grouped.keys())]

    def _build_labs_from_csv_observations(self, observations: list[dict[str, str]]) -> list[LabResult]:
        labs: list[LabResult] = []
        for row in observations:
            desc = str(row.get("DESCRIPTION", "")).strip()
            if self._obs_to_vital_field(desc):
                continue
            value = str(row.get("VALUE", "")).strip()
            if not desc and not value:
                continue
            labs.append(
                LabResult(
                    test_name=desc or "Observation",
                    result=value,
                    unit=str(row.get("UNITS", "")).strip(),
                    reference_range="",
                    flagged=False,
                    date_performed=_parse_date(row.get("DATE")),
                )
            )
        return labs

    def _build_labs_and_vitals_from_fhir(self, paths: list[Path]) -> tuple[list[LabResult], list[VitalSigns]]:
        labs: list[LabResult] = []
        vitals_by_day: dict[str, VitalSigns] = {}
        for path in paths:
            if not path.suffix.lower().endswith("json"):
                continue
            try:
                bundle = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            for entry in bundle.get("entry", []):
                resource = entry.get("resource") or {}
                rtype = resource.get("resourceType")
                if rtype != "Observation":
                    continue
                code = resource.get("code") or {}
                coding = (code.get("coding") or [{}])[0]
                description = (
                    str(code.get("text") or "").strip()
                    or str(coding.get("display") or "").strip()
                    or str(coding.get("code") or "").strip()
                    or "Observation"
                )
                effective = resource.get("effectiveDateTime") or resource.get("issued") or ""
                field = self._obs_to_vital_field(description)
                value_q = resource.get("valueQuantity") or {}
                value_str = resource.get("valueString")
                value_num = value_q.get("value")
                unit = str(value_q.get("unit") or "")
                day_key = str(effective)[:10] if effective else "unknown"

                if field:
                    vital = vitals_by_day.get(day_key)
                    if vital is None:
                        vital = VitalSigns(measurement_date=_parse_datetime(effective))
                        vitals_by_day[day_key] = vital
                    if field in {"blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate"}:
                        setattr(vital, field, _safe_int(value_num))
                    else:
                        setattr(vital, field, _safe_float(value_num))
                    continue

                result = str(value_str if value_str is not None else value_num if value_num is not None else "").strip()
                labs.append(
                    LabResult(
                        test_name=description,
                        result=result,
                        unit=unit,
                        reference_range="",
                        flagged=False,
                        date_performed=_parse_date(effective),
                    )
                )
        return (labs, [vitals_by_day[k] for k in sorted(vitals_by_day.keys())])

    def _build_labs_and_vitals_from_ccda(self, paths: list[Path]) -> tuple[list[LabResult], list[VitalSigns]]:
        labs: list[LabResult] = []
        vitals_by_day: dict[str, VitalSigns] = {}
        for path in paths:
            if not path.suffix.lower().endswith("xml"):
                continue
            try:
                root = ET.parse(path).getroot()
            except ET.ParseError:
                continue

            sections = root.findall(".//c:section", self.ccda_ns)
            for section in sections:
                title_node = section.find("c:title", self.ccda_ns)
                title = (title_node.text or "").strip().lower() if title_node is not None and title_node.text else ""
                if "result" not in title and "vital" not in title:
                    continue
                for obs in section.findall(".//c:observation", self.ccda_ns):
                    code_node = obs.find("c:code", self.ccda_ns)
                    display = code_node.attrib.get("displayName") if code_node is not None else None
                    value_node = obs.find("c:value", self.ccda_ns)
                    if value_node is None:
                        continue
                    test_name = (display or "Observation").strip()
                    value = str(value_node.attrib.get("value") or "").strip()
                    unit = str(value_node.attrib.get("unit") or "").strip()
                    effective_node = obs.find("c:effectiveTime", self.ccda_ns)
                    date_performed = _hl7_to_date(effective_node.attrib.get("value") if effective_node is not None else None)

                    vital_field = self._obs_to_vital_field(test_name)
                    if vital_field:
                        day_key = date_performed.isoformat() if date_performed else "unknown"
                        vital = vitals_by_day.get(day_key)
                        if vital is None:
                            vital = VitalSigns(
                                measurement_date=datetime.combine(date_performed, datetime.min.time())
                                if date_performed
                                else None
                            )
                            vitals_by_day[day_key] = vital
                        if vital_field in {"blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate"}:
                            setattr(vital, vital_field, _safe_int(value))
                        else:
                            setattr(vital, vital_field, _safe_float(value))
                        continue

                    labs.append(
                        LabResult(
                            test_name=test_name,
                            result=value,
                            unit=unit,
                            reference_range="",
                            flagged=False,
                            date_performed=date_performed,
                        )
                    )
        return (labs, [vitals_by_day[k] for k in sorted(vitals_by_day.keys())])

    def _build_imaging_from_csv(self, rows: list[dict[str, str]]) -> list[ImagingStudy]:
        studies: list[ImagingStudy] = []
        for row in rows:
            studies.append(
                ImagingStudy(
                    study_type=str(row.get("MODALITY_DESCRIPTION") or "Imaging Study").strip(),
                    body_part=str(row.get("BODYSITE_DESCRIPTION") or "Unknown").strip(),
                    findings=str(row.get("SOP_DESCRIPTION") or "").strip(),
                    impression=str(row.get("SOP_DESCRIPTION") or "").strip(),
                    date_performed=_parse_date(row.get("DATE")) or date(1900, 1, 1),
                    radiologist=None,
                )
            )
        return studies

    def _build_imaging_and_diagnostics_from_fhir(self, paths: list[Path]) -> tuple[list[ImagingStudy], list[DiagnosticTest]]:
        imaging: list[ImagingStudy] = []
        tests: list[DiagnosticTest] = []
        for path in paths:
            if not path.suffix.lower().endswith("json"):
                continue
            try:
                bundle = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            for entry in bundle.get("entry", []):
                resource = entry.get("resource") or {}
                rtype = resource.get("resourceType")
                if rtype == "DiagnosticReport":
                    code = resource.get("code") or {}
                    coding = (code.get("coding") or [{}])[0]
                    test_type = (
                        str(code.get("text") or "").strip()
                        or str(coding.get("display") or "").strip()
                        or "Diagnostic Report"
                    )
                    findings = str(resource.get("conclusion") or "").strip()
                    interpretation = str(resource.get("status") or "").strip() or "unknown"
                    tests.append(
                        DiagnosticTest(
                            test_type=test_type,
                            date_performed=_parse_date(resource.get("effectiveDateTime") or resource.get("issued")) or date(1900, 1, 1),
                            findings=findings,
                            interpretation=interpretation,
                            ordered_by=None,
                        )
                    )
                elif rtype == "ImagingStudy":
                    series = resource.get("series") or []
                    first_series = series[0] if series else {}
                    body_part = ((first_series.get("bodySite") or {}).get("display") or "Unknown").strip()
                    modality = ((first_series.get("modality") or {}).get("display") or "Imaging Study").strip()
                    imaging.append(
                        ImagingStudy(
                            study_type=str(resource.get("description") or modality or "Imaging Study").strip(),
                            body_part=body_part,
                            findings=str(resource.get("reasonDescription") or "").strip(),
                            impression=str(resource.get("status") or "").strip(),
                            date_performed=_parse_date(resource.get("started")) or date(1900, 1, 1),
                            radiologist=None,
                        )
                    )
        return (imaging, tests)

    def build(self, identifier: str) -> dict[str, Any]:
        resolved = self.identity_agent.resolve_one(identifier)
        export_payload, export_created_at = self._profile_export_payload(identifier)

        csv_uuid = resolved.csv_patient_uuid if resolved else None
        stable_patient_id = (resolved.stable_patient_id if resolved else None) or (
            str(export_payload.get("patient_id")) if export_payload else None
        )
        mrn = (resolved.medical_record_number if resolved else None) or (
            str(export_payload.get("medical_record_number")) if export_payload else None
        )

        patients_rows = self._load_csv_rows("patients.csv")
        patient_row = next((r for r in patients_rows if str(r.get("Id", "")).strip().lower() == str(csv_uuid or "").lower()), None)

        first_name = (
            (patient_row or {}).get("FIRST")
            or (resolved.first_name if resolved else None)
            or (export_payload.get("first_name") if export_payload else None)
            or "Unknown"
        )
        last_name = (
            (patient_row or {}).get("LAST")
            or (resolved.last_name if resolved else None)
            or (export_payload.get("last_name") if export_payload else None)
            or "Unknown"
        )
        dob = (
            (patient_row or {}).get("BIRTHDATE")
            or (resolved.date_of_birth if resolved else None)
            or (export_payload.get("date_of_birth") if export_payload else None)
        )
        gender = (
            (patient_row or {}).get("GENDER")
            or (resolved.gender if resolved else None)
            or (export_payload.get("gender") if export_payload else None)
        )

        contact = ContactInfo(
            phone=str((export_payload or {}).get("contact_info", {}).get("phone") or ""),
            address=(
                str((export_payload or {}).get("contact_info", {}).get("address") or "").strip()
                or (
                    " ".join(
                        [
                            str((patient_row or {}).get("ADDRESS") or "").strip(),
                            str((patient_row or {}).get("CITY") or "").strip(),
                            str((patient_row or {}).get("STATE") or "").strip(),
                            str((patient_row or {}).get("ZIP") or "").strip(),
                        ]
                    ).strip()
                )
            ),
            emergency_contact_name=str((export_payload or {}).get("contact_info", {}).get("emergency_contact_name") or ""),
            emergency_contact_relation=str((export_payload or {}).get("contact_info", {}).get("emergency_contact_relation") or ""),
            emergency_contact_phone=str((export_payload or {}).get("contact_info", {}).get("emergency_contact_phone") or "") or None,
        )

        encounters = [r for r in self._load_csv_rows("encounters.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]
        providers = {r["Id"]: r for r in self._load_csv_rows("providers.csv") if r.get("Id")}
        organizations = {r["Id"]: r for r in self._load_csv_rows("organizations.csv") if r.get("Id")}
        payers = {r["Id"]: r for r in self._load_csv_rows("payers.csv") if r.get("Id")}
        transitions = [r for r in self._load_csv_rows("payer_transitions.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]

        provider_counter = Counter([str(r.get("PROVIDER") or "") for r in encounters if str(r.get("PROVIDER") or "").strip()])
        org_counter = Counter([str(r.get("ORGANIZATION") or "") for r in encounters if str(r.get("ORGANIZATION") or "").strip()])
        payer_counter = Counter([str(r.get("PAYER") or "") for r in encounters if str(r.get("PAYER") or "").strip()])
        transition_counter = Counter([str(r.get("PAYER") or "") for r in transitions if str(r.get("PAYER") or "").strip()])

        top_provider_id = provider_counter.most_common(1)[0][0] if provider_counter else None
        top_org_id = org_counter.most_common(1)[0][0] if org_counter else None
        top_payer_id = (payer_counter + transition_counter).most_common(1)[0][0] if (payer_counter or transition_counter) else None
        top_transition = max(transitions, key=lambda r: int((r.get("END_YEAR") or "0")), default=None) if transitions else None

        insurance = Insurance(
            provider=(
                str((export_payload or {}).get("insurance", {}).get("provider") or "").strip()
                or str((payers.get(top_payer_id) or {}).get("NAME") or "").strip()
                or "Unknown"
            ),
            plan_type=(
                str((export_payload or {}).get("insurance", {}).get("plan_type") or "").strip()
                or str((top_transition or {}).get("OWNERSHIP") or "").strip()
                or "Unknown"
            ),
        )

        allergies_rows = [r for r in self._load_csv_rows("allergies.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]
        medications_rows = [r for r in self._load_csv_rows("medications.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]
        conditions_rows = [r for r in self._load_csv_rows("conditions.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]
        observations_rows = [r for r in self._load_csv_rows("observations.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]
        imaging_rows = [r for r in self._load_csv_rows("imaging_studies.csv") if str(r.get("PATIENT", "")).strip().lower() == str(csv_uuid or "").lower()]

        allergies = [
            Allergy(
                allergen=str(r.get("DESCRIPTION") or "Allergy").strip(),
                reaction=None,
                status=AllergyStatus.CONFIRMED,
                recorded_at=_parse_datetime(r.get("START")),
            )
            for r in allergies_rows
        ]
        medications = [
            Medication(
                name=str(r.get("DESCRIPTION") or "Medication").strip(),
                dosage="unknown",
                frequency="unknown",
                indication=str(r.get("REASONDESCRIPTION") or "").strip() or None,
                prescribed_at=_parse_datetime(r.get("START")),
            )
            for r in medications_rows
        ]
        diagnoses = [
            Diagnosis(
                condition=str(r.get("DESCRIPTION") or "Condition").strip(),
                icd_code=str(r.get("CODE") or "").strip() or None,
                date_diagnosed=_parse_date(r.get("START")),
                status="resolved" if str(r.get("STOP") or "").strip() else "active",
            )
            for r in conditions_rows
        ]

        # Merge with richer profile-export entities when available.
        if export_payload:
            if not allergies and isinstance(export_payload.get("allergies"), list):
                allergies = [
                    Allergy(
                        allergen=str(x.get("allergen") or "Allergy"),
                        reaction=str(x.get("reaction") or "") or None,
                        status=_enum_allergy_status(x.get("status")),
                        recorded_at=_parse_datetime(x.get("recorded_at")),
                    )
                    for x in export_payload.get("allergies", [])
                ]
            if not medications and isinstance(export_payload.get("current_medications"), list):
                medications = [
                    Medication(
                        name=str(x.get("name") or "Medication"),
                        dosage=str(x.get("dosage") or "unknown"),
                        frequency=str(x.get("frequency") or "unknown"),
                        indication=str(x.get("indication") or "") or None,
                        prescribed_at=_parse_datetime(x.get("prescribed_at")),
                    )
                    for x in export_payload.get("current_medications", [])
                ]
            if not diagnoses and isinstance(export_payload.get("diagnoses"), list):
                diagnoses = [
                    Diagnosis(
                        condition=str(x.get("condition") or "Condition"),
                        icd_code=str(x.get("icd_code") or "") or None,
                        date_diagnosed=_parse_date(x.get("date_diagnosed")),
                        status=str(x.get("status") or "active"),
                    )
                    for x in export_payload.get("diagnoses", [])
                ]

        labs = self._build_labs_from_csv_observations(observations_rows)
        vital_signs = self._build_vitals_from_csv_observations(observations_rows)

        doc_paths = self._matching_doc_paths(csv_uuid)
        fhir_labs, fhir_vitals = self._build_labs_and_vitals_from_fhir(doc_paths)
        ccda_labs, ccda_vitals = self._build_labs_and_vitals_from_ccda(doc_paths)
        labs.extend(fhir_labs)
        labs.extend(ccda_labs)
        vital_signs.extend(fhir_vitals)
        vital_signs.extend(ccda_vitals)

        imaging_studies = self._build_imaging_from_csv(imaging_rows)
        fhir_imaging, fhir_tests = self._build_imaging_and_diagnostics_from_fhir(doc_paths)
        imaging_studies.extend(fhir_imaging)
        diagnostic_tests = list(fhir_tests)

        if export_payload:
            if not imaging_studies and isinstance(export_payload.get("imaging_studies"), list):
                imaging_studies = [
                    ImagingStudy(
                        study_type=str(x.get("study_type") or "Imaging Study"),
                        body_part=str(x.get("body_part") or "Unknown"),
                        findings=str(x.get("findings") or ""),
                        impression=str(x.get("impression") or ""),
                        date_performed=_parse_date(x.get("date_performed")) or date(1900, 1, 1),
                        radiologist=str(x.get("radiologist") or "") or None,
                    )
                    for x in export_payload.get("imaging_studies", [])
                ]
            if not diagnostic_tests and isinstance(export_payload.get("diagnostic_tests"), list):
                diagnostic_tests = [
                    DiagnosticTest(
                        test_type=str(x.get("test_type") or "Diagnostic Test"),
                        date_performed=_parse_date(x.get("date_performed")) or date(1900, 1, 1),
                        findings=str(x.get("findings") or ""),
                        interpretation=str(x.get("interpretation") or ""),
                        ordered_by=str(x.get("ordered_by") or "") or None,
                    )
                    for x in export_payload.get("diagnostic_tests", [])
                ]
            if not labs and isinstance(export_payload.get("lab_results"), list):
                labs = [
                    LabResult(
                        test_name=str(x.get("test_name") or "Lab"),
                        result=str(x.get("result") or ""),
                        unit=str(x.get("unit") or ""),
                        reference_range=str(x.get("reference_range") or ""),
                        flagged=bool(x.get("flagged", False)),
                        date_performed=_parse_date(x.get("date_performed")),
                    )
                    for x in export_payload.get("lab_results", [])
                ]

        patient = Patient(
            patient_id=stable_patient_id or str(csv_uuid or "UNKNOWN"),
            medical_record_number=mrn or "UNKNOWN",
            first_name=str(first_name),
            last_name=str(last_name),
            date_of_birth=_parse_date(dob) or date(1900, 1, 1),
            gender=_enum_gender(gender),
            contact_info=contact,
            insurance=insurance,
            allergies=allergies,
            current_medications=medications,
            diagnoses=diagnoses,
            clinical_notes=[],
            lab_results=labs,
            imaging_studies=imaging_studies,
            diagnostic_tests=diagnostic_tests,
            primary_care_physician=(
                str((export_payload or {}).get("primary_care_physician") or "").strip()
                or str((providers.get(top_provider_id) or {}).get("NAME") or "").strip()
                or None
            ),
            hospital=(
                str((export_payload or {}).get("hospital") or "").strip()
                or str((organizations.get(top_org_id) or {}).get("NAME") or "").strip()
                or None
            ),
            admission_date=_parse_date((export_payload or {}).get("admission_date")),
            patient_signature=(export_payload or {}).get("patient_signature") if export_payload else None,
            signature_date=_parse_datetime((export_payload or {}).get("signature_date")) if export_payload else None,
        )

        payload = {
            "identity": resolved.to_dict() if resolved else None,
            "export_profile_created_at": export_created_at,
            "patient": _as_jsonable(asdict(patient)),
            "vital_signs": _as_jsonable([asdict(v) for v in vital_signs]),
            "source_counts": {
                "encounters": len(encounters),
                "allergies_csv": len(allergies_rows),
                "medications_csv": len(medications_rows),
                "conditions_csv": len(conditions_rows),
                "observations_csv": len(observations_rows),
                "fhir_ccda_docs": len(doc_paths),
                "lab_results_total": len(labs),
                "vitals_total": len(vital_signs),
                "imaging_total": len(imaging_studies),
                "diagnostic_tests_total": len(diagnostic_tests),
            },
        }
        return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Build patient profile from CSV + FHIR + C-CDA.")
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or MRN.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional JSON output path.")
    args = parser.parse_args()

    agent = ProfileBuilderAgent(args.data_root)
    profile = agent.build(args.identifier)
    print(json.dumps(profile, indent=2))

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(profile, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
