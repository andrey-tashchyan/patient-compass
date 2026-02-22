from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from .patient import Patient


@dataclass
class TimelineEvent:
    """Normalized time-ordered clinical event."""

    event_id: str
    category: str
    subtype: str
    time_start: datetime
    time_end: Optional[datetime] = None
    description: Optional[str] = None
    code: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    flagged_abnormal: bool = False
    source_dataset: Optional[str] = None
    source_file: Optional[str] = None
    context: dict[str, Any] = field(default_factory=dict)
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass
class ClinicalEpisode:
    """Grouped clinical episode derived from one or more timeline events."""

    episode_id: str
    episode_type: str
    time_start: datetime
    time_end: Optional[datetime] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    related_event_ids: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvolutionAlert:
    """Actionable signal detected from temporal evolution."""

    alert_id: str
    severity: str
    alert_type: str
    message: str
    time_detected: datetime
    related_episode_ids: list[str] = field(default_factory=list)
    related_event_ids: list[str] = field(default_factory=list)
    recommended_action: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PatientEvolution:
    """Temporal view of a patient: profile + timeline + episodes + alerts."""

    patient: Patient
    timeline: list[TimelineEvent] = field(default_factory=list)
    episodes: list[ClinicalEpisode] = field(default_factory=list)
    alerts: list[EvolutionAlert] = field(default_factory=list)
