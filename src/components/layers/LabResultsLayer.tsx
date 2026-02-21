import { FlaskConical, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { LabResult } from "@/types/patient";
import { EditableText } from "../EditableField";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Props {
  results: LabResult[];
  editing?: boolean;
  onUpdate?: (results: LabResult[]) => void;
}

const LabResultsLayer = ({ results, editing, onUpdate }: Props) => {
  const flaggedCount = results.filter((r) => r.flagged).length;

  const update = (index: number, field: keyof LabResult, value: any) => {
    const next = [...results];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...results, { test_name: "", result: "", unit: "", reference_range: "", flagged: false, date_performed: "" }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(results.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Lab Results"
      icon={<FlaskConical className="h-4 w-4" />}
      badge={
        flaggedCount > 0
          ? <span className="clinical-badge-warning">{flaggedCount} abnormal</span>
          : <span className="clinical-badge-normal">Normal</span>
      }
    >
      {results.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No lab results.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="clinical-label pb-2 pr-4">Test</th>
                <th className="clinical-label pb-2 pr-4">Result</th>
                <th className="clinical-label pb-2 pr-4">Unit</th>
                <th className="clinical-label pb-2 pr-4">Reference</th>
                <th className="clinical-label pb-2">Date</th>
                {editing && <th className="clinical-label pb-2">Flag</th>}
                {editing && <th className="pb-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {results.map((r, i) => (
                <tr key={i} className={r.flagged ? 'bg-clinical-critical/[0.03]' : ''}>
                  <td className="py-2.5 pr-4 font-medium text-data-value">
                    {!editing && r.flagged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-clinical-critical mr-2 align-middle" />}
                    <EditableText value={r.test_name} editing={!!editing} onChange={(v) => update(i, "test_name", v)} placeholder="Test name" />
                  </td>
                  <td className={`py-2.5 pr-4 font-mono text-[12px] ${r.flagged ? 'clinical-critical font-semibold' : 'text-data-value'}`}>
                    <EditableText value={r.result} editing={!!editing} onChange={(v) => update(i, "result", v)} placeholder="Result" />
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <EditableText value={r.unit} editing={!!editing} onChange={(v) => update(i, "unit", v)} placeholder="Unit" />
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-[11px]">
                    <EditableText value={r.reference_range} editing={!!editing} onChange={(v) => update(i, "reference_range", v)} placeholder="Ref range" />
                  </td>
                  <td className="py-2.5 text-muted-foreground font-mono text-[11px]">
                    <EditableText value={r.date_performed || ""} editing={!!editing} onChange={(v) => update(i, "date_performed", v)} placeholder="Date" />
                  </td>
                  {editing && (
                    <td className="py-2.5">
                      <Checkbox checked={!!r.flagged} onCheckedChange={(v) => update(i, "flagged", !!v)} />
                    </td>
                  )}
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
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Lab Result
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default LabResultsLayer;
