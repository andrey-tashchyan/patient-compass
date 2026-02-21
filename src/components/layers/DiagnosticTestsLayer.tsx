import { ClipboardList, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { DiagnosticTest } from "@/types/patient";
import { EditableText } from "../EditableField";
import { Button } from "@/components/ui/button";

interface Props {
  tests: DiagnosticTest[];
  editing?: boolean;
  onUpdate?: (tests: DiagnosticTest[]) => void;
}

const DiagnosticTestsLayer = ({ tests, editing, onUpdate }: Props) => {
  const update = (index: number, field: keyof DiagnosticTest, value: string) => {
    const next = [...tests];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...tests, { test_type: "", date_performed: "", findings: "", interpretation: "", ordered_by: "" }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(tests.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Diagnostic Tests"
      icon={<ClipboardList className="h-4 w-4" />}
      badge={<span className="clinical-badge-info">{tests.length}</span>}
    >
      {tests.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No diagnostic tests.</p>
      ) : (
        <div className="space-y-3">
          {tests.map((t, i) => (
            <div key={i} className="data-card space-y-2">
              <div className="flex items-center justify-between gap-4">
                <EditableText value={t.test_type} editing={!!editing} onChange={(v) => update(i, "test_type", v)} className="text-[13px] font-medium text-data-value" placeholder="Test type" />
                <div className="flex items-center gap-2 shrink-0">
                  <EditableText value={t.date_performed} editing={!!editing} onChange={(v) => update(i, "date_performed", v)} className="font-mono text-[11px] text-muted-foreground" placeholder="Date" />
                  {editing && (
                    <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="space-y-1">
                  <EditableText value={t.ordered_by || ""} editing onChange={(v) => update(i, "ordered_by", v)} placeholder="Ordered by" />
                  <EditableText value={t.findings} editing onChange={(v) => update(i, "findings", v)} placeholder="Findings" multiline />
                  <EditableText value={t.interpretation} editing onChange={(v) => update(i, "interpretation", v)} placeholder="Interpretation" multiline />
                </div>
              ) : (
                <>
                  {t.ordered_by && <div className="text-[12px] text-muted-foreground">Ordered by {t.ordered_by}</div>}
                  <div className="text-[13px] text-data-value leading-relaxed">{t.findings}</div>
                  <div className="text-[12px] text-primary font-medium">Interpretation: {t.interpretation}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default DiagnosticTestsLayer;
