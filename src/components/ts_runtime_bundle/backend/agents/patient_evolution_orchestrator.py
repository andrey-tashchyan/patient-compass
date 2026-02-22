from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.agents.context_fusion_agent import ContextFusionAgent
    from backend.agents.narrative_agent import NarrativeAgent
    from backend.agents.profile_builder_agent import ProfileBuilderAgent
else:
    from backend.agents.context_fusion_agent import ContextFusionAgent
    from backend.agents.narrative_agent import NarrativeAgent
    from backend.agents.profile_builder_agent import ProfileBuilderAgent


class PatientEvolutionOrchestrator:
    """Runs all agents and saves one PatientEvolution package."""

    def __init__(self, data_root: str | Path = "data") -> None:
        self.data_root = Path(data_root)
        self.profile_agent = ProfileBuilderAgent(self.data_root)
        self.context_agent = ContextFusionAgent(self.data_root)
        self.narrative_agent = NarrativeAgent(self.data_root)

    def _normalize_episodes(self, episodes_by_group: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        idx = 0
        for group_name, items in (episodes_by_group or {}).items():
            for item in items:
                idx += 1
                normalized.append(
                    {
                        "episode_id": f"ep_{idx:06d}",
                        "episode_type": item.get("episode_type") or group_name,
                        "time_start": item.get("time_start"),
                        "time_end": item.get("time_end"),
                        "title": item.get("description") or item.get("test_name") or group_name.replace("_", " ").title(),
                        "description": item.get("description"),
                        "status": item.get("status"),
                        "related_event_ids": item.get("event_ids") or [],
                        "details": item.get("details") or {},
                    }
                )
        normalized.sort(key=lambda e: (str(e.get("time_start") or ""), e["episode_id"]))
        return normalized

    def _build_alerts(self, care_items: list[str], episodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        alerts: list[dict[str, Any]] = []
        now_iso = datetime.now().isoformat(timespec="seconds")

        for idx, message in enumerate(care_items, start=1):
            lower = (message or "").lower()
            severity = "medium"
            alert_type = "care_gap"
            if "contradiction" in lower:
                severity = "high"
                alert_type = "contradiction"
            elif "monitoring need" in lower or "abnormal lab" in lower:
                severity = "high"
                alert_type = "abnormal_trend"

            alerts.append(
                {
                    "alert_id": f"al_{idx:06d}",
                    "severity": severity,
                    "alert_type": alert_type,
                    "message": message,
                    "time_detected": now_iso,
                    "related_episode_ids": [],
                    "related_event_ids": [],
                    "recommended_action": None,
                    "metadata": {},
                }
            )

        abnormal_eps = [e for e in episodes if str(e.get("episode_type")).startswith("abnormal_lab")]
        if abnormal_eps and not any(a.get("alert_type") == "abnormal_trend" for a in alerts):
            alerts.append(
                {
                    "alert_id": f"al_{len(alerts) + 1:06d}",
                    "severity": "high",
                    "alert_type": "abnormal_trend",
                    "message": f"{len(abnormal_eps)} abnormal lab trend episode(s) detected.",
                    "time_detected": now_iso,
                    "related_episode_ids": [e["episode_id"] for e in abnormal_eps],
                    "related_event_ids": [x for e in abnormal_eps for x in (e.get("related_event_ids") or [])],
                    "recommended_action": "Review trend, confirm clinical significance, and plan follow-up testing.",
                    "metadata": {"episodes_count": len(abnormal_eps)},
                }
            )

        return alerts

    def build(self, identifier: str) -> dict[str, Any]:
        profile_payload = self.profile_agent.build(identifier)
        fused_payload = self.context_agent.build(identifier)
        narrative_payload = self.narrative_agent.build(identifier)

        patient = profile_payload.get("patient")
        timeline = fused_payload.get("timeline") or []
        episodes = self._normalize_episodes(fused_payload.get("episodes") or {})
        alerts = self._build_alerts(narrative_payload.get("care_gaps_or_contradictions") or [], episodes)

        return {
            "patient": patient,
            "timeline": timeline,
            "episodes": episodes,
            "alerts": alerts,
            "identity": fused_payload.get("identity"),
            "narrative": narrative_payload,
            "metadata": {
                "generated_at": datetime.now().isoformat(timespec="seconds"),
                "source_counts": {
                    "timeline_events": len(timeline),
                    "episodes": len(episodes),
                    "alerts": len(alerts),
                },
            },
        }

    def run(self, identifier: str, output_path: str | Path | None = None) -> Path:
        payload = self.build(identifier)
        output_dir = self.data_root / "exports"
        output_dir.mkdir(parents=True, exist_ok=True)
        out = Path(output_path) if output_path else output_dir / f"{identifier}_patient_evolution.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return out


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build and save full PatientEvolution package in one run."
    )
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or MRN.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional output JSON path.")
    args = parser.parse_args()

    orchestrator = PatientEvolutionOrchestrator(args.data_root)
    out = orchestrator.run(args.identifier, args.output)
    payload = json.loads(out.read_text(encoding="utf-8"))
    counts = payload.get("metadata", {}).get("source_counts", {})
    print(f"PatientEvolution saved to: {out}")
    print(
        f"Counts -> timeline: {counts.get('timeline_events', 0)}, "
        f"episodes: {counts.get('episodes', 0)}, alerts: {counts.get('alerts', 0)}"
    )


if __name__ == "__main__":
    main()
