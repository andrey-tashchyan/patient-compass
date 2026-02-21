import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Allergy } from "@/types/patient";
import { AllergyStatus } from "@/types/patient";
import { EditableText, EditableSelect } from "../EditableField";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  [AllergyStatus.CONFIRMED]: "Confirmed",
  [AllergyStatus.SUSPECTED]: "Suspected",
  [AllergyStatus.DENIED]: "Denied",
};

const statusBadge: Record<string, string> = {
  [AllergyStatus.CONFIRMED]: "clinical-badge-critical",
  [AllergyStatus.SUSPECTED]: "clinical-badge-warning",
  [AllergyStatus.DENIED]: "clinical-badge-muted",
};

const statusOptions = [
  { value: AllergyStatus.CONFIRMED, label: "Confirmed" },
  { value: AllergyStatus.SUSPECTED, label: "Suspected" },
  { value: AllergyStatus.DENIED, label: "Denied" },
];

interface Props {
  allergies: Allergy[];
  editing?: boolean;
  onUpdate?: (allergies: Allergy[]) => void;
}

const AllergiesLayer = ({ allergies, editing, onUpdate }: Props) => {
  const update = (index: number, field: keyof Allergy, value: any) => {
    const next = [...allergies];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...allergies, { allergen: "", reaction: "", status: AllergyStatus.CONFIRMED }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(allergies.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Allergies"
      icon={<AlertTriangle className="h-4 w-4" />}
      badge={allergies.length > 0 ? <span className="clinical-badge-critical">{allergies.length}</span> : undefined}
    >
      {allergies.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No known allergies.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="clinical-label pb-2 pr-4">Allergen</th>
                <th className="clinical-label pb-2 pr-4">Reaction</th>
                <th className="clinical-label pb-2">Status</th>
                {editing && <th className="pb-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allergies.map((a, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 font-medium text-data-value">
                    <EditableText value={a.allergen} editing={!!editing} onChange={(v) => update(i, "allergen", v)} placeholder="Allergen" />
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <EditableText value={a.reaction || ""} editing={!!editing} onChange={(v) => update(i, "reaction", v)} placeholder="Reaction" />
                  </td>
                  <td className="py-2.5">
                    {editing ? (
                      <EditableSelect value={a.status || AllergyStatus.CONFIRMED} editing onChange={(v) => update(i, "status", v)} options={statusOptions} />
                    ) : (
                      <span className={statusBadge[a.status || AllergyStatus.CONFIRMED]}>
                        {statusLabel[a.status || AllergyStatus.CONFIRMED]}
                      </span>
                    )}
                  </td>
                  {editing && (
                    <td className="py-2.5">
                      <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Allergy
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default AllergiesLayer;
