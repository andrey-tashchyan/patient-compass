import { FlaskConical } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { LabResult } from "@/types/patient";

const LabResultsLayer = ({ results }: { results: LabResult[] }) => {
  const flaggedCount = results.filter((r) => r.flagged).length;

  return (
    <CollapsibleLayer
      title="Résultats de laboratoire"
      icon={<FlaskConical className="h-4 w-4" />}
      badge={
        flaggedCount > 0
          ? <span className="clinical-badge-warning">{flaggedCount} anormal{flaggedCount > 1 ? 's' : ''}</span>
          : <span className="clinical-badge-normal">Normal</span>
      }
    >
      {results.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Aucun résultat de laboratoire.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="clinical-label pb-2 pr-4">Examen</th>
                <th className="clinical-label pb-2 pr-4">Résultat</th>
                <th className="clinical-label pb-2 pr-4">Unité</th>
                <th className="clinical-label pb-2 pr-4">Référence</th>
                <th className="clinical-label pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {results.map((r, i) => (
                <tr key={i} className={r.flagged ? 'bg-clinical-critical/[0.03]' : ''}>
                  <td className="py-2.5 pr-4 font-medium text-data-value">
                    {r.flagged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-clinical-critical mr-2 align-middle" />}
                    {r.test_name}
                  </td>
                  <td className={`py-2.5 pr-4 font-mono text-[12px] ${r.flagged ? 'clinical-critical font-semibold' : 'text-data-value'}`}>
                    {r.result}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{r.unit}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-[11px]">{r.reference_range}</td>
                  <td className="py-2.5 text-muted-foreground font-mono text-[11px]">{r.date_performed || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleLayer>
  );
};

export default LabResultsLayer;
