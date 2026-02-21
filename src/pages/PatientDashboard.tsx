import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { generatePatientSummary } from "@/lib/patientSummary";
import { getPatientAge, Gender } from "@/types/patient";
import AppHeader from "@/components/AppHeader";
import DemographicsLayer from "@/components/layers/DemographicsLayer";
import AllergiesLayer from "@/components/layers/AllergiesLayer";
import MedicationsLayer from "@/components/layers/MedicationsLayer";
import DiagnosesLayer from "@/components/layers/DiagnosesLayer";
import ClinicalNotesLayer from "@/components/layers/ClinicalNotesLayer";
import LabResultsLayer from "@/components/layers/LabResultsLayer";
import ImagingLayer from "@/components/layers/ImagingLayer";
import DiagnosticTestsLayer from "@/components/layers/DiagnosticTestsLayer";
import { usePatient } from "@/hooks/usePatients";

const PatientDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patient, isLoading } = usePatient(id || "");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Patient not found</h2>
          <p className="text-muted-foreground mb-4">No record matches this identifier.</p>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Back to dashboard</button>
        </div>
      </div>
    );
  }

  const age = getPatientAge(patient);
  const genderLabel = patient.gender === Gender.MALE ? "Male" : patient.gender === Gender.FEMALE ? "Female" : "Other";
  const activeDx = patient.diagnoses.filter(d => d.status === "active");

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
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1.5">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="font-mono text-xs">{patient.medical_record_number}</span>
              <span className="w-px h-3 bg-border" />
              <span>{genderLabel}, {age} yrs</span>
              <span className="w-px h-3 bg-border" />
              <span>DOB {patient.date_of_birth}</span>
              {patient.admission_date && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Admitted {patient.admission_date}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {activeDx.map((d, i) => (
              <span key={i} className="clinical-badge-warning">{d.condition.split(',')[0]}</span>
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
          <ClinicalNotesLayer notes={patient.clinical_notes} />
          <DiagnosesLayer diagnoses={patient.diagnoses} />
          <MedicationsLayer medications={patient.current_medications} />
          <LabResultsLayer results={patient.lab_results} />
          <AllergiesLayer allergies={patient.allergies} />
          <ImagingLayer studies={patient.imaging_studies} />
          <DiagnosticTestsLayer tests={patient.diagnostic_tests} />
          <DemographicsLayer
            contactInfo={patient.contact_info}
            insurance={patient.insurance}
            primaryCarePhysician={patient.primary_care_physician}
            hospital={patient.hospital}
          />
        </div>

        {/* Audit footer */}
        <div className="mt-12 py-5 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wide">
            Access logged · Session {Math.random().toString(36).substring(2, 10).toUpperCase()} · {new Date().toISOString().split('T')[0]} · Role: Clinician
          </p>
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
