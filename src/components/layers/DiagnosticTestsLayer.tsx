import { ClipboardList } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { DiagnosticTest } from "@/types/patient";

const DiagnosticTestsLayer = ({ tests }: { tests: DiagnosticTest[] }) => (
  <CollapsibleLayer
    title="Diagnostic Tests"
    icon={<ClipboardList className="h-4 w-4" />}
    badge={<span className="clinical-badge-info">{tests.length}</span>}
  >
    {tests.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">No diagnostic tests.</p>
    ) : (
      <div className="space-y-3">
        {tests.map((t, i) => (
          <div key={i} className="data-card space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] font-medium text-data-value">{t.test_type}</div>
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">{t.date_performed}</span>
            </div>
            {t.ordered_by && <div className="text-[12px] text-muted-foreground">Ordered by {t.ordered_by}</div>}
            <div className="text-[13px] text-data-value leading-relaxed">{t.findings}</div>
            <div className="text-[12px] text-primary font-medium">Interpretation: {t.interpretation}</div>
          </div>
        ))}
      </div>
    )}
  </CollapsibleLayer>
);

export default DiagnosticTestsLayer;
