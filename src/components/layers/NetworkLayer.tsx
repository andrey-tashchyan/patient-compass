import { Network, Star, Building, ArrowRightLeft } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientNetwork } from "@/data/mockPatients";

const NetworkLayer = ({ network }: { network: PatientNetwork }) => (
  <CollapsibleLayer
    title="Network Layer — Care Ecosystem"
    icon={<Network className="h-4 w-4" />}
    defaultOpen={false}
    badge={<span className="clinical-badge-muted">{network.careTeam.length} Members</span>}
  >
    <div className="space-y-5">
      {/* Care Team */}
      <div>
        <div className="clinical-label mb-3">Care Team</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {network.careTeam.map((m, i) => (
            <div key={i} className={`data-card ${m.isPrimary ? 'border-primary/40' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                {m.isPrimary && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                <span className="text-sm font-semibold text-data-value">{m.name}</span>
              </div>
              <div className="text-xs text-primary font-medium">{m.role}</div>
              {m.specialty && <div className="text-xs text-muted-foreground">{m.specialty}</div>}
              <div className="text-xs text-muted-foreground mt-1">{m.facility}</div>
              <div className="font-mono text-xs text-muted-foreground">{m.phone}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Facilities */}
      <div>
        <div className="clinical-label mb-3 flex items-center gap-2">
          <Building className="h-3.5 w-3.5" /> Facilities
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {network.facilities.map((f, i) => (
            <div key={i} className="data-card">
              <span className="text-sm font-semibold text-data-value">{f.name}</span>
              <div className="text-xs text-primary">{f.type}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.address}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Exchange */}
      <div>
        <div className="clinical-label mb-3 flex items-center gap-2">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Information Exchange Log
        </div>
        <div className="space-y-1.5">
          {network.informationExchange.map((ie, i) => (
            <div key={i} className="data-card flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{ie.date}</span>
              <span className="text-data-value font-medium shrink-0">{ie.from}</span>
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-data-value font-medium shrink-0">{ie.to}</span>
              <span className="clinical-badge-muted shrink-0">{ie.type}</span>
              <span className="text-muted-foreground truncate">{ie.summary}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </CollapsibleLayer>
);

export default NetworkLayer;
