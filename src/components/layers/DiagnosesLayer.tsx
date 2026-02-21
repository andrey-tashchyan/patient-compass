import { Stethoscope } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Diagnosis } from "@/types/patient";

const statusLabel: Record<string, string> = {
  active: "Actif",
  chronic: "Chronique",
  resolved: "Résolu",
};

const statusBadge: Record<string, string> = {
  active: "clinical-badge-warning",
  chronic: "clinical-badge-info",
  resolved: "clinical-badge-muted",
};

const DiagnosesLayer = ({ diagnoses }: { diagnoses: Diagnosis[] }) => (
  <CollapsibleLayer
    title="Diagnostics"
    icon={<Stethoscope className="h-4 w-4" />}
    badge={<span className="clinical-badge-info">{diagnoses.filter(d => d.status !== "resolved").length} actifs</span>}
  >
    {diagnoses.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">Aucun diagnostic enregistré.</p>
    ) : (
      <div className="space-y-2">
        {diagnoses.map((d, i) => (
          <div key={i} className="data-card flex items-start justify-between gap-4">
            <div>
              <div className="text-[13px] font-medium text-data-value">{d.condition}</div>
              <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                {d.icd_code && <span className="font-mono text-[11px]">{d.icd_code}</span>}
                {d.date_diagnosed && <span>· {d.date_diagnosed}</span>}
              </div>
            </div>
            <span className={`${statusBadge[d.status || "active"]} shrink-0 mt-0.5`}>
              {statusLabel[d.status || "active"]}
            </span>
          </div>
        ))}
      </div>
    )}
  </CollapsibleLayer>
);

export default DiagnosesLayer;
