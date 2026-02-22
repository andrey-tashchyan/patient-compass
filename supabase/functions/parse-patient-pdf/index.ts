import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackUsage } from "../_shared/paid-tracking.ts";

// ── Constants ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_PRO = "google/gemini-2.5-pro";
const MODEL_FLASH = "google/gemini-3-flash";

// ── Domain Tool Schemas ──

const demographicsTool = {
  type: "function" as const,
  function: {
    name: "extract_demographics",
    description: "Extract patient demographics, contact info, insurance, and administrative data.",
    parameters: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        date_of_birth: { type: "string", description: "YYYY-MM-DD format" },
        gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
        contact_info: {
          type: "object",
          properties: {
            phone: { type: "string" },
            address: { type: "string" },
            emergency_contact_name: { type: "string" },
            emergency_contact_relation: { type: "string" },
            emergency_contact_phone: { type: "string" },
          },
          required: ["phone", "address", "emergency_contact_name", "emergency_contact_relation"],
        },
        insurance: {
          type: "object",
          properties: { provider: { type: "string" }, plan_type: { type: "string" } },
          required: ["provider", "plan_type"],
        },
        primary_care_physician: { type: "string" },
        hospital: { type: "string" },
        admission_date: { type: "string", description: "YYYY-MM-DD format" },
        patient_signature: { type: "string" },
        signature_date: { type: "string", description: "YYYY-MM-DD format" },
      },
      required: ["first_name", "last_name", "date_of_birth", "gender", "contact_info", "insurance"],
    },
  },
};

const medsAllergiesTool = {
  type: "function" as const,
  function: {
    name: "extract_meds_allergies",
    description: "Extract current medications and allergies from medical text.",
    parameters: {
      type: "object",
      properties: {
        current_medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              indication: { type: "string" },
              prescribed_at: { type: "string" },
            },
            required: ["name", "dosage", "frequency"],
          },
        },
        allergies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              allergen: { type: "string" },
              reaction: { type: "string" },
              status: { type: "string", enum: ["CONFIRMED", "SUSPECTED", "DENIED"] },
              recorded_at: { type: "string" },
            },
            required: ["allergen"],
          },
        },
      },
      required: ["current_medications", "allergies"],
    },
  },
};

const diagnosesTool = {
  type: "function" as const,
  function: {
    name: "extract_diagnoses",
    description: "Extract diagnoses with ICD-10 codes and status from medical text.",
    parameters: {
      type: "object",
      properties: {
        diagnoses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: { type: "string" },
              icd_code: { type: "string", description: "ICD-10 code if identifiable" },
              date_diagnosed: { type: "string", description: "YYYY-MM-DD format" },
              status: { type: "string", enum: ["active", "resolved", "chronic"] },
            },
            required: ["condition"],
          },
        },
      },
      required: ["diagnoses"],
    },
  },
};

const clinicalNotesTool = {
  type: "function" as const,
  function: {
    name: "extract_clinical_notes",
    description: "Extract clinical notes with summaries, vitals, and provider info.",
    parameters: {
      type: "object",
      properties: {
        clinical_notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              note_type: { type: "string" },
              date_of_service: { type: "string", description: "YYYY-MM-DD format" },
              provider_name: { type: "string" },
              provider_credentials: { type: "string" },
              summary: { type: "string", description: "Comprehensive narrative summary of the clinical note covering patient presentation, exam findings, clinical impression, and management plan." },
              chief_complaint: { type: "string" },
              vital_signs: {
                type: "object",
                properties: {
                  blood_pressure_systolic: { type: "number" },
                  blood_pressure_diastolic: { type: "number" },
                  heart_rate: { type: "number" },
                  temperature_fahrenheit: { type: "number" },
                  bmi: { type: "number" },
                },
              },
              follow_up_instructions: { type: "string" },
            },
            required: ["note_type", "date_of_service", "provider_name", "provider_credentials", "summary"],
          },
        },
      },
      required: ["clinical_notes"],
    },
  },
};

const resultsTool = {
  type: "function" as const,
  function: {
    name: "extract_results",
    description: "Extract lab results, imaging studies, and diagnostic tests from medical text.",
    parameters: {
      type: "object",
      properties: {
        lab_results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              test_name: { type: "string" },
              result: { type: "string" },
              unit: { type: "string" },
              reference_range: { type: "string" },
              flagged: { type: "boolean" },
              date_performed: { type: "string" },
            },
            required: ["test_name", "result", "unit", "reference_range"],
          },
        },
        imaging_studies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              study_type: { type: "string" },
              body_part: { type: "string" },
              findings: { type: "string" },
              impression: { type: "string" },
              date_performed: { type: "string" },
              radiologist: { type: "string" },
            },
            required: ["study_type", "body_part", "findings", "impression", "date_performed"],
          },
        },
        diagnostic_tests: {
          type: "array",
          items: {
            type: "object",
            properties: {
              test_type: { type: "string" },
              date_performed: { type: "string" },
              findings: { type: "string" },
              interpretation: { type: "string" },
              ordered_by: { type: "string" },
            },
            required: ["test_type", "date_performed", "findings", "interpretation"],
          },
        },
      },
      required: ["lab_results", "imaging_studies", "diagnostic_tests"],
    },
  },
};

// ── Helper: callAI ──

interface CallAIOptions {
  tools?: any[];
  toolChoice?: any;
  temperature?: number;
}

async function callAI(
  model: string,
  messages: any[],
  apiKey: string,
  options: CallAIOptions = {}
): Promise<any> {
  const body: any = {
    model,
    messages,
    temperature: options.temperature ?? 0,
  };
  if (options.tools) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice ?? "auto";
  }

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const errText = await response.text();
    throw new Error(`AI call failed (${status}): ${errText}`);
  }

  return response.json();
}

// ── Phase 1: Raw Extraction ──

async function extractRawText(pdfBase64: string, apiKey: string): Promise<string> {
  const result = await callAI(
    MODEL_PRO,
    [
      {
        role: "system",
        content: `You are a medical document transcriber. Extract ALL text from this PDF document, section by section.
Preserve the structure: headings, lists, tables, and values.
If a value is hard to read, mark it as [UNCERTAIN: best_guess].
Do NOT summarize — transcribe everything you can see.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
          },
          {
            type: "text",
            text: "Transcribe this entire medical document. Include every section, every field, every value. Preserve structure with headers and lists.",
          },
        ],
      },
    ],
    apiKey,
    { temperature: 0 }
  );

  const rawText = result.choices?.[0]?.message?.content;
  if (!rawText || rawText.length < 50) {
    throw new Error("Failed to extract meaningful text from the PDF. The document may be blank, corrupt, or unreadable.");
  }

  return rawText;
}

// ── Phase 2: Specialist Agents ──

function makeAgentPrompt(domain: string, instructions: string): string {
  return `You are a specialist medical data extractor focused ONLY on: ${domain}.

You will receive raw text extracted from a medical document. Extract all relevant ${domain} data using the provided tool.

Rules:
- Only extract data relevant to your domain
- Use "Not documented" for required fields not found in the text
- Dates must be YYYY-MM-DD format
- Be thorough — do not skip any relevant information
- If information is marked [UNCERTAIN: value], use the value but note it may be uncertain

${instructions}`;
}

async function extractDemographics(rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: makeAgentPrompt(
          "Patient Demographics & Administrative Data",
          `Extract: patient name, date of birth, gender, phone, address, emergency contacts, insurance info, PCP, hospital, admission date, signature info.
- Gender must be MALE, FEMALE, or OTHER
- Generate no IDs — only extract what's in the document`
        ),
      },
      { role: "user", content: rawText },
    ],
    apiKey,
    {
      tools: [demographicsTool],
      toolChoice: { type: "function", function: { name: "extract_demographics" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Demographics agent returned no data");
  return JSON.parse(toolCall.function.arguments);
}

async function extractMedsAllergies(rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: makeAgentPrompt(
          "Medications & Allergies",
          `Extract: all current medications with name, dosage, frequency, indication, and date prescribed.
Extract: all allergies with allergen, reaction, status (CONFIRMED/SUSPECTED/DENIED), and date recorded.
- Cross-reference allergy mentions in notes vs. dedicated allergy section
- Include both prescription and OTC medications
- If a medication section says "none" or similar, return empty array`
        ),
      },
      { role: "user", content: rawText },
    ],
    apiKey,
    {
      tools: [medsAllergiesTool],
      toolChoice: { type: "function", function: { name: "extract_meds_allergies" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Meds/Allergies agent returned no data");
  return JSON.parse(toolCall.function.arguments);
}

async function extractDiagnoses(rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: makeAgentPrompt(
          "Diagnoses & Conditions",
          `Extract: all diagnoses, conditions, and medical problems.
- Infer ICD-10 codes when the condition is clearly identifiable
- Map status from context: "history of" → resolved, "currently being treated for" → active, long-term conditions → chronic
- Include both primary and secondary diagnoses
- If diagnoses section says "none" or similar, return empty array`
        ),
      },
      { role: "user", content: rawText },
    ],
    apiKey,
    {
      tools: [diagnosesTool],
      toolChoice: { type: "function", function: { name: "extract_diagnoses" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Diagnoses agent returned no data");
  return JSON.parse(toolCall.function.arguments);
}

async function extractClinicalNotes(rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: makeAgentPrompt(
          "Clinical Notes & Documentation",
          `Extract: all clinical notes, encounter notes, progress notes.
- Summarize each note into a comprehensive narrative covering: patient presentation, exam findings, clinical impression, and management plan
- Extract provider name and credentials (MD, DO, NP, PA, etc.)
- Extract vital signs embedded in notes (BP, HR, temp, BMI)
- Identify chief complaint and follow-up instructions
- note_type examples: "Progress Note", "Initial Consultation", "Follow-up Visit", "Discharge Summary"
- If no clinical notes exist, return empty array`
        ),
      },
      { role: "user", content: rawText },
    ],
    apiKey,
    {
      tools: [clinicalNotesTool],
      toolChoice: { type: "function", function: { name: "extract_clinical_notes" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Clinical Notes agent returned no data");
  return JSON.parse(toolCall.function.arguments);
}

async function extractResults(rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: makeAgentPrompt(
          "Lab Results, Imaging Studies & Diagnostic Tests",
          `Extract: all lab results with test name, result value, unit, reference range, and flag status.
Extract: all imaging studies with type, body part, findings, impression, date, and radiologist.
Extract: all diagnostic tests with type, date, findings, interpretation, and ordering provider.
- Flag lab results outside reference range (flagged: true)
- Include all numeric values with their units
- If no results/studies/tests exist, return empty arrays`
        ),
      },
      { role: "user", content: rawText },
    ],
    apiKey,
    {
      tools: [resultsTool],
      toolChoice: { type: "function", function: { name: "extract_results" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Results agent returned no data");
  return JSON.parse(toolCall.function.arguments);
}

// ── Phase 3a: Merge Agent Outputs ──

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateMRN(): string {
  const num = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
  return `MRN-${num}`;
}

function mergeAgentOutputs(
  demographics: any,
  medsAllergies: any,
  diagnoses: any,
  notes: any,
  results: any
): any {
  return {
    patient_id: generateUUID(),
    medical_record_number: generateMRN(),
    first_name: demographics.first_name || "Not documented",
    last_name: demographics.last_name || "Not documented",
    date_of_birth: demographics.date_of_birth || "Not documented",
    gender: demographics.gender || "OTHER",
    contact_info: {
      phone: demographics.contact_info?.phone || "Not documented",
      address: demographics.contact_info?.address || "Not documented",
      emergency_contact_name: demographics.contact_info?.emergency_contact_name || "Not documented",
      emergency_contact_relation: demographics.contact_info?.emergency_contact_relation || "Not documented",
      emergency_contact_phone: demographics.contact_info?.emergency_contact_phone,
    },
    insurance: {
      provider: demographics.insurance?.provider || "Not documented",
      plan_type: demographics.insurance?.plan_type || "Not documented",
    },
    allergies: medsAllergies.allergies || [],
    current_medications: medsAllergies.current_medications || [],
    diagnoses: diagnoses.diagnoses || [],
    clinical_notes: notes.clinical_notes || [],
    lab_results: results.lab_results || [],
    imaging_studies: results.imaging_studies || [],
    diagnostic_tests: results.diagnostic_tests || [],
    primary_care_physician: demographics.primary_care_physician,
    hospital: demographics.hospital,
    admission_date: demographics.admission_date,
    patient_signature: demographics.patient_signature,
    signature_date: demographics.signature_date,
  };
}

// ── Phase 3b: Deterministic Validation ──

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoFixed: string[];
  fieldsNotDocumented: string[];
  uncertainValues: string[];
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr === "Not documented") return true;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  if (date > new Date()) return false;
  if (date.getFullYear() < 1900) return false;
  return true;
}

function normalizeGender(gender: string): string {
  const upper = (gender || "").toUpperCase().trim();
  if (["MALE", "M", "MAN", "BOY"].includes(upper)) return "MALE";
  if (["FEMALE", "F", "WOMAN", "GIRL"].includes(upper)) return "FEMALE";
  return "OTHER";
}

function normalizeAllergyStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const upper = status.toUpperCase().trim();
  if (["CONFIRMED", "KNOWN", "YES", "ACTIVE"].includes(upper)) return "CONFIRMED";
  if (["SUSPECTED", "POSSIBLE", "PROBABLE"].includes(upper)) return "SUSPECTED";
  if (["DENIED", "NONE", "NO", "NEGATIVE"].includes(upper)) return "DENIED";
  return "CONFIRMED";
}

function normalizeDiagnosisStatus(status: string | undefined): string | undefined {
  if (!status) return undefined;
  const lower = (status || "").toLowerCase().trim();
  if (["active", "current", "ongoing", "present"].includes(lower)) return "active";
  if (["resolved", "past", "historical", "inactive", "history"].includes(lower)) return "resolved";
  if (["chronic", "long-term", "permanent", "longterm"].includes(lower)) return "chronic";
  return "active";
}

function validatePatient(patient: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const autoFixed: string[] = [];
  const fieldsNotDocumented: string[] = [];
  const uncertainValues: string[] = [];

  // Check for "Not documented" fields
  const requiredStringFields = ["first_name", "last_name", "date_of_birth"];
  for (const field of requiredStringFields) {
    if (!patient[field] || patient[field] === "Not documented") {
      fieldsNotDocumented.push(field);
      if (!patient[field]) {
        patient[field] = "Not documented";
        autoFixed.push(`Set missing ${field} to "Not documented"`);
      }
    }
  }

  // Check contact_info sub-fields
  const contactFields = ["phone", "address", "emergency_contact_name", "emergency_contact_relation"];
  for (const field of contactFields) {
    if (!patient.contact_info?.[field] || patient.contact_info[field] === "Not documented") {
      fieldsNotDocumented.push(`contact_info.${field}`);
      if (!patient.contact_info[field]) {
        patient.contact_info[field] = "Not documented";
        autoFixed.push(`Set missing contact_info.${field} to "Not documented"`);
      }
    }
  }

  // Check insurance sub-fields
  for (const field of ["provider", "plan_type"]) {
    if (!patient.insurance?.[field] || patient.insurance[field] === "Not documented") {
      fieldsNotDocumented.push(`insurance.${field}`);
      if (!patient.insurance[field]) {
        patient.insurance[field] = "Not documented";
        autoFixed.push(`Set missing insurance.${field} to "Not documented"`);
      }
    }
  }

  // Date validation
  if (patient.date_of_birth && patient.date_of_birth !== "Not documented") {
    if (!isValidDate(patient.date_of_birth)) {
      errors.push(`Invalid date_of_birth format: ${patient.date_of_birth} (expected YYYY-MM-DD, not future, after 1900)`);
    }
  }
  if (patient.admission_date && !isValidDate(patient.admission_date)) {
    warnings.push(`Invalid admission_date format: ${patient.admission_date}`);
  }
  if (patient.signature_date && !isValidDate(patient.signature_date)) {
    warnings.push(`Invalid signature_date format: ${patient.signature_date}`);
  }

  // Gender normalization
  const normalizedGender = normalizeGender(patient.gender);
  if (normalizedGender !== patient.gender) {
    autoFixed.push(`Normalized gender from "${patient.gender}" to "${normalizedGender}"`);
    patient.gender = normalizedGender;
  }

  // Array coercion
  const arrayFields = ["allergies", "current_medications", "diagnoses", "clinical_notes", "lab_results", "imaging_studies", "diagnostic_tests"];
  for (const field of arrayFields) {
    if (!Array.isArray(patient[field])) {
      patient[field] = [];
      autoFixed.push(`Coerced null ${field} to empty array`);
    }
  }

  // Allergy validation and normalization
  for (const allergy of patient.allergies) {
    if (!allergy.allergen) {
      errors.push("Allergy missing required field: allergen");
    }
    if (allergy.status) {
      const normalized = normalizeAllergyStatus(allergy.status);
      if (normalized !== allergy.status) {
        autoFixed.push(`Normalized allergy status from "${allergy.status}" to "${normalized}"`);
        allergy.status = normalized;
      }
    }
    if (allergy.allergen) allergy.allergen = allergy.allergen.trim();
  }

  // Medication validation
  for (const med of patient.current_medications) {
    const missing = [];
    if (!med.name) missing.push("name");
    if (!med.dosage) missing.push("dosage");
    if (!med.frequency) missing.push("frequency");
    if (missing.length > 0) {
      for (const field of missing) {
        if (!med[field]) {
          med[field] = "Not documented";
          autoFixed.push(`Set missing medication ${field} to "Not documented"`);
        }
      }
    }
    if (med.name) med.name = med.name.trim();
  }

  // Diagnosis validation and normalization
  for (const dx of patient.diagnoses) {
    if (!dx.condition) {
      errors.push("Diagnosis missing required field: condition");
    }
    if (dx.status) {
      const normalized = normalizeDiagnosisStatus(dx.status);
      if (normalized !== dx.status) {
        autoFixed.push(`Normalized diagnosis status from "${dx.status}" to "${normalized}"`);
        dx.status = normalized;
      }
    }
    if (dx.icd_code) {
      const icdPattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;
      if (!icdPattern.test(dx.icd_code)) {
        warnings.push(`ICD code "${dx.icd_code}" for "${dx.condition}" may be invalid format`);
      }
    }
    if (dx.date_diagnosed && !isValidDate(dx.date_diagnosed)) {
      warnings.push(`Invalid date_diagnosed for "${dx.condition}": ${dx.date_diagnosed}`);
    }
  }

  // Clinical note validation
  for (const note of patient.clinical_notes) {
    const requiredNoteFields = ["note_type", "date_of_service", "provider_name", "provider_credentials", "summary"];
    for (const field of requiredNoteFields) {
      if (!note[field]) {
        note[field] = "Not documented";
        autoFixed.push(`Set missing clinical note ${field} to "Not documented"`);
      }
    }
    if (note.date_of_service && note.date_of_service !== "Not documented" && !isValidDate(note.date_of_service)) {
      warnings.push(`Invalid date_of_service in clinical note: ${note.date_of_service}`);
    }
  }

  // Lab result validation
  for (const lab of patient.lab_results) {
    const requiredLabFields = ["test_name", "result", "unit", "reference_range"];
    for (const field of requiredLabFields) {
      if (!lab[field]) {
        lab[field] = "Not documented";
        autoFixed.push(`Set missing lab result ${field} to "Not documented"`);
      }
    }
    if (lab.date_performed && !isValidDate(lab.date_performed)) {
      warnings.push(`Invalid date_performed for lab "${lab.test_name}": ${lab.date_performed}`);
    }
  }

  // Imaging study validation
  for (const img of patient.imaging_studies) {
    const requiredImgFields = ["study_type", "body_part", "findings", "impression", "date_performed"];
    for (const field of requiredImgFields) {
      if (!img[field]) {
        img[field] = "Not documented";
        autoFixed.push(`Set missing imaging study ${field} to "Not documented"`);
      }
    }
  }

  // Diagnostic test validation
  for (const test of patient.diagnostic_tests) {
    const requiredTestFields = ["test_type", "date_performed", "findings", "interpretation"];
    for (const field of requiredTestFields) {
      if (!test[field]) {
        test[field] = "Not documented";
        autoFixed.push(`Set missing diagnostic test ${field} to "Not documented"`);
      }
    }
  }

  // Scan for [UNCERTAIN] markers in all string values
  const scanForUncertain = (obj: any, path: string) => {
    if (typeof obj === "string") {
      const matches = obj.match(/\[UNCERTAIN:\s*([^\]]+)\]/g);
      if (matches) {
        for (const match of matches) {
          uncertainValues.push(`${path}: ${match}`);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => scanForUncertain(item, `${path}[${i}]`));
    } else if (obj && typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        scanForUncertain(obj[key], `${path}.${key}`);
      }
    }
  };
  scanForUncertain(patient, "patient");

  const valid = errors.length === 0;
  return { valid, errors, warnings, autoFixed, fieldsNotDocumented, uncertainValues };
}

// ── Phase 3c: Cross-Validation ──

function crossValidate(patient: any): string[] {
  const warnings: string[] = [];

  // Check for allergies to prescribed medications
  const medNames = (patient.current_medications || []).map((m: any) => (m.name || "").toLowerCase().trim());
  for (const allergy of patient.allergies || []) {
    const allergen = (allergy.allergen || "").toLowerCase().trim();
    for (const medName of medNames) {
      if (medName && allergen && (medName.includes(allergen) || allergen.includes(medName))) {
        warnings.push(`Potential conflict: patient has allergy to "${allergy.allergen}" but is prescribed "${medName}"`);
      }
    }
  }

  // Check for medications treating conditions not in diagnoses
  const diagnosisConditions = (patient.diagnoses || []).map((d: any) => (d.condition || "").toLowerCase());
  for (const med of patient.current_medications || []) {
    if (med.indication && med.indication !== "Not documented") {
      const indication = med.indication.toLowerCase();
      const hasMatchingDiagnosis = diagnosisConditions.some((c: string) =>
        c.includes(indication) || indication.includes(c)
      );
      if (!hasMatchingDiagnosis && diagnosisConditions.length > 0) {
        warnings.push(`Medication "${med.name}" has indication "${med.indication}" but no matching diagnosis found`);
      }
    }
  }

  // Check date inconsistencies
  if (patient.admission_date && patient.admission_date !== "Not documented") {
    const admDate = new Date(patient.admission_date);
    if (!isNaN(admDate.getTime())) {
      for (const lab of patient.lab_results || []) {
        if (lab.date_performed && lab.date_performed !== "Not documented") {
          const labDate = new Date(lab.date_performed);
          if (!isNaN(labDate.getTime()) && labDate < admDate) {
            warnings.push(`Lab "${lab.test_name}" date (${lab.date_performed}) is before admission date (${patient.admission_date})`);
          }
        }
      }
    }
  }

  return warnings;
}

// ── Phase 3d: Hallucination Check ──

const verifyTool = {
  type: "function" as const,
  function: {
    name: "verification_result",
    description: "Report which fields in the patient record are hallucinated, invented, or not supported by the source document.",
    parameters: {
      type: "object",
      properties: {
        hallucinated_fields: {
          type: "array",
          description: "List of fields whose values were NOT found anywhere in the source document text.",
          items: {
            type: "object",
            properties: {
              field_path: { type: "string", description: "Dot-notation path, e.g. 'diagnoses[0].icd_code'" },
              extracted_value: { type: "string", description: "The value that was extracted" },
              reason: { type: "string", description: "Why this is considered hallucinated" },
            },
            required: ["field_path", "extracted_value", "reason"],
          },
        },
        verified_clean: { type: "boolean", description: "True if every field can be traced back to the source document" },
      },
      required: ["hallucinated_fields", "verified_clean"],
    },
  },
};

interface VerificationResult {
  hallucinated: { field_path: string; extracted_value: string; reason: string }[];
  warnings: string[];
}

async function verifyAgainstSource(patient: any, rawText: string, apiKey: string): Promise<VerificationResult> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: `You are a strict medical data auditor. Your job is to compare an extracted patient record against the ORIGINAL source document text and flag any hallucinated or invented data.

A value is HALLUCINATED if:
- It does not appear anywhere in the source text (not even paraphrased)
- It was fabricated by the extraction model (e.g. invented ICD codes, made-up phone numbers, guessed dates)
- It adds clinical details not present in the source (e.g. extra diagnoses, medications, lab values)

A value is NOT hallucinated if:
- It appears in the source text (exact or reasonably paraphrased)
- It is a standard default like "Not documented" for missing fields
- It is a generated ID (patient_id, medical_record_number) — these are expected

Be thorough. Check every medication, diagnosis, lab result, date, name, and contact detail against the source text.`,
      },
      {
        role: "user",
        content: `=== ORIGINAL SOURCE DOCUMENT TEXT ===
${rawText}

=== EXTRACTED PATIENT RECORD ===
${JSON.stringify(patient, null, 2)}

Compare every value in the extracted record against the source document. Use the verification_result tool to report any hallucinated or invented fields.`,
      },
    ],
    apiKey,
    {
      tools: [verifyTool],
      toolChoice: { type: "function", function: { name: "verification_result" } },
    }
  );

  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    return { hallucinated: [], warnings: ["Verification agent returned no data — skipping hallucination check"] };
  }

  const verification = JSON.parse(toolCall.function.arguments);
  const hallucinated = verification.hallucinated_fields || [];
  const warnings = hallucinated.map(
    (h: any) => `Hallucination detected — ${h.field_path}: "${h.extracted_value}" (${h.reason})`
  );

  return { hallucinated, warnings };
}

function removeHallucinatedValues(patient: any, hallucinated: { field_path: string }[]): string[] {
  const cleaned: string[] = [];

  for (const h of hallucinated) {
    const path = h.field_path;

    // Handle array item paths like "diagnoses[2].icd_code" or "lab_results[0]"
    const arrayItemMatch = path.match(/^(\w+)\[(\d+)\](?:\.(.+))?$/);
    if (arrayItemMatch) {
      const [, arrayField, indexStr, subField] = arrayItemMatch;
      const index = parseInt(indexStr, 10);
      if (Array.isArray(patient[arrayField]) && patient[arrayField][index]) {
        if (subField) {
          // Remove a sub-field (e.g. icd_code from a diagnosis) — set to undefined
          const item = patient[arrayField][index];
          if (item[subField] !== undefined) {
            delete item[subField];
            cleaned.push(`Removed hallucinated ${path}`);
          }
        } else {
          // Remove entire array item
          patient[arrayField].splice(index, 1);
          cleaned.push(`Removed hallucinated ${arrayField} entry at index ${index}`);
        }
      }
      continue;
    }

    // Handle nested dot paths like "contact_info.phone"
    const dotParts = path.split(".");
    if (dotParts.length === 2) {
      const [parent, child] = dotParts;
      if (patient[parent] && patient[parent][child] !== undefined) {
        patient[parent][child] = "Not documented";
        cleaned.push(`Reset hallucinated ${path} to "Not documented"`);
      }
    } else if (dotParts.length === 1) {
      // Top-level field
      if (patient[path] !== undefined && !["patient_id", "medical_record_number"].includes(path)) {
        if (typeof patient[path] === "string") {
          patient[path] = "Not documented";
          cleaned.push(`Reset hallucinated ${path} to "Not documented"`);
        }
      }
    }
  }

  return cleaned;
}

// ── Phase 3e: LLM Reconciliation ──

async function correctWithLLM(patient: any, errors: string[], rawText: string, apiKey: string): Promise<any> {
  const result = await callAI(
    MODEL_FLASH,
    [
      {
        role: "system",
        content: `You are a medical data validator. You will receive a patient record, a list of validation errors, and the ORIGINAL source document text.

Fix ONLY the specific errors listed. Do not change anything else.
CRITICAL: When correcting values, ONLY use information that exists in the source document text. Do NOT invent or hallucinate any values.
If a value cannot be found in the source document, use "Not documented".
Return the corrected patient record as valid JSON.

Rules:
- Dates must be YYYY-MM-DD format, not in the future, after 1900
- Gender must be MALE, FEMALE, or OTHER
- Allergy status must be CONFIRMED, SUSPECTED, or DENIED
- Diagnosis status must be active, resolved, or chronic
- Use "Not documented" for truly missing required fields
- Every corrected value MUST be traceable to the source document`,
      },
      {
        role: "user",
        content: `=== ORIGINAL SOURCE DOCUMENT TEXT ===
${rawText}

=== PATIENT RECORD ===
${JSON.stringify(patient, null, 2)}

=== VALIDATION ERRORS TO FIX ===
${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Fix these errors using ONLY information from the source document above.`,
      },
    ],
    apiKey,
    { temperature: 0 }
  );

  const content = result.choices?.[0]?.message?.content;
  if (!content) return patient;

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  try {
    return JSON.parse(jsonMatch[1].trim());
  } catch {
    return patient;
  }
}

// ── Meta Builder ──

interface MetaInfo {
  extraction_quality: "high" | "medium" | "low";
  warnings: string[];
  fields_not_documented: string[];
  uncertain_values: string[];
  hallucinations_found: number;
  hallucinations_removed: string[];
  validation_passed: boolean;
  correction_rounds: number;
  agents_succeeded: number;
  agents_failed: string[];
}

function buildMeta(
  validation: ValidationResult,
  crossWarnings: string[],
  verificationWarnings: string[],
  hallucinationsCleaned: string[],
  correctionRounds: number,
  agentResults: { name: string; success: boolean }[]
): MetaInfo {
  const allWarnings = [...validation.warnings, ...crossWarnings, ...verificationWarnings];
  const agentsSucceeded = agentResults.filter((a) => a.success).length;
  const agentsFailed = agentResults.filter((a) => !a.success).map((a) => a.name);

  let quality: "high" | "medium" | "low" = "high";
  if (agentsFailed.length > 0 || validation.fieldsNotDocumented.length > 5 || correctionRounds > 0) {
    quality = "medium";
  }
  if (hallucinationsCleaned.length > 0) {
    quality = "medium";
  }
  if (agentsFailed.length > 2 || !validation.valid || hallucinationsCleaned.length > 5) {
    quality = "low";
  }

  return {
    extraction_quality: quality,
    warnings: allWarnings,
    fields_not_documented: validation.fieldsNotDocumented,
    uncertain_values: validation.uncertainValues,
    hallucinations_found: hallucinationsCleaned.length,
    hallucinations_removed: hallucinationsCleaned,
    validation_passed: validation.valid,
    correction_rounds: correctionRounds,
    agents_succeeded: agentsSucceeded,
    agents_failed: agentsFailed,
  };
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pdfBase64 } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "Missing pdfBase64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── Phase 1: Raw Text Extraction ──
    let rawText: string;
    try {
      rawText = await extractRawText(pdfBase64, LOVABLE_API_KEY);
    } catch (e) {
      console.error("Phase 1 failed:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Failed to extract text from PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Phase 2: Parallel Specialist Agents ──
    const agentResults: { name: string; success: boolean }[] = [];
    const agentNames = ["demographics", "meds_allergies", "diagnoses", "clinical_notes", "results"];

    const [demographicsResult, medsAllergiesResult, diagnosesResult, clinicalNotesResult, resultsResult] =
      await Promise.all([
        extractDemographics(rawText, LOVABLE_API_KEY)
          .then((data) => { agentResults.push({ name: "demographics", success: true }); return data; })
          .catch((e) => { console.error("Demographics agent failed:", e); agentResults.push({ name: "demographics", success: false }); return {}; }),
        extractMedsAllergies(rawText, LOVABLE_API_KEY)
          .then((data) => { agentResults.push({ name: "meds_allergies", success: true }); return data; })
          .catch((e) => { console.error("Meds/Allergies agent failed:", e); agentResults.push({ name: "meds_allergies", success: false }); return { current_medications: [], allergies: [] }; }),
        extractDiagnoses(rawText, LOVABLE_API_KEY)
          .then((data) => { agentResults.push({ name: "diagnoses", success: true }); return data; })
          .catch((e) => { console.error("Diagnoses agent failed:", e); agentResults.push({ name: "diagnoses", success: false }); return { diagnoses: [] }; }),
        extractClinicalNotes(rawText, LOVABLE_API_KEY)
          .then((data) => { agentResults.push({ name: "clinical_notes", success: true }); return data; })
          .catch((e) => { console.error("Clinical Notes agent failed:", e); agentResults.push({ name: "clinical_notes", success: false }); return { clinical_notes: [] }; }),
        extractResults(rawText, LOVABLE_API_KEY)
          .then((data) => { agentResults.push({ name: "results", success: true }); return data; })
          .catch((e) => { console.error("Results agent failed:", e); agentResults.push({ name: "results", success: false }); return { lab_results: [], imaging_studies: [], diagnostic_tests: [] }; }),
      ]);

    // ── Phase 3a: Merge ──
    let patient = mergeAgentOutputs(
      demographicsResult,
      medsAllergiesResult,
      diagnosesResult,
      clinicalNotesResult,
      resultsResult
    );

    // ── Phase 3b: Deterministic Validation ──
    let validation = validatePatient(patient);

    // ── Phase 3c: Cross-Validation ──
    const crossWarnings = crossValidate(patient);

    // ── Phase 3d: Hallucination Verification ──
    let verificationWarnings: string[] = [];
    let hallucinationsCleaned: string[] = [];
    try {
      const verification = await verifyAgainstSource(patient, rawText, LOVABLE_API_KEY);
      verificationWarnings = verification.warnings;
      if (verification.hallucinated.length > 0) {
        hallucinationsCleaned = removeHallucinatedValues(patient, verification.hallucinated);
        // Re-validate after removing hallucinations
        validation = validatePatient(patient);
      }
    } catch (e) {
      console.error("Hallucination verification failed:", e);
      verificationWarnings.push("Hallucination verification could not be completed");
    }

    // ── Phase 3e: LLM Reconciliation (if needed) ──
    let correctionRounds = 0;
    while (!validation.valid && correctionRounds < 2) {
      correctionRounds++;
      console.log(`Correction round ${correctionRounds}, errors:`, validation.errors);
      try {
        patient = await correctWithLLM(patient, validation.errors, rawText, LOVABLE_API_KEY);
        validation = validatePatient(patient);
      } catch (e) {
        console.error(`LLM correction round ${correctionRounds} failed:`, e);
        break;
      }
    }

    // ── Build Meta & Return ──
    const meta = buildMeta(validation, crossWarnings, verificationWarnings, hallucinationsCleaned, correctionRounds, agentResults);

    // Track PDF parsing event
    await trackUsage({
      eventName: "pdf_structured",
      data: {
        extraction_quality: meta.extraction_quality,
        agents_succeeded: meta.agents_succeeded,
        hallucinations_found: meta.hallucinations_found,
        estimated_time_saved_minutes: 15,
        medication_count: (patient.current_medications || []).length,
        diagnosis_count: (patient.diagnoses || []).length,
      },
    });

    // Track contraindications if cross-validation found drug-allergy conflicts
    const allergyConflicts = crossWarnings.filter((w: string) => w.includes("allergy"));
    if (allergyConflicts.length > 0) {
      await trackUsage({
        eventName: "contraindication_detected",
        data: {
          count: allergyConflicts.length,
          severity: "warning",
          source: "pdf_cross_validation",
        },
      });
    }

    return new Response(
      JSON.stringify({ patient, _meta: meta }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-patient-pdf error:", e);

    // Preserve specific HTTP error codes
    if (e instanceof Error && e.message.includes("(429)")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (e instanceof Error && e.message.includes("(402)")) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
