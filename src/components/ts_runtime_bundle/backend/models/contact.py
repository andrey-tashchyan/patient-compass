from dataclasses import dataclass
from typing import Optional


@dataclass
class ContactInfo:
    """Contact information for patient"""
    phone: str
    address: str
    emergency_contact_name: str
    emergency_contact_relation: str
    emergency_contact_phone: Optional[str] = None


@dataclass
class Insurance:
    """Insurance information"""
    provider: str
    plan_type: str
