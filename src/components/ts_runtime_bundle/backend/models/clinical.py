from dataclasses import dataclass
from datetime import date
from typing import Optional

from .medical import VitalSigns


@dataclass
class ClinicalNote:
    """Clinical consultation note"""
    note_type: str  # e.g., "GP Consultation", "Orthopedic", "Cardiology"
    date_of_service: date
    provider_name: str
    provider_credentials: str

    # SOAP components
    subjective: str
    objective: str
    assessment: str
    plan: str

    # Additional fields
    chief_complaint: Optional[str] = None
    vital_signs: Optional[VitalSigns] = None
    follow_up_instructions: Optional[str] = None


@dataclass
class ImagingStudy:
    """Imaging study result"""
    study_type: str  # e.g., "MRI Lumbar Spine"
    body_part: str
    findings: str
    impression: str
    date_performed: date
    radiologist: Optional[str] = None


@dataclass
class DiagnosticTest:
    """Diagnostic test (e.g., ECG, Stress Test)"""
    test_type: str
    date_performed: date
    findings: str
    interpretation: str
    ordered_by: Optional[str] = None


@dataclass
class Diagnosis:
    """Medical diagnosis"""
    condition: str
    icd_code: Optional[str] = None
    date_diagnosed: Optional[date] = None
    status: str = "active"  # active, resolved, chronic
