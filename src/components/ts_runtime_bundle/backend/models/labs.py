from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class LabResult:
    """Laboratory test result"""
    test_name: str
    result: str
    unit: str
    reference_range: str
    flagged: bool = False
    date_performed: Optional[date] = None


@dataclass
class CompleteBloodCount(LabResult):
    """Specialized CBC lab result"""
    wbc: Optional[float] = None
    rbc: Optional[float] = None
    hemoglobin: Optional[float] = None
    hematocrit: Optional[float] = None
    platelets: Optional[float] = None


@dataclass
class LipidPanel(LabResult):
    """Specialized lipid panel result"""
    total_cholesterol: Optional[int] = None
    ldl_cholesterol: Optional[int] = None
    hdl_cholesterol: Optional[int] = None
    triglycerides: Optional[int] = None


@dataclass
class ChemistryPanel(LabResult):
    """Chemistry panel result"""
    sodium: Optional[float] = None
    potassium: Optional[float] = None
    co2: Optional[int] = None
    creatinine: Optional[float] = None
    ast: Optional[int] = None
    total_bilirubin: Optional[float] = None
