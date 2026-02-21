import type { Patient } from "@/types/patient";
import { Gender } from "@/types/patient";

export function generatePatientSummary(patient: Patient): string {
  const age = Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000);
  const sex = patient.gender === Gender.MALE ? "Homme" : patient.gender === Gender.FEMALE ? "Femme" : "Patient";

  const parts: string[] = [];

  // Identity line
  let identity = `${sex} de ${age} ans`;
  if (patient.admission_date) {
    const mainDx = patient.diagnoses.find(d => d.status === "active");
    identity += `, admis le ${patient.admission_date}`;
    if (mainDx) identity += ` pour ${mainDx.condition.toLowerCase()}`;
  }
  parts.push(identity + ".");

  // Active diagnoses
  const active = patient.diagnoses.filter(d => d.status === "active");
  if (active.length > 0) {
    parts.push(`Diagnostic principal : ${active.map(d => d.condition.split(",")[0]).join(", ")}.`);
  }

  // Chronic conditions
  const chronic = patient.diagnoses.filter(d => d.status === "chronic");
  if (chronic.length > 0) {
    parts.push(`Antécédents notables : ${chronic.map(d => d.condition.split(",")[0]).join(", ")}.`);
  }

  // Flagged labs
  const flagged = patient.lab_results.filter(l => l.flagged);
  if (flagged.length > 0) {
    parts.push(`Valeurs anormales : ${flagged.map(l => `${l.test_name} à ${l.result} ${l.unit}`).join(", ")}.`);
  }

  // Medications
  parts.push(`${patient.current_medications.length} traitements actifs en cours.`);

  // Allergies
  if (patient.allergies.length > 0) {
    parts.push(`${patient.allergies.length} allergie(s) documentée(s).`);
  }

  return parts.join(" ");
}
