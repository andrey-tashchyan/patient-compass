/**
 * Derives time-series metrics from Patient Evolution pipeline output
 * for clinical charting: BP trends, MAP, pulse pressure, shock index,
 * rolling averages, BP stage classification, condition trajectories,
 * and treatment-change markers.
 */
import type {
  PatientEvolutionOutput,
  TimelineEvent,
  Episode,
  JsonObject,
} from "@/types/patientEvolution";

/* ── BP stage classification ──────────────────────────────────── */
export type BpStage = "normal" | "elevated" | "htn_stage_1" | "htn_stage_2" | "crisis";

export function classifyBpStage(sbp: number, dbp: number): BpStage {
  if (sbp >= 180 || dbp >= 120) return "crisis";
  if (sbp >= 140 || dbp >= 90) return "htn_stage_2";
  if (sbp >= 130 || dbp >= 80) return "htn_stage_1";
  if (sbp >= 120 && dbp < 80) return "elevated";
  return "normal";
}

export const BP_STAGE_LABELS: Record<BpStage, string> = {
  normal: "Normal",
  elevated: "Elevated",
  htn_stage_1: "HTN Stage 1",
  htn_stage_2: "HTN Stage 2",
  crisis: "Hypertensive Crisis",
};

export const BP_STAGE_COLORS: Record<BpStage, string> = {
  normal: "hsl(var(--clinical-normal))",
  elevated: "hsl(var(--clinical-warning))",
  htn_stage_1: "#e67e22",
  htn_stage_2: "hsl(var(--clinical-critical))",
  crisis: "#8b0000",
};

/* ── Data point types ─────────────────────────────────────────── */
export interface VitalDataPoint {
  date: string; // ISO date string
  timestamp: number;
  sbp?: number | null;
  dbp?: number | null;
  hr?: number | null;
  temp?: number | null;
  bmi?: number | null;
  map?: number | null;
  pulsePressure?: number | null;
  shockIndex?: number | null;
  bpStage?: BpStage;
  source_file?: string;
  source_event_id?: string;
}

export interface RollingAverage {
  date: string;
  timestamp: number;
  sbp_30d?: number | null;
  sbp_90d?: number | null;
  dbp_30d?: number | null;
  dbp_90d?: number | null;
  map_30d?: number | null;
  map_90d?: number | null;
}

export interface ConditionSpan {
  condition: string;
  code?: string;
  start: string;
  end?: string | null;
  isActive: boolean;
  source_event_id?: string;
}

export interface ActiveConditionPoint {
  date: string;
  timestamp: number;
  count: number;
}

export interface TreatmentMarker {
  date: string;
  timestamp: number;
  type: "medication_start" | "medication_stop" | "procedure";
  description: string;
  source_event_id?: string;
}

export interface AdmissionMarker {
  date: string;
  timestamp: number;
  type: "admission" | "discharge";
  description: string;
  source_event_id?: string;
}

export interface DerivedMetrics {
  vitals: VitalDataPoint[];
  rollingAverages: RollingAverage[];
  conditionSpans: ConditionSpan[];
  activeConditionTimeline: ActiveConditionPoint[];
  treatmentMarkers: TreatmentMarker[];
  admissionMarkers: AdmissionMarker[];
  coverage: {
    totalVitalPoints: number;
    hasBP: boolean;
    hasHR: boolean;
    dateRange: { start: string; end: string } | null;
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */
function safeNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  const d = Date.parse(v);
  return Number.isNaN(d) ? null : new Date(d).toISOString();
}

function dayMs(days: number) {
  return days * 86400000;
}

function rollingMean(
  points: { timestamp: number; value: number }[],
  targetTs: number,
  windowDays: number,
): number | null {
  const cutoff = targetTs - dayMs(windowDays);
  const window = points.filter((p) => p.timestamp >= cutoff && p.timestamp <= targetTs);
  if (window.length === 0) return null;
  return window.reduce((s, p) => s + p.value, 0) / window.length;
}

/* ── Main derivation function ─────────────────────────────────── */
export function deriveMetrics(payload: PatientEvolutionOutput): DerivedMetrics {
  const timeline = payload.timeline ?? [];
  const episodes = payload.episodes ?? [];
  const patient = (payload.patient ?? {}) as JsonObject;

  // Extract vital signs from timeline
  const vitalEvents = timeline.filter(
    (e) =>
      e.category === "observation" ||
      e.category === "vital_sign" ||
      e.category === "vital-sign" ||
      (e.subtype && /vital|blood.?pressure|heart.?rate|bmi|temperature/i.test(e.subtype))
  );

  // Group observations by encounter/timestamp to build composite points
  const pointsByDate = new Map<string, VitalDataPoint>();

  for (const ev of vitalEvents) {
    const dateStr = isoDate(ev.time_start);
    if (!dateStr) continue;
    const dateKey = dateStr.slice(0, 10);

    if (!pointsByDate.has(dateKey)) {
      pointsByDate.set(dateKey, {
        date: dateStr,
        timestamp: new Date(dateStr).getTime(),
      });
    }
    const pt = pointsByDate.get(dateKey)!;
    const desc = String(ev.description ?? "").toLowerCase();
    const val = safeNum(ev.value);
    if (val == null) continue;

    if (desc.includes("systolic")) pt.sbp = val;
    else if (desc.includes("diastolic")) pt.dbp = val;
    else if (desc.includes("heart rate") || desc.includes("pulse")) pt.hr = val;
    else if (desc.includes("temperature")) pt.temp = val;
    else if (desc.includes("body mass") || desc === "bmi") pt.bmi = val;

    pt.source_file = ev.source_file ?? undefined;
    pt.source_event_id = ev.event_id ?? undefined;
  }

  // Also pull from patient.vital_signs if present
  const vitalSigns = patient.vital_signs as JsonObject | undefined;
  if (vitalSigns) {
    const latestDate = new Date().toISOString();
    const key = "latest";
    if (!pointsByDate.has(key)) {
      pointsByDate.set(key, { date: latestDate, timestamp: Date.now() });
    }
    const pt = pointsByDate.get(key)!;
    pt.sbp = pt.sbp ?? safeNum(vitalSigns.blood_pressure_systolic);
    pt.dbp = pt.dbp ?? safeNum(vitalSigns.blood_pressure_diastolic);
    pt.hr = pt.hr ?? safeNum(vitalSigns.heart_rate);
    pt.bmi = pt.bmi ?? safeNum(vitalSigns.bmi);
  }

  // Convert to sorted array and compute derived fields
  const vitals = Array.from(pointsByDate.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((pt) => {
      if (pt.sbp != null && pt.dbp != null) {
        pt.map = Math.round(((pt.sbp + 2 * pt.dbp) / 3) * 10) / 10;
        pt.pulsePressure = pt.sbp - pt.dbp;
        pt.bpStage = classifyBpStage(pt.sbp, pt.dbp);
      }
      if (pt.hr != null && pt.sbp != null && pt.sbp > 0) {
        pt.shockIndex = Math.round((pt.hr / pt.sbp) * 100) / 100;
      }
      return pt;
    });

  // Rolling averages
  const sbpSeries = vitals.filter((v) => v.sbp != null).map((v) => ({ timestamp: v.timestamp, value: v.sbp! }));
  const dbpSeries = vitals.filter((v) => v.dbp != null).map((v) => ({ timestamp: v.timestamp, value: v.dbp! }));
  const mapSeries = vitals.filter((v) => v.map != null).map((v) => ({ timestamp: v.timestamp, value: v.map! }));

  const rollingAverages: RollingAverage[] = vitals.map((v) => ({
    date: v.date,
    timestamp: v.timestamp,
    sbp_30d: rollingMean(sbpSeries, v.timestamp, 30),
    sbp_90d: rollingMean(sbpSeries, v.timestamp, 90),
    dbp_30d: rollingMean(dbpSeries, v.timestamp, 30),
    dbp_90d: rollingMean(dbpSeries, v.timestamp, 90),
    map_30d: rollingMean(mapSeries, v.timestamp, 30),
    map_90d: rollingMean(mapSeries, v.timestamp, 90),
  }));

  // Condition spans from timeline
  const conditionEvents = timeline.filter(
    (e) => e.category === "condition" || e.category === "diagnosis"
  );
  const conditionSpans: ConditionSpan[] = conditionEvents.map((e) => ({
    condition: String(e.description ?? "Unknown"),
    code: e.code ?? undefined,
    start: e.time_start ?? "",
    end: e.time_end ?? null,
    isActive: !e.time_end,
    source_event_id: e.event_id,
  }));

  // Active condition count over time
  const allDates = new Set<string>();
  for (const v of vitals) allDates.add(v.date.slice(0, 10));
  for (const c of conditionSpans) {
    if (c.start) allDates.add(c.start.slice(0, 10));
    if (c.end) allDates.add(c.end.slice(0, 10));
  }
  const sortedDates = Array.from(allDates).sort();

  const activeConditionTimeline: ActiveConditionPoint[] = sortedDates.map((d) => {
    const ts = new Date(d).getTime();
    const count = conditionSpans.filter((c) => {
      const start = c.start ? new Date(c.start).getTime() : 0;
      const end = c.end ? new Date(c.end).getTime() : Infinity;
      return ts >= start && ts <= end;
    }).length;
    return { date: d, timestamp: ts, count };
  });

  // Treatment markers
  const treatmentMarkers: TreatmentMarker[] = timeline
    .filter((e) => e.category === "medication" || e.category === "procedure")
    .map((e) => {
      const dateStr = isoDate(e.time_start);
      if (!dateStr) return null;
      const isMed = e.category === "medication";
      return {
        date: dateStr,
        timestamp: new Date(dateStr).getTime(),
        type: isMed ? ("medication_start" as const) : ("procedure" as const),
        description: String(e.description ?? ""),
        source_event_id: e.event_id,
      };
    })
    .filter(Boolean) as TreatmentMarker[];

  // Admission markers from encounters
  const admissionMarkers: AdmissionMarker[] = [];
  const encounters = timeline.filter(
    (e) =>
      e.category === "encounter" &&
      e.subtype &&
      /inpatient|emergency|admission/i.test(e.subtype)
  );
  for (const enc of encounters) {
    if (enc.time_start) {
      admissionMarkers.push({
        date: enc.time_start,
        timestamp: new Date(enc.time_start).getTime(),
        type: "admission",
        description: String(enc.description ?? enc.subtype ?? "Admission"),
        source_event_id: enc.event_id,
      });
    }
    if (enc.time_end) {
      admissionMarkers.push({
        date: enc.time_end,
        timestamp: new Date(enc.time_end).getTime(),
        type: "discharge",
        description: `Discharge: ${enc.description ?? ""}`.trim(),
        source_event_id: enc.event_id,
      });
    }
  }

  const hasBP = vitals.some((v) => v.sbp != null);
  const hasHR = vitals.some((v) => v.hr != null);
  const dates = vitals.map((v) => v.date).filter(Boolean).sort();

  return {
    vitals,
    rollingAverages,
    conditionSpans,
    activeConditionTimeline,
    treatmentMarkers,
    admissionMarkers,
    coverage: {
      totalVitalPoints: vitals.length,
      hasBP,
      hasHR,
      dateRange: dates.length >= 2 ? { start: dates[0], end: dates[dates.length - 1] } : null,
    },
  };
}
