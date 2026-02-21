import { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Activity } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ClinicalNote } from "@/types/patient";

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

const NoteCard = ({ note }: { note: ClinicalNote }) => {
  const [expanded, setExpanded] = useState(false);

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
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 text-[13px]">
          <div>
            <div className="clinical-label mb-1">Subjective (S)</div>
            <p className="text-data-value leading-relaxed">{note.subjective}</p>
          </div>
          <div>
            <div className="clinical-label mb-1">Objective (O)</div>
            <p className="text-data-value leading-relaxed">{note.objective}</p>
          </div>
          <div>
            <div className="clinical-label mb-1">Assessment (A)</div>
            <p className="text-data-value leading-relaxed">{note.assessment}</p>
          </div>
          <div>
            <div className="clinical-label mb-1">Plan (P)</div>
            <p className="text-data-value leading-relaxed">{note.plan}</p>
          </div>
          {note.vital_signs && <VitalsInline vs={note.vital_signs} />}
          {note.follow_up_instructions && (
            <div className="p-3 rounded-lg bg-primary/5 text-[12px] text-primary">
              <strong>Follow-up:</strong> {note.follow_up_instructions}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ClinicalNotesLayer = ({ notes }: { notes: ClinicalNote[] }) => (
  <CollapsibleLayer
    title="Clinical Notes"
    icon={<FileText className="h-4 w-4" />}
    badge={<span className="clinical-badge-info">{notes.length}</span>}
  >
    {notes.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">No clinical notes.</p>
    ) : (
      <div className="space-y-3">
        {notes.map((n, i) => (
          <NoteCard key={i} note={n} />
        ))}
      </div>
    )}
  </CollapsibleLayer>
);

export default ClinicalNotesLayer;
