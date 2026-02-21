import { Scan, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ImagingStudy } from "@/types/patient";
import { EditableText } from "../EditableField";
import { Button } from "@/components/ui/button";

interface Props {
  studies: ImagingStudy[];
  editing?: boolean;
  onUpdate?: (studies: ImagingStudy[]) => void;
}

const ImagingLayer = ({ studies, editing, onUpdate }: Props) => {
  const update = (index: number, field: keyof ImagingStudy, value: string) => {
    const next = [...studies];
    next[index] = { ...next[index], [field]: value };
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...studies, { study_type: "", body_part: "", findings: "", impression: "", date_performed: "", radiologist: "" }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(studies.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Imaging Studies"
      icon={<Scan className="h-4 w-4" />}
      badge={<span className="clinical-badge-info">{studies.length}</span>}
    >
      {studies.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No imaging studies.</p>
      ) : (
        <div className="space-y-3">
          {studies.map((s, i) => (
            <div key={i} className="data-card space-y-2">
              <div className="flex items-center justify-between gap-4">
                <EditableText value={s.study_type} editing={!!editing} onChange={(v) => update(i, "study_type", v)} className="text-[13px] font-medium text-data-value" placeholder="Study type" />
                <div className="flex items-center gap-2 shrink-0">
                  <EditableText value={s.date_performed} editing={!!editing} onChange={(v) => update(i, "date_performed", v)} className="font-mono text-[11px] text-muted-foreground" placeholder="Date" />
                  {editing && (
                    <button onClick={() => removeItem(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="space-y-1">
                  <EditableText value={s.body_part} editing onChange={(v) => update(i, "body_part", v)} placeholder="Body part" />
                  <EditableText value={s.radiologist || ""} editing onChange={(v) => update(i, "radiologist", v)} placeholder="Radiologist" />
                  <EditableText value={s.findings} editing onChange={(v) => update(i, "findings", v)} placeholder="Findings" multiline />
                  <EditableText value={s.impression} editing onChange={(v) => update(i, "impression", v)} placeholder="Impression" multiline />
                </div>
              ) : (
                <>
                  <div className="text-[12px] text-muted-foreground">{s.body_part}{s.radiologist && <> · {s.radiologist}</>}</div>
                  <div className="text-[13px] text-data-value leading-relaxed">{s.findings}</div>
                  <div className="text-[12px] text-primary font-medium mt-1">Impression: {s.impression}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Study
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default ImagingLayer;
