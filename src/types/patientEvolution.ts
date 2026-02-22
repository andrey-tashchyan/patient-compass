export type JsonObject = Record<string, unknown>;

export interface IdentityPayload extends JsonObject {
  query_identifier?: string;
  csv_patient_uuid?: string | null;
  stable_patient_id?: string | null;
  medical_record_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  matched_by?: string[];
  confidence?: number;
  evidence?: unknown[];
}

export interface TimelineEvent extends JsonObject {
  event_id?: string;
  category?: string;
  subtype?: string;
  time_start?: string | null;
  time_end?: string | null;
  description?: string | null;
  code?: string | null;
  value?: string | null;
  unit?: string | null;
  flagged_abnormal?: boolean;
  source_dataset?: string | null;
  source_file?: string | null;
  clinical_context?: JsonObject;
  provenance?: JsonObject;
}

export interface Episode extends JsonObject {
  episode_id: string;
  episode_type: string;
  time_start?: string | null;
  time_end?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  related_event_ids: string[];
  details: JsonObject;
}

export interface EvolutionAlert extends JsonObject {
  alert_id: string;
  severity: "low" | "medium" | "high";
  alert_type: string;
  message: string;
  time_detected: string;
  related_episode_ids: string[];
  related_event_ids: string[];
  recommended_action?: string | null;
  metadata: JsonObject;
}

export interface NarrativePayload extends JsonObject {
  baseline_profile?: string;
  evolution_by_condition?: string[];
  changes_last_30_days?: string;
  changes_last_90_days?: string;
  changes_last_365_days?: string;
  care_gaps_or_contradictions?: string[];
  evolution_timeline_summary?: string;
  generation_mode?: "ai" | "deterministic";
  generation_model?: string | null;
  generation_provider?: string | null;
}

export interface PatientEvolutionOutput extends JsonObject {
  patient?: JsonObject;
  timeline: TimelineEvent[];
  episodes: Episode[];
  alerts: EvolutionAlert[];
  identity?: IdentityPayload | null;
  narrative: NarrativePayload;
  metadata: {
    generated_at: string;
    source_counts: {
      timeline_events: number;
      episodes: number;
      alerts: number;
    };
    pipeline: {
      identity_agent: string;
      profile_builder_agent: string;
      temporal_evolution_agent: string;
      context_fusion_agent: string;
      narrative_agent: string;
    };
  };
}

export interface GeneratePatientEvolutionResponse {
  patient_id: string;
  storage_bucket: string;
  storage_path: string;
  payload: PatientEvolutionOutput;
}
