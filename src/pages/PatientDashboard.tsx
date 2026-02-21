import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import { generatePatientSummary } from "@/lib/patientSummary";
import { getPatientById } from "@/data/mockPatients";
import AppHeader from "@/components/AppHeader";
import IdentityLayer from "@/components/layers/IdentityLayer";
import StateLayer from "@/components/layers/StateLayer";
import HistoryLayer from "@/components/layers/HistoryLayer";
import InterventionLayer from "@/components/layers/InterventionLayer";
import AssessmentLayer from "@/components/layers/AssessmentLayer";
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
          <h2 className="text-xl font-semibold text-foreground mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-4">No patient record matches the given identifier.</p>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const age = Math.floor((Date.now() - new Date(patient.identity.immutable.dateOfBirth).getTime()) / 31557600000);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        {/* Patient Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/")} className="p-2 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {patient.identity.mutable.firstName} {patient.identity.mutable.lastName}
              </h1>
              {patient.identity.mutable.preferredName && (
                <span className="text-sm text-muted-foreground">"{patient.identity.mutable.preferredName}"</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">{patient.identity.mrn}</span>
              <span>{patient.identity.immutable.biologicalSex}, {age}y</span>
              <span>{patient.identity.immutable.bloodType}</span>
              {patient.identity.temporal.admissionDate && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Admitted {patient.identity.temporal.admissionDate}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {patient.state.activeDiagnoses.filter(d => d.severity === 'critical').map((d, i) => (
              <span key={i} className="clinical-badge-critical animate-pulse-critical">{d.name.split(',')[0]}</span>
            ))}
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="mb-5 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              {generatePatientSummary(patient)}
            </p>
          </div>
        </div>

        {/* Layers */}
        <div className="space-y-3">
          <IdentityLayer identity={patient.identity} />
          <StateLayer state={patient.state} />
          <HistoryLayer history={patient.history} />
          <InterventionLayer interventions={patient.interventions} />
          <AssessmentLayer assessments={patient.assessments} />
          <NetworkLayer network={patient.network} />
        </div>

        {/* Audit footer */}
        <div className="mt-8 py-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Access logged • Session ID: {Math.random().toString(36).substring(2, 10).toUpperCase()} • {new Date().toISOString()} • Role: Clinician
          </p>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
