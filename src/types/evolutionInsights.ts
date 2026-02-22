/** Types for AI-generated evolution insights */

export interface ChartAnnotation {
  time: string;
  metric: string;
  title: string;
  explanation: string;
  confidence: number;
  related_event_ids: string[];
}

export interface RiskWindow {
  start: string;
  end: string;
  label: string;
  confidence: number;
}

export interface ConditionTrajectory {
  condition: string;
  phase: string;
  start: string;
  end: string;
  confidence: number;
}

export interface AnimationStep {
  metric: string;
  delay_ms: number;
  rationale: string;
}

export interface PlotPlan {
  recommended_metrics: string[];
  focus_metric: string;
  recommended_date_range: "30d" | "90d" | "365d" | "all";
  animation_sequence: AnimationStep[];
  narrative_headline: string;
}

export interface EvolutionInsights {
  annotations: ChartAnnotation[];
  risk_windows: RiskWindow[];
  condition_trajectory: ConditionTrajectory[];
  plot_plan?: PlotPlan;
  source: "ai" | "deterministic";
}
