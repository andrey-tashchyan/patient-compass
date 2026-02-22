/**
 * Fetches AI-powered chart annotations from edge function.
 * Falls back to deterministic rule-based annotations on failure.
 */
import type { DerivedMetrics, VitalDataPoint } from "./evolutionMetrics";
import type { EvolutionInsights, ChartAnnotation, PlotPlan } from "@/types/evolutionInsights";
import type { PatientEvolutionOutput } from "@/types/patientEvolution";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function fetchEvolutionInsights(
  metrics: DerivedMetrics,
  payload: PatientEvolutionOutput,
): Promise<EvolutionInsights> {
  try {
    const compact = {
      vitals_summary: metrics.vitals.slice(-30).map((v) => ({
        date: v.date.slice(0, 10),
        sbp: v.sbp,
        dbp: v.dbp,
        hr: v.hr,
        map: v.map,
        bpStage: v.bpStage,
      })),
      conditions: metrics.conditionSpans.slice(0, 20).map((c) => ({
        condition: c.condition,
        start: c.start?.slice(0, 10),
        end: c.end?.slice(0, 10),
        active: c.isActive,
      })),
      treatments: metrics.treatmentMarkers.slice(0, 20).map((t) => ({
        date: t.date.slice(0, 10),
        type: t.type,
        desc: t.description,
      })),
      alert_count: (payload.alerts ?? []).length,
      episode_count: (payload.episodes ?? []).length,
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-evolution-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SUPABASE_KEY ? { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } : {}),
      },
      body: JSON.stringify(compact),
    });

    if (!response.ok) throw new Error(`Insights API returned ${response.status}`);
    const data = await response.json();
    if (data.annotations) {
      return { ...data, source: "ai" } as EvolutionInsights;
    }
    throw new Error("Invalid response shape");
  } catch (err) {
    console.warn("AI insights unavailable, using deterministic fallback:", err);
    return generateDeterministicInsights(metrics);
  }
}

/** Rule-based fallback annotations */
export function generateDeterministicInsights(metrics: DerivedMetrics): EvolutionInsights {
  const annotations: ChartAnnotation[] = [];

  // Flag crisis-level BP readings
  for (const v of metrics.vitals) {
    if (v.bpStage === "crisis") {
      annotations.push({
        time: v.date,
        metric: "bp",
        title: "Hypertensive Crisis",
        explanation: `SBP ${v.sbp}/${v.dbp} mmHg exceeds crisis threshold (≥180/120).`,
        confidence: 1,
        related_event_ids: v.source_event_id ? [v.source_event_id] : [],
      });
    }
    if (v.shockIndex != null && v.shockIndex > 1.0) {
      annotations.push({
        time: v.date,
        metric: "shock_index",
        title: "Elevated Shock Index",
        explanation: `Shock index ${v.shockIndex} (HR/SBP > 1.0) may indicate hemodynamic instability.`,
        confidence: 0.9,
        related_event_ids: v.source_event_id ? [v.source_event_id] : [],
      });
    }
  }

  // Flag large BP jumps
  for (let i = 1; i < metrics.vitals.length; i++) {
    const prev = metrics.vitals[i - 1];
    const curr = metrics.vitals[i];
    if (prev.sbp != null && curr.sbp != null) {
      const delta = Math.abs(curr.sbp - prev.sbp);
      if (delta >= 30) {
        annotations.push({
          time: curr.date,
          metric: "bp",
          title: `SBP ${curr.sbp > prev.sbp ? "Spike" : "Drop"} (${delta} mmHg)`,
          explanation: `Systolic BP changed by ${delta} mmHg between readings.`,
          confidence: 0.85,
          related_event_ids: [prev.source_event_id, curr.source_event_id].filter(Boolean) as string[],
        });
      }
    }
  }

  return {
    annotations: annotations.slice(0, 20),
    risk_windows: [],
    condition_trajectory: [],
    plot_plan: generateDeterministicPlotPlan(metrics),
    source: "deterministic",
  };
}

/** Deterministic plot plan fallback based on data availability */
export function generateDeterministicPlotPlan(metrics: DerivedMetrics): PlotPlan {
  const { coverage } = metrics;
  const recommended: string[] = [];
  const sequence: { metric: string; delay_ms: number; rationale: string }[] = [];
  let delay = 0;
  const STEP = 400;

  if (coverage.hasBP) {
    recommended.push("sbp", "dbp");
    sequence.push({ metric: "sbp", delay_ms: delay, rationale: "Primary blood pressure metric available." });
    delay += STEP;
    sequence.push({ metric: "dbp", delay_ms: delay, rationale: "Diastolic pressure provides complete BP picture." });
    delay += STEP;
    recommended.push("map");
    sequence.push({ metric: "map", delay_ms: delay, rationale: "MAP indicates perfusion pressure." });
    delay += STEP;
  }

  if (coverage.hasHR) {
    recommended.push("hr");
    sequence.push({ metric: "hr", delay_ms: delay, rationale: "Heart rate data available for cardiovascular assessment." });
    delay += STEP;
  }

  if (coverage.hasBP) {
    recommended.push("sbp_30d");
    sequence.push({ metric: "sbp_30d", delay_ms: delay, rationale: "Rolling average shows long-term BP trend." });
    delay += STEP;
  }

  recommended.push("annotations");
  sequence.push({ metric: "annotations", delay_ms: delay, rationale: "Clinical annotations highlight key events." });

  const focusMetric = coverage.hasBP ? "sbp" : coverage.hasHR ? "hr" : "annotations";

  return {
    recommended_metrics: recommended,
    focus_metric: focusMetric,
    recommended_date_range: "all",
    animation_sequence: sequence,
    narrative_headline: coverage.hasBP
      ? "Blood pressure trends drive this patient's clinical narrative."
      : "Vital sign monitoring overview.",
  };
}
