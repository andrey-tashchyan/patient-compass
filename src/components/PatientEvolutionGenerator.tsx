import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generatePatientEvolution } from "@/lib/patientEvolution";
import type { GeneratePatientEvolutionResponse } from "@/types/patientEvolution";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function PatientEvolutionGenerator() {
  const [identifier, setIdentifier] = useState("");

  const mutation = useMutation<GeneratePatientEvolutionResponse, Error, string>({
    mutationFn: generatePatientEvolution,
  });

  const payload = mutation.data?.payload;
  const identity = payload?.identity;
  const narrative = payload?.narrative;

  const narrativeSections = useMemo(
    () => [
      {
        title: "Baseline profile",
        body: narrative?.baseline_profile,
      },
      {
        title: "Evolution summary",
        body: narrative?.evolution_timeline_summary,
      },
      {
        title: "30-day change",
        body: narrative?.changes_last_30_days,
      },
      {
        title: "90-day change",
        body: narrative?.changes_last_90_days,
      },
      {
        title: "365-day change",
        body: narrative?.changes_last_365_days,
      },
    ].filter((section) => section.body),
    [narrative],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(identifier);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Generate Patient Evolution</CardTitle>
          <CardDescription>
            Enter a patient UUID or full patient name (case-insensitive exact match).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="e.g. 20c3ca32-ec09-4e7c-abab-9f7711cbe235 or Scotty190 Spencer878"
              disabled={mutation.isPending}
            />
            <Button type="submit" disabled={mutation.isPending || !identifier.trim()} className="sm:w-auto">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running pipeline...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {mutation.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {payload ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identity</CardTitle>
              <CardDescription>Resolved patient identity and match provenance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">ID: {identity?.csv_patient_uuid ?? "unknown"}</Badge>
                {identity?.confidence != null ? (
                  <Badge variant="outline">confidence {identity.confidence}</Badge>
                ) : null}
              </div>
              <p className="text-foreground">
                {(identity?.first_name ?? "").trim()} {(identity?.last_name ?? "").trim()}
              </p>
              {identity?.matched_by?.length ? (
                <p className="text-xs text-muted-foreground">Matched by: {identity.matched_by.join(", ")}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Narrative</CardTitle>
              <CardDescription>
                Mode: {narrative?.generation_mode ?? "deterministic"}
                {narrative?.generation_model ? ` - ${narrative.generation_model}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {narrativeSections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.body}</p>
                </div>
              ))}

              {narrative?.evolution_by_condition?.length ? (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Evolution by condition</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {narrative.evolution_by_condition.map((item, index) => (
                      <li key={`${index}-${item}`}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {narrative?.care_gaps_or_contradictions?.length ? (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">Care gaps / contradictions</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {narrative.care_gaps_or_contradictions.map((item, index) => (
                      <li key={`${index}-${item}`}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
              <CardDescription>Counts and storage persistence details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Timeline events" value={payload.metadata.source_counts.timeline_events} />
                <Stat label="Episodes" value={payload.metadata.source_counts.episodes} />
                <Stat label="Alerts" value={payload.metadata.source_counts.alerts} />
              </div>

              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Storage bucket:</span>{" "}
                  {mutation.data?.storage_bucket}
                </p>
                <p className="mt-1 break-all">
                  <span className="font-medium text-foreground">Storage path:</span>{" "}
                  {mutation.data?.storage_path}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
