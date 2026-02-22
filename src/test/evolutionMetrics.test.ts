import { describe, it, expect } from "vitest";
import { classifyBpStage, deriveMetrics, BP_STAGE_LABELS } from "@/lib/evolutionMetrics";
import type { PatientEvolutionOutput } from "@/types/patientEvolution";
import { generateDeterministicInsights } from "@/lib/evolutionInsights";

describe("classifyBpStage", () => {
  it("classifies normal BP", () => {
    expect(classifyBpStage(115, 75)).toBe("normal");
  });

  it("classifies elevated BP", () => {
    expect(classifyBpStage(125, 78)).toBe("elevated");
  });

  it("classifies HTN stage 1", () => {
    expect(classifyBpStage(135, 82)).toBe("htn_stage_1");
  });

  it("classifies HTN stage 2", () => {
    expect(classifyBpStage(145, 92)).toBe("htn_stage_2");
  });

  it("classifies crisis", () => {
    expect(classifyBpStage(185, 95)).toBe("crisis");
    expect(classifyBpStage(140, 125)).toBe("crisis");
  });

  it("DBP drives stage when SBP is normal", () => {
    expect(classifyBpStage(118, 92)).toBe("htn_stage_2");
  });
});

describe("deriveMetrics", () => {
  const makePayload = (timeline: any[]): PatientEvolutionOutput => ({
    timeline,
    episodes: [],
    alerts: [],
    narrative: {} as any,
    metadata: {
      generated_at: new Date().toISOString(),
      source_counts: { timeline_events: timeline.length, episodes: 0, alerts: 0 },
      pipeline: {
        identity_agent: "test",
        profile_builder_agent: "test",
        temporal_evolution_agent: "test",
        context_fusion_agent: "test",
        narrative_agent: "test",
      },
    },
  });

  it("computes MAP correctly", () => {
    const payload = makePayload([
      {
        event_id: "e1",
        category: "observation",
        time_start: "2024-01-15T10:00:00Z",
        description: "Systolic Blood Pressure",
        value: "120",
      },
      {
        event_id: "e2",
        category: "observation",
        time_start: "2024-01-15T10:00:00Z",
        description: "Diastolic Blood Pressure",
        value: "80",
      },
    ]);
    const m = deriveMetrics(payload);
    expect(m.vitals.length).toBeGreaterThan(0);
    const pt = m.vitals[0];
    // MAP = (120 + 2*80)/3 = 93.3
    expect(pt.map).toBeCloseTo(93.3, 1);
    expect(pt.pulsePressure).toBe(40);
    // 120/80 is HTN Stage 1 per AHA (DBP >= 80)
    expect(pt.bpStage).toBe("htn_stage_1");
  });

  it("computes shock index", () => {
    const payload = makePayload([
      { category: "observation", time_start: "2024-01-15", description: "Systolic Blood Pressure", value: "90" },
      { category: "observation", time_start: "2024-01-15", description: "Heart Rate", value: "110" },
    ]);
    const m = deriveMetrics(payload);
    expect(m.vitals[0].shockIndex).toBeCloseTo(1.22, 1);
  });

  it("handles empty timeline gracefully", () => {
    const m = deriveMetrics(makePayload([]));
    expect(m.vitals).toEqual([]);
    expect(m.coverage.totalVitalPoints).toBe(0);
    expect(m.coverage.hasBP).toBe(false);
  });
});

describe("generateDeterministicInsights", () => {
  it("flags crisis readings", () => {
    const metrics = {
      vitals: [
        { date: "2024-01-15", timestamp: 0, sbp: 190, dbp: 125, bpStage: "crisis" as const, source_event_id: "e1" },
      ],
      rollingAverages: [],
      conditionSpans: [],
      activeConditionTimeline: [],
      treatmentMarkers: [],
      admissionMarkers: [],
      coverage: { totalVitalPoints: 1, hasBP: true, hasHR: false, dateRange: null },
    };
    const result = generateDeterministicInsights(metrics);
    expect(result.source).toBe("deterministic");
    expect(result.annotations.length).toBeGreaterThan(0);
    expect(result.annotations[0].title).toContain("Crisis");
  });

  it("returns empty annotations when no issues", () => {
    const metrics = {
      vitals: [
        { date: "2024-01-15", timestamp: 0, sbp: 118, dbp: 76, bpStage: "normal" as const },
      ],
      rollingAverages: [],
      conditionSpans: [],
      activeConditionTimeline: [],
      treatmentMarkers: [],
      admissionMarkers: [],
      coverage: { totalVitalPoints: 1, hasBP: true, hasHR: false, dateRange: null },
    };
    const result = generateDeterministicInsights(metrics);
    expect(result.annotations).toEqual([]);
  });
});
