import { Pill } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Medication } from "@/types/patient";

const MedicationsLayer = ({ medications }: { medications: Medication[] }) => (
  <CollapsibleLayer
    title="Medications"
    icon={<Pill className="h-4 w-4" />}
    badge={<span className="clinical-badge-info">{medications.length}</span>}
  >
    {medications.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">No active medications.</p>
    ) : (
      <div className="space-y-2">
        {medications.map((m, i) => (
          <div key={i} className="data-card flex items-start justify-between gap-4">
            <div>
              <div className="text-[13px] font-medium text-data-value">{m.name}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {m.dosage} · {m.frequency}
              </div>
            </div>
            {m.indication && (
              <span className="clinical-badge-muted shrink-0 mt-0.5">{m.indication}</span>
            )}
          </div>
        ))}
      </div>
    )}
  </CollapsibleLayer>
);

export default MedicationsLayer;
