import { type Patient, Gender, AllergyStatus } from "@/types/patient";

/**
 * 10 mock patients corresponding to the Synthea evolution dataset.
 * Each has an evolution_uuid matching the UUID in public/data/final_10_patients/.
 */
export const evolutionPatients: Patient[] = [
  // 1. Andreas188 Hoeger474 — elderly male, hyperlipidemia + CHF
  {
    patient_id: "EVO-001",
    medical_record_number: "MRN-EVO-0001",
    first_name: "Andreas",
    last_name: "Hoeger",
    date_of_birth: "1945-06-11",
    gender: Gender.MALE,
    evolution_uuid: "20c3ca32-ec09-4e7c-abab-9f7711cbe235",
    contact_info: {
      phone: "(503) 555-1001",
      address: "312 NW Lovejoy St, Portland, OR 97209",
      emergency_contact_name: "Martha Hoeger",
      emergency_contact_relation: "Spouse",
      emergency_contact_phone: "(503) 555-1002",
    },
    insurance: { provider: "Medicare", plan_type: "Part A + B" },
    primary_care_physician: "Dr. Robert Kim",
    hospital: "Providence Portland Medical Center",
    allergies: [
      { allergen: "Codeine", reaction: "Nausea", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [
      { name: "Simvastatin", dosage: "10 mg", frequency: "Once daily", indication: "Hyperlipidemia" },
      { name: "Metoprolol succinate", dosage: "100 mg", frequency: "Once daily", indication: "CHF" },
      { name: "Furosemide", dosage: "40 mg", frequency: "Once daily", indication: "CHF" },
    ],
    diagnoses: [
      { condition: "Hyperlipidemia", icd_code: "E78.5", status: "chronic", date_diagnosed: "1979-07-19" },
      { condition: "Chronic congestive heart failure", icd_code: "I50.9", status: "active", date_diagnosed: "2013-06-22" },
    ],
    clinical_notes: [
      {
        note_type: "Cardiology follow-up",
        date_of_service: "2025-01-10",
        provider_name: "Dr. Robert Kim",
        provider_credentials: "MD, FACC",
        chief_complaint: "Routine CHF follow-up",
        summary: "Stable CHF on current regimen. LVEF 35%. Continue metoprolol and furosemide. Lipids well controlled on simvastatin. Follow up in 3 months.",
        vital_signs: { blood_pressure_systolic: 132, blood_pressure_diastolic: 78, heart_rate: 68, bmi: 28.4 },
      },
    ],
    lab_results: [
      { test_name: "Total Cholesterol", result: "198", unit: "mg/dL", reference_range: "< 200", flagged: false, date_performed: "2025-01-10" },
      { test_name: "LDL", result: "110", unit: "mg/dL", reference_range: "< 100", flagged: true, date_performed: "2025-01-10" },
      { test_name: "BNP", result: "420", unit: "pg/mL", reference_range: "< 100", flagged: true, date_performed: "2025-01-10" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 2. Anibal473 Connelly992 — male, obesity + prediabetes + pregnancy history (partner)
  {
    patient_id: "EVO-002",
    medical_record_number: "MRN-EVO-0002",
    first_name: "Anibal",
    last_name: "Connelly",
    date_of_birth: "1965-10-14",
    gender: Gender.MALE,
    evolution_uuid: "32885ae1-d031-4f52-8f91-0e5196f5462a",
    contact_info: {
      phone: "(503) 555-1003",
      address: "890 SE Division St, Portland, OR 97202",
      emergency_contact_name: "Rosa Connelly",
      emergency_contact_relation: "Wife",
      emergency_contact_phone: "(503) 555-1004",
    },
    insurance: { provider: "Blue Cross Blue Shield", plan_type: "PPO" },
    primary_care_physician: "Dr. Anna Volkov",
    allergies: [],
    current_medications: [
      { name: "Metformin", dosage: "500 mg", frequency: "Once daily", indication: "Prediabetes" },
    ],
    diagnoses: [
      { condition: "Obesity (BMI 30+)", icd_code: "E66.9", status: "chronic", date_diagnosed: "2016-01-18" },
      { condition: "Prediabetes", icd_code: "R73.03", status: "active", date_diagnosed: "2022-05-14" },
      { condition: "Antepartum eclampsia (partner)", icd_code: "O15.0", status: "resolved", date_diagnosed: "2013-03-11" },
    ],
    clinical_notes: [
      {
        note_type: "Primary care visit",
        date_of_service: "2025-02-01",
        provider_name: "Dr. Anna Volkov",
        provider_credentials: "MD",
        chief_complaint: "Weight management, prediabetes follow-up",
        summary: "BMI 32.1. HbA1c 6.2%, stable prediabetes. Continue metformin and lifestyle modifications. Repeat labs in 6 months.",
        vital_signs: { blood_pressure_systolic: 138, blood_pressure_diastolic: 86, heart_rate: 76, bmi: 32.1 },
      },
    ],
    lab_results: [
      { test_name: "HbA1c", result: "6.2", unit: "%", reference_range: "< 5.7", flagged: true, date_performed: "2025-02-01" },
      { test_name: "Fasting Glucose", result: "112", unit: "mg/dL", reference_range: "70-100", flagged: true, date_performed: "2025-02-01" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 3. Annemarie794 Heidenreich818 — female, ankle fracture history
  {
    patient_id: "EVO-003",
    medical_record_number: "MRN-EVO-0003",
    first_name: "Annemarie",
    last_name: "Heidenreich",
    date_of_birth: "1968-08-22",
    gender: Gender.FEMALE,
    evolution_uuid: "45ad6c75-7808-4f70-9c80-0db44f681e55",
    contact_info: {
      phone: "(503) 555-1005",
      address: "1455 NE Alberta St, Portland, OR 97211",
      emergency_contact_name: "Franz Heidenreich",
      emergency_contact_relation: "Brother",
      emergency_contact_phone: "(503) 555-1006",
    },
    insurance: { provider: "Kaiser Permanente", plan_type: "HMO" },
    primary_care_physician: "Dr. Helen Wu",
    allergies: [
      { allergen: "Amoxicillin", reaction: "Rash", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Ibuprofen", dosage: "400 mg", frequency: "As needed", indication: "Pain management" },
    ],
    diagnoses: [
      { condition: "Fracture of ankle", icd_code: "S82.899A", status: "resolved", date_diagnosed: "2013-02-26" },
      { condition: "Streptococcal sore throat", icd_code: "J02.0", status: "resolved", date_diagnosed: "2018-07-02" },
      { condition: "Sprain of wrist", icd_code: "S63.509A", status: "resolved", date_diagnosed: "2021-09-12" },
    ],
    clinical_notes: [
      {
        note_type: "Annual wellness",
        date_of_service: "2025-01-20",
        provider_name: "Dr. Helen Wu",
        provider_credentials: "MD",
        chief_complaint: "Annual wellness exam",
        summary: "Generally healthy 56-year-old female. No active conditions. History of ankle fracture (2013) fully healed. Routine screening labs within normal limits.",
        vital_signs: { blood_pressure_systolic: 118, blood_pressure_diastolic: 72, heart_rate: 70, bmi: 24.6 },
      },
    ],
    lab_results: [
      { test_name: "CBC", result: "Normal", unit: "", reference_range: "Normal", flagged: false, date_performed: "2025-01-20" },
      { test_name: "CMP", result: "Normal", unit: "", reference_range: "Normal", flagged: false, date_performed: "2025-01-20" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 4. Cecille691 Upton904 — female, whiplash + sinusitis history
  {
    patient_id: "EVO-004",
    medical_record_number: "MRN-EVO-0004",
    first_name: "Cecille",
    last_name: "Upton",
    date_of_birth: "1968-08-11",
    gender: Gender.FEMALE,
    evolution_uuid: "5ee76f27-28b9-4eee-992f-fa9e6f04330a",
    contact_info: {
      phone: "(503) 555-1007",
      address: "2100 SW 4th Ave, Portland, OR 97201",
      emergency_contact_name: "Gerald Upton",
      emergency_contact_relation: "Husband",
      emergency_contact_phone: "(503) 555-1008",
    },
    insurance: { provider: "Aetna", plan_type: "PPO" },
    primary_care_physician: "Dr. Sarah Chen",
    allergies: [],
    current_medications: [
      { name: "Cetirizine", dosage: "10 mg", frequency: "Once daily", indication: "Allergic rhinitis" },
    ],
    diagnoses: [
      { condition: "Whiplash injury to neck", icd_code: "S13.4XXA", status: "resolved", date_diagnosed: "2012-07-10" },
      { condition: "Facial laceration", icd_code: "S01.81XA", status: "resolved", date_diagnosed: "2014-06-28" },
      { condition: "Viral sinusitis", icd_code: "J01.90", status: "resolved", date_diagnosed: "2021-11-02" },
    ],
    clinical_notes: [
      {
        note_type: "Primary care visit",
        date_of_service: "2025-02-05",
        provider_name: "Dr. Sarah Chen",
        provider_credentials: "MD",
        chief_complaint: "Recurrent sinus congestion",
        summary: "Patient reports seasonal sinus congestion. No acute sinusitis. Continue cetirizine. History of whiplash (2012) — no residual symptoms. Facial laceration scar well healed.",
        vital_signs: { blood_pressure_systolic: 122, blood_pressure_diastolic: 76, heart_rate: 72, bmi: 25.8 },
      },
    ],
    lab_results: [],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 5. Forrest301 Gleason633 — young male, sinusitis + laceration
  {
    patient_id: "EVO-005",
    medical_record_number: "MRN-EVO-0005",
    first_name: "Forrest",
    last_name: "Gleason",
    date_of_birth: "2004-01-25",
    gender: Gender.MALE,
    evolution_uuid: "64ab927a-de28-4993-bfb2-d851cb366f73",
    contact_info: {
      phone: "(503) 555-1009",
      address: "789 N Mississippi Ave, Portland, OR 97227",
      emergency_contact_name: "Patricia Gleason",
      emergency_contact_relation: "Mother",
      emergency_contact_phone: "(503) 555-1010",
    },
    insurance: { provider: "United Healthcare", plan_type: "PPO" },
    primary_care_physician: "Dr. Michael Torres",
    allergies: [
      { allergen: "Peanuts", reaction: "Hives", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [],
    diagnoses: [
      { condition: "Chronic sinusitis", icd_code: "J32.9", status: "chronic", date_diagnosed: "2003-09-20" },
      { condition: "Laceration of foot", icd_code: "S91.319A", status: "resolved", date_diagnosed: "2013-06-19" },
      { condition: "Acute bronchitis", icd_code: "J20.9", status: "resolved", date_diagnosed: "2013-02-20" },
    ],
    clinical_notes: [
      {
        note_type: "Wellness visit",
        date_of_service: "2025-01-15",
        provider_name: "Dr. Michael Torres",
        provider_credentials: "MD",
        chief_complaint: "Annual check-up",
        summary: "Healthy 21-year-old male. Chronic sinusitis managed conservatively. No acute issues. Peanut allergy — carries EpiPen.",
        vital_signs: { blood_pressure_systolic: 116, blood_pressure_diastolic: 68, heart_rate: 64, bmi: 22.3 },
      },
    ],
    lab_results: [],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 6. Geri861 Homenick806 — female, colon cancer survivor + smoker
  {
    patient_id: "EVO-006",
    medical_record_number: "MRN-EVO-0006",
    first_name: "Geri",
    last_name: "Homenick",
    date_of_birth: "1973-04-11",
    gender: Gender.FEMALE,
    evolution_uuid: "73ccae2b-09be-48be-b6f8-320bc4df146a",
    contact_info: {
      phone: "(503) 555-1011",
      address: "4521 SE Hawthorne Blvd, Portland, OR 97215",
      emergency_contact_name: "Thomas Homenick",
      emergency_contact_relation: "Husband",
      emergency_contact_phone: "(503) 555-1012",
    },
    insurance: { provider: "Cigna", plan_type: "PPO" },
    primary_care_physician: "Dr. Amy Nguyen",
    hospital: "OHSU Knight Cancer Institute",
    allergies: [
      { allergen: "Sulfa drugs", reaction: "Rash", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [
      { name: "Fluticasone nasal spray", dosage: "50 mcg", frequency: "Once daily", indication: "Chronic sinusitis" },
      { name: "Nicotine patch", dosage: "14 mg", frequency: "Once daily", indication: "Smoking cessation" },
    ],
    diagnoses: [
      { condition: "Chronic sinusitis", icd_code: "J32.9", status: "chronic", date_diagnosed: "1972-01-07" },
      { condition: "Daily tobacco smoker", icd_code: "F17.210", status: "active", date_diagnosed: "1996-08-15" },
      { condition: "Malignant tumor of colon", icd_code: "C18.9", status: "resolved", date_diagnosed: "2010-04-03" },
      { condition: "Polyp of colon", icd_code: "K63.5", status: "chronic", date_diagnosed: "2009-02-03" },
      { condition: "Recurrent rectal polyp", icd_code: "K62.1", status: "chronic", date_diagnosed: "2010-03-30" },
    ],
    clinical_notes: [
      {
        note_type: "Oncology follow-up",
        date_of_service: "2025-02-10",
        provider_name: "Dr. Amy Nguyen",
        provider_credentials: "MD, FACP",
        chief_complaint: "Cancer surveillance, smoking cessation",
        summary: "52-year-old female, colon cancer survivor (resected 2010-2012, in remission). Colonoscopy surveillance every 3 years — next due 2026. Active smoker attempting cessation with nicotine patch. Chronic sinusitis managed with nasal fluticasone.",
        vital_signs: { blood_pressure_systolic: 128, blood_pressure_diastolic: 82, heart_rate: 78, bmi: 27.2 },
      },
    ],
    lab_results: [
      { test_name: "CEA", result: "2.1", unit: "ng/mL", reference_range: "< 3.0", flagged: false, date_performed: "2025-02-10" },
      { test_name: "CBC", result: "Normal", unit: "", reference_range: "Normal", flagged: false, date_performed: "2025-02-10" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 7. Gwendolyn93 Schneider199 — young female, ankle sprain
  {
    patient_id: "EVO-007",
    medical_record_number: "MRN-EVO-0007",
    first_name: "Gwendolyn",
    last_name: "Schneider",
    date_of_birth: "1993-12-20",
    gender: Gender.FEMALE,
    evolution_uuid: "8bf8631f-2fd4-4dc7-af2b-c400499fedfc",
    contact_info: {
      phone: "(503) 555-1013",
      address: "1022 NW 23rd Ave, Portland, OR 97210",
      emergency_contact_name: "Karen Schneider",
      emergency_contact_relation: "Mother",
      emergency_contact_phone: "(503) 555-1014",
    },
    insurance: { provider: "Kaiser Permanente", plan_type: "HMO" },
    primary_care_physician: "Dr. Helen Wu",
    allergies: [],
    current_medications: [],
    diagnoses: [
      { condition: "Sprain of ankle", icd_code: "S93.409A", status: "resolved", date_diagnosed: "2019-04-14" },
      { condition: "Viral sinusitis", icd_code: "J01.90", status: "resolved", date_diagnosed: "2023-02-11" },
    ],
    clinical_notes: [
      {
        note_type: "Annual wellness",
        date_of_service: "2025-01-25",
        provider_name: "Dr. Helen Wu",
        provider_credentials: "MD",
        chief_complaint: "Routine annual physical",
        summary: "Healthy 31-year-old female. No active conditions. Prior ankle sprain (2019) fully resolved. All screening labs normal.",
        vital_signs: { blood_pressure_systolic: 112, blood_pressure_diastolic: 70, heart_rate: 66, bmi: 22.8 },
      },
    ],
    lab_results: [],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 8. Shondra529 Armstrong51 — young female, healthy
  {
    patient_id: "EVO-008",
    medical_record_number: "MRN-EVO-0008",
    first_name: "Shondra",
    last_name: "Armstrong",
    date_of_birth: "1999-05-02",
    gender: Gender.FEMALE,
    evolution_uuid: "ca24f616-30cc-4351-aca9-1b49297de076",
    contact_info: {
      phone: "(503) 555-1015",
      address: "3300 SE Belmont St, Portland, OR 97214",
      emergency_contact_name: "Diane Armstrong",
      emergency_contact_relation: "Mother",
      emergency_contact_phone: "(503) 555-1016",
    },
    insurance: { provider: "Anthem", plan_type: "PPO" },
    primary_care_physician: "Dr. Anna Volkov",
    allergies: [],
    current_medications: [],
    diagnoses: [],
    clinical_notes: [
      {
        note_type: "Wellness visit",
        date_of_service: "2025-02-12",
        provider_name: "Dr. Anna Volkov",
        provider_credentials: "MD",
        chief_complaint: "Annual wellness exam",
        summary: "Healthy 25-year-old female. No significant medical history. Immunizations up to date. All vitals normal.",
        vital_signs: { blood_pressure_systolic: 110, blood_pressure_diastolic: 68, heart_rate: 62, bmi: 21.5 },
      },
    ],
    lab_results: [],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 9. Verena947 Fahey393 — female, chronic sinusitis + miscarriage history
  {
    patient_id: "EVO-009",
    medical_record_number: "MRN-EVO-0009",
    first_name: "Verena",
    last_name: "Fahey",
    date_of_birth: "1990-08-11",
    gender: Gender.FEMALE,
    evolution_uuid: "d9f90c91-2e37-40ca-a574-89b33a120d16",
    contact_info: {
      phone: "(503) 555-1017",
      address: "567 NE Sandy Blvd, Portland, OR 97232",
      emergency_contact_name: "Marcus Fahey",
      emergency_contact_relation: "Spouse",
      emergency_contact_phone: "(503) 555-1018",
    },
    insurance: { provider: "Providence Health Plan", plan_type: "HMO" },
    primary_care_physician: "Dr. Sarah Chen",
    allergies: [
      { allergen: "Latex", reaction: "Contact dermatitis", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [
      { name: "Fluticasone nasal spray", dosage: "50 mcg", frequency: "Once daily", indication: "Chronic sinusitis" },
      { name: "Sertraline", dosage: "50 mg", frequency: "Once daily", indication: "Depression" },
    ],
    diagnoses: [
      { condition: "Chronic sinusitis", icd_code: "J32.9", status: "chronic", date_diagnosed: "2016-01-30" },
      { condition: "Miscarriage in first trimester", icd_code: "O03.9", status: "resolved", date_diagnosed: "2010-11-30" },
      { condition: "Sprain of ankle", icd_code: "S93.409A", status: "resolved", date_diagnosed: "2017-03-12" },
      { condition: "Acute bacterial sinusitis", icd_code: "J01.90", status: "resolved", date_diagnosed: "2023-11-03" },
    ],
    clinical_notes: [
      {
        note_type: "ENT follow-up",
        date_of_service: "2025-01-30",
        provider_name: "Dr. Sarah Chen",
        provider_credentials: "MD",
        chief_complaint: "Chronic sinusitis management",
        summary: "35-year-old female with chronic sinusitis managed on nasal fluticasone. Recurrent acute exacerbations (last episode Nov 2023). Mood stable on sertraline. History of early pregnancy loss (2010).",
        vital_signs: { blood_pressure_systolic: 120, blood_pressure_diastolic: 74, heart_rate: 72, bmi: 24.1 },
      },
    ],
    lab_results: [
      { test_name: "CBC", result: "Normal", unit: "", reference_range: "Normal", flagged: false, date_performed: "2025-01-30" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },

  // 10. Wilbert25 Cole117 — elderly male, healthy
  {
    patient_id: "EVO-010",
    medical_record_number: "MRN-EVO-0010",
    first_name: "Wilbert",
    last_name: "Cole",
    date_of_birth: "1951-11-28",
    gender: Gender.MALE,
    evolution_uuid: "dda6a788-814a-48f2-8ebe-bc57e4cefd92",
    contact_info: {
      phone: "(503) 555-1019",
      address: "2890 SW Barbur Blvd, Portland, OR 97239",
      emergency_contact_name: "Dorothy Cole",
      emergency_contact_relation: "Wife",
      emergency_contact_phone: "(503) 555-1020",
    },
    insurance: { provider: "Medicare", plan_type: "Part A + B" },
    primary_care_physician: "Dr. Robert Kim",
    allergies: [
      { allergen: "Aspirin", reaction: "GI upset", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Amlodipine", dosage: "5 mg", frequency: "Once daily", indication: "Hypertension" },
    ],
    diagnoses: [
      { condition: "Essential hypertension", icd_code: "I10", status: "chronic", date_diagnosed: "2005-03-15" },
    ],
    clinical_notes: [
      {
        note_type: "Primary care visit",
        date_of_service: "2025-02-08",
        provider_name: "Dr. Robert Kim",
        provider_credentials: "MD",
        chief_complaint: "BP management",
        summary: "73-year-old male with well-controlled hypertension on amlodipine. No other significant medical history. Cognitively intact. Continue current regimen.",
        vital_signs: { blood_pressure_systolic: 134, blood_pressure_diastolic: 80, heart_rate: 70, bmi: 26.0 },
      },
    ],
    lab_results: [
      { test_name: "Creatinine", result: "1.0", unit: "mg/dL", reference_range: "0.7-1.3", flagged: false, date_performed: "2025-02-08" },
      { test_name: "Potassium", result: "4.2", unit: "mEq/L", reference_range: "3.5-5.0", flagged: false, date_performed: "2025-02-08" },
    ],
    imaging_studies: [],
    diagnostic_tests: [],
  },
];
