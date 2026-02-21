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
      emergency_contact_relation: "Épouse",
      emergency_contact_phone: "(503) 555-0198",
    },
    insurance: { provider: "Blue Cross Blue Shield", plan_type: "PPO" },
    primary_care_physician: "Dr. Sarah Chen",
    hospital: "Portland Heart Center",
    admission_date: "2025-01-15",
    allergies: [
      { allergen: "Pénicilline", reaction: "Urticaire", status: AllergyStatus.CONFIRMED, recorded_at: "2010-06-01" },
      { allergen: "Sulfamides", reaction: "Éruption cutanée", status: AllergyStatus.CONFIRMED, recorded_at: "2015-03-12" },
      { allergen: "Aspirine", reaction: "Bronchospasme", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Furosémide", dosage: "40 mg", frequency: "2×/jour", indication: "Insuffisance cardiaque" },
      { name: "Lisinopril", dosage: "20 mg", frequency: "1×/jour", indication: "HTA / IC" },
      { name: "Carvédilol", dosage: "25 mg", frequency: "2×/jour", indication: "IC — bêtabloquant" },
      { name: "Spironolactone", dosage: "25 mg", frequency: "1×/jour", indication: "IC — anti-aldostérone" },
      { name: "Metformine", dosage: "1000 mg", frequency: "2×/jour", indication: "Diabète type 2" },
      { name: "Warfarine", dosage: "5 mg", frequency: "1×/jour", indication: "Fibrillation auriculaire" },
    ],
    diagnoses: [
      { condition: "Insuffisance cardiaque congestive", icd_code: "I50.9", status: "active", date_diagnosed: "2023-06-10" },
      { condition: "Fibrillation auriculaire", icd_code: "I48.91", status: "active", date_diagnosed: "2023-06-10" },
      { condition: "Diabète de type 2", icd_code: "E11.9", status: "chronic", date_diagnosed: "2015-04-20" },
      { condition: "Hypertension artérielle", icd_code: "I10", status: "chronic", date_diagnosed: "2010-02-14" },
      { condition: "Pneumonie communautaire", icd_code: "J18.9", status: "resolved", date_diagnosed: "2024-11-05" },
    ],
    clinical_notes: [
      {
        note_type: "Suivi cardiologie",
        date_of_service: "2025-02-10",
        provider_name: "Dr. Sarah Chen",
        provider_credentials: "MD, FACC",
        chief_complaint: "Dyspnée d'effort progressive, œdèmes des membres inférieurs",
        subjective: "Le patient rapporte une dyspnée croissante lors d'activités modérées (montée d'un étage). Orthopnée nécessitant 3 oreillers. Prise de poids de 2 kg en une semaine. Observance médicamenteuse correcte.",
        objective: "PA 148/92, FC 88 bpm irrégulier, T° 36.8 °C, SpO₂ 93 % AA. Crépitants bilatéraux aux bases pulmonaires. OMI bilatéral 2+. JVD à 10 cm H₂O. B3 audible à l'apex.",
        assessment: "Décompensation d'insuffisance cardiaque classe III NYHA sur fibrillation auriculaire à réponse ventriculaire rapide. Surcharge hydrosodée.",
        plan: "Augmenter furosémide à 80 mg/j. Contrôle BNP et ionogramme à 48 h. Restriction hydrique 1,5 L/j. Échocardiographie de contrôle dans 2 semaines. Surveillance quotidienne du poids.",
        vital_signs: {
          blood_pressure_systolic: 148,
          blood_pressure_diastolic: 92,
          heart_rate: 88,
          temperature_fahrenheit: 98.2,
          bmi: 31.2,
        },
        follow_up_instructions: "Revoir dans 2 semaines ou plus tôt si prise de poids > 1 kg/jour.",
      },
      {
        note_type: "Urgence",
        date_of_service: "2025-01-15",
        provider_name: "Dr. Michael Torres",
        provider_credentials: "MD, FACEP",
        chief_complaint: "Dyspnée aiguë, douleur thoracique",
        subjective: "Homme de 66 ans amené par ambulance pour dyspnée aiguë d'apparition brutale avec douleur thoracique antérieure non irradiante.",
        objective: "PA 165/100, FC 112 bpm irrégulier, SpO₂ 88 % AA, FR 28. Détresse respiratoire modérée. Crépitants diffus bilatéraux. ECG : FA rapide, pas de sus-décalage ST.",
        assessment: "Œdème aigu du poumon sur décompensation d'IC. FA à réponse rapide. Troponine négative — SCA écarté.",
        plan: "Furosémide 80 mg IV, O₂ 4 L/min, monitoring continu. Hospitalisation en USIC. Échocardiographie en urgence.",
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
      { test_name: "Créatinine", result: "1.8", unit: "mg/dL", reference_range: "0.7-1.3", flagged: true, date_performed: "2025-02-10" },
      { test_name: "Potassium", result: "5.2", unit: "mEq/L", reference_range: "3.5-5.0", flagged: true, date_performed: "2025-02-10" },
      { test_name: "HbA1c", result: "7.8", unit: "%", reference_range: "< 7.0", flagged: true, date_performed: "2025-01-20" },
      { test_name: "INR", result: "2.4", unit: "", reference_range: "2.0-3.0", flagged: false, date_performed: "2025-02-10" },
      { test_name: "Sodium", result: "138", unit: "mEq/L", reference_range: "136-145", flagged: false, date_performed: "2025-02-10" },
    ],
    imaging_studies: [
      {
        study_type: "Échocardiographie transthoracique",
        body_part: "Cœur",
        findings: "FEVG 30 %. Dilatation VG sévère (DTDVG 68 mm). Insuffisance mitrale modérée fonctionnelle. HTAP modérée (PAPS 48 mmHg). Dilatation OG.",
        impression: "Cardiomyopathie dilatée avec dysfonction systolique sévère. IC à FEVG réduite.",
        date_performed: "2025-01-16",
        radiologist: "Dr. Amy Nguyen",
      },
      {
        study_type: "Radiographie thoracique",
        body_part: "Thorax",
        findings: "Cardiomégalie. Redistribution vasculaire vers les sommets. Épanchement pleural bilatéral de faible abondance. Lignes de Kerley B.",
        impression: "Signes radiologiques d'insuffisance cardiaque gauche avec surcharge hydrique.",
        date_performed: "2025-01-15",
        radiologist: "Dr. Robert Kim",
      },
    ],
    diagnostic_tests: [
      {
        test_type: "ECG 12 dérivations",
        date_performed: "2025-02-10",
        findings: "Fibrillation auriculaire à 88 bpm. Axe gauche. Hypertrophie ventriculaire gauche (critères de Sokolow). Pas de trouble de la repolarisation aigu.",
        interpretation: "FA chronique. HVG électrique. Pas d'ischémie aiguë.",
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
      emergency_contact_relation: "Frère",
      emergency_contact_phone: "(503) 555-0345",
    },
    insurance: { provider: "Kaiser Permanente", plan_type: "HMO" },
    primary_care_physician: "Dr. Anna Volkov",
    hospital: "Portland Endocrine Center",
    allergies: [
      { allergen: "Iode", reaction: "Urticaire", status: AllergyStatus.CONFIRMED },
      { allergen: "Latex", reaction: "Dermatite de contact", status: AllergyStatus.SUSPECTED },
    ],
    current_medications: [
      { name: "Lévothyroxine", dosage: "100 µg", frequency: "1×/jour", indication: "Hypothyroïdie" },
      { name: "Vitamine D3", dosage: "2000 UI", frequency: "1×/jour", indication: "Carence vitaminique" },
      { name: "Fer ferreux", dosage: "325 mg", frequency: "1×/jour", indication: "Anémie ferriprive" },
    ],
    diagnoses: [
      { condition: "Hypothyroïdie", icd_code: "E03.9", status: "active", date_diagnosed: "2020-08-15" },
      { condition: "Anémie ferriprive", icd_code: "D50.9", status: "active", date_diagnosed: "2024-06-10" },
      { condition: "Carence en vitamine D", icd_code: "E55.9", status: "chronic", date_diagnosed: "2022-01-20" },
      { condition: "Nodule thyroïdien bénin", icd_code: "E04.1", status: "resolved", date_diagnosed: "2021-03-05" },
    ],
    clinical_notes: [
      {
        note_type: "Suivi endocrinologie",
        date_of_service: "2025-02-05",
        provider_name: "Dr. Anna Volkov",
        provider_credentials: "MD, FACE",
        chief_complaint: "Contrôle thyroïdien, fatigue persistante",
        subjective: "Patiente se plaint de fatigue résiduelle malgré traitement. Prise de poids de 3 kg en 3 mois. Cheveux secs et cassants. Transit ralenti.",
        objective: "PA 118/74, FC 62 bpm, T° 36.4 °C. Thyroïde palpable, homogène, non douloureuse. Peau sèche. Réflexes ostéo-tendineux légèrement diminués.",
        assessment: "Hypothyroïdie insuffisamment substituée. TSH encore élevée. Anémie ferriprive persistante.",
        plan: "Augmenter lévothyroxine à 125 µg/j. Contrôle TSH/T4L dans 6 semaines. Poursuivre supplémentation en fer. NFS de contrôle dans 1 mois.",
        vital_signs: {
          blood_pressure_systolic: 118,
          blood_pressure_diastolic: 74,
          heart_rate: 62,
          temperature_fahrenheit: 97.5,
          bmi: 26.4,
        },
        follow_up_instructions: "Revoir dans 6 semaines avec résultats biologiques.",
      },
    ],
    lab_results: [
      { test_name: "TSH", result: "8.2", unit: "mUI/L", reference_range: "0.4-4.0", flagged: true, date_performed: "2025-02-05" },
      { test_name: "T4 libre", result: "0.9", unit: "ng/dL", reference_range: "0.8-1.8", flagged: false, date_performed: "2025-02-05" },
      { test_name: "Ferritine", result: "12", unit: "ng/mL", reference_range: "20-200", flagged: true, date_performed: "2025-02-05" },
      { test_name: "Hémoglobine", result: "10.8", unit: "g/dL", reference_range: "12.0-16.0", flagged: true, date_performed: "2025-02-05" },
      { test_name: "Vitamine D (25-OH)", result: "22", unit: "ng/mL", reference_range: "30-100", flagged: true, date_performed: "2025-02-05" },
    ],
    imaging_studies: [
      {
        study_type: "Échographie thyroïdienne",
        body_part: "Thyroïde",
        findings: "Thyroïde de volume normal. Nodule du lobe droit de 8 mm, iso-échogène, bien limité, classé EU-TIRADS 2. Pas de ganglion suspect.",
        impression: "Nodule bénin stable. Pas de critère de ponction.",
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
      emergency_contact_relation: "Fils",
      emergency_contact_phone: "(503) 555-0412",
    },
    insurance: { provider: "Medicare", plan_type: "Part A + B" },
    primary_care_physician: "Dr. Helen Wu",
    hospital: "St. Vincent Medical Center",
    admission_date: "2025-02-01",
    allergies: [
      { allergen: "Codéine", reaction: "Nausées sévères", status: AllergyStatus.CONFIRMED },
      { allergen: "Arachides", reaction: "Anaphylaxie", status: AllergyStatus.CONFIRMED },
    ],
    current_medications: [
      { name: "Donépézil", dosage: "10 mg", frequency: "1×/jour", indication: "Maladie d'Alzheimer" },
      { name: "Amlodipine", dosage: "5 mg", frequency: "1×/jour", indication: "HTA" },
      { name: "Calcium + Vit D", dosage: "600 mg / 400 UI", frequency: "2×/jour", indication: "Ostéoporose" },
      { name: "Alendronate", dosage: "70 mg", frequency: "1×/semaine", indication: "Ostéoporose" },
      { name: "Paracétamol", dosage: "500 mg", frequency: "si besoin", indication: "Douleur arthrosique" },
    ],
    diagnoses: [
      { condition: "Maladie d'Alzheimer, stade léger à modéré", icd_code: "G30.1", status: "active", date_diagnosed: "2023-09-20" },
      { condition: "Ostéoporose post-ménopausique", icd_code: "M81.0", status: "chronic", date_diagnosed: "2018-05-10" },
      { condition: "Hypertension artérielle", icd_code: "I10", status: "chronic", date_diagnosed: "2005-11-30" },
      { condition: "Arthrose du genou droit", icd_code: "M17.11", status: "chronic", date_diagnosed: "2016-08-22" },
      { condition: "Fracture du col fémoral gauche", icd_code: "S72.001A", status: "resolved", date_diagnosed: "2024-12-15" },
    ],
    clinical_notes: [
      {
        note_type: "Consultation gériatrique",
        date_of_service: "2025-02-12",
        provider_name: "Dr. Helen Wu",
        provider_credentials: "MD, CMD",
        chief_complaint: "Réévaluation cognitive, suivi post-fracture",
        subjective: "La fille du patient rapporte une aggravation des troubles mnésiques : oublis de repas, désorientation dans le quartier. Douleur résiduelle de la hanche gauche à la marche. Pas de chute depuis la dernière visite.",
        objective: "PA 134/78, FC 72 bpm. MMSE 20/30 (orientation 7/10, rappel 1/3). Get Up and Go test : 18 secondes (risque de chute). Cicatrice chirurgicale hanche gauche bien cicatrisée. Mobilité articulaire satisfaisante.",
        assessment: "Déclin cognitif progressif (Alzheimer stade modéré). Risque de chute élevé. Bonne récupération post-chirurgicale de la fracture du col.",
        plan: "Maintenir donépézil 10 mg. Référer en kinésithérapie pour programme de prévention des chutes. Évaluation neuropsychologique complète dans 3 mois. Adaptation du domicile recommandée.",
        vital_signs: {
          blood_pressure_systolic: 134,
          blood_pressure_diastolic: 78,
          heart_rate: 72,
          temperature_fahrenheit: 97.8,
          bmi: 22.1,
        },
        follow_up_instructions: "Revoir dans 3 mois. Appeler si confusion aiguë ou chute.",
      },
    ],
    lab_results: [
      { test_name: "Calcium", result: "9.2", unit: "mg/dL", reference_range: "8.5-10.5", flagged: false, date_performed: "2025-02-01" },
      { test_name: "Vitamine D (25-OH)", result: "28", unit: "ng/mL", reference_range: "30-100", flagged: true, date_performed: "2025-02-01" },
      { test_name: "Créatinine", result: "1.1", unit: "mg/dL", reference_range: "0.6-1.2", flagged: false, date_performed: "2025-02-01" },
      { test_name: "Hémoglobine", result: "11.5", unit: "g/dL", reference_range: "12.0-16.0", flagged: true, date_performed: "2025-02-01" },
      { test_name: "TSH", result: "2.1", unit: "mUI/L", reference_range: "0.4-4.0", flagged: false, date_performed: "2025-02-01" },
    ],
    imaging_studies: [
      {
        study_type: "Radiographie bassin",
        body_part: "Hanche gauche",
        findings: "Matériel d'ostéosynthèse en place (vis-plaque DHS). Consolidation osseuse satisfaisante. Pas de déplacement secondaire.",
        impression: "Fracture col fémoral gauche en cours de consolidation, évolution favorable.",
        date_performed: "2025-02-01",
        radiologist: "Dr. Robert Kim",
      },
      {
        study_type: "Ostéodensitométrie (DEXA)",
        body_part: "Rachis lombaire / Col fémoral droit",
        findings: "T-score rachis L1-L4 : -3.2. T-score col fémoral droit : -2.8.",
        impression: "Ostéoporose sévère. Risque fracturaire élevé.",
        date_performed: "2024-11-20",
        radiologist: "Dr. Amy Nguyen",
      },
    ],
    diagnostic_tests: [
      {
        test_type: "MMSE (Mini-Mental State Examination)",
        date_performed: "2025-02-12",
        findings: "Score total 20/30. Déficit en orientation temporelle (2/5), rappel (1/3) et calcul (2/5). Langage et praxies constructives préservés.",
        interpretation: "Déclin cognitif modéré compatible avec maladie d'Alzheimer stade modéré. Baisse de 2 points par rapport au score de septembre 2024.",
        ordered_by: "Dr. Helen Wu",
      },
      {
        test_type: "Get Up and Go Test",
        date_performed: "2025-02-12",
        findings: "Temps : 18 secondes. Démarche prudente, léger déséquilibre au demi-tour.",
        interpretation: "Risque de chute modéré à élevé. Kinésithérapie recommandée.",
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
