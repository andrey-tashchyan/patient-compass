import { Scan } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ImagingStudy } from "@/types/patient";

const ImagingLayer = ({ studies }: { studies: ImagingStudy[] }) => (
  <CollapsibleLayer
    title="Imagerie"
    icon={<Scan className="h-4 w-4" />}
    badge={<span className="clinical-badge-info">{studies.length}</span>}
  >
    {studies.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">Aucune étude d'imagerie.</p>
    ) : (
      <div className="space-y-3">
        {studies.map((s, i) => (
          <div key={i} className="data-card space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] font-medium text-data-value">{s.study_type}</div>
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">{s.date_performed}</span>
            </div>
            <div className="text-[12px] text-muted-foreground">{s.body_part}{s.radiologist && <> · {s.radiologist}</>}</div>
            <div className="text-[13px] text-data-value leading-relaxed">{s.findings}</div>
            <div className="text-[12px] text-primary font-medium mt-1">Impression : {s.impression}</div>
          </div>
        ))}
      </div>
    )}
  </CollapsibleLayer>
);

export default ImagingLayer;
