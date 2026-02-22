import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChartAnnotation, RiskWindow } from "@/types/evolutionInsights";

interface Props {
  annotations: ChartAnnotation[];
  riskWindows: RiskWindow[];
  source: "ai" | "deterministic";
  selectedAnnotation: ChartAnnotation | null;
  onSelect: (annotation: ChartAnnotation | null) => void;
}

function confidenceColor(c: number) {
  if (c >= 0.9) return "clinical-badge-critical";
  if (c >= 0.7) return "clinical-badge-warning";
  return "clinical-badge-info";
}

export default function AnnotationPanel({
  annotations,
  riskWindows,
  source,
  selectedAnnotation,
  onSelect,
}: Props) {
  if (annotations.length === 0 && riskWindows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        <Info className="mx-auto mb-2 h-5 w-5" />
        No annotations available for this data range.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">Clinical Annotations</h3>
        <Badge variant={source === "ai" ? "default" : "secondary"} className="text-[10px]">
          {source === "ai" ? (
            <><Sparkles className="mr-1 h-3 w-3" /> AI-Generated</>
          ) : (
            "Rule-Based"
          )}
        </Badge>
      </div>

      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        <AnimatePresence>
          {annotations.map((ann, i) => (
            <motion.button
              key={`${ann.time}-${ann.metric}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(selectedAnnotation === ann ? null : ann)}
              className={`w-full rounded-lg border p-3 text-left transition-all hover:border-primary/40 ${
                selectedAnnotation === ann
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-clinical-warning" />
                  <span className="text-xs font-semibold text-foreground">{ann.title}</span>
                </div>
                <span className={confidenceColor(ann.confidence)}>
                  {Math.round(ann.confidence * 100)}%
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {ann.explanation}
              </p>
              <span className="mt-1 block text-[10px] text-muted-foreground/60">
                {ann.time.slice(0, 10)} · {ann.metric}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {riskWindows.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Risk Windows
          </h4>
          {riskWindows.map((rw, i) => (
            <div
              key={`${rw.start}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-clinical-critical/20 bg-clinical-critical/5 px-3 py-2"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-clinical-critical" />
              <div className="flex-1">
                <span className="text-xs font-medium text-foreground">{rw.label}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">
                  {rw.start.slice(0, 10)} → {rw.end.slice(0, 10)}
                </span>
              </div>
              <span className="clinical-badge-critical">{Math.round(rw.confidence * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
