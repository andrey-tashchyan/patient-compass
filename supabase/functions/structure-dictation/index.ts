import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Constants ──

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_FLASH = "google/gemini-3-flash";

// ── Tool Schemas ──

const consultationNoteTool = {
  type: "function" as const,
  function: {
    name: "create_consultation_note",
    description: "Summarize a doctor's full consultation dictation into a structured clinical note.",
    parameters: {
      type: "object",
      properties: {
        note_type: {
          type: "string",
          description: "Type of encounter: 'Initial Consultation', 'Follow-Up Visit', 'Progress Note', 'Annual Physical', 'Urgent Visit', 'Discharge Summary', 'Pre-Operative', 'Post-Operative', 'Telehealth Visit'",
        },
        date_of_service: { type: "string", description: "YYYY-MM-DD format" },
        provider_name: { type: "string", description: "Name of the dictating clinician" },
        provider_credentials: { type: "string", description: "Credentials: MD, DO, NP, PA, etc." },
        chief_complaint: {
          type: "string",
          description: "The primary reason for the visit, e.g. 'chest pain for 2 days', 'follow-up for diabetes management'",
        },
        summary: {
          type: "string",
          description: "A comprehensive, well-structured narrative summary of the entire consultation. Should cover: what the patient reported, the clinician's examination findings and vital signs, the clinical assessment/impression, and the management plan. Write in professional clinical language as flowing prose with paragraph breaks between sections. This is NOT a transcript — it is a polished clinical summary suitable for the medical record.",
        },
        follow_up_instructions: {
          type: "string",
          description: "Patient-facing follow-up: when to return, red flags to watch for, lifestyle recommendations, and any pending actions (labs, referrals, prior auth).",
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
      },
      required: ["note_type", "date_of_service", "provider_name", "provider_credentials",
        "chief_complaint", "summary", "follow_up_instructions"],
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
                enum: ["drug_allergy", "drug_drug_interaction", "drug_condition_contraindication",
                  "duplicate_therapy", "missing_indication", "dosage_concern"],
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
  options: { tools?: any[]; toolChoice?: any } = {}
): Promise<any> {
  const body: any = {
    model: MODEL_FLASH,
    messages,
    temperature: 0,
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

// ── Agent 1: Consultation Summarizer ──

async function summarizeConsultation(
  transcript: string,
  patientContext: any,
  apiKey: string
): Promise<any> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are an expert clinical documentation specialist. You will receive a FULL consultation dictation — the entire patient encounter from start to finish. Your job is to produce a polished clinical summary.

Patient context:
- Name: ${patientContext?.name || "Unknown"}
- Age: ${patientContext?.age || "Unknown"}
- Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}
- Current medications: ${patientContext?.medications?.join(", ") || "None listed"}
- Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}

Summary Guidelines:

Write a comprehensive narrative summary of the entire consultation. The summary should be well-structured prose (not bullet points or a form), covering:

1. Why the patient presented and what they reported — symptoms, history, concerns, relevant context
2. What the clinician found — exam findings, vital signs, any point-of-care results
3. Clinical impression — what the clinician thinks is going on, differential if relevant, severity
4. Management plan — medications prescribed/changed/stopped, tests ordered, referrals, lifestyle advice

Use paragraph breaks between these sections for readability. Write in professional clinical language. Include specific numbers (vital signs, doses, lab values) when the doctor mentions them.

Rules:
- This is a SUMMARY, not a transcript — synthesize and organize the dictation into clear clinical prose
- Do NOT invent findings — only document what the doctor actually dictated
- If the dictation is brief, summarize what's there; do not pad with fabricated details
- If the provider isn't named, use "Dictating Provider" / "MD"
- Set date_of_service to today: ${new Date().toISOString().split("T")[0]}
- Choose note_type based on what the encounter sounds like
- Extract vital signs into the vital_signs field if mentioned (in addition to including them in the summary)`,
      },
      {
        role: "user",
        content: `Here is the doctor's full consultation dictation:\n\n"${transcript}"`,
      },
    ],
    apiKey,
    {
      tools: [consultationNoteTool],
      toolChoice: { type: "function", function: { name: "create_consultation_note" } },
    }
  );

  const args = extractToolArgs(result);
  if (!args) throw new Error("Consultation summarizer agent returned no data");
  return args;
}

// ── Agent 2: Change Detection ──

async function detectChanges(
  transcript: string,
  patientContext: any,
  apiKey: string
): Promise<any[]> {
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
    }
  );

  const args = extractToolArgs(result);
  if (!args) return [];
  return args.proposed_changes || [];
}

// ── Agent 3: Drug Interaction & Safety Check ──

async function checkInteractions(
  proposedChanges: any[],
  patientContext: any,
  apiKey: string
): Promise<any[]> {
  // Skip if no medication or allergy changes
  const relevantChanges = proposedChanges.filter(
    (c) => c.category === "medication" || c.category === "allergy"
  );
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
    }
  );

  const args = extractToolArgs(result);
  if (!args) return [];
  return args.alerts || [];
}

// ── Agent 4: Verification Against Dictation ──

async function verifyAgainstDictation(
  transcript: string,
  consultationNote: any,
  proposedChanges: any[],
  apiKey: string
): Promise<{ hallucinated: any[]; warnings: string[] }> {
  const result = await callAI(
    [
      {
        role: "system",
        content: `You are a strict clinical documentation auditor. Compare the structured consultation summary and proposed record changes against the ORIGINAL dictation transcript.

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

=== STRUCTURED CONSULTATION SUMMARY ===
${JSON.stringify(consultationNote, null, 2)}

=== PROPOSED RECORD CHANGES ===
${JSON.stringify(proposedChanges, null, 2)}

Check every clinical detail against the original dictation. Use the verify_against_dictation tool to report findings.`,
      },
    ],
    apiKey,
    {
      tools: [verificationTool],
      toolChoice: { type: "function", function: { name: "verify_against_dictation" } },
    }
  );

  const args = extractToolArgs(result);
  if (!args) return { hallucinated: [], warnings: ["Verification agent returned no data"] };

  const hallucinated = args.hallucinated_items || [];
  const warnings = hallucinated.map(
    (h: any) => `Hallucination: ${h.field} — "${h.value}" (${h.reason})`
  );

  return { hallucinated, warnings };
}

// ── Cleanup: Remove Hallucinated Data ──

function cleanHallucinations(
  consultationNote: any,
  proposedChanges: any[],
  hallucinated: any[]
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

    // Check if it refers to a note content field
    const noteFields = ["summary", "chief_complaint", "follow_up_instructions"];
    for (const nf of noteFields) {
      if (field.includes(nf) && consultationNote[nf]) {
        // Flag it but don't remove the whole summary — let the clinician review
        cleaned.push(`Flagged hallucination in ${nf}: "${h.value}"`);
        break;
      }
    }

    // Check vital signs
    if (field.includes("vital") || field.includes("bp") || field.includes("heart_rate") || field.includes("temperature") || field.includes("bmi")) {
      if (consultationNote.vital_signs) {
        if (field.includes("systolic") || field.includes("bp")) {
          delete consultationNote.vital_signs.blood_pressure_systolic;
          delete consultationNote.vital_signs.blood_pressure_diastolic;
          cleaned.push("Removed hallucinated blood pressure values");
        } else if (field.includes("heart_rate") || field.includes("hr")) {
          delete consultationNote.vital_signs.heart_rate;
          cleaned.push("Removed hallucinated heart rate");
        } else if (field.includes("temp")) {
          delete consultationNote.vital_signs.temperature_fahrenheit;
          cleaned.push("Removed hallucinated temperature");
        } else if (field.includes("bmi")) {
          delete consultationNote.vital_signs.bmi;
          cleaned.push("Removed hallucinated BMI");
        }
        // Clean up empty vital_signs object
        if (consultationNote.vital_signs && Object.values(consultationNote.vital_signs).every((v: any) => v == null)) {
          delete consultationNote.vital_signs;
        }
      }
    }
  }

  return { note: consultationNote, changes: proposedChanges, cleaned };
}

// ── Build Response Note (backwards compatible) ──

function buildNote(data: any): any {
  return {
    note_type: data.note_type || "Progress Note",
    date_of_service: data.date_of_service || new Date().toISOString().split("T")[0],
    provider_name: data.provider_name || "Dictating Provider",
    provider_credentials: data.provider_credentials || "MD",
    chief_complaint: data.chief_complaint || "",
    summary: data.summary || "",
    follow_up_instructions: data.follow_up_instructions || "",
    vital_signs: data.vital_signs || undefined,
  };
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

    // ── Phase 1: Parallel Consultation Summary + Change Detection ──
    const agentResults: { name: string; success: boolean }[] = [];

    const [summaryResult, changesResult] = await Promise.all([
      summarizeConsultation(transcript, patientContext, LOVABLE_API_KEY)
        .then((data) => { agentResults.push({ name: "summary", success: true }); return data; })
        .catch((e) => {
          console.error("Summary agent failed:", e);
          agentResults.push({ name: "summary", success: false });
          return null;
        }),
      detectChanges(transcript, patientContext, LOVABLE_API_KEY)
        .then((data) => { agentResults.push({ name: "changes", success: true }); return data; })
        .catch((e) => {
          console.error("Change detection agent failed:", e);
          agentResults.push({ name: "changes", success: false });
          return [];
        }),
    ]);

    if (!summaryResult) {
      return new Response(
        JSON.stringify({ error: "Failed to summarize the consultation." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let consultationNote = summaryResult;
    let proposedChanges = changesResult || [];

    // ── Phase 2: Parallel Interaction Check + Verification ──
    const [interactionAlerts, verification] = await Promise.all([
      checkInteractions(proposedChanges, patientContext, LOVABLE_API_KEY)
        .then((data) => { agentResults.push({ name: "interactions", success: true }); return data; })
        .catch((e) => {
          console.error("Interaction check failed:", e);
          agentResults.push({ name: "interactions", success: false });
          return [];
        }),
      verifyAgainstDictation(transcript, consultationNote, proposedChanges, LOVABLE_API_KEY)
        .then((data) => { agentResults.push({ name: "verification", success: true }); return data; })
        .catch((e) => {
          console.error("Verification agent failed:", e);
          agentResults.push({ name: "verification", success: false });
          return { hallucinated: [], warnings: ["Verification could not be completed"] };
        }),
    ]);

    // ── Phase 3: Clean Hallucinations ──
    let hallucinationsCleaned: string[] = [];
    if (verification.hallucinated.length > 0) {
      const cleanResult = cleanHallucinations(consultationNote, proposedChanges, verification.hallucinated);
      consultationNote = cleanResult.note;
      proposedChanges = cleanResult.changes;
      hallucinationsCleaned = cleanResult.cleaned;
    }

    // ── Build Response ──
    const note = buildNote(consultationNote);

    // Attach interaction alerts to proposed changes for frontend display
    const changesWithAlerts = proposedChanges.map((change: any) => {
      const relatedAlerts = interactionAlerts.filter((a: any) => {
        const relatedName = change.data?.name?.toLowerCase() || "";
        return (a.related_change || "").toLowerCase().includes(relatedName) ||
          (a.explanation || "").toLowerCase().includes(relatedName);
      });
      return {
        ...change,
        alerts: relatedAlerts.length > 0 ? relatedAlerts : undefined,
      };
    });

    const agentsSucceeded = agentResults.filter((a) => a.success).length;
    const agentsFailed = agentResults.filter((a) => !a.success).map((a) => a.name);

    return new Response(
      JSON.stringify({
        note,
        proposed_changes: changesWithAlerts,
        _meta: {
          interaction_alerts: interactionAlerts,
          verification_warnings: verification.warnings,
          hallucinations_cleaned: hallucinationsCleaned,
          agents_succeeded: agentsSucceeded,
          agents_failed: agentsFailed,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("structure-dictation error:", e);

    if (e instanceof Error && e.message.includes("(429)")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (e instanceof Error && e.message.includes("(402)")) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
