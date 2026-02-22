import { lazy, Suspense, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Activity, Loader2, Sparkles } from "lucide-react";
import CollapsibleLayer from "@/components/CollapsibleLayer";
import { Button } from "@/components/ui/button";
import { generatePatientEvolution } from "@/lib/patientEvolution";
import type { GeneratePatientEvolutionResponse } from "@/types/patientEvolution";

const EvolutionDashboard = lazy(() => import("@/components/evolution/EvolutionDashboard"));

interface Props {
  evolutionUuid: string;
  patientName: string;
}

export default function EvolutionLayer({ evolutionUuid, patientName }: Props) {
  const [hasTriggered, setHasTriggered] = useState(false);

  const mutation = useMutation<GeneratePatientEvolutionResponse, Error, string>({
    mutationFn: generatePatientEvolution,
  });

  const handleGenerate = () => {
    setHasTriggered(true);
    mutation.mutate(evolutionUuid);
  };

  const payload = mutation.data?.payload;

  return (
    <CollapsibleLayer
      title="Evolution Analysis"
      icon={<Activity className="h-4 w-4" />}
      defaultOpen={false}
    >
      {!hasTriggered ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground max-w-md">
            Run the AI-powered evolution pipeline to analyze {patientName}'s complete medical history,
            including timeline, episodes, alerts, and narrative summary.
          </p>
          <Button onClick={handleGenerate} size="sm" className="mt-1">
            <Sparkles className="h-4 w-4 mr-1" />
            Generate Evolution Analysis
          </Button>
        </div>
      ) : mutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Running evolution pipeline...</span>
          <span className="text-xs text-muted-foreground/60">This may take up to 30 seconds</span>
        </div>
      ) : mutation.error ? (
        <div className="py-6 text-center">
          <p className="text-sm text-destructive mb-3">{mutation.error.message}</p>
          <Button onClick={handleGenerate} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      ) : payload ? (
        <Suspense
          fallback={
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading charts...</span>
            </div>
          }
        >
          <EvolutionDashboard payload={payload} />
        </Suspense>
      ) : null}
    </CollapsibleLayer>
  );
}
