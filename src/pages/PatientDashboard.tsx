import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Download, Loader2, Mic, Pencil, Pill, Save, X, Plus, Trash2 } from "lucide-react";
import { exportPatientPdf } from "@/lib/exportPatientPdf";
import { generatePatientSummary } from "@/lib/patientSummary";
import { getPatientAge, Gender } from "@/types/patient";
import type { Patient } from "@/types/patient";
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
import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import { Button } from "@/components/ui/button";
import PatientChatPanel from "@/components/PatientChatPanel";
import VoiceDictation from "@/components/VoiceDictation";
import type { ClinicalNote } from "@/types/patient";
import type { ProposedChange } from "@/components/VoiceDictation";

const PatientDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patient, isLoading } = usePatient(id || "");
  const updatePatient = useUpdatePatient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Patient | null>(null);
  const [dictationOpen, setDictationOpen] = useState(false);

  const startEditing = () => {
    if (patient) {
      setDraft(JSON.parse(JSON.stringify(patient)));
      setEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(null);
  };

  const saveEditing = () => {
    if (draft) {
      updatePatient.mutate(draft, {
        onSuccess: () => {
          setEditing(false);
          setDraft(null);
        },
      });
    }
  };

  const updateDraft = (updater: (d: Patient) => void) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      return next;
    });
  };

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

  const current = editing && draft ? draft : patient;
  const age = getPatientAge(current);
  const genderLabel = current.gender === Gender.MALE ? "Male" : current.gender === Gender.FEMALE ? "Female" : "Other";
  const activeDx = current.diagnoses.filter(d => d.status === "active");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-5xl py-10">
        {/* Patient Header */}
        <div className="mb-8">
          <div className="flex items-center gap-5 mb-3">
            <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                {current.first_name} {current.last_name}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {editing ? (
                <>
                  <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={updatePatient.isPending}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditing} disabled={updatePatient.isPending}>
                    {updatePatient.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/patient/${id}/prescribe`)}>
                    <Pill className="h-4 w-4 mr-1" /> Prescribe
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDictationOpen(true)}>
                    <Mic className="h-4 w-4 mr-1" /> Dictate Note
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportPatientPdf(current)}>
                    <Download className="h-4 w-4 mr-1" /> Export PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground ml-11 mb-3">
            <span className="font-mono text-xs">{current.medical_record_number}</span>
            <span className="w-px h-3 bg-border" />
            <span>{genderLabel}, {age} yrs</span>
            <span className="w-px h-3 bg-border" />
            <span>DOB {current.date_of_birth}</span>
            {current.admission_date && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Admitted {current.admission_date}</span>
              </>
            )}
          </div>
          {activeDx.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-11">
              {activeDx.map((d, i) => (
                <span key={i} className="clinical-badge-warning">{d.condition.split(',')[0]}</span>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Summary */}
        {!editing && (
          <div className="mb-8 px-5 py-4 rounded-xl bg-muted/40 border border-border">
            <p className="text-[13px] text-foreground/80 leading-relaxed">
              {generatePatientSummary(current)}
            </p>
          </div>
        )}

        {/* Layers */}
        <div className="space-y-4">
          <ClinicalNotesLayer notes={current.clinical_notes} editing={editing} onUpdate={(notes) => updateDraft(d => { d.clinical_notes = notes; })} />
          <DiagnosesLayer diagnoses={current.diagnoses} editing={editing} onUpdate={(diagnoses) => updateDraft(d => { d.diagnoses = diagnoses; })} />
          <MedicationsLayer medications={current.current_medications} editing={editing} onUpdate={(meds) => updateDraft(d => { d.current_medications = meds; })} />
          <LabResultsLayer results={current.lab_results} editing={editing} onUpdate={(results) => updateDraft(d => { d.lab_results = results; })} />
          <AllergiesLayer allergies={current.allergies} editing={editing} onUpdate={(allergies) => updateDraft(d => { d.allergies = allergies; })} />
          <ImagingLayer studies={current.imaging_studies} editing={editing} onUpdate={(studies) => updateDraft(d => { d.imaging_studies = studies; })} />
          <DiagnosticTestsLayer tests={current.diagnostic_tests} editing={editing} onUpdate={(tests) => updateDraft(d => { d.diagnostic_tests = tests; })} />
          <DemographicsLayer
            contactInfo={current.contact_info}
            insurance={current.insurance}
            primaryCarePhysician={current.primary_care_physician}
            hospital={current.hospital}
            editing={editing}
            onUpdate={(updates) => updateDraft(d => {
              if (updates.contactInfo) d.contact_info = updates.contactInfo;
              if (updates.insurance) d.insurance = updates.insurance;
              if (updates.primaryCarePhysician !== undefined) d.primary_care_physician = updates.primaryCarePhysician;
              if (updates.hospital !== undefined) d.hospital = updates.hospital;
            })}
          />
        </div>

        {/* Audit footer */}
        <div className="mt-12 py-5 border-t border-border text-center">
          <p className="text-[11px] text-muted-foreground font-mono tracking-wide">
            Access logged · Session {Math.random().toString(36).substring(2, 10).toUpperCase()} · {new Date().toISOString().split('T')[0]} · Role: Clinician
          </p>
        </div>
      </main>
      <PatientChatPanel patient={current} updatePatient={updatePatient} />
      <VoiceDictation
        open={dictationOpen}
        onOpenChange={setDictationOpen}
        patientContext={{
          name: `${current.first_name} ${current.last_name}`,
          age: age,
          activeDiagnoses: activeDx.map(d => d.condition),
          medications: current.current_medications.map(m => m.name),
          allergies: current.allergies.map(a => a.allergen),
        }}
        onSave={(newNote: ClinicalNote, approvedChanges: ProposedChange[]) => {
          const updated = JSON.parse(JSON.stringify(current)) as Patient;
          updated.clinical_notes = [newNote, ...updated.clinical_notes];

          // Apply approved record changes
          for (const change of approvedChanges) {
            if (change.category === "medication") {
              if (change.action === "add" && change.data.name) {
                updated.current_medications.push({
                  name: change.data.name,
                  dosage: change.data.dosage || "",
                  frequency: change.data.frequency || "",
                  indication: change.data.indication,
                  prescribed_at: new Date().toISOString().split("T")[0],
                });
              } else if (change.action === "remove" && change.data.name) {
                updated.current_medications = updated.current_medications.filter(
                  (m) => !m.name.toLowerCase().includes(change.data.name!.toLowerCase())
                );
              } else if (change.action === "update" && change.data.name) {
                const med = updated.current_medications.find(
                  (m) => m.name.toLowerCase().includes(change.data.name!.toLowerCase())
                );
                if (med) {
                  if (change.data.dosage) med.dosage = change.data.dosage;
                  if (change.data.frequency) med.frequency = change.data.frequency;
                }
              }
            } else if (change.category === "diagnosis") {
              if (change.action === "add" && change.data.name) {
                updated.diagnoses.push({
                  condition: change.data.name,
                  icd_code: change.data.icd_code,
                  status: (change.data.status as "active" | "resolved" | "chronic") || "active",
                  date_diagnosed: new Date().toISOString().split("T")[0],
                });
              } else if (change.action === "remove" && change.data.name) {
                const dx = updated.diagnoses.find(
                  (d) => d.condition.toLowerCase().includes(change.data.name!.toLowerCase())
                );
                if (dx) dx.status = "resolved";
              }
            } else if (change.category === "allergy") {
              if (change.action === "add" && change.data.name) {
                updated.allergies.push({
                  allergen: change.data.name,
                  reaction: change.data.reaction,
                  recorded_at: new Date().toISOString().split("T")[0],
                });
              }
            }
          }

          updatePatient.mutate(updated);
        }}
      />
    </div>
  );
};

export default PatientDashboard;
