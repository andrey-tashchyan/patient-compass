import { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Activity, Plus, Trash2 } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ClinicalNote } from "@/types/patient";
import { EditableText } from "../EditableField";
import { Button } from "@/components/ui/button";

const VitalsInline = ({ vs }: { vs: NonNullable<ClinicalNote["vital_signs"]> }) => (
  <div className="flex flex-wrap gap-3 mt-3 p-3 rounded-lg bg-muted/50 text-[12px]">
    <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
    {vs.blood_pressure_systolic && vs.blood_pressure_diastolic && (
      <span><strong>BP</strong> {vs.blood_pressure_systolic}/{vs.blood_pressure_diastolic}</span>
    )}
    {vs.heart_rate && <span><strong>HR</strong> {vs.heart_rate} bpm</span>}
    {vs.temperature_fahrenheit && <span><strong>Temp</strong> {vs.temperature_fahrenheit} °F</span>}
    {vs.bmi && <span><strong>BMI</strong> {vs.bmi}</span>}
  </div>
);

interface NoteCardProps {
  note: ClinicalNote;
  editing?: boolean;
  onChange?: (note: ClinicalNote) => void;
  onRemove?: () => void;
}

const NoteCard = ({ note, editing, onChange, onRemove }: NoteCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const update = (field: keyof ClinicalNote, value: string) => {
    onChange?.({ ...note, [field]: value });
  };

  return (
    <div className="layer-section">
      <button className="w-full px-5 py-3.5 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-semibold text-data-value">{note.note_type}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-[11px] text-muted-foreground">{note.date_of_service}</span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            {note.provider_name}, {note.provider_credentials}
            {note.chief_complaint && <> — {note.chief_complaint}</>}
          </div>
        </div>
        {editing && (
          <div onClick={(e) => e.stopPropagation()}>
            <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
          {editing && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="clinical-label mb-1">Note Type</div>
                <EditableText value={note.note_type} editing onChange={(v) => update("note_type", v)} placeholder="Note type" />
              </div>
              <div>
                <div className="clinical-label mb-1">Date</div>
                <EditableText value={note.date_of_service} editing onChange={(v) => update("date_of_service", v)} placeholder="Date" />
              </div>
              <div>
                <div className="clinical-label mb-1">Provider</div>
                <EditableText value={note.provider_name} editing onChange={(v) => update("provider_name", v)} placeholder="Provider" />
              </div>
              <div>
                <div className="clinical-label mb-1">Credentials</div>
                <EditableText value={note.provider_credentials} editing onChange={(v) => update("provider_credentials", v)} placeholder="Credentials" />
              </div>
            </div>
          )}
          <div>
            <div className="clinical-label mb-1">Summary</div>
            <EditableText value={note.summary} editing={!!editing} onChange={(v) => update("summary", v)} className="text-data-value leading-relaxed whitespace-pre-wrap" multiline={editing} />
          </div>
          {note.vital_signs && <VitalsInline vs={note.vital_signs} />}
          {(note.follow_up_instructions || editing) && (
            <div>
              <div className="clinical-label mb-1">Follow-up</div>
              <EditableText value={note.follow_up_instructions || ""} editing={!!editing} onChange={(v) => update("follow_up_instructions", v)} className="text-[12px] text-primary" placeholder="Follow-up instructions" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface Props {
  notes: ClinicalNote[];
  editing?: boolean;
  onUpdate?: (notes: ClinicalNote[]) => void;
}

const ClinicalNotesLayer = ({ notes, editing, onUpdate }: Props) => {
  const updateNote = (index: number, note: ClinicalNote) => {
    const next = [...notes];
    next[index] = note;
    onUpdate?.(next);
  };

  const addItem = () => {
    onUpdate?.([...notes, {
      note_type: "Progress Note",
      date_of_service: new Date().toISOString().split("T")[0],
      provider_name: "",
      provider_credentials: "",
      summary: "",
    }]);
  };

  const removeItem = (index: number) => {
    onUpdate?.(notes.filter((_, i) => i !== index));
  };

  return (
    <CollapsibleLayer
      title="Clinical Notes"
      icon={<FileText className="h-4 w-4" />}
      badge={<span className="clinical-badge-info">{notes.length}</span>}
    >
      {notes.length === 0 && !editing ? (
        <p className="text-[13px] text-muted-foreground">No clinical notes.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n, i) => (
            <NoteCard key={i} note={n} editing={editing} onChange={(note) => updateNote(i, note)} onRemove={() => removeItem(i)} />
          ))}
        </div>
      )}
      {editing && (
        <Button variant="ghost" size="sm" className="mt-3 text-[12px]" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Note
        </Button>
      )}
    </CollapsibleLayer>
  );
};

export default ClinicalNotesLayer;
