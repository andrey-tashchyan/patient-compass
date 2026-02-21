export interface Patient {
  id: string;
  identity: PatientIdentity;
  state: PatientState;
  history: PatientHistory;
  interventions: PatientInterventions;
  assessments: PatientAssessments;
  network: PatientNetwork;
}

export interface PatientIdentity {
  mrn: string;
  immutable: {
    dateOfBirth: string;
    biologicalSex: string;
    bloodType: string;
    geneticMarkers?: string[];
  };
  mutable: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    phone: string;
    email: string;
    address: string;
    emergencyContact: { name: string; relation: string; phone: string };
    insurance: { provider: string; policyNumber: string; group: string };
    preferredLanguage: string;
  };
  temporal: {
    dateOfBirth: string;
    admissionDate?: string;
    lastVisit: string;
    keyEvents: { date: string; event: string }[];
  };
}

export interface VitalSign {
  name: string;
  value: string;
  unit: string;
  status: 'critical' | 'warning' | 'normal';
  timestamp: string;
}

export interface LabValue {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'critical' | 'warning' | 'normal';
  timestamp: string;
}

export interface Diagnosis {
  name: string;
  icdCode: string;
  severity: 'critical' | 'warning' | 'normal';
  status: 'active' | 'resolved' | 'chronic';
  onsetDate: string;
}

export interface PatientState {
  vitals: VitalSign[];
  labs: LabValue[];
  physicalExam: { system: string; finding: string; status: 'normal' | 'abnormal' }[];
  functionalState: { domain: string; score: string; description: string }[];
  symptoms: { symptom: string; severity: 'mild' | 'moderate' | 'severe'; onset: string }[];
  activeDiagnoses: Diagnosis[];
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'encounter' | 'procedure' | 'diagnosis' | 'medication' | 'problem';
  title: string;
  description: string;
  provider?: string;
  status?: 'active' | 'resolved' | 'chronic';
}

export interface PatientHistory {
  timeline: TimelineEvent[];
  exposures: { type: string; detail: string; duration: string }[];
  familyHistory: { relation: string; condition: string; ageOfOnset?: string }[];
}

export interface Medication {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'discontinued';
  prescriber: string;
}

export interface PatientInterventions {
  medications: Medication[];
  therapies: { name: string; type: string; frequency: string; status: 'active' | 'completed' }[];
  devices: { name: string; implantDate: string; status: string }[];
  carePlans: { name: string; goals: string[]; status: 'active' | 'completed' }[];
  preventive: { measure: string; lastDate: string; nextDue: string; status: 'current' | 'overdue' | 'upcoming' }[];
}

export interface RiskScore {
  name: string;
  score: number;
  maxScore: number;
  interpretation: string;
  level: 'low' | 'moderate' | 'high' | 'critical';
}

export interface PatientAssessments {
  riskScores: RiskScore[];
  functionalScores: { name: string; score: string; date: string; trend: 'improving' | 'stable' | 'declining' }[];
  psychosocial: { domain: string; assessment: string }[];
  goalsOfCare: { goal: string; priority: 'high' | 'medium' | 'low'; status: string }[];
  preferences: { category: string; preference: string }[];
}

export interface CareTeamMember {
  name: string;
  role: string;
  specialty?: string;
  phone: string;
  facility: string;
  isPrimary: boolean;
}

export interface PatientNetwork {
  careTeam: CareTeamMember[];
  facilities: { name: string; type: string; address: string }[];
  informationExchange: { date: string; from: string; to: string; type: string; summary: string }[];
}

export const mockPatients: Patient[] = [
  {
    id: "P-001",
    identity: {
      mrn: "MRN-2024-00847",
      immutable: {
        dateOfBirth: "1958-03-14",
        biologicalSex: "Male",
        bloodType: "A+",
        geneticMarkers: ["BRCA2 variant", "Factor V Leiden heterozygous"],
      },
      mutable: {
        firstName: "James",
        lastName: "Morrison",
        preferredName: "Jim",
        phone: "(555) 234-5678",
        email: "j.morrison@email.com",
        address: "1247 Oak Ridge Dr, Portland, OR 97201",
        emergencyContact: { name: "Linda Morrison", relation: "Spouse", phone: "(555) 234-5679" },
        insurance: { provider: "Blue Cross Blue Shield", policyNumber: "BCB-9847362", group: "GRP-44210" },
        preferredLanguage: "English",
      },
      temporal: {
        dateOfBirth: "1958-03-14",
        admissionDate: "2025-02-10",
        lastVisit: "2025-02-18",
        keyEvents: [
          { date: "2019-06-12", event: "CABG Surgery" },
          { date: "2022-11-03", event: "Type 2 Diabetes Diagnosis" },
          { date: "2024-08-15", event: "Fall with hip fracture" },
          { date: "2025-02-10", event: "Current admission — CHF exacerbation" },
        ],
      },
    },
    state: {
      vitals: [
        { name: "Heart Rate", value: "104", unit: "bpm", status: "warning", timestamp: "2025-02-18T14:30:00" },
        { name: "Blood Pressure", value: "158/94", unit: "mmHg", status: "warning", timestamp: "2025-02-18T14:30:00" },
        { name: "SpO2", value: "91", unit: "%", status: "critical", timestamp: "2025-02-18T14:30:00" },
        { name: "Temperature", value: "98.6", unit: "°F", status: "normal", timestamp: "2025-02-18T14:30:00" },
        { name: "Respiratory Rate", value: "22", unit: "/min", status: "warning", timestamp: "2025-02-18T14:30:00" },
        { name: "Weight", value: "198", unit: "lbs", status: "normal", timestamp: "2025-02-18T06:00:00" },
      ],
      labs: [
        { name: "BNP", value: "1,240", unit: "pg/mL", referenceRange: "<100", status: "critical", timestamp: "2025-02-18T08:00:00" },
        { name: "Troponin I", value: "0.08", unit: "ng/mL", referenceRange: "<0.04", status: "warning", timestamp: "2025-02-18T08:00:00" },
        { name: "Creatinine", value: "1.8", unit: "mg/dL", referenceRange: "0.7-1.3", status: "warning", timestamp: "2025-02-18T08:00:00" },
        { name: "Potassium", value: "5.4", unit: "mEq/L", referenceRange: "3.5-5.0", status: "warning", timestamp: "2025-02-18T08:00:00" },
        { name: "HbA1c", value: "8.2", unit: "%", referenceRange: "<7.0", status: "warning", timestamp: "2025-02-15T08:00:00" },
        { name: "WBC", value: "7.2", unit: "K/uL", referenceRange: "4.5-11.0", status: "normal", timestamp: "2025-02-18T08:00:00" },
        { name: "Hemoglobin", value: "11.8", unit: "g/dL", referenceRange: "13.5-17.5", status: "warning", timestamp: "2025-02-18T08:00:00" },
        { name: "Sodium", value: "138", unit: "mEq/L", referenceRange: "136-145", status: "normal", timestamp: "2025-02-18T08:00:00" },
      ],
      physicalExam: [
        { system: "Cardiovascular", finding: "S3 gallop, JVD elevated, bilateral pedal edema 2+", status: "abnormal" },
        { system: "Pulmonary", finding: "Bilateral basilar crackles, diminished breath sounds", status: "abnormal" },
        { system: "Abdomen", finding: "Soft, non-tender, hepatomegaly palpable", status: "abnormal" },
        { system: "Neurological", finding: "Alert, oriented x4, no focal deficits", status: "normal" },
        { system: "Musculoskeletal", finding: "Decreased ROM left hip, healed surgical scar", status: "abnormal" },
      ],
      functionalState: [
        { domain: "Mobility", score: "3/5", description: "Ambulatory with walker, limited distance" },
        { domain: "Cognition", score: "28/30", description: "MMSE within normal limits" },
        { domain: "ADL Independence", score: "4/6", description: "Requires assistance with bathing, transfers" },
        { domain: "NYHA Class", score: "III", description: "Marked limitation of physical activity" },
      ],
      symptoms: [
        { symptom: "Dyspnea on exertion", severity: "severe", onset: "2025-02-08" },
        { symptom: "Orthopnea (3-pillow)", severity: "moderate", onset: "2025-02-09" },
        { symptom: "Bilateral lower extremity edema", severity: "moderate", onset: "2025-02-07" },
        { symptom: "Fatigue", severity: "moderate", onset: "2025-02-06" },
        { symptom: "Decreased appetite", severity: "mild", onset: "2025-02-10" },
      ],
      activeDiagnoses: [
        { name: "Acute on Chronic Systolic Heart Failure", icdCode: "I50.23", severity: "critical", status: "active", onsetDate: "2019-06-01" },
        { name: "Type 2 Diabetes Mellitus, uncontrolled", icdCode: "E11.65", severity: "warning", status: "chronic", onsetDate: "2022-11-03" },
        { name: "Chronic Kidney Disease, Stage 3", icdCode: "N18.3", severity: "warning", status: "chronic", onsetDate: "2023-04-15" },
        { name: "Coronary Artery Disease, s/p CABG", icdCode: "I25.10", severity: "warning", status: "chronic", onsetDate: "2019-06-12" },
        { name: "Essential Hypertension", icdCode: "I10", severity: "normal", status: "chronic", onsetDate: "2010-03-20" },
        { name: "Hyperlipidemia", icdCode: "E78.5", severity: "normal", status: "chronic", onsetDate: "2015-09-01" },
      ],
    },
    history: {
      timeline: [
        { id: "T1", date: "2025-02-18", type: "encounter", title: "Cardiology Consult", description: "Inpatient consult for CHF exacerbation management", provider: "Dr. Sarah Chen" },
        { id: "T2", date: "2025-02-15", type: "procedure", title: "Echocardiogram", description: "TTE showing EF 30%, moderate MR, dilated LV", provider: "Dr. Mark Wilson" },
        { id: "T3", date: "2025-02-10", type: "encounter", title: "ED Admission", description: "Presented with acute dyspnea, bilateral edema, BNP 1800", provider: "Dr. Robert Kim" },
        { id: "T4", date: "2024-12-05", type: "encounter", title: "Outpatient Cardiology", description: "Routine follow-up, stable on current regimen, EF 35%", provider: "Dr. Sarah Chen" },
        { id: "T5", date: "2024-08-15", type: "procedure", title: "Left Hip ORIF", description: "Open reduction internal fixation for femoral neck fracture", provider: "Dr. James Park" },
        { id: "T6", date: "2024-08-15", type: "encounter", title: "ED Visit — Fall", description: "Fall at home, left hip pain, X-ray confirmed fracture", provider: "Dr. Amy Liu" },
        { id: "T7", date: "2024-03-10", type: "medication", title: "Jardiance Started", description: "Empagliflozin 10mg daily added for DM2 and cardioprotection", provider: "Dr. Sarah Chen" },
        { id: "T8", date: "2022-11-03", type: "diagnosis", title: "Type 2 Diabetes Diagnosis", description: "FBG 186, HbA1c 9.1%, started on metformin", provider: "Dr. Lisa Patel" },
        { id: "T9", date: "2019-06-12", type: "procedure", title: "CABG x3", description: "Triple vessel coronary artery bypass grafting", provider: "Dr. Michael Torres" },
        { id: "T10", date: "2019-06-01", type: "diagnosis", title: "CHF Diagnosis", description: "EF 40% on initial echo, NYHA Class II at diagnosis", provider: "Dr. Sarah Chen", status: "active" },
      ],
      exposures: [
        { type: "Occupational", detail: "Construction worker for 30 years, asbestos exposure suspected", duration: "1978-2008" },
        { type: "Social", detail: "Former smoker, 20 pack-years, quit 2019", duration: "1988-2019" },
        { type: "Social", detail: "Social alcohol use, 2-3 drinks/week", duration: "Current" },
        { type: "Environmental", detail: "Rural residence, well water supply", duration: "1958-1990" },
      ],
      familyHistory: [
        { relation: "Father", condition: "Myocardial infarction", ageOfOnset: "62" },
        { relation: "Mother", condition: "Type 2 Diabetes", ageOfOnset: "55" },
        { relation: "Brother", condition: "Colon cancer", ageOfOnset: "58" },
        { relation: "Mother", condition: "Breast cancer (BRCA2)", ageOfOnset: "67" },
      ],
    },
    interventions: {
      medications: [
        { name: "Furosemide", dose: "80mg", route: "IV", frequency: "BID", startDate: "2025-02-10", status: "active", prescriber: "Dr. Chen" },
        { name: "Carvedilol", dose: "12.5mg", route: "PO", frequency: "BID", startDate: "2019-07-01", status: "active", prescriber: "Dr. Chen" },
        { name: "Lisinopril", dose: "20mg", route: "PO", frequency: "Daily", startDate: "2019-07-01", status: "active", prescriber: "Dr. Chen" },
        { name: "Empagliflozin", dose: "10mg", route: "PO", frequency: "Daily", startDate: "2024-03-10", status: "active", prescriber: "Dr. Chen" },
        { name: "Metformin", dose: "1000mg", route: "PO", frequency: "BID", startDate: "2022-11-10", status: "active", prescriber: "Dr. Patel" },
        { name: "Atorvastatin", dose: "80mg", route: "PO", frequency: "QHS", startDate: "2019-07-01", status: "active", prescriber: "Dr. Chen" },
        { name: "Aspirin", dose: "81mg", route: "PO", frequency: "Daily", startDate: "2019-07-01", status: "active", prescriber: "Dr. Chen" },
        { name: "Enoxaparin", dose: "40mg", route: "SQ", frequency: "Daily", startDate: "2025-02-10", status: "active", prescriber: "Dr. Kim" },
      ],
      therapies: [
        { name: "Physical Therapy", type: "Rehabilitation", frequency: "Daily", status: "active" },
        { name: "Occupational Therapy", type: "Rehabilitation", frequency: "3x/week", status: "active" },
        { name: "Cardiac Rehabilitation", type: "Preventive", frequency: "Pending discharge", status: "active" },
      ],
      devices: [
        { name: "Continuous Telemetry Monitor", implantDate: "2025-02-10", status: "Active — inpatient" },
        { name: "Compression Stockings", implantDate: "2025-02-10", status: "Active" },
      ],
      carePlans: [
        { name: "CHF Exacerbation Management", goals: ["Achieve euvolemic state", "Optimize GDMT", "Improve EF >35%", "Reduce readmission risk"], status: "active" },
        { name: "Diabetes Management", goals: ["HbA1c <7.5%", "Renal protective medication adjustment"], status: "active" },
      ],
      preventive: [
        { measure: "Influenza Vaccine", lastDate: "2024-10-15", nextDue: "2025-10-01", status: "current" },
        { measure: "Pneumococcal Vaccine (PCV20)", lastDate: "2023-03-20", nextDue: "N/A", status: "current" },
        { measure: "Colonoscopy", lastDate: "2020-06-10", nextDue: "2025-06-10", status: "upcoming" },
        { measure: "Diabetic Eye Exam", lastDate: "2024-01-15", nextDue: "2025-01-15", status: "overdue" },
        { measure: "HbA1c Check", lastDate: "2025-02-15", nextDue: "2025-05-15", status: "current" },
      ],
    },
    assessments: {
      riskScores: [
        { name: "HEART Score", score: 6, maxScore: 10, interpretation: "High risk — consider admission and intervention", level: "high" },
        { name: "CHA₂DS₂-VASc", score: 4, maxScore: 9, interpretation: "High stroke risk — anticoagulation recommended", level: "high" },
        { name: "MAGGIC HF Risk", score: 28, maxScore: 50, interpretation: "Moderate-high 1-year mortality risk", level: "moderate" },
        { name: "Falls Risk (Morse)", score: 65, maxScore: 125, interpretation: "High fall risk — implement precautions", level: "high" },
        { name: "Braden Scale", score: 16, maxScore: 23, interpretation: "Mild risk for pressure injury", level: "moderate" },
      ],
      functionalScores: [
        { name: "KCCQ-12 (Heart Failure QoL)", score: "42/100", date: "2025-02-12", trend: "declining" },
        { name: "PHQ-9 (Depression)", score: "8/27", date: "2025-02-12", trend: "stable" },
        { name: "Katz ADL Index", score: "4/6", date: "2025-02-12", trend: "declining" },
        { name: "6-Minute Walk Test", score: "180m", date: "2025-02-14", trend: "declining" },
      ],
      psychosocial: [
        { domain: "Social Support", assessment: "Spouse is primary caregiver; adult children live out of state" },
        { domain: "Health Literacy", assessment: "Adequate — understands medication regimen with teach-back" },
        { domain: "Housing", assessment: "Two-story home, stairs to bedroom — barrier to safe discharge" },
        { domain: "Financial", assessment: "Medicare + supplemental insurance, stable income" },
        { domain: "Mental Health", assessment: "Mild depressive symptoms, adjustment to chronic illness" },
      ],
      goalsOfCare: [
        { goal: "Return home after diuresis and stabilization", priority: "high", status: "In progress" },
        { goal: "Maintain independence in ADLs", priority: "high", status: "Active" },
        { goal: "Avoid ICU and intubation if possible", priority: "medium", status: "Documented" },
        { goal: "Complete advance directive", priority: "medium", status: "Pending" },
      ],
      preferences: [
        { category: "Code Status", preference: "Full Code" },
        { category: "Communication", preference: "Include spouse in all discussions" },
        { category: "Dietary", preference: "Low-sodium, diabetic-friendly diet" },
        { category: "Spiritual", preference: "Would like chaplain visit if available" },
      ],
    },
    network: {
      careTeam: [
        { name: "Dr. Sarah Chen", role: "Attending Cardiologist", specialty: "Heart Failure", phone: "(555) 100-2001", facility: "Portland Heart Center", isPrimary: true },
        { name: "Dr. Robert Kim", role: "Hospitalist", specialty: "Internal Medicine", phone: "(555) 100-2002", facility: "St. Vincent Medical Center", isPrimary: false },
        { name: "Dr. Lisa Patel", role: "PCP / Endocrinology", specialty: "Internal Medicine", phone: "(555) 100-2003", facility: "Portland Primary Care", isPrimary: false },
        { name: "Maria Santos, RN", role: "Primary Nurse", phone: "(555) 100-2004", facility: "St. Vincent Medical Center", isPrimary: false },
        { name: "Tom Bradley, PT", role: "Physical Therapist", phone: "(555) 100-2005", facility: "St. Vincent Medical Center", isPrimary: false },
        { name: "Rachel Green, SW", role: "Social Worker", phone: "(555) 100-2006", facility: "St. Vincent Medical Center", isPrimary: false },
      ],
      facilities: [
        { name: "St. Vincent Medical Center", type: "Acute Care Hospital", address: "9205 SW Barnes Rd, Portland, OR 97225" },
        { name: "Portland Heart Center", type: "Specialty Clinic", address: "501 N Graham St, Portland, OR 97227" },
        { name: "Portland Primary Care", type: "Primary Care", address: "1130 NW 22nd Ave, Portland, OR 97210" },
      ],
      informationExchange: [
        { date: "2025-02-18", from: "Dr. Chen", to: "Dr. Patel", type: "Consult Note", summary: "CHF exacerbation update, medication adjustments" },
        { date: "2025-02-15", from: "Radiology", to: "Dr. Kim", type: "Echo Report", summary: "TTE results: EF 30%, moderate MR" },
        { date: "2025-02-10", from: "ED", to: "Dr. Kim", type: "Admission Note", summary: "Acute CHF exacerbation, initial stabilization" },
        { date: "2024-12-05", from: "Dr. Chen", to: "Dr. Patel", type: "Clinic Note", summary: "Stable HF, routine labs, continue current regimen" },
      ],
    },
  },
  {
    id: "P-002",
    identity: {
      mrn: "MRN-2024-01293",
      immutable: {
        dateOfBirth: "1985-09-22",
        biologicalSex: "Female",
        bloodType: "O-",
      },
      mutable: {
        firstName: "Aisha",
        lastName: "Rahman",
        phone: "(555) 876-5432",
        email: "a.rahman@email.com",
        address: "742 Evergreen Terrace, Portland, OR 97209",
        emergencyContact: { name: "Khalid Rahman", relation: "Husband", phone: "(555) 876-5433" },
        insurance: { provider: "Aetna", policyNumber: "AET-5523841", group: "GRP-88190" },
        preferredLanguage: "English",
      },
      temporal: {
        dateOfBirth: "1985-09-22",
        lastVisit: "2025-02-17",
        keyEvents: [
          { date: "2023-05-10", event: "Gestational diabetes during pregnancy" },
          { date: "2024-01-15", event: "Post-partum thyroiditis diagnosis" },
        ],
      },
    },
    state: {
      vitals: [
        { name: "Heart Rate", value: "78", unit: "bpm", status: "normal", timestamp: "2025-02-17T10:00:00" },
        { name: "Blood Pressure", value: "122/78", unit: "mmHg", status: "normal", timestamp: "2025-02-17T10:00:00" },
        { name: "SpO2", value: "98", unit: "%", status: "normal", timestamp: "2025-02-17T10:00:00" },
        { name: "Temperature", value: "99.1", unit: "°F", status: "normal", timestamp: "2025-02-17T10:00:00" },
        { name: "Weight", value: "145", unit: "lbs", status: "normal", timestamp: "2025-02-17T10:00:00" },
      ],
      labs: [
        { name: "TSH", value: "0.15", unit: "mIU/L", referenceRange: "0.4-4.0", status: "critical", timestamp: "2025-02-15T08:00:00" },
        { name: "Free T4", value: "2.8", unit: "ng/dL", referenceRange: "0.8-1.8", status: "warning", timestamp: "2025-02-15T08:00:00" },
        { name: "CBC", value: "Normal", unit: "", referenceRange: "Normal", status: "normal", timestamp: "2025-02-15T08:00:00" },
        { name: "FBG", value: "95", unit: "mg/dL", referenceRange: "<100", status: "normal", timestamp: "2025-02-15T08:00:00" },
      ],
      physicalExam: [
        { system: "Thyroid", finding: "Mildly enlarged, non-tender, no nodules", status: "abnormal" },
        { system: "Cardiovascular", finding: "RRR, no murmurs", status: "normal" },
        { system: "Neurological", finding: "Fine tremor bilateral hands", status: "abnormal" },
      ],
      functionalState: [
        { domain: "Mobility", score: "5/5", description: "Fully independent" },
        { domain: "Cognition", score: "30/30", description: "Normal" },
        { domain: "ADL Independence", score: "6/6", description: "Fully independent" },
      ],
      symptoms: [
        { symptom: "Palpitations", severity: "moderate", onset: "2025-01-20" },
        { symptom: "Heat intolerance", severity: "mild", onset: "2025-01-15" },
        { symptom: "Anxiety / restlessness", severity: "moderate", onset: "2025-01-25" },
        { symptom: "Unintentional weight loss (5 lbs)", severity: "mild", onset: "2025-01-10" },
      ],
      activeDiagnoses: [
        { name: "Thyrotoxicosis, post-partum", icdCode: "E05.90", severity: "warning", status: "active", onsetDate: "2024-01-15" },
        { name: "History of Gestational Diabetes", icdCode: "O24.419", severity: "normal", status: "resolved", onsetDate: "2023-05-10" },
      ],
    },
    history: {
      timeline: [
        { id: "T1", date: "2025-02-17", type: "encounter", title: "Endocrinology Follow-up", description: "Thyroid function worsening, consider methimazole", provider: "Dr. Anna Volkov" },
        { id: "T2", date: "2025-02-15", type: "procedure", title: "Thyroid Ultrasound", description: "Diffusely enlarged thyroid, no nodules", provider: "Dr. Anna Volkov" },
        { id: "T3", date: "2024-01-15", type: "diagnosis", title: "Post-partum Thyroiditis", description: "Hyperthyroid phase, monitoring initiated", provider: "Dr. Anna Volkov" },
      ],
      exposures: [
        { type: "Social", detail: "Non-smoker, no alcohol", duration: "Lifetime" },
      ],
      familyHistory: [
        { relation: "Mother", condition: "Hashimoto's thyroiditis", ageOfOnset: "45" },
        { relation: "Sister", condition: "Graves' disease", ageOfOnset: "32" },
      ],
    },
    interventions: {
      medications: [
        { name: "Propranolol", dose: "20mg", route: "PO", frequency: "TID", startDate: "2025-02-17", status: "active", prescriber: "Dr. Volkov" },
        { name: "Prenatal Vitamins", dose: "1 tab", route: "PO", frequency: "Daily", startDate: "2023-01-01", status: "active", prescriber: "Dr. Patel" },
      ],
      therapies: [],
      devices: [],
      carePlans: [
        { name: "Thyroid Management", goals: ["Normalize TSH", "Monitor for hypothyroid conversion", "Assess need for definitive therapy"], status: "active" },
      ],
      preventive: [
        { measure: "Annual Physical", lastDate: "2025-01-10", nextDue: "2026-01-10", status: "current" },
        { measure: "Pap Smear", lastDate: "2024-06-01", nextDue: "2027-06-01", status: "current" },
      ],
    },
    assessments: {
      riskScores: [
        { name: "Thyroid Storm Risk (Burch-Wartofsky)", score: 15, maxScore: 140, interpretation: "Unlikely thyroid storm", level: "low" },
        { name: "Cardiovascular Risk (ASCVD)", score: 2, maxScore: 100, interpretation: "Low 10-year risk", level: "low" },
      ],
      functionalScores: [
        { name: "GAD-7 (Anxiety)", score: "12/21", date: "2025-02-17", trend: "stable" },
        { name: "PHQ-9 (Depression)", score: "5/27", date: "2025-02-17", trend: "stable" },
      ],
      psychosocial: [
        { domain: "Social Support", assessment: "Strong family support, husband and parents nearby" },
        { domain: "Childcare", assessment: "Primary caregiver to 18-month-old" },
        { domain: "Health Literacy", assessment: "High — healthcare background" },
      ],
      goalsOfCare: [
        { goal: "Symptom control while breastfeeding-safe", priority: "high", status: "Active" },
        { goal: "Avoid radioactive iodine during nursing period", priority: "high", status: "Documented" },
      ],
      preferences: [
        { category: "Medication", preference: "Prefers breastfeeding-compatible options" },
        { category: "Communication", preference: "Prefers secure messaging over phone calls" },
      ],
    },
    network: {
      careTeam: [
        { name: "Dr. Anna Volkov", role: "Endocrinologist", specialty: "Thyroid Disorders", phone: "(555) 200-3001", facility: "Portland Endocrine Center", isPrimary: true },
        { name: "Dr. Lisa Patel", role: "PCP / OB-GYN", specialty: "Family Medicine", phone: "(555) 200-3002", facility: "Portland Primary Care", isPrimary: false },
      ],
      facilities: [
        { name: "Portland Endocrine Center", type: "Specialty Clinic", address: "2020 NW Lovejoy St, Portland, OR 97209" },
        { name: "Portland Primary Care", type: "Primary Care", address: "1130 NW 22nd Ave, Portland, OR 97210" },
      ],
      informationExchange: [
        { date: "2025-02-17", from: "Dr. Volkov", to: "Dr. Patel", type: "Clinic Note", summary: "Thyrotoxicosis worsening, starting propranolol" },
      ],
    },
  },
  {
    id: "P-003",
    identity: {
      mrn: "MRN-2024-00312",
      immutable: {
        dateOfBirth: "1942-11-08",
        biologicalSex: "Female",
        bloodType: "B+",
      },
      mutable: {
        firstName: "Eleanor",
        lastName: "Whitfield",
        preferredName: "Ellie",
        phone: "(555) 345-6789",
        email: "e.whitfield@email.com",
        address: "89 Sunset Blvd, Lake Oswego, OR 97034",
        emergencyContact: { name: "David Whitfield", relation: "Son", phone: "(555) 345-6790" },
        insurance: { provider: "Medicare", policyNumber: "MED-1142938", group: "N/A" },
        preferredLanguage: "English",
      },
      temporal: {
        dateOfBirth: "1942-11-08",
        admissionDate: "2025-02-16",
        lastVisit: "2025-02-19",
        keyEvents: [
          { date: "2020-03-15", event: "Mild Cognitive Impairment diagnosis" },
          { date: "2023-09-01", event: "Alzheimer's Disease diagnosis" },
          { date: "2025-02-16", event: "Admission — UTI with acute confusion" },
        ],
      },
    },
    state: {
      vitals: [
        { name: "Heart Rate", value: "88", unit: "bpm", status: "normal", timestamp: "2025-02-19T08:00:00" },
        { name: "Blood Pressure", value: "134/82", unit: "mmHg", status: "normal", timestamp: "2025-02-19T08:00:00" },
        { name: "SpO2", value: "96", unit: "%", status: "normal", timestamp: "2025-02-19T08:00:00" },
        { name: "Temperature", value: "100.4", unit: "°F", status: "warning", timestamp: "2025-02-19T08:00:00" },
      ],
      labs: [
        { name: "WBC", value: "14.2", unit: "K/uL", referenceRange: "4.5-11.0", status: "warning", timestamp: "2025-02-19T06:00:00" },
        { name: "Urinalysis", value: "Positive", unit: "", referenceRange: "Negative", status: "critical", timestamp: "2025-02-16T10:00:00" },
        { name: "Creatinine", value: "1.1", unit: "mg/dL", referenceRange: "0.6-1.2", status: "normal", timestamp: "2025-02-19T06:00:00" },
      ],
      physicalExam: [
        { system: "Neurological", finding: "Confused, oriented x1 (person only), baseline MMSE 18/30", status: "abnormal" },
        { system: "Genitourinary", finding: "Suprapubic tenderness, cloudy urine", status: "abnormal" },
        { system: "Cardiovascular", finding: "RRR, no murmurs", status: "normal" },
      ],
      functionalState: [
        { domain: "Mobility", score: "2/5", description: "Requires 1-person assist, unsteady gait" },
        { domain: "Cognition", score: "14/30", description: "MMSE decline from baseline 18, acute delirium superimposed" },
        { domain: "ADL Independence", score: "2/6", description: "Requires assist with most ADLs" },
      ],
      symptoms: [
        { symptom: "Acute confusion / agitation", severity: "severe", onset: "2025-02-15" },
        { symptom: "Dysuria", severity: "moderate", onset: "2025-02-14" },
        { symptom: "Urinary frequency", severity: "moderate", onset: "2025-02-14" },
      ],
      activeDiagnoses: [
        { name: "Urinary Tract Infection", icdCode: "N39.0", severity: "warning", status: "active", onsetDate: "2025-02-16" },
        { name: "Delirium superimposed on Dementia", icdCode: "F05", severity: "critical", status: "active", onsetDate: "2025-02-15" },
        { name: "Alzheimer's Disease, early stage", icdCode: "G30.0", severity: "warning", status: "chronic", onsetDate: "2023-09-01" },
        { name: "Osteoporosis", icdCode: "M81.0", severity: "normal", status: "chronic", onsetDate: "2018-05-01" },
      ],
    },
    history: {
      timeline: [
        { id: "T1", date: "2025-02-19", type: "encounter", title: "Geriatrics Consult", description: "Delirium management, non-pharmacological interventions", provider: "Dr. Helen Wu" },
        { id: "T2", date: "2025-02-16", type: "encounter", title: "Admission", description: "Acute confusion, UTI confirmed, IV antibiotics started", provider: "Dr. James Park" },
        { id: "T3", date: "2023-09-01", type: "diagnosis", title: "Alzheimer's Disease", description: "Progression from MCI, started donepezil", provider: "Dr. Helen Wu" },
      ],
      exposures: [
        { type: "Social", detail: "Non-smoker, occasional wine", duration: "Lifetime" },
      ],
      familyHistory: [
        { relation: "Mother", condition: "Alzheimer's Disease", ageOfOnset: "72" },
        { relation: "Father", condition: "Stroke", ageOfOnset: "80" },
      ],
    },
    interventions: {
      medications: [
        { name: "Ceftriaxone", dose: "1g", route: "IV", frequency: "Daily", startDate: "2025-02-16", status: "active", prescriber: "Dr. Park" },
        { name: "Donepezil", dose: "10mg", route: "PO", frequency: "QHS", startDate: "2023-09-15", status: "active", prescriber: "Dr. Wu" },
        { name: "Memantine", dose: "10mg", route: "PO", frequency: "BID", startDate: "2024-06-01", status: "active", prescriber: "Dr. Wu" },
        { name: "Alendronate", dose: "70mg", route: "PO", frequency: "Weekly", startDate: "2018-06-01", status: "active", prescriber: "Dr. Patel" },
      ],
      therapies: [
        { name: "Cognitive Stimulation Therapy", type: "Cognitive", frequency: "3x/week", status: "active" },
        { name: "Physical Therapy (fall prevention)", type: "Rehabilitation", frequency: "Daily", status: "active" },
      ],
      devices: [
        { name: "Bed Alarm", implantDate: "2025-02-16", status: "Active — fall precaution" },
      ],
      carePlans: [
        { name: "Delirium Resolution", goals: ["Treat UTI", "Restore baseline cognition", "Non-pharmacological delirium management"], status: "active" },
      ],
      preventive: [
        { measure: "Influenza Vaccine", lastDate: "2024-10-01", nextDue: "2025-10-01", status: "current" },
        { measure: "DEXA Scan", lastDate: "2023-05-01", nextDue: "2025-05-01", status: "upcoming" },
      ],
    },
    assessments: {
      riskScores: [
        { name: "CAM (Confusion Assessment)", score: 4, maxScore: 4, interpretation: "Positive for delirium", level: "critical" },
        { name: "Falls Risk (Morse)", score: 80, maxScore: 125, interpretation: "High fall risk", level: "high" },
        { name: "Braden Scale", score: 14, maxScore: 23, interpretation: "Moderate pressure injury risk", level: "moderate" },
      ],
      functionalScores: [
        { name: "MMSE", score: "14/30", date: "2025-02-17", trend: "declining" },
        { name: "GDS (Geriatric Depression)", score: "6/15", date: "2025-01-15", trend: "stable" },
        { name: "Barthel Index", score: "45/100", date: "2025-02-17", trend: "declining" },
      ],
      psychosocial: [
        { domain: "Caregiver", assessment: "Son is primary caregiver, reports burnout" },
        { domain: "Living Situation", assessment: "Lives with son, home aide 4 hrs/day" },
        { domain: "Advance Planning", assessment: "POLST completed, DNR/DNI" },
      ],
      goalsOfCare: [
        { goal: "Comfort-focused care, avoid aggressive interventions", priority: "high", status: "Documented" },
        { goal: "Return home with increased aide support", priority: "high", status: "In progress" },
      ],
      preferences: [
        { category: "Code Status", preference: "DNR/DNI" },
        { category: "Decision Maker", preference: "Son — David Whitfield (Healthcare POA)" },
      ],
    },
    network: {
      careTeam: [
        { name: "Dr. Helen Wu", role: "Geriatrician", specialty: "Geriatric Medicine", phone: "(555) 300-4001", facility: "Portland Geriatric Center", isPrimary: true },
        { name: "Dr. James Park", role: "Hospitalist", specialty: "Internal Medicine", phone: "(555) 300-4002", facility: "St. Vincent Medical Center", isPrimary: false },
        { name: "Maria Lopez, HHA", role: "Home Health Aide", phone: "(555) 300-4003", facility: "Comfort Care Services", isPrimary: false },
      ],
      facilities: [
        { name: "St. Vincent Medical Center", type: "Acute Care Hospital", address: "9205 SW Barnes Rd, Portland, OR 97225" },
        { name: "Portland Geriatric Center", type: "Specialty Clinic", address: "3181 SW Sam Jackson Park Rd, Portland, OR 97239" },
      ],
      informationExchange: [
        { date: "2025-02-19", from: "Dr. Wu", to: "David Whitfield", type: "Family Update", summary: "Delirium improving, plan for discharge in 48-72 hrs" },
        { date: "2025-02-16", from: "Dr. Park", to: "Dr. Wu", type: "Admission Note", summary: "UTI with delirium superimposed on Alzheimer's" },
      ],
    },
  },
];

export function searchPatients(query: string): Patient[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return mockPatients.filter(p => {
    const { identity } = p;
    const fullName = `${identity.mutable.firstName} ${identity.mutable.lastName}`.toLowerCase();
    const mrn = identity.mrn.toLowerCase();
    const dob = identity.immutable.dateOfBirth;
    return fullName.includes(q) || mrn.includes(q) || dob.includes(q) || (identity.mutable.preferredName?.toLowerCase().includes(q) ?? false);
  });
}

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find(p => p.id === id);
}
