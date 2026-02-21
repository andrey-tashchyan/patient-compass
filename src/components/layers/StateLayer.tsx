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
      title="État actuel"
      icon={<Activity className="h-4 w-4" />}
      badge={
        <div className="flex items-center gap-2">
          {criticalCount > 0 && <span className="clinical-badge-critical flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{criticalCount} Critique{criticalCount > 1 ? 's' : ''}</span>}
          {warningCount > 0 && <span className="clinical-badge-warning">{warningCount} Anormal{warningCount > 1 ? 'es' : ''}</span>}
        </div>
      }
    >
      <div className="space-y-8">
        {/* Vitals */}
        <div>
          <div className="clinical-label mb-4">Signes vitaux</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {state.vitals.map((v, i) => (
              <div key={i} className={`vital-card ${v.status === 'critical' ? 'ring-1 ring-clinical-critical/30' : v.status === 'warning' ? 'ring-1 ring-clinical-warning/20' : ''}`}>
                <div className="clinical-label mb-2">{v.name}</div>
                <div className={`text-xl font-mono font-bold ${statusClass(v.status)}`}>{v.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{v.unit}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Labs */}
        <div>
          <div className="clinical-label mb-4">Résultats de laboratoire</div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 clinical-label font-semibold">Test</th>
                  <th className="text-left py-3 px-4 clinical-label font-semibold">Valeur</th>
                  <th className="text-left py-3 px-4 clinical-label font-semibold">Référence</th>
                  <th className="text-left py-3 px-4 clinical-label font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {state.labs.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-4 text-data-value font-medium">{l.name}</td>
                    <td className={`py-3 px-4 font-mono font-medium ${statusClass(l.status)}`}>{l.value} {l.unit}</td>
                    <td className="py-3 px-4 text-muted-foreground">{l.referenceRange}</td>
                    <td className="py-3 px-4"><span className={badgeClass(l.status)}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Physical Exam */}
        <div>
          <div className="clinical-label mb-4">Examen physique</div>
          <div className="space-y-3">
            {state.physicalExam.map((pe, i) => (
              <div key={i} className="flex items-start gap-3 text-[13px]">
                <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${pe.status === 'abnormal' ? 'bg-clinical-warning' : 'bg-clinical-normal'}`} />
                <span className="font-medium text-data-value w-36 shrink-0">{pe.system}</span>
                <span className="text-muted-foreground">{pe.finding}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Functional State + Symptoms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="clinical-label mb-4">État fonctionnel</div>
            <div className="space-y-3">
              {state.functionalState.map((fs, i) => (
                <div key={i} className="data-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium text-data-value">{fs.domain}</span>
                    <span className="font-mono text-[13px] font-bold text-primary">{fs.score}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground">{fs.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="clinical-label mb-4">Symptômes actifs</div>
            <div className="space-y-3">
              {state.symptoms.map((s, i) => (
                <div key={i} className="flex items-center justify-between data-card">
                  <span className="text-[13px] text-data-value">{s.symptom}</span>
                  <span className={badgeClass(s.severity)}>{s.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnoses */}
        <div>
          <div className="clinical-label mb-4">Diagnostics actifs</div>
          <div className="space-y-2">
            {state.activeDiagnoses.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px] data-card">
                <span className={`shrink-0 w-2 h-2 rounded-full ${d.severity === 'critical' ? 'bg-clinical-critical' : d.severity === 'warning' ? 'bg-clinical-warning' : 'bg-clinical-normal'}`} />
                <div className="flex-1">
                  <span className="font-medium text-data-value">{d.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{d.icdCode}</span>
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
