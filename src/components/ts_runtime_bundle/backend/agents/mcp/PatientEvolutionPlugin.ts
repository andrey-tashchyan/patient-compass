import path from "node:path";
import { ContextFusionComponent } from "./components/ContextFusionComponent.ts";
import { IdentityAgentComponent } from "./components/IdentityAgentComponent.ts";
import { NarrativeComponent } from "./components/NarrativeComponent.ts";
import { ProfileBuilderComponent } from "./components/ProfileBuilderComponent.ts";
import { TemporalEvolutionComponent } from "./components/TemporalEvolutionComponent.ts";
import type {
  AgentRunContext,
  ContextPayload,
  Episode,
  EvolutionAlert,
  NarrativePayload,
  PatientEvolutionOutput,
  ProfilePayload,
  TemporalPayload,
} from "./types.ts";

export interface PatientEvolutionPluginOptions {
  dataRoot?: string;
  pythonBin?: string;
  agentsDir?: string;
}

export class PatientEvolutionPlugin {
  private readonly dataRoot: string;
  private readonly pythonBin: string;
  private readonly agentsDir: string;

  private readonly identityAgent = new IdentityAgentComponent();
  private readonly profileAgent = new ProfileBuilderComponent();
  private readonly temporalAgent = new TemporalEvolutionComponent();
  private readonly contextAgent = new ContextFusionComponent();
  private readonly narrativeAgent = new NarrativeComponent();

  constructor(options: PatientEvolutionPluginOptions = {}) {
    this.dataRoot = options.dataRoot ?? "data";
    this.pythonBin = options.pythonBin ?? "python";
    this.agentsDir = options.agentsDir ?? path.resolve(process.cwd(), "backend/agents");
  }

  private baseContext(identifier: string): AgentRunContext {
    return {
      identifier,
      dataRoot: this.dataRoot,
      pythonBin: this.pythonBin,
      agentsDir: this.agentsDir,
    };
  }

  private normalizeEpisodes(episodesByGroup: Record<string, Record<string, unknown>[]>): Episode[] {
    const normalized: Episode[] = [];
    let idx = 0;

    for (const [groupName, items] of Object.entries(episodesByGroup ?? {})) {
      for (const item of items ?? []) {
        idx += 1;
        const episodeType = (item.episode_type as string | undefined) ?? groupName;
        normalized.push({
          episode_id: `ep_${String(idx).padStart(6, "0")}`,
          episode_type: episodeType,
          time_start: (item.time_start as string | undefined) ?? null,
          time_end: (item.time_end as string | undefined) ?? null,
          title:
            (item.description as string | undefined) ??
            (item.test_name as string | undefined) ??
            groupName.replaceAll("_", " "),
          description: (item.description as string | undefined) ?? null,
          status: (item.status as string | undefined) ?? null,
          related_event_ids: ((item.event_ids as string[] | undefined) ?? []).filter(Boolean),
          details: (item.details as Record<string, unknown> | undefined) ?? {},
        });
      }
    }

    normalized.sort((a, b) => {
      const tA = a.time_start ?? "";
      const tB = b.time_start ?? "";
      if (tA === tB) {
        return a.episode_id.localeCompare(b.episode_id);
      }
      return tA.localeCompare(tB);
    });

    return normalized;
  }

  private buildAlerts(careItems: string[], episodes: Episode[]): EvolutionAlert[] {
    const alerts: EvolutionAlert[] = [];
    const nowIso = new Date().toISOString();

    for (const [i, message] of (careItems ?? []).entries()) {
      const lower = (message ?? "").toLowerCase();
      let severity: "low" | "medium" | "high" = "medium";
      let alertType = "care_gap";

      if (lower.includes("contradiction")) {
        severity = "high";
        alertType = "contradiction";
      } else if (lower.includes("monitoring need") || lower.includes("abnormal lab")) {
        severity = "high";
        alertType = "abnormal_trend";
      }

      alerts.push({
        alert_id: `al_${String(i + 1).padStart(6, "0")}`,
        severity,
        alert_type: alertType,
        message,
        time_detected: nowIso,
        related_episode_ids: [],
        related_event_ids: [],
        recommended_action: null,
        metadata: {},
      });
    }

    const abnormalEpisodes = episodes.filter((e) => e.episode_type.startsWith("abnormal_lab"));
    const alreadyHasAbnormal = alerts.some((a) => a.alert_type === "abnormal_trend");

    if (abnormalEpisodes.length > 0 && !alreadyHasAbnormal) {
      alerts.push({
        alert_id: `al_${String(alerts.length + 1).padStart(6, "0")}`,
        severity: "high",
        alert_type: "abnormal_trend",
        message: `${abnormalEpisodes.length} abnormal lab trend episode(s) detected.`,
        time_detected: nowIso,
        related_episode_ids: abnormalEpisodes.map((e) => e.episode_id),
        related_event_ids: abnormalEpisodes.flatMap((e) => e.related_event_ids),
        recommended_action:
          "Review trend, confirm clinical significance, and plan follow-up testing.",
        metadata: { episodes_count: abnormalEpisodes.length },
      });
    }

    return alerts;
  }

  async run(identifier: string): Promise<PatientEvolutionOutput> {
    const ctx = this.baseContext(identifier);

    const [identityPayload, profilePayload, temporalPayload, contextPayload, narrativePayload] =
      await Promise.all([
        this.identityAgent.run(ctx),
        this.profileAgent.run(ctx),
        this.temporalAgent.run(ctx),
        this.contextAgent.run(ctx),
        this.narrativeAgent.run(ctx),
      ]);

    const profile = profilePayload as ProfilePayload;
    const temporal = temporalPayload as TemporalPayload;
    const fused = contextPayload as ContextPayload;
    const narrative = narrativePayload as NarrativePayload;

    const timeline = (fused.timeline ?? temporal.timeline ?? []).slice();
    const episodes = this.normalizeEpisodes((fused.episodes ?? temporal.episodes ?? {}) as Record<string, Record<string, unknown>[]>);
    const careItems = (narrative.care_gaps_or_contradictions ?? []).filter((v): v is string => typeof v === "string");
    const alerts = this.buildAlerts(careItems, episodes);

    return {
      patient: profile.patient,
      timeline,
      episodes,
      alerts,
      identity: fused.identity ?? profile.identity ?? identityPayload ?? null,
      narrative,
      metadata: {
        generated_at: new Date().toISOString(),
        source_counts: {
          timeline_events: timeline.length,
          episodes: episodes.length,
          alerts: alerts.length,
        },
        pipeline: {
          identity_agent: this.identityAgent.name,
          profile_builder_agent: this.profileAgent.name,
          temporal_evolution_agent: this.temporalAgent.name,
          context_fusion_agent: this.contextAgent.name,
          narrative_agent: this.narrativeAgent.name,
        },
      },
    };
  }
}
