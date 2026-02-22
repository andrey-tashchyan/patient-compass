from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

if __package__ is None or __package__ == "":
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from backend.agents.context_fusion_agent import ContextFusionAgent
    from backend.agents.profile_builder_agent import ProfileBuilderAgent
else:
    from backend.agents.context_fusion_agent import ContextFusionAgent
    from backend.agents.profile_builder_agent import ProfileBuilderAgent


def _s(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _dt(raw: Any) -> datetime | None:
    t = _s(raw)
    if not t:
        return None
    try:
        parsed = datetime.fromisoformat(t.replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            return parsed.astimezone().replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


class NarrativeAgent:
    """Produces clinician-readable patient evolution summaries."""

    GEMINI_MODEL_ALIASES = {
        "gemini-3.0": "gemini-3-pro-preview",
        "gemini-3": "gemini-3-pro-preview",
        "gemini-3.1": "gemini-3.1-pro-preview",
    }
    GEMINI_KNOWN_MODELS = {
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash-lite-001",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
        "gemini-3-pro-preview",
        "gemini-3-flash-preview",
        "gemini-3.1-pro-preview",
        "gemini-3.1-pro-preview-customtools",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemini-pro-latest",
    }

    def __init__(
        self,
        data_root: str | Path = "data",
        use_ai: bool = True,
        model: str | None = None,
        provider: str | None = None,
    ) -> None:
        self.data_root = Path(data_root)
        self.profile_agent = ProfileBuilderAgent(self.data_root)
        self.context_agent = ContextFusionAgent(self.data_root)
        self.use_ai = use_ai
        self.provider = (provider or os.getenv("NARRATIVE_AI_PROVIDER", "openai")).strip().lower()
        if self.provider == "gemini":
            requested_model = model or os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
            self.model = self._normalize_gemini_model(requested_model)
        else:
            self.model = model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    def _normalize_gemini_model(self, model_name: str) -> str:
        raw = _s(model_name)
        if not raw:
            return "gemini-3-pro-preview"
        normalized = self.GEMINI_MODEL_ALIASES.get(raw, raw)
        if normalized not in self.GEMINI_KNOWN_MODELS:
            # Safe fallback to known-available stable model.
            return "gemini-3-pro-preview"
        return normalized

    def _baseline_profile(self, patient: dict[str, Any]) -> str:
        name = f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip()
        dob = patient.get("date_of_birth")
        gender = patient.get("gender")
        pid = patient.get("patient_id")
        mrn = patient.get("medical_record_number")
        pcp = patient.get("primary_care_physician") or "not documented"
        hospital = patient.get("hospital") or "not documented"
        insurance = patient.get("insurance") or {}
        dx = patient.get("diagnoses") or []
        meds = patient.get("current_medications") or []
        allergies = patient.get("allergies") or []

        return (
            f"Patient {name} (patient_id: {pid}, MRN: {mrn}), DOB {dob}, gender {gender}. "
            f"Primary physician: {pcp}. Main facility: {hospital}. "
            f"Insurance: {insurance.get('provider', 'unknown')} ({insurance.get('plan_type', 'unknown')}). "
            f"Current burden includes {len(dx)} diagnoses, {len(meds)} medications, and {len(allergies)} documented allergies."
        )

    def _evolution_by_condition(self, timeline: list[dict[str, Any]]) -> list[str]:
        conditions = defaultdict(list)
        for e in timeline:
            for d in (e.get("clinical_context") or {}).get("related_diagnosis", []):
                key = d.get("condition") or "Unknown condition"
                conditions[key].append(e)
            if e.get("category") == "diagnosis_onset":
                key = _s(e.get("description")) or "Unknown condition"
                conditions[key].append(e)

        output: list[str] = []
        for condition, events in sorted(conditions.items(), key=lambda kv: len(kv[1]), reverse=True)[:12]:
            events = [e for e in events if e.get("time_start")]
            if not events:
                continue
            events.sort(key=lambda x: x.get("time_start"))
            first = events[0].get("time_start")
            last = events[-1].get("time_start")
            meds = {
                m.get("medication")
                for e in events
                for m in (e.get("clinical_context") or {}).get("related_medication", [])
                if m.get("medication")
            }
            labs = {
                l.get("lab")
                for e in events
                for l in (e.get("clinical_context") or {}).get("related_lab", [])
                if l.get("lab")
            }
            output.append(
                f"{condition}: observed from {first} to {last}; linked to {len(meds)} medication(s) and {len(labs)} lab signal(s)."
            )
        return output

    def _window_changes(self, timeline: list[dict[str, Any]], days: int) -> str:
        cutoff = datetime.now() - timedelta(days=days)
        recent = [e for e in timeline if _dt(e.get("time_start")) and _dt(e.get("time_start")) >= cutoff]

        diagnosis = [e for e in recent if e.get("category") == "diagnosis_onset"]
        treatment = [e for e in recent if e.get("category") == "treatment_change"]
        labs = [e for e in recent if e.get("category") == "lab_trend"]
        admits = [e for e in recent if e.get("category") == "admission_discharge"]
        abnormal_labs = [e for e in labs if e.get("flagged_abnormal")]

        return (
            f"Last {days} days: {len(recent)} events total, "
            f"{len(diagnosis)} diagnosis events, {len(treatment)} treatment events, "
            f"{len(labs)} lab events ({len(abnormal_labs)} flagged abnormal), "
            f"{len(admits)} admission/discharge events."
        )

    def _care_gaps_and_contradictions(self, fused_payload: dict[str, Any]) -> list[str]:
        timeline = fused_payload.get("timeline") or []
        episodes = fused_payload.get("episodes") or {}
        issues: list[str] = []

        cycles = episodes.get("admission_discharge_cycles") or []
        for c in cycles:
            st = _dt(c.get("time_start"))
            en = _dt(c.get("time_end"))
            if st and en and en < st:
                issues.append(
                    f"Contradiction: encounter cycle '{c.get('description')}' has discharge before admission ({c.get('time_start')} > {c.get('time_end')})."
                )

        med_stops = [e for e in timeline if "medication_stop" in _s(e.get("subtype"))]
        med_starts = [e for e in timeline if "medication_start" in _s(e.get("subtype"))]
        if med_stops and not med_starts:
            issues.append("Potential contradiction: medication stop events exist without corresponding medication start events.")

        now = datetime.now()
        encounters = [e for e in timeline if e.get("category") == "admission_discharge"]
        recent_encounters = [e for e in encounters if (_dt(e.get("time_start")) and _dt(e.get("time_start")) >= now - timedelta(days=365))]
        if not recent_encounters:
            issues.append("Care gap: no encounter/admission-discharge activity observed in the last 365 days.")

        recent_labs = [e for e in timeline if e.get("category") == "lab_trend" and (_dt(e.get("time_start")) and _dt(e.get("time_start")) >= now - timedelta(days=180))]
        if not recent_labs:
            issues.append("Care gap: no lab trend events observed in the last 180 days.")

        abn = episodes.get("abnormal_lab_trend") or []
        if abn:
            issues.append(f"Monitoring need: {len(abn)} abnormal lab trend episode(s) detected and should be clinically reviewed.")

        if not issues:
            issues.append("No major care gaps or timeline contradictions detected by rule-based checks.")
        return issues

    def _deterministic_payload(
        self,
        patient: dict[str, Any],
        timeline: list[dict[str, Any]],
        fused: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "baseline_profile": self._baseline_profile(patient),
            "evolution_by_condition": self._evolution_by_condition(timeline),
            "changes_last_30_days": self._window_changes(timeline, 30),
            "changes_last_90_days": self._window_changes(timeline, 90),
            "changes_last_365_days": self._window_changes(timeline, 365),
            "care_gaps_or_contradictions": self._care_gaps_and_contradictions(fused),
        }

    def _deterministic_evolution_summary(self, timeline: list[dict[str, Any]]) -> str:
        dated = [e for e in timeline if e.get("time_start")]
        if not dated:
            return "No time-stamped evolution events were found."
        dated.sort(key=lambda e: e.get("time_start"))
        first = dated[0].get("time_start")
        last = dated[-1].get("time_start")
        total = len(dated)
        diag = sum(1 for e in dated if e.get("category") == "diagnosis_onset")
        tx = sum(1 for e in dated if e.get("category") == "treatment_change")
        labs = sum(1 for e in dated if e.get("category") == "lab_trend")
        admits = sum(1 for e in dated if e.get("category") == "admission_discharge")
        abnormal = sum(1 for e in dated if e.get("category") == "lab_trend" and e.get("flagged_abnormal"))
        return (
            f"Evolution spans {first} to {last} with {total} events: "
            f"{diag} diagnosis, {tx} treatment, {labs} lab ({abnormal} abnormal), "
            f"and {admits} admission/discharge events."
        )

    def _build_payload_from_context(
        self,
        patient: dict[str, Any],
        identity: dict[str, Any] | None,
        timeline: list[dict[str, Any]],
        episodes: dict[str, Any] | None,
    ) -> dict[str, Any]:
        fused = {
            "identity": identity,
            "timeline": timeline,
            "episodes": episodes or {},
        }
        deterministic = self._deterministic_payload(patient, timeline, fused)
        ai_summary = self._ai_evolution_summary(patient, fused, deterministic)
        chosen = deterministic
        chosen["evolution_timeline_summary"] = ai_summary or self._deterministic_evolution_summary(timeline)
        return {
            "identity": identity,
            **chosen,
            "generation_mode": "ai" if ai_summary else "deterministic",
            "generation_model": self.model if ai_summary else None,
            "generation_provider": self.provider if ai_summary else None,
        }

    def build_from_context(
        self,
        patient: dict[str, Any],
        identity: dict[str, Any] | None,
        timeline: list[dict[str, Any]],
        episodes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Generate narrative from already selected/filtered context.

        Useful for date-range narrative regeneration on a subset of events.
        """
        return self._build_payload_from_context(
            patient=patient,
            identity=identity,
            timeline=timeline or [],
            episodes=episodes or {},
        )

    def _ai_evolution_summary(
        self,
        patient: dict[str, Any],
        fused: dict[str, Any],
        deterministic: dict[str, Any],
    ) -> str | None:
        if not self.use_ai:
            return None

        timeline = fused.get("timeline") or []
        episodes = fused.get("episodes") or {}
        recent_events = sorted(
            [e for e in timeline if e.get("time_start")],
            key=lambda e: e.get("time_start"),
            reverse=True,
        )[:120]

        compact_context = {
            "identity": fused.get("identity"),
            "patient": {
                "patient_id": patient.get("patient_id"),
                "medical_record_number": patient.get("medical_record_number"),
                "first_name": patient.get("first_name"),
                "last_name": patient.get("last_name"),
                "date_of_birth": patient.get("date_of_birth"),
                "gender": patient.get("gender"),
                "primary_care_physician": patient.get("primary_care_physician"),
                "hospital": patient.get("hospital"),
                "insurance": patient.get("insurance"),
                "diagnoses": patient.get("diagnoses", [])[:20],
                "current_medications": patient.get("current_medications", [])[:20],
                "allergies": patient.get("allergies", [])[:20],
            },
            "recent_timeline_events": recent_events,
            "episodes": episodes,
            "rule_based_seed": deterministic,
        }

        system_prompt = (
            "You are a clinical summarization assistant. "
            "Generate a concise clinician-oriented summary of patient evolution over time from structured data. "
            "Do not invent facts. If uncertain, say so. "
            "Return plain text only, 5-10 sentences, focused on temporal progression."
        )

        user_prompt = (
            "Produce the temporal evolution summary from this patient evolution context:\n"
            + json.dumps(compact_context, ensure_ascii=False)
        )

        if self.provider == "gemini":
            return self._ai_evolution_summary_gemini(system_prompt, user_prompt)
        return self._ai_evolution_summary_openai(system_prompt, user_prompt)

    def _ai_evolution_summary_openai(self, system_prompt: str, user_prompt: str) -> str | None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        try:
            from openai import OpenAI
        except ImportError:
            return None

        client = OpenAI(api_key=api_key)
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
            )
            text = response.choices[0].message.content if response.choices else None
            if not text:
                return None
        except Exception:
            return None

        return text.strip()

    def _ai_evolution_summary_gemini(self, system_prompt: str, user_prompt: str) -> str | None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
            f"?key={api_key}"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read().decode("utf-8")
            parsed_body = json.loads(body)
            candidates = parsed_body.get("candidates") or []
            if not candidates:
                return None
            parts = ((candidates[0].get("content") or {}).get("parts") or [])
            if not parts:
                return None
            text = _s(parts[0].get("text"))
            if not text:
                return None
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None

        return text.strip()

    def build(self, identifier: str) -> dict[str, Any]:
        profile = self.profile_agent.build(identifier)
        fused = self.context_agent.build(identifier)
        patient = profile.get("patient") or {}
        return self._build_payload_from_context(
            patient=patient,
            identity=fused.get("identity"),
            timeline=fused.get("timeline") or [],
            episodes=fused.get("episodes") or {},
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate clinician-readable summaries from fused clinical timeline.")
    parser.add_argument("--identifier", required=True, help="Patient UUID, patient_id, or MRN.")
    parser.add_argument("--data-root", default="data", help="Path to data directory.")
    parser.add_argument("--output", default=None, help="Optional JSON output path.")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI generation and use deterministic summaries.")
    parser.add_argument("--model", default=None, help="OpenAI model to use when AI is enabled.")
    parser.add_argument("--provider", default=None, choices=["openai", "gemini"], help="AI provider for narrative generation.")
    parser.add_argument(
        "--require-ai",
        action="store_true",
        help="Fail with non-zero exit if AI generation is not used.",
    )
    parser.add_argument(
        "--proof",
        action="store_true",
        help="Print a terminal proof line for provider/mode/model.",
    )
    args = parser.parse_args()

    agent = NarrativeAgent(
        args.data_root,
        use_ai=not args.no_ai,
        model=args.model,
        provider=args.provider,
    )
    payload = agent.build(args.identifier)

    if args.require_ai and payload.get("generation_mode") != "ai":
        raise SystemExit(
            "ERROR: AI generation was not used. "
            "Check API key/model/provider configuration."
        )
    if args.require_ai and args.provider and payload.get("generation_provider") != args.provider:
        raise SystemExit(
            f"ERROR: Expected provider '{args.provider}' but got "
            f"'{payload.get('generation_provider')}'."
        )

    if args.proof:
        print(
            "AI_PROOF "
            f"mode={payload.get('generation_mode')} "
            f"provider={payload.get('generation_provider')} "
            f"model={payload.get('generation_model')}"
        )

    print(json.dumps(payload, indent=2))

    if args.output:
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
