from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional, List

from .enums import Gender
from .contact import ContactInfo, Insurance
from .medical import Allergy, Medication
from .clinical import ClinicalNote, ImagingStudy, DiagnosticTest, Diagnosis
from .labs import LabResult


@dataclass
class Patient:
    """Complete patient medical record"""
    # Demographics
    patient_id: str
    medical_record_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: Gender

    # Contact and insurance
    contact_info: ContactInfo
    insurance: Insurance

    # Medical information
    allergies: List[Allergy] = field(default_factory=list)
    current_medications: List[Medication] = field(default_factory=list)
    diagnoses: List[Diagnosis] = field(default_factory=list)

    # Clinical records
    clinical_notes: List[ClinicalNote] = field(default_factory=list)
    lab_results: List[LabResult] = field(default_factory=list)
    imaging_studies: List[ImagingStudy] = field(default_factory=list)
    diagnostic_tests: List[DiagnosticTest] = field(default_factory=list)

    # Healthcare providers
    primary_care_physician: Optional[str] = None
    hospital: Optional[str] = None
    admission_date: Optional[date] = None

    # Administrative
    patient_signature: Optional[str] = None
    signature_date: Optional[datetime] = None

    def age(self) -> int:
        """Calculate patient age"""
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def get_active_diagnoses(self) -> List[Diagnosis]:
        """Get list of active diagnoses"""
        return [d for d in self.diagnoses if d.status == "active"]

    def get_recent_labs(self, days: int = 30) -> List[LabResult]:
        """Get lab results from last N days"""
        cutoff = date.today() - timedelta(days=days)
        return [lab for lab in self.lab_results
                if lab.date_performed and lab.date_performed >= cutoff]
