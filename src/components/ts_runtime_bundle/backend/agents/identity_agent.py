from __future__ import annotations

import argparse
import csv
import json
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any


UUID_PATTERN = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
)


def _norm_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _norm_gender(value: Any) -> str:
    raw = _norm_str(value).upper()
    if not raw:
        return ""
    if raw in {"M", "MALE"}:
        return "MALE"
    if raw in {"F", "FEMALE"}:
        return "FEMALE"
    return "OTHER"


def _extract_uuid_from_name(path: Path) -> str | None:
    match = UUID_PATTERN.search(path.stem)
    return match.group(0).lower() if match else None


@dataclass
class ResolvedIdentity:
    query_identifier: str
    csv_patient_uuid: str | None
    stable_patient_id: str | None
    medical_record_number: str | None
    first_name: str | None
    last_name: str | None
    date_of_birth: str | None
    gender: str | None
    matched_by: list[str]
    confidence: float
    evidence: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "query_identifier": self.query_identifier,
            "csv_patient_uuid": self.csv_patient_uuid,
            "stable_patient_id": self.stable_patient_id,
            "medical_record_number": self.medical_record_number,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "date_of_birth": self.date_of_birth,
            "gender": self.gender,
            "matched_by": self.matched_by,
            "confidence": self.confidence,
            "evidence": self.evidence,
        }


class IdentityAgent:
    """
    Resolves a single person identity across CSV, C-CDA and FHIR datasets.

    Strategy:
    1) Resolve patient UUID from `data/csv/patients.csv` and document filenames.
    2) Link stable business identifiers (`patient_id`, `medical_record_number`) from
       `data/patients-export-*.csv` (JSON payload in `patient_data`).
    3) Validate linkage with internal IDs inside C-CDA/FHIR documents.
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

    def _load_csv_patients(self) -> dict[str, dict[str, str]]:
        patients_path = self.csv_dir / "patients.csv"
        by_uuid: dict[str, dict[str, str]] = {}
        with patients_path.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                patient_uuid = _norm_str(row.get("Id")).lower()
                if not patient_uuid:
                    continue
                by_uuid[patient_uuid] = {
                    "first_name": _norm_str(row.get("FIRST")) or None,
                    "last_name": _norm_str(row.get("LAST")) or None,
                    "date_of_birth": _norm_str(row.get("BIRTHDATE")) or None,
                    "gender": _norm_gender(row.get("GENDER")) or None,
                }
        return by_uuid

    def _latest_patient_export(self) -> Path | None:
        candidates = sorted(self.data_root.glob("patients-export-*.csv"), key=lambda p: p.stat().st_mtime)
        return candidates[-1] if candidates else None

    def _load_profile_export_rows(self) -> list[dict[str, Any]]:
        export_path = self._latest_patient_export()
        if export_path is None:
            return []

        rows: list[dict[str, Any]] = []
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
                rows.append(
                    {
                        "source_file": str(export_path),
                        "created_at": _norm_str(row.get("created_at")) or None,
                        "first_name": _norm_str(payload.get("first_name")) or None,
                        "last_name": _norm_str(payload.get("last_name")) or None,
                        "date_of_birth": _norm_str(payload.get("date_of_birth")) or None,
                        "gender": _norm_gender(payload.get("gender")) or None,
                        "patient_id": _norm_str(payload.get("patient_id")) or None,
                        "medical_record_number": _norm_str(payload.get("medical_record_number")) or None,
                    }
                )
        return rows

    def _demographic_key(self, first_name: str | None, last_name: str | None, dob: str | None, gender: str | None) -> str:
        return "|".join(
            [
                _norm_str(first_name).casefold(),
                _norm_str(last_name).casefold(),
                _norm_str(dob),
                _norm_gender(gender),
            ]
        )

    def _profiles_by_identifier(self) -> tuple[dict[str, list[dict[str, Any]]], dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
        rows = self._load_profile_export_rows()
        by_patient_id: dict[str, list[dict[str, Any]]] = {}
        by_mrn: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            patient_id = _norm_str(row.get("patient_id"))
            mrn = _norm_str(row.get("medical_record_number"))
            if patient_id:
                by_patient_id.setdefault(patient_id, []).append(row)
            if mrn:
                by_mrn.setdefault(mrn, []).append(row)
        return by_patient_id, by_mrn, rows

    def _candidate_documents(self, patient_uuid: str) -> list[tuple[str, Path]]:
        matches: list[tuple[str, Path]] = []
        for dataset_type, folder in self.doc_dirs.items():
            for path in sorted(folder.glob(f"*{patient_uuid}*")):
                matches.append((dataset_type, path))
        return matches

    def _ccda_internal_ids(self, path: Path) -> list[str]:
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError:
            return []
        ids = root.findall('.//c:recordTarget/c:patientRole/c:id', self.ccda_ns)
        out: list[str] = []
        for node in ids:
            ext = _norm_str(node.attrib.get("extension")).lower()
            if ext:
                out.append(ext)
        return out

    def _fhir_internal_ids(self, path: Path) -> list[str]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return []
        ids: list[str] = []
        for entry in payload.get("entry", []):
            resource = entry.get("resource") or {}
            if resource.get("resourceType") == "Patient":
                patient_id = _norm_str(resource.get("id")).lower()
                if patient_id:
                    ids.append(patient_id)
        return ids

    def _document_evidence(self, patient_uuid: str) -> tuple[list[dict[str, Any]], bool]:
        docs = self._candidate_documents(patient_uuid)
        evidence: list[dict[str, Any]] = []
        all_internal_match = True

        for dataset_type, path in docs:
            filename_uuid = _extract_uuid_from_name(path)
            internal_ids: list[str]
            if dataset_type == "ccda":
                internal_ids = self._ccda_internal_ids(path)
            else:
                internal_ids = self._fhir_internal_ids(path)

            internal_match = not internal_ids or patient_uuid in internal_ids
            if not internal_match:
                all_internal_match = False

            evidence.append(
                {
                    "dataset_type": dataset_type,
                    "file_path": str(path),
                    "filename_uuid": filename_uuid,
                    "filename_matches_patient_uuid": filename_uuid == patient_uuid,
                    "internal_patient_ids": internal_ids,
                    "internal_id_matches_patient_uuid": internal_match,
                }
            )
        return evidence, all_internal_match

    def resolve(self, identifier: str) -> list[ResolvedIdentity]:
        query = _norm_str(identifier)
        if not query:
            return []

        query_lc = query.lower()
        csv_patients = self._load_csv_patients()
        by_patient_id, by_mrn, profile_rows = self._profiles_by_identifier()

        demographics_to_uuid: dict[str, list[str]] = {}
        for patient_uuid, demo in csv_patients.items():
            key = self._demographic_key(demo.get("first_name"), demo.get("last_name"), demo.get("date_of_birth"), demo.get("gender"))
            demographics_to_uuid.setdefault(key, []).append(patient_uuid)

        candidate_uuids: dict[str, list[str]] = {}
        matched_profiles: dict[str, dict[str, Any]] = {}
        profile_only_rows: list[dict[str, Any]] = []

        if query_lc in csv_patients:
            candidate_uuids.setdefault(query_lc, []).append("csv.patient_uuid")

        for dataset_type, folder in self.doc_dirs.items():
            for path in folder.glob(f"*{query}*"):
                filename_uuid = _extract_uuid_from_name(path)
                if filename_uuid:
                    candidate_uuids.setdefault(filename_uuid, []).append(f"{dataset_type}.filename_uuid")

        for profile in by_patient_id.get(query, []):
            key = self._demographic_key(
                profile.get("first_name"),
                profile.get("last_name"),
                profile.get("date_of_birth"),
                profile.get("gender"),
            )
            for patient_uuid in demographics_to_uuid.get(key, []):
                candidate_uuids.setdefault(patient_uuid, []).append("profile.patient_id+demographics")
                matched_profiles[patient_uuid] = profile
            if key not in demographics_to_uuid:
                profile_only_rows.append(profile)

        for profile in by_mrn.get(query, []):
            key = self._demographic_key(
                profile.get("first_name"),
                profile.get("last_name"),
                profile.get("date_of_birth"),
                profile.get("gender"),
            )
            for patient_uuid in demographics_to_uuid.get(key, []):
                candidate_uuids.setdefault(patient_uuid, []).append("profile.medical_record_number+demographics")
                matched_profiles[patient_uuid] = profile
            if key not in demographics_to_uuid:
                profile_only_rows.append(profile)

        resolved: list[ResolvedIdentity] = []
        for patient_uuid, reasons in sorted(candidate_uuids.items()):
            demo = csv_patients.get(patient_uuid, {})
            profile = matched_profiles.get(patient_uuid)
            doc_evidence, all_internal_match = self._document_evidence(patient_uuid)

            evidence: list[dict[str, Any]] = [
                {
                    "dataset_type": "csv",
                    "file_path": str(self.csv_dir / "patients.csv"),
                    "patient_uuid": patient_uuid,
                    "found_in_csv": bool(demo),
                    "first_name": demo.get("first_name"),
                    "last_name": demo.get("last_name"),
                    "date_of_birth": demo.get("date_of_birth"),
                    "gender": demo.get("gender"),
                }
            ]
            if profile:
                evidence.append(
                    {
                        "dataset_type": "profile_export",
                        "file_path": profile.get("source_file"),
                        "created_at": profile.get("created_at"),
                        "patient_id": profile.get("patient_id"),
                        "medical_record_number": profile.get("medical_record_number"),
                        "first_name": profile.get("first_name"),
                        "last_name": profile.get("last_name"),
                        "date_of_birth": profile.get("date_of_birth"),
                        "gender": profile.get("gender"),
                    }
                )
            evidence.extend(doc_evidence)

            confidence = 0.0
            if demo:
                confidence += 0.45
            if profile:
                confidence += 0.30
            if doc_evidence:
                confidence += 0.15
            if all_internal_match and doc_evidence:
                confidence += 0.10
            confidence = min(confidence, 1.0)

            resolved.append(
                ResolvedIdentity(
                    query_identifier=query,
                    csv_patient_uuid=patient_uuid,
                    stable_patient_id=profile.get("patient_id") if profile else None,
                    medical_record_number=profile.get("medical_record_number") if profile else None,
                    first_name=demo.get("first_name"),
                    last_name=demo.get("last_name"),
                    date_of_birth=demo.get("date_of_birth"),
                    gender=demo.get("gender"),
                    matched_by=sorted(set(reasons)),
                    confidence=round(confidence, 2),
                    evidence=evidence,
                )
            )

        for profile in profile_only_rows:
            confidence = 0.35
            evidence = [
                {
                    "dataset_type": "profile_export",
                    "file_path": profile.get("source_file"),
                    "created_at": profile.get("created_at"),
                    "patient_id": profile.get("patient_id"),
                    "medical_record_number": profile.get("medical_record_number"),
                    "first_name": profile.get("first_name"),
                    "last_name": profile.get("last_name"),
                    "date_of_birth": profile.get("date_of_birth"),
                    "gender": profile.get("gender"),
                    "linked_to_csv_uuid": False,
                }
            ]
            resolved.append(
                ResolvedIdentity(
                    query_identifier=query,
                    csv_patient_uuid=None,
                    stable_patient_id=profile.get("patient_id"),
                    medical_record_number=profile.get("medical_record_number"),
                    first_name=profile.get("first_name"),
                    last_name=profile.get("last_name"),
                    date_of_birth=profile.get("date_of_birth"),
                    gender=profile.get("gender"),
                    matched_by=["profile_export_only"],
                    confidence=confidence,
                    evidence=evidence,
                )
            )

        deduped: list[ResolvedIdentity] = []
        seen = set()
        for item in resolved:
            key = (
                item.csv_patient_uuid or "",
                item.stable_patient_id or "",
                item.medical_record_number or "",
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)

        return deduped

    def resolve_one(self, identifier: str) -> ResolvedIdentity | None:
        matches = self.resolve(identifier)
        if not matches:
            return None
        matches.sort(key=lambda m: (-m.confidence, m.csv_patient_uuid))
        return matches[0]


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve a patient identity across CSV, C-CDA and FHIR datasets.")
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or medical_record_number.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional JSON output path.")
    args = parser.parse_args()

    agent = IdentityAgent(args.data_root)
    matches = agent.resolve(args.identifier)

    payload = [m.to_dict() for m in matches]
    print(json.dumps(payload, indent=2))

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
