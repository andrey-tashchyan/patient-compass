/**
 * Client-side clinical event tracker.
 * Mirrors Paid.ai events locally for dashboard display.
 * Events are stored in localStorage for persistence across sessions.
 */

export interface ClinicalEvent {
  id: string;
  eventName: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

const STORAGE_KEY = "cliniview_clinical_events";
const MAX_EVENTS = 500;

function getEvents(): ClinicalEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: ClinicalEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
}

export function trackClinicalEvent(eventName: string, metadata: Record<string, unknown> = {}): void {
  const events = getEvents();
  events.push({
    id: crypto.randomUUID(),
    eventName,
    timestamp: new Date().toISOString(),
    metadata,
  });
  saveEvents(events);
}

export function getClinicalEvents(): ClinicalEvent[] {
  return getEvents();
}

export function getEventsByName(name: string): ClinicalEvent[] {
  return getEvents().filter((e) => e.eventName === name);
}

export function getEventsThisMonth(): ClinicalEvent[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return getEvents().filter((e) => e.timestamp >= startOfMonth);
}

export interface ClinicalSafetyIndex {
  score: number; // 0-100
  contraindictionsDetected: number;
  redFlagsIdentified: number;
  highRiskPrevented: number;
  label: "Excellent" | "Good" | "Fair" | "Needs Attention";
}

export function computeSafetyIndex(): ClinicalSafetyIndex {
  const events = getEvents();
  const contraindictions = events.filter((e) => e.eventName === "contraindication_detected").length;
  const redFlags = events.filter((e) => e.eventName === "red_flag_identified").length;
  const highRisk = events.filter(
    (e) => e.eventName === "contraindication_detected" && e.metadata.severity === "critical"
  ).length;

  const totalSafety = contraindictions + redFlags + highRisk;
  // Higher score = more safety events caught = better safety
  const score = Math.min(100, Math.round(30 + totalSafety * 10));
  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Attention";

  return {
    score,
    contraindictionsDetected: contraindictions,
    redFlagsIdentified: redFlags,
    highRiskPrevented: highRisk,
    label,
  };
}

export interface ROIMetrics {
  totalConsultations: number;
  totalErrorsPrevented: number;
  estimatedTimeSavedMinutes: number;
  usageThisMonth: number;
  simulatedBillingAmount: number;
  topRedFlags: { flag: string; count: number }[];
}

export function computeROIMetrics(): ROIMetrics {
  const events = getEvents();
  const thisMonth = getEventsThisMonth();

  const consultations = events.filter((e) => e.eventName === "consultation_generated").length;
  const contraindictions = events.filter((e) => e.eventName === "contraindication_detected").length;
  const redFlags = events.filter((e) => e.eventName === "red_flag_identified").length;
  const errorsPrevented = contraindictions + redFlags;

  const timeSaved = events.reduce((acc, e) => {
    const mins = Number(e.metadata.estimated_time_saved_minutes) || 0;
    return acc + mins;
  }, 0);

  // Simulated billing: $0.50 per consultation, $1.00 per safety check
  const billing =
    consultations * 0.5 +
    events.filter((e) => e.eventName === "prescription_checked").length * 0.25 +
    events.filter((e) => e.eventName === "pdf_structured").length * 1.0;

  // Top red flags
  const flagCounts = new Map<string, number>();
  for (const e of events.filter((e) => e.eventName === "red_flag_identified")) {
    const flag = String(e.metadata.flag_type || e.metadata.title || "Unknown");
    flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
  }
  const topRedFlags = Array.from(flagCounts.entries())
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalConsultations: consultations,
    totalErrorsPrevented: errorsPrevented,
    estimatedTimeSavedMinutes: timeSaved,
    usageThisMonth: thisMonth.length,
    simulatedBillingAmount: Math.round(billing * 100) / 100,
    topRedFlags,
  };
}

/** Seed demo data for hackathon presentation */
export function seedDemoData(): void {
  const events = getEvents();
  if (events.length > 10) return; // Already has data

  const demoEvents: Omit<ClinicalEvent, "id">[] = [
    // Consultations
    ...Array.from({ length: 24 }, (_, i) => ({
      eventName: "consultation_generated",
      timestamp: new Date(Date.now() - i * 3600000 * 4).toISOString(),
      metadata: { transcript_length: 500 + Math.random() * 1000, estimated_time_saved_minutes: 8 },
    })),
    // Voice dictations
    ...Array.from({ length: 18 }, (_, i) => ({
      eventName: "voice_dictation_processed",
      timestamp: new Date(Date.now() - i * 3600000 * 5).toISOString(),
      metadata: { transcript_length: 300 + Math.random() * 800 },
    })),
    // PDFs parsed
    ...Array.from({ length: 12 }, (_, i) => ({
      eventName: "pdf_structured",
      timestamp: new Date(Date.now() - i * 3600000 * 8).toISOString(),
      metadata: { extraction_quality: "high", estimated_time_saved_minutes: 15, medication_count: 3 + Math.floor(Math.random() * 5) },
    })),
    // Prescription checks
    ...Array.from({ length: 30 }, (_, i) => ({
      eventName: "prescription_checked",
      timestamp: new Date(Date.now() - i * 3600000 * 3).toISOString(),
      metadata: { has_patient_data: true },
    })),
    // Contraindications
    ...Array.from({ length: 7 }, (_, i) => ({
      eventName: "contraindication_detected",
      timestamp: new Date(Date.now() - i * 3600000 * 12).toISOString(),
      metadata: {
        severity: i < 2 ? "critical" : "warning",
        source: "prescription_safety_check",
        drug: ["Metformin + Contrast", "NSAID + CKD", "Beta-blocker + Asthma", "ACE-I + Pregnancy", "Warfarin + Aspirin", "Statin + Gemfibrozil", "Digoxin + Amiodarone"][i],
      },
    })),
    // Red flags
    ...Array.from({ length: 5 }, (_, i) => ({
      eventName: "red_flag_identified",
      timestamp: new Date(Date.now() - i * 3600000 * 16).toISOString(),
      metadata: {
        flag_type: ["Hypertensive Crisis (SBP > 180)", "Anaphylaxis Risk", "Drug-Allergy Conflict", "Suicidal Ideation Keywords", "Sepsis Indicator"][i],
        severity: i < 2 ? "critical" : "warning",
      },
    })),
  ];

  const seeded = demoEvents.map((e) => ({ ...e, id: crypto.randomUUID() }));
  saveEvents([...events, ...seeded]);
}
