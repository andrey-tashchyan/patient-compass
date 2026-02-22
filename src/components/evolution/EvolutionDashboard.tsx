import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Activity, Heart, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MetricTrendChart from "./MetricTrendChart";
import DiseaseTimelineChart from "./DiseaseTimelineChart";
import AnnotationPanel from "./AnnotationPanel";
import { deriveMetrics, type DerivedMetrics, BP_STAGE_LABELS } from "@/lib/evolutionMetrics";
import { fetchEvolutionInsights, generateDeterministicInsights } from "@/lib/evolutionInsights";
import type { PatientEvolutionOutput } from "@/types/patientEvolution";
import type { EvolutionInsights, ChartAnnotation } from "@/types/evolutionInsights";

interface Props {
  payload: PatientEvolutionOutput;
}

type DateRangeOption = "30d" | "90d" | "365d" | "all";

const METRIC_CHIPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "sbp", label: "SBP", icon: <Activity className="h-3 w-3" /> },
  { key: "dbp", label: "DBP", icon: <Activity className="h-3 w-3" /> },
  { key: "map", label: "MAP", icon: <TrendingUp className="h-3 w-3" /> },
  { key: "hr", label: "HR", icon: <Heart className="h-3 w-3" /> },
  { key: "sbp_30d", label: "30d Avg", icon: <BarChart3 className="h-3 w-3" /> },
  { key: "annotations", label: "Annotations", icon: <Calendar className="h-3 w-3" /> },
];

export default function EvolutionDashboard({ payload }: Props) {
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all");
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    new Set(["sbp", "dbp", "map", "hr", "annotations"])
  );
  const [insights, setInsights] = useState<EvolutionInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<ChartAnnotation | null>(null);

  const metrics = useMemo(() => deriveMetrics(payload), [payload]);

  // Compute date range
  const dateRange = useMemo((): [number, number] | null => {
    if (dateRangeOption === "all" || !metrics.coverage.dateRange) return null;
    const now = Date.now();
    const days = dateRangeOption === "30d" ? 30 : dateRangeOption === "90d" ? 90 : 365;
    return [now - days * 86400000, now];
  }, [dateRangeOption, metrics.coverage.dateRange]);

  // Fetch AI insights
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInsightsLoading(true);
      try {
        const result = await fetchEvolutionInsights(metrics, payload);
        if (!cancelled) setInsights(result);
      } catch {
        if (!cancelled) setInsights(generateDeterministicInsights(metrics));
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [metrics, payload]);

  const toggleMetric = useCallback((key: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const { coverage } = metrics;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Evolution Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {coverage.totalVitalPoints} data points
            {coverage.dateRange
              ? ` · ${coverage.dateRange.start.slice(0, 10)} → ${coverage.dateRange.end.slice(0, 10)}`
              : ""}
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex gap-1">
          {(["30d", "90d", "365d", "all"] as DateRangeOption[]).map((opt) => (
            <Button
              key={opt}
              size="sm"
              variant={dateRangeOption === opt ? "default" : "outline"}
              onClick={() => setDateRangeOption(opt)}
              className="h-7 px-3 text-xs"
            >
              {opt === "all" ? "All" : opt}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric toggle chips */}
      <div className="flex flex-wrap gap-2">
        {METRIC_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => toggleMetric(chip.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              activeMetrics.has(chip.key)
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/20"
            }`}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.vitals.length > 0 && metrics.vitals[metrics.vitals.length - 1].sbp != null && (
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="clinical-label">Latest BP</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                {metrics.vitals[metrics.vitals.length - 1].sbp}/
                {metrics.vitals[metrics.vitals.length - 1].dbp}
              </p>
              {metrics.vitals[metrics.vitals.length - 1].bpStage && (
                <Badge
                  variant="outline"
                  className="mt-1 text-[10px]"
                >
                  {BP_STAGE_LABELS[metrics.vitals[metrics.vitals.length - 1].bpStage!]}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}
        {metrics.vitals.length > 0 && metrics.vitals[metrics.vitals.length - 1].map != null && (
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="clinical-label">Latest MAP</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                {metrics.vitals[metrics.vitals.length - 1].map}
              </p>
              <span className="text-[10px] text-muted-foreground">mmHg</span>
            </CardContent>
          </Card>
        )}
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="clinical-label">Active Conditions</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {metrics.conditionSpans.filter((c) => c.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="clinical-label">Treatments</p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {metrics.treatmentMarkers.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Annotations layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* BP / Vital Trend Chart */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              Blood Pressure & Vital Trends
            </h3>
            {coverage.hasBP || coverage.hasHR ? (
              <MetricTrendChart
                vitals={metrics.vitals}
                rollingAverages={metrics.rollingAverages}
                annotations={insights?.annotations ?? []}
                riskWindows={insights?.risk_windows ?? []}
                treatmentMarkers={metrics.treatmentMarkers}
                admissionMarkers={metrics.admissionMarkers}
                visibleMetrics={activeMetrics}
                dateRange={dateRange}
                onAnnotationClick={setSelectedAnnotation}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
                No blood pressure or heart rate data available
              </div>
            )}
          </div>

          {/* Disease Timeline */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              Disease Timeline
            </h3>
            <DiseaseTimelineChart
              conditionSpans={metrics.conditionSpans}
              activeConditionTimeline={metrics.activeConditionTimeline}
              conditionTrajectory={insights?.condition_trajectory ?? []}
              dateRange={dateRange}
            />
          </div>
        </div>

        {/* Annotation Panel */}
        <div>
          {insightsLoading ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-xs text-muted-foreground">Generating insights...</span>
            </div>
          ) : (
            <AnnotationPanel
              annotations={insights?.annotations ?? []}
              riskWindows={insights?.risk_windows ?? []}
              source={insights?.source ?? "deterministic"}
              selectedAnnotation={selectedAnnotation}
              onSelect={setSelectedAnnotation}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
