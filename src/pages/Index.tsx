import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, Calendar, Clock } from "lucide-react";
import { mockPatients } from "@/data/mockPatientData";
import { getPatientAge } from "@/types/patient";
import AppHeader from "@/components/AppHeader";

const upcomingAppointments = [
  { id: "A1", patientId: "P-001", patientName: "James Morrison", type: "Cardiologie — Suivi insuffisance cardiaque", provider: "Dr. Sarah Chen", date: "2025-02-24", time: "09:30", location: "Portland Heart Center", urgent: true },
  { id: "A2", patientId: "P-003", patientName: "Eleanor Whitfield", type: "Gériatrie — Réévaluation cognitive", provider: "Dr. Helen Wu", date: "2025-02-25", time: "11:00", location: "Portland Geriatric Center", urgent: false },
  { id: "A3", patientId: "P-002", patientName: "Aisha Rahman", type: "Endocrinologie — Contrôle thyroïdien", provider: "Dr. Anna Volkov", date: "2025-02-26", time: "14:15", location: "Portland Endocrine Center", urgent: false },
  { id: "A4", patientId: "P-001", patientName: "James Morrison", type: "Diabétologie — HbA1c & ajustement traitement", provider: "Dr. Lisa Patel", date: "2025-02-28", time: "10:00", location: "Portland Primary Care", urgent: false },
  { id: "A5", patientId: "P-003", patientName: "Eleanor Whitfield", type: "Kinésithérapie — Bilan prévention chutes", provider: "Tom Bradley, PT", date: "2025-03-03", time: "08:45", location: "St. Vincent Medical Center", urgent: false },
];

const formatDate = (date: string) => {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-4xl py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1">Tableau de bord</h1>
          <p className="text-[13px] text-muted-foreground">Vue d'ensemble — rendez-vous à venir et dossiers patients.</p>
        </div>

        {/* Upcoming Appointments */}
        <div className="mb-10">
          <div className="clinical-label mb-4 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Prochains rendez-vous</div>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {upcomingAppointments.map(apt => (
              <button key={apt.id} onClick={() => navigate(`/patient/${apt.patientId}`)} className="w-full text-left px-5 py-4 flex items-center gap-5 hover:bg-muted/30 transition-colors group">
                <div className="w-16 shrink-0 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{formatDate(apt.date).split(' ').slice(0, 1)}</div>
                  <div className="text-lg font-semibold text-foreground leading-tight">{new Date(apt.date + "T00:00:00").getDate()}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDate(apt.date).split(' ').slice(2).join(' ')}</div>
                </div>
                <div className="w-px h-10 bg-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-foreground">{apt.patientName}</span>
                    {apt.urgent && <span className="w-2 h-2 rounded-full bg-clinical-critical animate-pulse" />}
                  </div>
                  <div className="text-[13px] text-muted-foreground mb-1">{apt.type}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{apt.time}</span>
                    <span>{apt.provider}</span>
                    <span className="hidden sm:inline">· {apt.location}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
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
                      <span>{age} ans</span>
                      {p.admission_date && <span>Admis le {p.admission_date}</span>}
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
