import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const PAID_API_KEY = Deno.env.get("PAID_API_KEY")!;

async function trackUsage(signalName: string) {
  await fetch("https://api.paid.ai/v1/signals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAID_API_KEY}`,
    },
    body: JSON.stringify({
      customer_id: "demo_hospital",
      name: signalName,
      value: 1,
    }),
  });
}

// ── Constants ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_FLASH = "google/gemini-3-flash-preview";

// ── Tool Schemas ──

const soapNoteTool = {
  type: "function" as const,
  function: {
    name: "create_soap_note",
    description: "Structure a doctor's consultation dictation into a complete SOAP clinical note.",
    parameters: {
      type: "object",
      properties: {
        note_type: {
          type: "string",
          description:
            "Type of encounter: 'Initial Consultation', 'Follow-Up Visit', 'Progress Note', 'Annual Physical', 'Urgent Visit', 'Discharge Summary', 'Pre-Operative', 'Post-Operative', 'Telehealth Visit'",
        },
        date_of_service: { type: "string", description: "YYYY-MM-DD format" },
        provider_name: { type: "string", description: "Name of the dictating clinician" },
        provider_credentials: { type: "string", description: "Credentials: MD, DO, NP, PA, etc." },
        chief_complaint: {
          type: "string",
          description:
            "The primary reason for the visit in the patient's perspective, e.g. 'chest pain for 2 days', 'follow-up for diabetes management'",
        },
        subjective: {
          type: "string",
          description:
            "Patient's reported symptoms, history of present illness (HPI), and relevant review of systems (ROS). Include: onset, location, duration, character, aggravating/alleviating factors, timing, severity (OLDCARTS). Include pertinent positives AND negatives from ROS.",
        },
        objective: {
          type: "string",
          description:
            "Clinician's findings from physical examination, vital signs narrative, and any point-of-care test results. Structure by system examined. Include general appearance.",
        },
        assessment: {
          type: "string",
          description:
            "Clinical impression and reasoning. For each problem: state the diagnosis or differential, link to supporting evidence from S and O sections. Number each problem if multiple.",
        },
        plan: {
          type: "string",
          description:
            "Management plan for each assessed problem. Include: medications (new/changed/continued), diagnostic orders (labs, imaging), referrals, patient education, and follow-up timeline. Number to match assessment problems.",
        },
        follow_up_instructions: {
          type: "string",
          description:
            "Patient-facing follow-up: when to return, red flags to watch for, lifestyle recommendations, and any pending actions (labs, referrals, prior auth).",
        },
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
        history_of_present_illness: {
          type: "string",
          description:
            "Detailed HPI narrative if the dictation contains enough detail to warrant a separate field. Use OLDCARTS framework.",
        },
        review_of_systems: {
          type: "string",
          description:
            "Structured ROS with pertinent positives and negatives by system, if the dictation covers multiple systems.",
        },
        physical_exam_detail: {
          type: "string",
          description:
            "Detailed physical exam findings organized by system (HEENT, Cardiovascular, Respiratory, Abdomen, Musculoskeletal, Neuro, Skin, etc.)",
        },
      },
      required: [
        "note_type",
        "date_of_service",
        "provider_name",
        "provider_credentials",
        "chief_complaint",
        "subjective",
        "objective",
        "assessment",
        "plan",
        "follow_up_instructions",
      ],
    },
  },
};

const changeDetectionTool = {
  type: "function" as const,
  function: {
    name: "detect_record_changes",
    description: "Detect actionable changes to the patient record from a consultation dictation.",
    parameters: {
      type: "object",
      properties: {
        proposed_changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["medication", "diagnosis", "allergy"],
              },
              action: {
                type: "string",
                enum: ["add", "remove", "update"],
              },
              description: {
                type: "string",
                description: "Human-readable summary, e.g. 'Start Metformin 500mg BID for newly diagnosed T2DM'",
              },
              clinical_rationale: {
                type: "string",
                description: "Brief clinical reasoning for this change, linking it to the consultation findings",
              },
              data: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Medication name, diagnosis condition, or allergen" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  indication: { type: "string" },
                  icd_code: { type: "string", description: "ICD-10 code for diagnoses if identifiable" },
                  status: { type: "string", description: "For diagnoses: active/resolved/chronic" },
                  reaction: { type: "string", description: "For allergies: reaction type" },
                },
                required: ["name"],
              },
            },
            required: ["category", "action", "description", "data"],
          },
        },
      },
      required: ["proposed_changes"],
    },
  },
};

const interactionCheckTool = {
  type: "function" as const,
  function: {
    name: "check_interactions",
    description: "Check proposed medication and diagnosis changes for clinical safety concerns.",
    parameters: {
      type: "object",
      properties: {
        alerts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["critical", "warning", "info"] },
              alert_type: {
                type: "string",
                enum: [
                  "drug_allergy",
                  "drug_drug_interaction",
                  "drug_condition_contraindication",
                  "duplicate_therapy",
                  "missing_indication",
                  "dosage_concern",
                ],
              },
              title: { type: "string", description: "Short alert title" },
              explanation: {
                type: "string",
                description: "Clinical explanation of the concern",
              },
              related_change: {
                type: "string",
                description: "Which proposed change triggered this alert",
              },
            },
            required: ["severity", "alert_type", "title", "explanation"],
          },
        },
        all_clear: {
          type: "boolean",
          description: "True if no safety concerns were identified",
        },
      },
      required: ["alerts", "all_clear"],
    },
  },
};

const verificationTool = {
  type: "function" as const,
  function: {
    name: "verify_against_dictation",
    description: "Verify that all extracted data is supported by the original dictation transcript.",
    parameters: {
      type: "object",
      properties: {
        hallucinated_items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "Which field or change contains invented data" },
              value: { type: "string", description: "The hallucinated value" },
              reason: { type: "string", description: "Why this is not supported by the dictation" },
            },
            required: ["field", "value", "reason"],
          },
        },
        verified_clean: { type: "boolean" },
      },
      required: ["hallucinated_items", "verified_clean"],
    },
  },
};

// ── Helper: callAI ──

async function callAI(
  messages: any[],
  apiKey: string,
  options: { tools?: any[]; toolChoice?: any; temperature?: number } = {},
): Promise<any> {
  const body: any = {
    model: MODEL_FLASH,
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

function extractToolArgs(result: any): any | null {
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;
  return JSON.parse(toolCall.function.arguments);
}

function extractMessageText(result: any): string {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .map((item: any) => (typeof item === "string" ? item : item?.text || ""))
      .join("\n")
      .trim();
    return text;
  }
  return "";
}

function normalizeConsultationReport(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(Motif|S|O|A|P|Subjective|Objective|Assessment|Plan)\s*:\s*/gim, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanTranscript(rawTranscript: string): string {
  let cleaned = rawTranscript
    .replace(/\r\n/g, "\n")
    .replace(/\b(um+|uh+|erm+|ah+|like)\b/gi, "")
    .replace(/\b(you know|kind of|sort of|i mean)\b/gi, "")
    .replace(/\b([a-zA-Z]+)\s+\1\b/gi, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

  if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
    cleaned = `${cleaned}.`;
  }

  return cleaned;
}

function parseSoapText(soapText: string): {
  motif: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} {
  const sections = {
    motif: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };

  const sectionMap: Record<string, keyof typeof sections> = {
    motif: "motif",
    s: "subjective",
    o: "objective",
    a: "assessment",
    p: "plan",
  };

  let activeSection: keyof typeof sections | null = null;
  for (const rawLine of soapText.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^(Motif|S|O|A|P):\s*(.*)$/i);
    if (headingMatch) {
      const key = sectionMap[headingMatch[1].toLowerCase()];
      activeSection = key;
      sections[key] = headingMatch[2]?.trim() || "";
      continue;
    }

    if (activeSection) {
      sections[activeSection] = sections[activeSection] ? `${sections[activeSection]}\n${line}` : line;
    }
  }

  return sections;
}

function toCondensedSoapText(sections: {
  motif: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}): string {
  return [
    "Motif:",
    sections.motif || "",
    "",
    "S:",
    sections.subjective || "",
    "",
    "O:",
    sections.objective || "",
    "",
    "A:",
    sections.assessment || "",
    "",
    "P:",
    sections.plan || "",
  ].join("\n");
}

// ── Agent 1: SOAP Note Structurer ──

async function structureSOAPNote(cleanedTranscript: string, patientContext: any, apiKey: string): Promise<any> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are a medical documentation assistant. Your ONLY job is to write a single narrative paragraph summarizing a patient consultation.

Patient: ${patientContext?.name || "Unknown"}, ${patientContext?.age || "Unknown"} years old.
Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}.
Current medications: ${patientContext?.medications?.join(", ") || "None listed"}.
Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}.

FORMAT RULES (CRITICAL — violating any rule is a failure):
1. Write EXACTLY ONE paragraph of plain flowing text.
2. NEVER use labels like "Motif:", "S:", "O:", "A:", "P:", "Subjective:", "Objective:", "Assessment:", "Plan:", or ANY section header.
3. NEVER use bullet points, dashes, numbered lists, or line breaks.
4. NEVER output JSON, markdown, or code fences.
5. The paragraph must cover: why the patient came (reason for visit), relevant clinical context, key findings if any, and the proposed treatment/plan — all woven into one continuous block of text.
6. Use professional medical language, concise and direct.
7. Do NOT invent or hallucinate any information not present in the dictation.
8. If the dictation is too short or vague, summarize only what was actually said — do not fabricate details.

Example output style:
"Patient Jean Dupont, 54 ans, consulte pour une fatigue persistante depuis trois semaines associée à des vertiges posturaux, dans un contexte d'hypothyroïdie traitée par lévothyroxine 75 mcg et d'anémie ferriprive connue; l'examen clinique retrouve une pâleur conjonctivale sans autre anomalie notable; un bilan sanguin de contrôle incluant TSH, NFS et ferritinémie est prescrit, avec réévaluation prévue dans deux semaines pour ajustement thérapeutique si nécessaire."`,
      },
      {
        role: "user",
        content: `Cleaned clinician dictation:\n\n${cleanedTranscript}`,
      },
    ],
    apiKey,
    { temperature: 0.15 },
  );

  const report = extractMessageText(result);
  if (!report) throw new Error("Consultation report generation returned no text");
  const normalizedReport = normalizeConsultationReport(report);
  if (!normalizedReport) throw new Error("Consultation report generation returned empty text");

  return {
    note_type: "Progress Note",
    date_of_service: new Date().toISOString().split("T")[0],
    provider_name: "Dictating Provider",
    provider_credentials: "MD",
    chief_complaint: "",
    summary: normalizedReport,
    follow_up_instructions: "",
    _formatted_text: normalizedReport,
  };
}

// ── Agent 2: Change Detection ──

async function detectChanges(transcript: string, patientContext: any, apiKey: string): Promise<any[]> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are a clinical change detection specialist. Your ONLY job is to identify actionable changes to the patient's medical record from a consultation dictation.

Current patient record:
- Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}
- Current medications: ${patientContext?.medications?.join(", ") || "None listed"}
- Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}

Look for these types of changes:

MEDICATIONS:
- New prescriptions (listen for: "start", "prescribe", "begin", "initiate", "put on")
- Discontinued medications (listen for: "stop", "discontinue", "hold", "taper off", "wean")
- Dose changes (listen for: "increase", "decrease", "titrate", "adjust", "change to")
- Include: exact drug name, dose, route, frequency, indication

DIAGNOSES:
- New diagnoses (listen for: "diagnosed with", "assessment is", "consistent with", "working diagnosis")
- Resolved conditions (listen for: "resolved", "cleared", "no longer", "in remission")
- Status changes (listen for: "chronic", "worsening", "stable", "improved")
- Include: ICD-10 code if clearly identifiable, status (active/resolved/chronic)

ALLERGIES:
- Newly reported allergies (listen for: "allergic to", "reacted to", "intolerance to", "adverse reaction")
- Include: allergen, reaction type, severity if mentioned

Rules:
- ONLY flag changes that are EXPLICITLY stated or STRONGLY implied in the dictation
- Do NOT fabricate changes — if in doubt, leave it out
- Do NOT flag continuation of existing therapies as changes (e.g. "continue Metformin" is NOT a change)
- Provide clinical rationale linking each change to the consultation context
- For medication changes, always include dose and frequency when mentioned`,
      },
      {
        role: "user",
        content: `Here is the doctor's full consultation dictation:\n\n"${transcript}"`,
      },
    ],
    apiKey,
    {
      tools: [changeDetectionTool],
      toolChoice: { type: "function", function: { name: "detect_record_changes" } },
    },
  );

  const args = extractToolArgs(result);
  if (!args) return [];
  return args.proposed_changes || [];
}

// ── Agent 3: Drug Interaction & Safety Check ──

async function checkInteractions(proposedChanges: any[], patientContext: any, apiKey: string): Promise<any[]> {
  // Skip if no medication or allergy changes
  const relevantChanges = proposedChanges.filter((c) => c.category === "medication" || c.category === "allergy");
  if (relevantChanges.length === 0) return [];

  const result = await callAI(
    [
      {
        role: "system",
        content: `You are a clinical pharmacist and safety checker. Review proposed changes to a patient's record for safety concerns.

Current patient record:
- Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}
- Current medications: ${patientContext?.medications?.join(", ") || "None listed"}
- Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}
- Age: ${patientContext?.age || "Unknown"}

Check for:
1. DRUG-ALLERGY conflicts: Is a proposed new medication in the same drug class as a known allergy?
2. DRUG-DRUG interactions: Does a new medication interact with any current medication?
3. DRUG-CONDITION contraindications: Does a new medication conflict with an active diagnosis? (e.g. beta-blocker in decompensated heart failure, NSAIDs with CKD)
4. DUPLICATE THERAPY: Is a new medication redundant with an existing one in the same class?
5. DOSAGE CONCERNS: Is a dose unusually high or low for the indication and patient age?
6. MISSING INDICATION: Is a medication being added without a clear corresponding diagnosis?

Severity levels:
- critical: Potentially life-threatening (e.g. prescribing penicillin to a penicillin-allergic patient)
- warning: Clinically significant concern requiring provider awareness
- info: Minor concern or reminder (e.g. monitor labs)

Only flag real, clinically meaningful concerns. Do NOT flag trivial or theoretical issues.`,
      },
      {
        role: "user",
        content: `Proposed changes to review:\n${JSON.stringify(relevantChanges, null, 2)}`,
      },
    ],
    apiKey,
    {
      tools: [interactionCheckTool],
      toolChoice: { type: "function", function: { name: "check_interactions" } },
    },
  );

  const args = extractToolArgs(result);
  if (!args) return [];
  return args.alerts || [];
}

// ── Agent 4: Verification Against Dictation ──

async function verifyAgainstDictation(
  transcript: string,
  soapNote: any,
  proposedChanges: any[],
  apiKey: string,
): Promise<{ hallucinated: any[]; warnings: string[] }> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are a strict clinical documentation auditor. Compare the structured SOAP note and proposed record changes against the ORIGINAL dictation transcript.

Flag any data that was HALLUCINATED — meaning it does NOT appear in the dictation:
- Diagnoses the doctor never mentioned
- Medications the doctor never prescribed or discussed
- Physical exam findings not described in the dictation
- Vital sign values not stated
- Allergies not mentioned
- Lab results or values not dictated

Things that are NOT hallucinations:
- Professional rephrasing of what the doctor said (e.g. "SOB" → "shortness of breath")
- Standard clinical formatting of dictated content
- "Not addressed" for sections not covered in the dictation
- ICD codes inferred from clearly stated diagnoses
- Default values like "Dictating Provider" when provider name wasn't stated

Be thorough but fair. The goal is catching fabricated clinical data, not penalizing reasonable clinical structuring.`,
      },
      {
        role: "user",
        content: `=== ORIGINAL DICTATION ===
"${transcript}"

=== STRUCTURED SOAP NOTE ===
${JSON.stringify(soapNote, null, 2)}

=== PROPOSED RECORD CHANGES ===
${JSON.stringify(proposedChanges, null, 2)}

Check every clinical detail against the original dictation. Use the verify_against_dictation tool to report findings.`,
      },
    ],
    apiKey,
    {
      tools: [verificationTool],
      toolChoice: { type: "function", function: { name: "verify_against_dictation" } },
    },
  );

  const args = extractToolArgs(result);
  if (!args) return { hallucinated: [], warnings: ["Verification agent returned no data"] };

  const hallucinated = args.hallucinated_items || [];
  const warnings = hallucinated.map((h: any) => `Hallucination: ${h.field} — "${h.value}" (${h.reason})`);

  return { hallucinated, warnings };
}

// ── Cleanup: Remove Hallucinated Data ──

function cleanHallucinations(
  soapNote: any,
  proposedChanges: any[],
  hallucinated: any[],
): { note: any; changes: any[]; cleaned: string[] } {
  const cleaned: string[] = [];

  for (const h of hallucinated) {
    const field = (h.field || "").toLowerCase();

    // Check if it refers to a proposed change
    const changeMatch = field.match(/change|proposed|medication|diagnosis|allergy/i);
    if (changeMatch) {
      const valueLower = (h.value || "").toLowerCase();
      const before = proposedChanges.length;
      proposedChanges = proposedChanges.filter((c) => {
        const matchesName = c.data?.name && valueLower.includes(c.data.name.toLowerCase());
        const matchesDesc = c.description && valueLower.includes(c.description.toLowerCase());
        if (matchesName || matchesDesc) {
          cleaned.push(`Removed hallucinated change: ${c.description}`);
          return false;
        }
        return true;
      });
      if (proposedChanges.length < before) continue;
    }

    // Check if it refers to a SOAP note field
    const soapFields = [
      "subjective",
      "objective",
      "assessment",
      "plan",
      "chief_complaint",
      "follow_up_instructions",
      "history_of_present_illness",
      "review_of_systems",
      "physical_exam_detail",
    ];
    for (const sf of soapFields) {
      if (field.includes(sf) && soapNote[sf]) {
        // For SOAP fields, we can't just delete — flag it but don't remove the whole section
        // Instead, we'll report it as a warning and let the clinician review
        cleaned.push(`Flagged hallucination in ${sf}: "${h.value}"`);
        break;
      }
    }

    // Check vital signs
    if (
      field.includes("vital") ||
      field.includes("bp") ||
      field.includes("heart_rate") ||
      field.includes("temperature") ||
      field.includes("bmi")
    ) {
      if (soapNote.vital_signs) {
        if (field.includes("systolic") || field.includes("bp")) {
          delete soapNote.vital_signs.blood_pressure_systolic;
          delete soapNote.vital_signs.blood_pressure_diastolic;
          cleaned.push("Removed hallucinated blood pressure values");
        } else if (field.includes("heart_rate") || field.includes("hr")) {
          delete soapNote.vital_signs.heart_rate;
          cleaned.push("Removed hallucinated heart rate");
        } else if (field.includes("temp")) {
          delete soapNote.vital_signs.temperature_fahrenheit;
          cleaned.push("Removed hallucinated temperature");
        } else if (field.includes("bmi")) {
          delete soapNote.vital_signs.bmi;
          cleaned.push("Removed hallucinated BMI");
        }
        // Clean up empty vital_signs object
        if (soapNote.vital_signs && Object.values(soapNote.vital_signs).every((v: any) => v == null)) {
          delete soapNote.vital_signs;
        }
      }
    }
  }

  return { note: soapNote, changes: proposedChanges, cleaned };
}

// ── Build Response Note (backwards compatible) ──

function buildNote(soapData: any): any {
  return {
    note_type: soapData.note_type || "Progress Note",
    date_of_service: soapData.date_of_service || new Date().toISOString().split("T")[0],
    provider_name: soapData.provider_name || "Dictating Provider",
    provider_credentials: soapData.provider_credentials || "MD",
    chief_complaint: soapData.chief_complaint || "",
    summary: soapData.summary || "",
    follow_up_instructions: soapData.follow_up_instructions || "",
    vital_signs: soapData.vital_signs || undefined,
  };
}

function formatNoteAsSoapText(note: any): string {
  return note.summary || "";
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, patientContext } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cleanedTranscript = cleanTranscript(transcript);

    // ── Phase 1: Consultation Report Generation ──
    const agentResults: { name: string; success: boolean }[] = [];
    const reportResult = await structureSOAPNote(cleanedTranscript, patientContext, LOVABLE_API_KEY)
      .then((data) => {
        agentResults.push({ name: "report", success: true });
        return data;
      })
      .catch((e) => {
        console.error("Report agent failed:", e);
        agentResults.push({ name: "report", success: false });
        return null;
      });

    if (!reportResult) {
      return new Response(JSON.stringify({ error: "Failed to generate consultation report." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Build Response ──
    const note = buildNote(reportResult);

    const agentsSucceeded = agentResults.filter((a) => a.success).length;
    const agentsFailed = agentResults.filter((a) => !a.success).map((a) => a.name);

    return new Response(
      JSON.stringify({
        note,
        formatted_note: formatNoteAsSoapText(note),
        proposed_changes: [],
        _meta: {
          cleaned_transcript: cleanedTranscript,
          interaction_alerts: [],
          verification_warnings: [],
          hallucinations_cleaned: [],
          agents_succeeded: agentsSucceeded,
          agents_failed: agentsFailed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("structure-dictation error:", e);

    if (e instanceof Error && e.message.includes("(429)")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e instanceof Error && e.message.includes("(402)")) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
