import type { Patient } from "@/data/mockPatients";

export function generatePatientSummary(patient: Patient): string {
  const { identity, state, interventions } = patient;
  const age = Math.floor((Date.now() - new Date(identity.immutable.dateOfBirth).getTime()) / 31557600000);
  const sex = identity.immutable.biologicalSex === "Male" ? "Homme" : "Femme";
  
  // Primary diagnoses
  const criticalDx = state.activeDiagnoses.filter(d => d.severity === 'critical');
  const chronicDx = state.activeDiagnoses.filter(d => d.status === 'chronic');
  
  // Critical vitals
  const criticalVitals = state.vitals.filter(v => v.status === 'critical');
  const warningVitals = state.vitals.filter(v => v.status === 'warning');
  
  // Critical labs
  const criticalLabs = state.labs.filter(l => l.status === 'critical');
  const warningLabs = state.labs.filter(l => l.status === 'warning');

  // Severe symptoms
  const severeSymptoms = state.symptoms.filter(s => s.severity === 'severe');
  
  // Active meds count
  const activeMeds = interventions.medications.filter(m => m.status === 'active').length;

  // Build summary
  const parts: string[] = [];

  // Identity
  parts.push(`${sex} de ${age} ans (${identity.immutable.bloodType})`);

  // Admission context
  if (identity.temporal.admissionDate) {
    const lastEvent = identity.temporal.keyEvents[identity.temporal.keyEvents.length - 1];
    if (lastEvent) {
      parts[0] += `, admis le ${identity.temporal.admissionDate} pour ${lastEvent.event.replace('Current admission — ', '').replace('Admission — ', '').toLowerCase()}`;
    }
  }

  parts[0] += '.';

  // Critical diagnoses
  if (criticalDx.length > 0) {
    const dxNames = criticalDx.map(d => d.name.split(',')[0]).join(', ');
    parts.push(`Diagnostic principal : ${dxNames}.`);
  }

  // Chronic conditions
  if (chronicDx.length > 0) {
    const chronicNames = chronicDx.map(d => d.name.split(',')[0]).join(', ');
    parts.push(`Antécédents notables : ${chronicNames}.`);
  }

  // Current status
  const statusParts: string[] = [];
  if (criticalVitals.length > 0) {
    statusParts.push(criticalVitals.map(v => `${v.name} à ${v.value} ${v.unit} (critique)`).join(', '));
  }
  if (criticalLabs.length > 0) {
    statusParts.push(criticalLabs.map(l => `${l.name} à ${l.value} ${l.unit}`).join(', '));
  }
  if (statusParts.length > 0) {
    parts.push(`Valeurs critiques : ${statusParts.join(' ; ')}.`);
  }

  // Symptoms
  if (severeSymptoms.length > 0) {
    parts.push(`Symptômes principaux : ${severeSymptoms.map(s => s.symptom.toLowerCase()).join(', ')}.`);
  }

  // Functional
  const nyha = state.functionalState.find(f => f.domain.includes('NYHA'));
  if (nyha) {
    parts.push(`Classe fonctionnelle NYHA ${nyha.score}.`);
  }

  // Treatment
  parts.push(`${activeMeds} traitements actifs en cours.`);

  return parts.join(' ');
}
