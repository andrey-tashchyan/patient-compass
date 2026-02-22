import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  FileText,
  Mic,
  DollarSign,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppHeader from "@/components/AppHeader";
import {
  computeROIMetrics,
  computeSafetyIndex,
  getClinicalEvents,
  seedDemoData,
  type ClinicalEvent,
} from "@/lib/clinicalEventTracker";

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  accent?: string;
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`mt-2 text-2xl font-bold tabular-nums ${accent || "text-foreground"}`}>{value}</p>
            {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SafetyGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
      ? "text-amber-500"
      : score >= 40
      ? "text-orange-500"
      : "text-destructive";

  return (
    <Card className="border-border">
      <CardContent className="p-6 flex flex-col items-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Clinical Safety Index
        </p>
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={`${(score / 100) * 314} 314`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ${color}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <Badge variant="outline" className="mt-3 text-xs">
          {label}
        </Badge>
      </CardContent>
    </Card>
  );
}

function EventTimeline({ events }: { events: ClinicalEvent[] }) {
  const recent = events.slice(-15).reverse();
  const eventIcons: Record<string, React.ElementType> = {
    consultation_generated: FileText,
    voice_dictation_processed: Mic,
    pdf_structured: FileText,
    prescription_checked: Shield,
    contraindication_detected: AlertTriangle,
    red_flag_identified: AlertTriangle,
  };
  const eventColors: Record<string, string> = {
    consultation_generated: "text-primary",
    voice_dictation_processed: "text-primary",
    pdf_structured: "text-primary",
    prescription_checked: "text-emerald-500",
    contraindication_detected: "text-amber-500",
    red_flag_identified: "text-destructive",
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {recent.map((e) => {
          const Icon = eventIcons[e.eventName] || Activity;
          const color = eventColors[e.eventName] || "text-muted-foreground";
          return (
            <div key={e.id} className="flex items-start gap-3">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {e.eventName.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(e.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {recent.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No events recorded yet</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const [events, setEvents] = useState<ClinicalEvent[]>([]);

  useEffect(() => {
    seedDemoData();
    setEvents(getClinicalEvents());
  }, []);

  const roi = useMemo(() => computeROIMetrics(), [events]);
  const safety = useMemo(() => computeSafetyIndex(), [events]);

  const totalTimeSavedHours = Math.round(roi.estimatedTimeSavedMinutes / 60);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              ROI & Safety Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clinical intelligence metrics powered by Paid.ai signal tracking
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              icon={FileText}
              label="Consultations"
              value={roi.totalConsultations}
              subtext="Total generated"
            />
            <StatCard
              icon={Shield}
              label="Errors Prevented"
              value={roi.totalErrorsPrevented}
              subtext="Contraindications + Red flags"
              accent="text-emerald-600"
            />
            <StatCard
              icon={Clock}
              label="Time Saved"
              value={`${totalTimeSavedHours}h`}
              subtext={`${roi.estimatedTimeSavedMinutes} minutes total`}
            />
            <StatCard
              icon={Zap}
              label="Usage This Month"
              value={roi.usageThisMonth}
              subtext="All events"
            />
            <StatCard
              icon={DollarSign}
              label="Estimated Value"
              value={`$${roi.simulatedBillingAmount}`}
              subtext="Simulated billing"
            />
          </div>

          {/* Safety + Timeline */}
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            <SafetyGauge score={safety.score} label={safety.label} />

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Safety Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-amber-500">{safety.contraindictionsDetected}</p>
                    <p className="text-xs text-muted-foreground mt-1">Contraindications Detected</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{safety.redFlagsIdentified}</p>
                    <p className="text-xs text-muted-foreground mt-1">Red Flags Identified</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-500">{safety.highRiskPrevented}</p>
                    <p className="text-xs text-muted-foreground mt-1">High-Risk Prevented</p>
                  </div>
                </div>

                {roi.topRedFlags.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold text-foreground mb-3">Top Red Flags</p>
                    <div className="space-y-2">
                      {roi.topRedFlags.map((rf, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-xs text-foreground">{rf.flag}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{rf.count}×</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Event Usage by Type + Timeline */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Usage by Feature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Consultations Generated", event: "consultation_generated", icon: FileText },
                    { name: "Voice Dictations", event: "voice_dictation_processed", icon: Mic },
                    { name: "PDFs Structured", event: "pdf_structured", icon: FileText },
                    { name: "Prescriptions Checked", event: "prescription_checked", icon: Shield },
                    { name: "Contraindications Detected", event: "contraindication_detected", icon: AlertTriangle },
                    { name: "Red Flags Identified", event: "red_flag_identified", icon: AlertTriangle },
                  ].map((item) => {
                    const count = events.filter((e) => e.eventName === item.event).length;
                    const maxCount = Math.max(1, ...events.reduce((acc, e) => {
                      const n = e.eventName;
                      acc.set(n, (acc.get(n) || 0) + 1);
                      return acc;
                    }, new Map<string, number>()).values());
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={item.event} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-foreground">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-semibold text-foreground">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <EventTimeline events={events} />
          </div>

          {/* Hackathon demo CTA */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Powered by Paid.ai</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Every AI interaction in CliniVIEW sends a structured usage signal to Paid.ai.
                    This enables real-time billing, safety analytics, and ROI tracking — turning
                    clinical AI into a measurable, monetizable product.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
