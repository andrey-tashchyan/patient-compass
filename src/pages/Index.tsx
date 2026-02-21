import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import { mockPatients } from "@/data/mockPatients";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-16">
        <div className="mb-12">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            Tableau de bord clinique
          </h1>
          <p className="text-sm text-muted-foreground">
            Agrégation unifiée des données patient — laboratoires, signes vitaux, traitements, équipe soignante.
          </p>
        </div>

        <div className="mb-6">
          <div className="clinical-label mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Patients récents
          </div>
          <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
            {mockPatients.map(p => {
              const age = Math.floor((Date.now() - new Date(p.identity.immutable.dateOfBirth).getTime()) / 31557600000);
              const criticalVitals = p.state.vitals.filter(v => v.status === 'critical');
              const activeDx = p.state.activeDiagnoses.filter(d => d.status === 'active' || d.status === 'chronic');

              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/patient/${p.id}`)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {p.identity.mutable.firstName} {p.identity.mutable.lastName}
                      </span>
                      {criticalVitals.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-clinical-critical animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{p.identity.mrn}</span>
                      <span>{p.identity.immutable.biologicalSex}, {age} ans</span>
                      <span>{p.identity.immutable.bloodType}</span>
                      {p.identity.temporal.admissionDate && (
                        <span>Admis le {p.identity.temporal.admissionDate}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeDx.slice(0, 3).map((d, i) => (
                        <span key={i} className={
                          d.severity === 'critical' ? 'clinical-badge-critical' :
                          d.severity === 'warning' ? 'clinical-badge-warning' :
                          'clinical-badge-muted'
                        }>
                          {d.name.split(',')[0]}
                        </span>
                      ))}
                      {activeDx.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">+{activeDx.length - 3}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
