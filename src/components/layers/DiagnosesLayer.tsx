import { Stethoscope, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Diagnosis } from "@/types/patient";
import { EditableText, EditableSelect } from "../EditableField";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  active: "Active",
  chronic: "Chronic",
  resolved: "Resolved",
};

const statusBadge: Record<string, string> = {
  active: "clinical-badge-warning",
  chronic: "clinical-badge-info",
  resolved: "clinical-badge-muted",
};

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "chronic", label: "Chronic" },
  { value: "resolved", label: "Resolved" },
];

interface Props {
  diagnoses: Diagnosis[];
  editing?: boolean;
  onUpdate?: (diagnoses: Diagnosis[]) => void;
}

const DiagnosesLayer = ({ diagnoses, editing, onUpdate }: Props) => {
  const update = (index: number, field: keyof Diagnosis, value: any) => {
    const next = [...diagnoses];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...diagnoses, { condition: "", icd_code: "", status: "active", date_diagnosed: "" }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(diagnoses.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Diagnoses"
      icon={<Stethoscope className="h-4 w-4" />}
      badge={<span className="clinical-badge-info">{diagnoses.filter(d => d.status !== "resolved").length} active</span>}
    >
      {diagnoses.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No diagnoses recorded.</p>
      ) : (
        <div className="space-y-2">
          {diagnoses.map((d, i) => (
            <div key={i} className="data-card flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <EditableText value={d.condition} editing={!!editing} onChange={(v) => update(i, "condition", v)} className="text-[13px] font-medium text-data-value" placeholder="Condition" />
                <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                  {editing ? (
                    <>
                      <EditableText value={d.icd_code || ""} editing onChange={(v) => update(i, "icd_code", v)} placeholder="ICD code" className="font-mono" />
                      <EditableText value={d.date_diagnosed || ""} editing onChange={(v) => update(i, "date_diagnosed", v)} placeholder="Date diagnosed" />
                    </>
                  ) : (
                    <>
                      {d.icd_code && <span className="font-mono text-[11px]">{d.icd_code}</span>}
                      {d.date_diagnosed && <span>· {d.date_diagnosed}</span>}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {editing ? (
                  <>
                    <EditableSelect value={d.status || "active"} editing onChange={(v) => update(i, "status", v)} options={statusOptions} />
                    <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className={`${statusBadge[d.status || "active"]} shrink-0`}>
                    {statusLabel[d.status || "active"]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Diagnosis
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default DiagnosesLayer;
