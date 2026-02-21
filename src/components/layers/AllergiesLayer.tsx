import { AlertTriangle } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { Allergy } from "@/types/patient";
import { AllergyStatus } from "@/types/patient";

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

const AllergiesLayer = ({ allergies }: { allergies: Allergy[] }) => (
  <CollapsibleLayer
    title="Allergies"
    icon={<AlertTriangle className="h-4 w-4" />}
    badge={allergies.length > 0 ? <span className="clinical-badge-critical">{allergies.length}</span> : undefined}
  >
    {allergies.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">No known allergies.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="clinical-label pb-2 pr-4">Allergen</th>
              <th className="clinical-label pb-2 pr-4">Reaction</th>
              <th className="clinical-label pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {allergies.map((a, i) => (
              <tr key={i}>
                <td className="py-2.5 pr-4 font-medium text-data-value">{a.allergen}</td>
                <td className="py-2.5 pr-4 text-muted-foreground">{a.reaction || "—"}</td>
                <td className="py-2.5">
                  <span className={statusBadge[a.status || AllergyStatus.CONFIRMED]}>
                    {statusLabel[a.status || AllergyStatus.CONFIRMED]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CollapsibleLayer>
);

export default AllergiesLayer;
