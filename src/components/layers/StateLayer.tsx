import { Activity, AlertTriangle } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientState } from "@/data/mockPatients";

const statusClass = (s: string) =>
  s === 'critical' ? 'clinical-critical' : s === 'warning' ? 'clinical-warning' : 'clinical-normal';

const badgeClass = (s: string) =>
  s === 'critical' ? 'clinical-badge-critical' : s === 'warning' ? 'clinical-badge-warning' : s === 'severe' ? 'clinical-badge-critical' : s === 'moderate' ? 'clinical-badge-warning' : s === 'mild' ? 'clinical-badge-muted' : 'clinical-badge-normal';

const StateLayer = ({ state }: { state: PatientState }) => {
  const criticalCount = [...state.vitals, ...state.labs].filter(v => v.status === 'critical').length;
  const warningCount = [...state.vitals, ...state.labs].filter(v => v.status === 'warning').length;

  return (
    <CollapsibleLayer
      title="State Layer — Real-Time Snapshot"
      icon={<Activity className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-2">
          {criticalCount > 0 && <span className="clinical-badge-critical flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{criticalCount} Critical</span>}
          {warningCount > 0 && <span className="clinical-badge-warning">{warningCount} Abnormal</span>}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Vitals */}
        <div>
          <div className="clinical-label mb-3">Vital Signs</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {state.vitals.map((v, i) => (
              <div key={i} className={`vital-card ${v.status === 'critical' ? 'border-clinical-critical/40 animate-pulse-critical' : v.status === 'warning' ? 'border-clinical-warning/40' : ''}`}>
                <div className="clinical-label mb-1">{v.name}</div>
                <div className={`text-xl font-mono font-bold ${statusClass(v.status)}`}>{v.value}</div>
                <div className="text-xs text-muted-foreground">{v.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Labs */}
        <div>
          <div className="clinical-label mb-3">Recent Lab Values</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Test</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Value</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Reference</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {state.labs.map((l, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2 text-data-value">{l.name}</td>
                    <td className={`py-2 px-2 font-mono font-medium ${statusClass(l.status)}`}>{l.value} {l.unit}</td>
                    <td className="py-2 px-2 text-muted-foreground">{l.referenceRange}</td>
                    <td className="py-2 px-2"><span className={badgeClass(l.status)}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Physical Exam */}
        <div>
          <div className="clinical-label mb-3">Physical Exam Findings</div>
          <div className="space-y-1.5">
            {state.physicalExam.map((pe, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${pe.status === 'abnormal' ? 'bg-clinical-warning' : 'bg-clinical-normal'}`} />
                <span className="font-medium text-data-value w-32 shrink-0">{pe.system}</span>
                <span className="text-muted-foreground">{pe.finding}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Functional State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="clinical-label mb-3">Functional State</div>
            <div className="space-y-2">
              {state.functionalState.map((fs, i) => (
                <div key={i} className="data-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-data-value">{fs.domain}</span>
                    <span className="font-mono text-sm font-bold text-primary">{fs.score}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{fs.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="clinical-label mb-3">Active Symptoms</div>
            <div className="space-y-2">
              {state.symptoms.map((s, i) => (
                <div key={i} className="flex items-center justify-between data-card">
                  <span className="text-sm text-data-value">{s.symptom}</span>
                  <span className={badgeClass(s.severity)}>{s.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        <div>
          <div className="clinical-label mb-3">Active Diagnoses</div>
          <div className="space-y-1.5">
            {state.activeDiagnoses.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-sm data-card">
                <span className={`shrink-0 w-2 h-2 rounded-full ${d.severity === 'critical' ? 'bg-clinical-critical animate-pulse-critical' : d.severity === 'warning' ? 'bg-clinical-warning' : 'bg-clinical-normal'}`} />
                <div className="flex-1">
                  <span className="font-medium text-data-value">{d.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{d.icdCode}</span>
                </div>
                <span className={badgeClass(d.status === 'active' ? 'warning' : d.status === 'chronic' ? 'moderate' : 'mild')}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default StateLayer;
