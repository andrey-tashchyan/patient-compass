// ── Enums ──

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum AllergyStatus {
  CONFIRMED = "CONFIRMED",
  SUSPECTED = "SUSPECTED",
  DENIED = "DENIED",
}

// ── Sub-models ──

export interface ContactInfo {
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone?: string;
}

export interface Insurance {
  provider: string;
  plan_type: string;
}

export interface Allergy {
  allergen: string;
  reaction?: string;
  status?: AllergyStatus;
  recorded_at?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  indication?: string;
  prescribed_at?: string;
}

export interface VitalSigns {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  temperature_fahrenheit?: number;
  bmi?: number;
  measurement_date?: string;
}

export interface ClinicalNote {
  note_type: string;
  date_of_service: string;
  provider_name: string;
  provider_credentials: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chief_complaint?: string;
  vital_signs?: VitalSigns;
  follow_up_instructions?: string;
}

export interface Diagnosis {
  condition: string;
  icd_code?: string;
  date_diagnosed?: string;
  status?: "active" | "resolved" | "chronic";
}

export interface LabResult {
  test_name: string;
  result: string;
  unit: string;
  reference_range: string;
  flagged?: boolean;
  date_performed?: string;
}

export interface CompleteBloodCount extends LabResult {
  wbc?: number;
  rbc?: number;
  hemoglobin?: number;
  hematocrit?: number;
  platelets?: number;
}

export interface LipidPanel extends LabResult {
  total_cholesterol?: number;
  ldl_cholesterol?: number;
  hdl_cholesterol?: number;
  triglycerides?: number;
}

export interface ChemistryPanel extends LabResult {
  sodium?: number;
  potassium?: number;
  co2?: number;
  creatinine?: number;
  ast?: number;
  total_bilirubin?: number;
}

export interface ImagingStudy {
  study_type: string;
  body_part: string;
  findings: string;
  impression: string;
  date_performed: string;
  radiologist?: string;
}

export interface DiagnosticTest {
  test_type: string;
  date_performed: string;
  findings: string;
  interpretation: string;
  ordered_by?: string;
}

// ── Root model ──

export interface Patient {
  patient_id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  contact_info: ContactInfo;
  insurance: Insurance;
  allergies: Allergy[];
  current_medications: Medication[];
  diagnoses: Diagnosis[];
  clinical_notes: ClinicalNote[];
  lab_results: LabResult[];
  imaging_studies: ImagingStudy[];
  diagnostic_tests: DiagnosticTest[];
  primary_care_physician?: string;
  hospital?: string;
  admission_date?: string;
  patient_signature?: string;
  signature_date?: string;
}

// ── Helper functions ──

export function getPatientAge(patient: Patient): number {
  return Math.floor(
    (Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000
  );
}

export function getActiveDiagnoses(patient: Patient): Diagnosis[] {
  return patient.diagnoses.filter((d) => d.status === "active");
}

export function getRecentLabs(patient: Patient, days = 30): LabResult[] {
  const cutoff = Date.now() - days * 86400000;
  return patient.lab_results.filter(
    (l) => l.date_performed && new Date(l.date_performed).getTime() >= cutoff
  );
}
