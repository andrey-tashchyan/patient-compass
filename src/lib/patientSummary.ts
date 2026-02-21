import type { Patient } from "@/types/patient";
import { Gender } from "@/types/patient";

export function generatePatientSummary(patient: Patient): string {
  const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000);
  const sex = patient.gender === Gender.MALE ? "Male" : patient.gender === Gender.FEMALE ? "Female" : "Patient";

  const parts: string[] = [];

  let identity = `${sex}, ${age} years old`;
  if (patient.admission_date) {
    const mainDx = patient.diagnoses.find(d => d.status === "active");
    identity += `, admitted ${patient.admission_date}`;
    if (mainDx) identity += ` for ${mainDx.condition.toLowerCase()}`;
  }
  parts.push(identity + ".");

  const active = patient.diagnoses.filter(d => d.status === "active");
  if (active.length > 0) {
    parts.push(`Primary diagnosis: ${active.map(d => d.condition.split(",")[0]).join(", ")}.`);
  }

  const chronic = patient.diagnoses.filter(d => d.status === "chronic");
  if (chronic.length > 0) {
    parts.push(`Notable history: ${chronic.map(d => d.condition.split(",")[0]).join(", ")}.`);
  }

  const flagged = patient.lab_results.filter(l => l.flagged);
  if (flagged.length > 0) {
    parts.push(`Abnormal values: ${flagged.map(l => `${l.test_name} at ${l.result} ${l.unit}`).join(", ")}.`);
  }

  parts.push(`${patient.current_medications.length} active medication(s).`);

  if (patient.allergies.length > 0) {
    parts.push(`${patient.allergies.length} documented allergy(ies).`);
  }

  return parts.join(" ");
}
