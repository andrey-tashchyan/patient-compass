import { Pill, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Medication } from "@/types/patient";
import { EditableText } from "../EditableField";
import { Button } from "@/components/ui/button";

interface Props {
  medications: Medication[];
  editing?: boolean;
  onUpdate?: (meds: Medication[]) => void;
}

const MedicationsLayer = ({ medications, editing, onUpdate }: Props) => {
  const update = (index: number, field: keyof Medication, value: string) => {
    const next = [...medications];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...medications, { name: "", dosage: "", frequency: "", indication: "" }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(medications.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Medications"
      icon={<Pill className="h-4 w-4" />}
      badge={<span className="clinical-badge-info">{medications.length}</span>}
    >
      {medications.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No active medications.</p>
      ) : (
        <div className="space-y-2">
          {medications.map((m, i) => (
            <div key={i} className="data-card flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <EditableText value={m.name} editing={!!editing} onChange={(v) => update(i, "name", v)} className="text-[13px] font-medium text-data-value" placeholder="Medication name" />
                {editing ? (
                  <div className="flex gap-2">
                    <EditableText value={m.dosage} editing onChange={(v) => update(i, "dosage", v)} placeholder="Dosage" />
                    <EditableText value={m.frequency} editing onChange={(v) => update(i, "frequency", v)} placeholder="Frequency" />
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    {m.dosage} · {m.frequency}
                  </div>
                )}
              </div>
              {editing ? (
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <EditableText value={m.indication || ""} editing onChange={(v) => update(i, "indication", v)} placeholder="Indication" />
                  <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                m.indication && <span className="clinical-badge-muted shrink-0 mt-0.5">{m.indication}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Medication
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default MedicationsLayer;
