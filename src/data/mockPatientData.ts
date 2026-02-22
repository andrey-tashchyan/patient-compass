import {
  type Patient,
  Gender,
  AllergyStatus,
} from "@/types/patient";

export const mockPatients: Patient[] = [
  // ── P-001: CHF patient ──
  {
    patient_id: "P-001",
    medical_record_number: "MRN-2024-4521",
    first_name: "James",
    last_name: "Morrison",
    date_of_birth: "1958-03-15",
    gender: Gender.MALE,
    contact_info: {
      phone: "(503) 555-0142",
      address: "1247 NW Everett St, Portland, OR 97209",
      emergency_contact_name: "Linda Morrison",
      emergency_contact_relation: "Spouse",
      emergency_contact_phone: "(503) 555-0198",
    },
    insurance: { provider: "Blue Cross Blue Shield", plan_type: "PPO" },
    primary_care_physician: "Dr. Sarah Chen",
    hospital: "Portland Heart Center",
    admission_date: "2025-01-15",
    allergies: [
      { allergen: "Penicillin", reaction: "Urticaria", status: AllergyStatus.CONFIRMED, recorded_at: "2010-06-01" },
      { allergen: "Sulfonamides", reaction: "Rash", status: AllergyStatus.CONFIRMED, recorded_at: "2015-03-12" },
      { allergen: "Aspirin", reaction: "Bronchospasm", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Furosemide", dosage: "40 mg", frequency: "Twice daily", indication: "Heart failure" },
      { name: "Lisinopril", dosage: "20 mg", frequency: "Once daily", indication: "HTN / HF" },
      { name: "Carvedilol", dosage: "25 mg", frequency: "Twice daily", indication: "HF — beta-blocker" },
      { name: "Spironolactone", dosage: "25 mg", frequency: "Once daily", indication: "HF — aldosterone antagonist" },
      { name: "Metformin", dosage: "1000 mg", frequency: "Twice daily", indication: "Type 2 diabetes" },
      { name: "Warfarin", dosage: "5 mg", frequency: "Once daily", indication: "Atrial fibrillation" },
    ],
    diagnoses: [
      { condition: "Congestive heart failure", icd_code: "I50.9", status: "active", date_diagnosed: "2023-06-10" },
      { condition: "Atrial fibrillation", icd_code: "I48.91", status: "active", date_diagnosed: "2023-06-10" },
      { condition: "Type 2 diabetes mellitus", icd_code: "E11.9", status: "chronic", date_diagnosed: "2015-04-20" },
      { condition: "Essential hypertension", icd_code: "I10", status: "chronic", date_diagnosed: "2010-02-14" },
      { condition: "Community-acquired pneumonia", icd_code: "J18.9", status: "resolved", date_diagnosed: "2024-11-05" },
    ],
    clinical_notes: [
      {
        note_type: "Cardiology follow-up",
        date_of_service: "2025-02-10",
        provider_name: "Dr. Sarah Chen",
        provider_credentials: "MD, FACC",
        chief_complaint: "Progressive exertional dyspnea, lower extremity edema",
        summary: "Patient reports increasing dyspnea with moderate activities (climbing one flight of stairs). Orthopnea requiring 3 pillows. Weight gain of 2 kg in one week. Medication adherence reported as good.\n\nBP 148/92, HR 88 bpm irregular, Temp 98.2 °F, SpO₂ 93% on RA. Bilateral basilar crackles. Bilateral LE edema 2+. JVD at 10 cm H₂O. S3 gallop at apex.\n\nDecompensated heart failure NYHA class III with rapid ventricular response atrial fibrillation. Volume overload.\n\nPlan: Increase furosemide to 80 mg/day. Recheck BNP and electrolytes at 48 hours. Fluid restriction 1.5 L/day. Follow-up echocardiogram in 2 weeks. Daily weight monitoring.",
        vital_signs: {
          blood_pressure_systolic: 148,
          blood_pressure_diastolic: 92,
          heart_rate: 88,
          temperature_fahrenheit: 98.2,
          bmi: 31.2,
        },
        follow_up_instructions: "Return in 2 weeks or sooner if weight gain > 1 kg/day.",
      },
      {
        note_type: "Emergency",
        date_of_service: "2025-01-15",
        provider_name: "Dr. Michael Torres",
        provider_credentials: "MD, FACEP",
        chief_complaint: "Acute dyspnea, chest pain",
        summary: "66-year-old male brought by ambulance for acute-onset dyspnea with anterior chest pain, non-radiating.\n\nBP 165/100, HR 112 bpm irregular, SpO₂ 88% on RA, RR 28. Moderate respiratory distress. Diffuse bilateral crackles. ECG: rapid AFib, no ST elevation.\n\nAcute pulmonary edema secondary to HF decompensation. Rapid ventricular response AFib. Negative troponin — ACS ruled out.\n\nPlan: Furosemide 80 mg IV, O₂ 4 L/min, continuous monitoring. Admit to cardiac ICU. Urgent echocardiography.",
        vital_signs: {
          blood_pressure_systolic: 165,
          blood_pressure_diastolic: 100,
          heart_rate: 112,
          temperature_fahrenheit: 98.6,
        },
      },
    ],
    lab_results: [
      { test_name: "BNP", result: "1250", unit: "pg/mL", reference_range: "< 100", flagged: true, date_performed: "2025-02-10" },
      { test_name: "Creatinine", result: "1.8", unit: "mg/dL", reference_range: "0.7-1.3", flagged: true, date_performed: "2025-02-10" },
      { test_name: "Potassium", result: "5.2", unit: "mEq/L", reference_range: "3.5-5.0", flagged: true, date_performed: "2025-02-10" },
      { test_name: "HbA1c", result: "7.8", unit: "%", reference_range: "< 7.0", flagged: true, date_performed: "2025-01-20" },
      { test_name: "INR", result: "2.4", unit: "", reference_range: "2.0-3.0", flagged: false, date_performed: "2025-02-10" },
      { test_name: "Sodium", result: "138", unit: "mEq/L", reference_range: "136-145", flagged: false, date_performed: "2025-02-10" },
    ],
    imaging_studies: [
      {
        study_type: "Transthoracic echocardiography",
        body_part: "Heart",
        findings: "LVEF 30%. Severe LV dilation (LVEDD 68 mm). Moderate functional mitral regurgitation. Moderate pulmonary hypertension (PASP 48 mmHg). LA dilation.",
        impression: "Dilated cardiomyopathy with severe systolic dysfunction. HFrEF.",
        date_performed: "2025-01-16",
        radiologist: "Dr. Amy Nguyen",
      },
      {
        study_type: "Chest X-ray",
        body_part: "Chest",
        findings: "Cardiomegaly. Cephalization of pulmonary vasculature. Small bilateral pleural effusions. Kerley B lines.",
        impression: "Radiographic signs of left-sided heart failure with fluid overload.",
        date_performed: "2025-01-15",
        radiologist: "Dr. Robert Kim",
      },
    ],
    diagnostic_tests: [
      {
        test_type: "12-lead ECG",
        date_performed: "2025-02-10",
        findings: "Atrial fibrillation at 88 bpm. Left axis deviation. LVH by Sokolow criteria. No acute ST changes.",
        interpretation: "Chronic AFib. LVH. No acute ischemia.",
        ordered_by: "Dr. Sarah Chen",
      },
    ],
  },

  // ── P-002: Thyroid patient ──
  {
    patient_id: "P-002",
    medical_record_number: "MRN-2024-7834",
    first_name: "Aisha",
    last_name: "Rahman",
    date_of_birth: "1985-11-22",
    gender: Gender.FEMALE,
    contact_info: {
      phone: "(503) 555-0267",
      address: "892 SE Hawthorne Blvd, Portland, OR 97214",
      emergency_contact_name: "Omar Rahman",
      emergency_contact_relation: "Brother",
      emergency_contact_phone: "(503) 555-0345",
    },
    insurance: { provider: "Kaiser Permanente", plan_type: "HMO" },
    primary_care_physician: "Dr. Anna Volkov",
    hospital: "Portland Endocrine Center",
    allergies: [
      { allergen: "Iodine", reaction: "Urticaria", status: AllergyStatus.CONFIRMED },
      { allergen: "Latex", reaction: "Contact dermatitis", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Levothyroxine", dosage: "100 mcg", frequency: "Once daily", indication: "Hypothyroidism" },
      { name: "Vitamin D3", dosage: "2000 IU", frequency: "Once daily", indication: "Vitamin D deficiency" },
      { name: "Ferrous sulfate", dosage: "325 mg", frequency: "Once daily", indication: "Iron deficiency anemia" },
    ],
    diagnoses: [
      { condition: "Hypothyroidism", icd_code: "E03.9", status: "active", date_diagnosed: "2020-08-15" },
      { condition: "Iron deficiency anemia", icd_code: "D50.9", status: "active", date_diagnosed: "2024-06-10" },
      { condition: "Vitamin D deficiency", icd_code: "E55.9", status: "chronic", date_diagnosed: "2022-01-20" },
      { condition: "Benign thyroid nodule", icd_code: "E04.1", status: "resolved", date_diagnosed: "2021-03-05" },
    ],
    clinical_notes: [
      {
        note_type: "Endocrinology follow-up",
        date_of_service: "2025-02-05",
        provider_name: "Dr. Anna Volkov",
        provider_credentials: "MD, FACE",
        chief_complaint: "Thyroid check, persistent fatigue",
        summary: "Patient reports residual fatigue despite treatment. Weight gain of 3 kg over 3 months. Dry, brittle hair. Constipation.\n\nBP 118/74, HR 62 bpm, Temp 97.5 °F. Thyroid palpable, homogeneous, non-tender. Dry skin. Slightly diminished deep tendon reflexes.\n\nInsufficiently treated hypothyroidism. TSH still elevated. Persistent iron deficiency anemia.\n\nPlan: Increase levothyroxine to 125 mcg/day. Recheck TSH/free T4 in 6 weeks. Continue iron supplementation. CBC recheck in 1 month.",
        vital_signs: {
          blood_pressure_systolic: 118,
          blood_pressure_diastolic: 74,
          heart_rate: 62,
          temperature_fahrenheit: 97.5,
          bmi: 26.4,
        },
        follow_up_instructions: "Return in 6 weeks with lab results.",
      },
    ],
    lab_results: [
      { test_name: "TSH", result: "8.2", unit: "mIU/L", reference_range: "0.4-4.0", flagged: true, date_performed: "2025-02-05" },
      { test_name: "Free T4", result: "0.9", unit: "ng/dL", reference_range: "0.8-1.8", flagged: false, date_performed: "2025-02-05" },
      { test_name: "Ferritin", result: "12", unit: "ng/mL", reference_range: "20-200", flagged: true, date_performed: "2025-02-05" },
      { test_name: "Hemoglobin", result: "10.8", unit: "g/dL", reference_range: "12.0-16.0", flagged: true, date_performed: "2025-02-05" },
      { test_name: "Vitamin D (25-OH)", result: "22", unit: "ng/mL", reference_range: "30-100", flagged: true, date_performed: "2025-02-05" },
    ],
    imaging_studies: [
      {
        study_type: "Thyroid ultrasound",
        body_part: "Thyroid",
        findings: "Normal-sized thyroid. Right lobe nodule 8 mm, isoechoic, well-defined, EU-TIRADS 2. No suspicious lymph nodes.",
        impression: "Stable benign nodule. No indication for biopsy.",
        date_performed: "2025-01-10",
        radiologist: "Dr. Helen Wu",
      },
    ],
    diagnostic_tests: [],
  },

  // ── P-003: Geriatric patient ──
  {
    patient_id: "P-003",
    medical_record_number: "MRN-2024-1156",
    first_name: "Eleanor",
    last_name: "Whitfield",
    date_of_birth: "1940-07-08",
    gender: Gender.FEMALE,
    contact_info: {
      phone: "(503) 555-0389",
      address: "456 NE Broadway, Portland, OR 97232",
      emergency_contact_name: "David Whitfield",
      emergency_contact_relation: "Son",
      emergency_contact_phone: "(503) 555-0412",
    },
    insurance: { provider: "Medicare", plan_type: "Part A + B" },
    primary_care_physician: "Dr. Helen Wu",
    hospital: "St. Vincent Medical Center",
    admission_date: "2025-02-01",
    allergies: [
      { allergen: "Codeine", reaction: "Severe nausea", status: AllergyStatus.CONFIRMED },
      { allergen: "Peanuts", reaction: "Anaphylaxis", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [
      { name: "Donepezil", dosage: "10 mg", frequency: "Once daily", indication: "Alzheimer's disease" },
      { name: "Amlodipine", dosage: "5 mg", frequency: "Once daily", indication: "Hypertension" },
      { name: "Calcium + Vit D", dosage: "600 mg / 400 IU", frequency: "Twice daily", indication: "Osteoporosis" },
      { name: "Alendronate", dosage: "70 mg", frequency: "Once weekly", indication: "Osteoporosis" },
      { name: "Acetaminophen", dosage: "500 mg", frequency: "As needed", indication: "Osteoarthritis pain" },
    ],
    diagnoses: [
      { condition: "Alzheimer's disease, mild to moderate", icd_code: "G30.1", status: "active", date_diagnosed: "2023-09-20" },
      { condition: "Postmenopausal osteoporosis", icd_code: "M81.0", status: "chronic", date_diagnosed: "2018-05-10" },
      { condition: "Essential hypertension", icd_code: "I10", status: "chronic", date_diagnosed: "2005-11-30" },
      { condition: "Right knee osteoarthritis", icd_code: "M17.11", status: "chronic", date_diagnosed: "2016-08-22" },
      { condition: "Left femoral neck fracture", icd_code: "S72.001A", status: "resolved", date_diagnosed: "2024-12-15" },
    ],
    clinical_notes: [
      {
        note_type: "Geriatric consultation",
        date_of_service: "2025-02-12",
        provider_name: "Dr. Helen Wu",
        provider_credentials: "MD, CMD",
        chief_complaint: "Cognitive reassessment, post-fracture follow-up",
        summary: "Patient's daughter reports worsening memory issues: missed meals, getting lost in the neighborhood. Residual left hip pain with walking. No falls since last visit.\n\nBP 134/78, HR 72 bpm. MMSE 20/30 (orientation 7/10, recall 1/3). Timed Up and Go test: 18 seconds (fall risk). Left hip surgical scar well-healed. Satisfactory joint mobility.\n\nProgressive cognitive decline (moderate Alzheimer's). High fall risk. Good post-surgical recovery from femoral neck fracture.\n\nPlan: Continue donepezil 10 mg. Refer to physical therapy for fall prevention program. Full neuropsychological evaluation in 3 months. Home safety modifications recommended.",
        vital_signs: {
          blood_pressure_systolic: 134,
          blood_pressure_diastolic: 78,
          heart_rate: 72,
          temperature_fahrenheit: 97.8,
          bmi: 22.1,
        },
        follow_up_instructions: "Return in 3 months. Call if acute confusion or fall occurs.",
      },
    ],
    lab_results: [
      { test_name: "Calcium", result: "9.2", unit: "mg/dL", reference_range: "8.5-10.5", flagged: false, date_performed: "2025-02-01" },
      { test_name: "Vitamin D (25-OH)", result: "28", unit: "ng/mL", reference_range: "30-100", flagged: true, date_performed: "2025-02-01" },
      { test_name: "Creatinine", result: "1.1", unit: "mg/dL", reference_range: "0.6-1.2", flagged: false, date_performed: "2025-02-01" },
      { test_name: "Hemoglobin", result: "11.5", unit: "g/dL", reference_range: "12.0-16.0", flagged: true, date_performed: "2025-02-01" },
      { test_name: "TSH", result: "2.1", unit: "mIU/L", reference_range: "0.4-4.0", flagged: false, date_performed: "2025-02-01" },
    ],
    imaging_studies: [
      {
        study_type: "Pelvis X-ray",
        body_part: "Left hip",
        findings: "DHS plate and screw fixation in place. Satisfactory bony consolidation. No secondary displacement.",
        impression: "Left femoral neck fracture healing well, favorable progress.",
        date_performed: "2025-02-01",
        radiologist: "Dr. Robert Kim",
      },
      {
        study_type: "DEXA scan",
        body_part: "Lumbar spine / Right femoral neck",
        findings: "T-score lumbar L1-L4: -3.2. T-score right femoral neck: -2.8.",
        impression: "Severe osteoporosis. High fracture risk.",
        date_performed: "2024-11-20",
        radiologist: "Dr. Amy Nguyen",
      },
    ],
    diagnostic_tests: [
      {
        test_type: "MMSE (Mini-Mental State Examination)",
        date_performed: "2025-02-12",
        findings: "Total score 20/30. Deficits in temporal orientation (2/5), recall (1/3), and calculation (2/5). Language and constructional praxis preserved.",
        interpretation: "Moderate cognitive decline consistent with moderate-stage Alzheimer's disease. 2-point decline from September 2024 score.",
        ordered_by: "Dr. Helen Wu",
      },
      {
        test_type: "Timed Up and Go Test",
        date_performed: "2025-02-12",
        findings: "Time: 18 seconds. Cautious gait, slight imbalance on turning.",
        interpretation: "Moderate to high fall risk. Physical therapy recommended.",
        ordered_by: "Dr. Helen Wu",
      },
    ],
  },
];

export function getPatientById(id: string): Patient | undefined {
  return mockPatients.find((p) => p.patient_id === id);
}

export function searchPatients(query: string): Patient[] {
  const q = query.toLowerCase();
  return mockPatients.filter(
    (p) =>
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.medical_record_number.toLowerCase().includes(q)
  );
}
