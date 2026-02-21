

## Refactor Patient Data to New Schema

This plan replaces the current custom patient data model with the standardized medical record schema you provided, and rebuilds every frontend layer to match.

### What changes

**Current state**: Patient data is split across deeply nested interfaces (Identity, State, History, Interventions, Assessments, Network) with custom structures for vitals, labs, timeline events, etc.

**Target state**: A flat Patient root model with typed arrays for Allergies, Medications, Diagnoses, ClinicalNotes (SOAP), LabResults (with CBC/Lipid/Chemistry subtypes), ImagingStudies, and DiagnosticTests.

### Layers removed
- Network Layer (care team, facilities, info exchange) -- not in new schema
- Vaccination Layer -- not in new schema
- History Layer (timeline, exposures, family history) -- replaced by ClinicalNotes and Diagnoses

### New layers on the dashboard
1. **Demographics** -- patient header with name, DOB, age, gender, contact info, insurance, PCP, hospital
2. **Allergies** -- table with allergen, reaction, status (confirmed/suspected/denied)
3. **Medications** -- active medications with dosage, frequency, indication
4. **Diagnoses** -- conditions with ICD codes, status (active/resolved/chronic), date diagnosed
5. **Clinical Notes** -- SOAP-format notes with expandable detail (subjective/objective/assessment/plan), vital signs inline
6. **Lab Results** -- base results with flagged indicators + specialized panels (CBC, Lipid, Chemistry) shown as sub-sections
7. **Imaging Studies** -- study type, body part, findings, impression, radiologist
8. **Diagnostic Tests** -- test type, findings, interpretation

### Technical details

**Files to create:**
- `src/types/patient.ts` -- All TypeScript interfaces and enums (Gender, AllergyStatus, ContactInfo, Insurance, Allergy, Medication, VitalSigns, ClinicalNote, Diagnosis, LabResult, CompleteBloodCount, LipidPanel, ChemistryPanel, ImagingStudy, DiagnosticTest, Patient) plus helper methods (age, getActiveDiagnoses, getRecentLabs)
- `src/data/mockPatientData.ts` -- 3 mock patients using the new schema, mapped from existing clinical scenarios (P-001 CHF patient, P-002 thyroid patient, P-003 geriatric patient)
- `src/components/layers/DemographicsLayer.tsx` -- Contact info and insurance display
- `src/components/layers/AllergiesLayer.tsx` -- Allergy table
- `src/components/layers/MedicationsLayer.tsx` -- Medication list
- `src/components/layers/DiagnosesLayer.tsx` -- Diagnosis cards with ICD codes and status badges
- `src/components/layers/ClinicalNotesLayer.tsx` -- Expandable SOAP notes with inline vitals
- `src/components/layers/LabResultsLayer.tsx` -- Lab results table with flagged indicators and specialized panel sub-views
- `src/components/layers/ImagingLayer.tsx` -- Imaging study cards
- `src/components/layers/DiagnosticTestsLayer.tsx` -- Diagnostic test cards

**Files to modify:**
- `src/pages/PatientDashboard.tsx` -- Replace all layer imports and rewire to new Patient type; update header to use new flat fields (first_name, last_name, gender, date_of_birth); update summary generation
- `src/lib/patientSummary.ts` -- Rewrite to work with new Patient model (use diagnoses, current_medications, clinical_notes)

**Files to delete:**
- `src/data/mockPatients.ts` -- replaced by mockPatientData.ts
- `src/data/mockEncounters.ts` -- encounters folded into ClinicalNotes
- `src/data/mockVaccinations.ts` -- removed from schema
- `src/components/layers/IdentityLayer.tsx` -- replaced by DemographicsLayer
- `src/components/layers/HistoryLayer.tsx` -- replaced by ClinicalNotesLayer + DiagnosesLayer
- `src/components/layers/VaccinationLayer.tsx` -- removed
- `src/components/layers/NetworkLayer.tsx` -- removed
- `src/components/layers/EncountersLayer.tsx` -- folded into ClinicalNotesLayer

**Files kept as-is:**
- `src/components/CollapsibleLayer.tsx` -- reused by all new layers
- All UI primitives, CSS, AppHeader, PatientSearch (updated imports only)
- `src/components/PatientSearch.tsx` -- updated to search on new fields (first_name, last_name, medical_record_number)

All new layers will reuse the existing `CollapsibleLayer` component and the clinical badge/data-card CSS utilities already defined in `index.css`.

