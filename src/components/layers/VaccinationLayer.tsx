import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";

export interface Vaccination {
  name: string;
  date: string;
  lot?: string;
  site?: string;
  nextDue?: string;
  status: 'à jour' | 'en retard' | 'à venir';
  provider?: string;
}

const statusConfig = {
  'à jour': { badge: 'clinical-badge-normal', icon: CheckCircle },
  'en retard': { badge: 'clinical-badge-critical', icon: AlertTriangle },
  'à venir': { badge: 'clinical-badge-muted', icon: Clock },
};

const VaccinationLayer = ({ vaccinations }: { vaccinations: Vaccination[] }) => {
  const overdueCount = vaccinations.filter(v => v.status === 'en retard').length;

  return (
    <CollapsibleLayer
      title="Vaccinations"
      icon={<Shield className="h-4 w-4" />}
      defaultOpen={false}
      badge={
        <div className="flex items-center gap-2">
          <span className="clinical-badge-muted">{vaccinations.length} vaccins</span>
          {overdueCount > 0 && <span className="clinical-badge-critical">{overdueCount} en retard</span>}
        </div>
      }
    >
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 clinical-label font-semibold">Vaccin</th>
              <th className="text-left py-3 px-4 clinical-label font-semibold">Dernière dose</th>
              <th className="text-left py-3 px-4 clinical-label font-semibold">Lot</th>
              <th className="text-left py-3 px-4 clinical-label font-semibold">Prochaine échéance</th>
              <th className="text-left py-3 px-4 clinical-label font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {vaccinations.map((v, i) => {
              const cfg = statusConfig[v.status];
              const Icon = cfg.icon;
              return (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-3 px-4 font-medium text-data-value">{v.name}</td>
                  <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">{v.date}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{v.lot || '—'}</td>
                  <td className="py-3 px-4 font-mono text-[12px] text-muted-foreground">{v.nextDue || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`${cfg.badge} inline-flex items-center gap-1`}>
                      <Icon className="h-3 w-3" />
                      {v.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </CollapsibleLayer>
  );
};

export default VaccinationLayer;
