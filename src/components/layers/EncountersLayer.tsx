import { useState } from "react";
import { CalendarDays, FileText, ChevronRight, X, Stethoscope, AlertCircle, Building, Microscope } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import { encountersByPatient, type PastEncounter, type EncounterDocument } from "@/data/mockEncounters";

const typeConfig = {
  consultation: { label: "Consultation", icon: <Stethoscope className="h-3.5 w-3.5" />, badgeClass: "clinical-badge-info" },
  urgence: { label: "Urgences", icon: <AlertCircle className="h-3.5 w-3.5" />, badgeClass: "clinical-badge-critical" },
  hospitalisation: { label: "Hospitalisation", icon: <Building className="h-3.5 w-3.5" />, badgeClass: "clinical-badge-warning" },
  examen: { label: "Examen", icon: <Microscope className="h-3.5 w-3.5" />, badgeClass: "clinical-badge-muted" },
};

const docTypeLabel: Record<string, string> = {
  "compte-rendu": "CR",
  "ordonnance": "Rx",
  "résultat": "Labo",
  "imagerie": "Image",
  "courrier": "Courrier",
  "consentement": "Consent.",
};

const DocumentViewer = ({ doc, onClose }: { doc: EncounterDocument; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/15 backdrop-blur-sm">
    <div className="w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">{doc.name}</h3>
          <span className="text-[11px] text-muted-foreground">{doc.date}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <pre className="text-[12px] leading-relaxed text-foreground/85 font-mono whitespace-pre-wrap">
          {doc.content}
        </pre>
      </div>
    </div>
  </div>
);

const EncountersLayer = ({ patientId }: { patientId: string }) => {
  const [openDoc, setOpenDoc] = useState<EncounterDocument | null>(null);
  const encounters = encountersByPatient[patientId] || [];

  if (encounters.length === 0) return null;

  return (
    <>
      <CollapsibleLayer
        title="Consultations précédentes"
        icon={<CalendarDays className="h-4 w-4" />}
        badge={<span className="clinical-badge-muted">{encounters.length} visites</span>}
      >
        <div className="space-y-4">
          {encounters.map((enc) => {
            const cfg = typeConfig[enc.type];
            return (
              <div key={enc.id} className="data-card">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-muted-foreground">{enc.date}</span>
                      <span className={cfg.badgeClass}>{cfg.label}</span>
                    </div>
                    <h4 className="text-[13px] font-semibold text-foreground leading-snug">{enc.reason}</h4>
                  </div>
                </div>

                {/* Provider */}
                <div className="text-[12px] text-muted-foreground mb-2.5">
                  {enc.provider} · {enc.specialty}
                </div>

                {/* Doctor's summary */}
                <div className="text-[12px] leading-relaxed mb-3 px-3.5 py-3 rounded-lg bg-muted/40 border-l-2 border-primary/30">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Résumé du praticien</div>
                  <p className="text-foreground/80">{enc.summary}</p>
                  {enc.outcome && (
                    <p className="mt-2 text-foreground/90 font-medium">→ {enc.outcome}</p>
                  )}
                </div>

                {/* Documents */}
                {enc.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {enc.documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setOpenDoc(doc)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-muted/60 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors group"
                      >
                        <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="max-w-[200px] truncate">{doc.name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleLayer>

      {openDoc && <DocumentViewer doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </>
  );
};

export default EncountersLayer;
