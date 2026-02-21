import { Syringe, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientInterventions } from "@/data/mockPatients";

const InterventionLayer = ({ interventions }: { interventions: PatientInterventions }) => {
  const activeMeds = interventions.medications.filter(m => m.status === 'active');
  const overduePrev = interventions.preventive.filter(p => p.status === 'overdue');

  return (
    <CollapsibleLayer
      title="Intervention Layer"
      icon={<Syringe className="h-4 w-4" />}
      defaultOpen={false}
      badge={
        <div className="flex items-center gap-2">
          <span className="clinical-badge-info">{activeMeds.length} Active Meds</span>
          {overduePrev.length > 0 && <span className="clinical-badge-warning">{overduePrev.length} Overdue</span>}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Medications */}
        <div>
          <div className="clinical-label mb-3">Active Medications</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Medication</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Dose</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Route</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Freq</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Start</th>
                  <th className="text-left py-2 px-2 clinical-label font-semibold">Prescriber</th>
                </tr>
              </thead>
              <tbody>
                {interventions.medications.filter(m => m.status === 'active').map((m, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium text-data-value">{m.name}</td>
                    <td className="py-2 px-2 font-mono text-sm text-data-mono">{m.dose}</td>
                    <td className="py-2 px-2 text-muted-foreground">{m.route}</td>
                    <td className="py-2 px-2 text-muted-foreground">{m.frequency}</td>
                    <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{m.startDate}</td>
                    <td className="py-2 px-2 text-muted-foreground">{m.prescriber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Therapies & Devices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interventions.therapies.length > 0 && (
            <div>
              <div className="clinical-label mb-3">Therapies</div>
              <div className="space-y-2">
                {interventions.therapies.map((t, i) => (
                  <div key={i} className="data-card flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-data-value">{t.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{t.frequency}</span>
                    </div>
                    <span className={t.status === 'active' ? 'clinical-badge-normal' : 'clinical-badge-muted'}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {interventions.devices.length > 0 && (
            <div>
              <div className="clinical-label mb-3">Devices</div>
              <div className="space-y-2">
                {interventions.devices.map((d, i) => (
                  <div key={i} className="data-card">
                    <span className="text-sm font-medium text-data-value">{d.name}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Care Plans */}
        {interventions.carePlans.length > 0 && (
          <div>
            <div className="clinical-label mb-3">Care Plans</div>
            <div className="space-y-2">
              {interventions.carePlans.map((cp, i) => (
                <div key={i} className="data-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-data-value">{cp.name}</span>
                    <span className={cp.status === 'active' ? 'clinical-badge-normal' : 'clinical-badge-muted'}>{cp.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cp.goals.map((g, j) => (
                      <span key={j} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-sm">{g}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preventive */}
        <div>
          <div className="clinical-label mb-3">Preventive Measures</div>
          <div className="space-y-1.5">
            {interventions.preventive.map((p, i) => (
              <div key={i} className="data-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.status === 'overdue' ? <AlertTriangle className="h-3.5 w-3.5 text-clinical-warning" /> :
                   p.status === 'current' ? <CheckCircle className="h-3.5 w-3.5 text-clinical-normal" /> :
                   <Clock className="h-3.5 w-3.5 text-clinical-info" />}
                  <span className="text-sm text-data-value">{p.measure}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Due: {p.nextDue}</span>
                  <span className={p.status === 'overdue' ? 'clinical-badge-warning' : p.status === 'current' ? 'clinical-badge-normal' : 'clinical-badge-info'}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default InterventionLayer;
