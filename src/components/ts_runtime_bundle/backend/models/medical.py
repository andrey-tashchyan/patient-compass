from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from .enums import AllergyStatus


@dataclass
class Allergy:
    """Patient allergy information"""
    allergen: str
    reaction: Optional[str] = None
    status: AllergyStatus = AllergyStatus.CONFIRMED
    recorded_at: Optional[datetime] = None


@dataclass
class Medication:
    """Current medication"""
    name: str
    dosage: str
    frequency: str
    indication: Optional[str] = None
    prescribed_at: Optional[datetime] = None


@dataclass
class VitalSigns:
    """Vital signs measurement"""
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature_fahrenheit: Optional[float] = None
    bmi: Optional[float] = None
    measurement_date: Optional[datetime] = None
