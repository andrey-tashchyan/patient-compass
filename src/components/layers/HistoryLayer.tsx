import { useState } from "react";
import { History, Stethoscope, FlaskConical, Pill, AlertCircle, FileText } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientHistory, TimelineEvent } from "@/data/mockPatients";

const typeConfig: Record<TimelineEvent['type'], { icon: React.ReactNode; color: string }> = {
  encounter: { icon: <Stethoscope className="h-3.5 w-3.5" />, color: 'bg-clinical-info' },
  procedure: { icon: <FlaskConical className="h-3.5 w-3.5" />, color: 'bg-primary' },
  diagnosis: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'bg-clinical-warning' },
  medication: { icon: <Pill className="h-3.5 w-3.5" />, color: 'bg-clinical-normal' },
  problem: { icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-clinical-muted' },
};

const HistoryLayer = ({ history }: { history: PatientHistory }) => {
  const [filter, setFilter] = useState<string>('all');

  const types = ['all', 'encounter', 'procedure', 'diagnosis', 'medication', 'problem'] as const;
  const filtered = filter === 'all' ? history.timeline : history.timeline.filter(e => e.type === filter);

  return (
    <CollapsibleLayer title="History Layer — Timeline" icon={<History className="h-4 w-4" />} defaultOpen={false}>
      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${
                filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {filtered.map((event) => {
              const cfg = typeConfig[event.type];
              return (
                <div key={event.id} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full ${cfg.color} flex items-center justify-center text-primary-foreground shrink-0 z-10`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 data-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-data-value">{event.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">{event.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    {event.provider && <p className="text-xs text-muted-foreground mt-1">Provider: {event.provider}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exposures & Family History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="clinical-label mb-3">Exposure History</div>
            <div className="space-y-2">
              {history.exposures.map((e, i) => (
                <div key={i} className="data-card">
                  <span className="clinical-badge-info mr-2">{e.type}</span>
                  <span className="text-sm text-data-value">{e.detail}</span>
                  <span className="text-xs text-muted-foreground ml-2">({e.duration})</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="clinical-label mb-3">Family & Genetic History</div>
            <div className="space-y-2">
              {history.familyHistory.map((f, i) => (
                <div key={i} className="data-card">
                  <span className="text-sm font-medium text-data-value">{f.relation}:</span>
                  <span className="text-sm text-muted-foreground ml-2">{f.condition}</span>
                  {f.ageOfOnset && <span className="text-xs text-muted-foreground ml-1">(age {f.ageOfOnset})</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default HistoryLayer;
