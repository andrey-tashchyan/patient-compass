

# AI-Driven Plot Planning Agent

## Overview

Instead of showing all metrics by default with manual toggle chips, an AI agent will analyze each patient's evolution data and return a **plot plan** -- which parameters matter most for this specific patient, in what order to reveal them, and why. The dashboard will then animate charts in a cinematic sequence guided by the agent's clinical reasoning.

## What Changes

### 1. Extend the `generate-evolution-insights` edge function

Add a new `plot_plan` field to the AI tool schema. The agent will return:

```
plot_plan: {
  recommended_metrics: ["sbp", "dbp", "hr", ...]   // ordered by clinical relevance
  focus_metric: "sbp"                                // the "hero" metric to emphasize
  recommended_date_range: "90d" | "365d" | "all"     // best window for this patient
  animation_sequence: [                              // staggered reveal order
    { metric: "sbp", delay_ms: 0, rationale: "Persistent stage 2 HTN..." },
    { metric: "dbp", delay_ms: 400, rationale: "Diastolic trending down..." },
    { metric: "hr",  delay_ms: 800, rationale: "Tachycardia correlates..." }
  ]
  narrative_headline: "Cardiovascular risk is the dominant story..."
}
```

The system prompt gains a paragraph instructing the model to select parameters based on data availability, clinical significance, and temporal patterns.

### 2. New type: `PlotPlan`

In `src/types/evolutionInsights.ts`, add:

- `PlotPlan` interface with `recommended_metrics`, `focus_metric`, `recommended_date_range`, `animation_sequence`, and `narrative_headline`
- `AnimationStep` sub-type with `metric`, `delay_ms`, `rationale`
- Extend `EvolutionInsights` to include optional `plot_plan`

### 3. Deterministic fallback

In `src/lib/evolutionInsights.ts`, add `generateDeterministicPlotPlan(metrics)` that picks metrics based on data availability (if BP data exists, include sbp/dbp; if HR data exists, include hr; etc.) with default stagger timings.

### 4. Update `EvolutionDashboard.tsx`

- On mount, `activeMetrics` starts as an **empty set** (nothing visible)
- When insights load (AI or deterministic), read `plot_plan.animation_sequence`
- Use `setTimeout` chain to add each metric to `activeMetrics` one by one at the specified `delay_ms`, creating a cinematic stagger effect
- Set `dateRangeOption` from `plot_plan.recommended_date_range`
- Show `narrative_headline` as a brief intro text above the chart
- The `focus_metric` gets a subtle glow/emphasis treatment in the chart (thicker line, area fill)
- User can still manually toggle chips after the animation completes

### 5. Update `MetricTrendChart.tsx`

- Accept an optional `focusMetric` prop
- When a series matches `focusMetric`, increase its line width and add area gradient
- Each series uses `animationDelay` from ECharts to stagger its entrance matching the plan

### 6. No new edge function needed

The existing `generate-evolution-insights` function is extended with the additional `plot_plan` property in the tool schema. One API call returns both annotations and the plot plan.

## Files Changed

| File | Change |
|------|--------|
| `src/types/evolutionInsights.ts` | Add `PlotPlan`, `AnimationStep` types; extend `EvolutionInsights` |
| `supabase/functions/generate-evolution-insights/index.ts` | Add `plot_plan` to system prompt and tool schema |
| `src/lib/evolutionInsights.ts` | Add `generateDeterministicPlotPlan()`, include plot_plan in fallback |
| `src/components/evolution/EvolutionDashboard.tsx` | Start with empty metrics, animate sequence from plot plan, show headline |
| `src/components/evolution/MetricTrendChart.tsx` | Accept `focusMetric` prop, apply emphasis styling and per-series animation delay |

## Technical Details

- The animation sequence uses React state updates via `setTimeout` to progressively enable metrics, which triggers ECharts re-render with its built-in enter animation
- The focus metric gets `lineStyle.width: 3` and an area gradient, while non-focus metrics stay at `width: 1.5` with no fill
- ECharts `animationDelay` per series is set from the plan's `delay_ms` values
- If the AI call fails, the deterministic fallback picks all available metrics with 300ms stagger intervals
- User manual toggles override the agent plan at any time -- chips remain interactive

