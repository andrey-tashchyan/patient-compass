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

export interface EvolutionInsights {
  annotations: ChartAnnotation[];
  risk_windows: RiskWindow[];
  condition_trajectory: ConditionTrajectory[];
  source: "ai" | "deterministic";
}
