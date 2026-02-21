import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import { generatePatientSummary } from "@/lib/patientSummary";
import { getPatientById } from "@/data/mockPatients";
import { vaccinationsByPatient } from "@/data/mockVaccinations";
import AppHeader from "@/components/AppHeader";
import IdentityLayer from "@/components/layers/IdentityLayer";
import HistoryLayer from "@/components/layers/HistoryLayer";
import EncountersLayer from "@/components/layers/EncountersLayer";
import VaccinationLayer from "@/components/layers/VaccinationLayer";
import NetworkLayer from "@/components/layers/NetworkLayer";

const PatientDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patient = getPatientById(id || "");

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Patient introuvable</h2>
          <p className="text-muted-foreground mb-4">Aucun dossier ne correspond à cet identifiant.</p>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Retour au tableau de bord</button>
        </div>
      </div>
    );
  }

  const age = Math.floor((Date.now() - new Date(patient.identity.immutable.dateOfBirth).getTime()) / 31557600000);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-5xl py-10">
        {/* Patient Header */}
        <div className="flex items-start gap-5 mb-8">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors mt-1">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {patient.identity.mutable.firstName} {patient.identity.mutable.lastName}
              </h1>
              {patient.identity.mutable.preferredName && (
                <span className="text-sm text-muted-foreground font-normal">"{patient.identity.mutable.preferredName}"</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="font-mono text-xs">{patient.identity.mrn}</span>
              <span className="w-px h-3 bg-border" />
              <span>{patient.identity.immutable.biologicalSex}, {age} ans</span>
              <span className="w-px h-3 bg-border" />
              <span>{patient.identity.immutable.bloodType}</span>
              {patient.identity.temporal.admissionDate && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Admis le {patient.identity.temporal.admissionDate}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {patient.state.activeDiagnoses.filter(d => d.severity === 'critical').map((d, i) => (
              <span key={i} className="clinical-badge-critical">{d.name.split(',')[0]}</span>
            ))}
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="mb-8 px-5 py-4 rounded-xl bg-muted/40 border border-border">
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            {generatePatientSummary(patient)}
          </p>
        </div>

        {/* Layers */}
        <div className="space-y-4">
          <EncountersLayer patientId={patient.id} />
          <IdentityLayer identity={patient.identity} />
          <HistoryLayer history={patient.history} />
          <VaccinationLayer vaccinations={vaccinationsByPatient[patient.id] || []} />
          <NetworkLayer network={patient.network} />
        </div>

        {/* Audit footer */}
        <div className="mt-12 py-5 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wide">
            Accès enregistré · Session {Math.random().toString(36).substring(2, 10).toUpperCase()} · {new Date().toISOString().split('T')[0]} · Rôle : Clinicien
          </p>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
