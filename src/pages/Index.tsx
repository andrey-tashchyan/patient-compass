import { useNavigate } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import { mockPatients } from "@/data/mockPatientData";
import { getPatientAge } from "@/types/patient";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground">Overview — upcoming appointments and patient records.</p>
        </div>

        {/* Patient list */}
        <div>
          <div className="clinical-label mb-4 flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Patients</div>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {mockPatients.map(p => {
              const age = getPatientAge(p);
              const activeDx = p.diagnoses.filter(d => d.status === "active" || d.status === "chronic");
              return (
                <button key={p.patient_id} onClick={() => navigate(`/patient/${p.patient_id}`)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-foreground">{p.first_name} {p.last_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-mono">{p.medical_record_number}</span>
                      <span>{age} yrs</span>
                      {p.admission_date && <span>Admitted {p.admission_date}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeDx.slice(0, 3).map((d, i) => (
                        <span key={i} className={d.status === 'active' ? 'clinical-badge-warning' : 'clinical-badge-muted'}>
                          {d.condition.split(',')[0]}
                        </span>
                      ))}
                      {activeDx.length > 3 && <span className="text-[11px] text-muted-foreground self-center">+{activeDx.length - 3}</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
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
