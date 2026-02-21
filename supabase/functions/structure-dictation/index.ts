import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const systemPrompt = `You are a clinical documentation specialist. You will receive a raw voice dictation from a doctor describing a patient encounter. Your job is to:
1. Structure the dictation into a complete SOAP clinical note
2. Detect any actionable changes to the patient's record mentioned in the dictation

Patient context:
- Name: ${patientContext?.name || "Unknown"}
- Age: ${patientContext?.age || "Unknown"}
- Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}
- Current medications: ${patientContext?.medications?.join(", ") || "None listed"}
- Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}

Rules for the SOAP note:
- Separate subjective complaints from objective findings
- If vitals are mentioned, extract them into vital_signs
- Formulate a clear assessment and actionable plan
- Infer chief_complaint from the dictation
- Set note_type appropriately (e.g. "Progress Note", "Follow-Up")
- Set date_of_service to today: ${new Date().toISOString().split("T")[0]}
- Use professional clinical language

Rules for detecting proposed changes:
- Look for medication changes: starting new meds, stopping/discontinuing meds, dosage changes
- Look for new diagnoses or resolved diagnoses
- Look for new allergies discovered
- Each change must have a category, action, and description
- Only include changes that are explicitly stated or strongly implied
- Do NOT fabricate changes not supported by the dictation`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the doctor's dictation:\n\n"${transcript}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_clinical_note_with_changes",
              description: "Create a structured SOAP clinical note and detect proposed patient record changes",
              parameters: {
                type: "object",
                properties: {
                  note_type: { type: "string" },
                  date_of_service: { type: "string" },
                  provider_name: { type: "string" },
                  provider_credentials: { type: "string" },
                  chief_complaint: { type: "string" },
                  subjective: { type: "string" },
                  objective: { type: "string" },
                  assessment: { type: "string" },
                  plan: { type: "string" },
                  follow_up_instructions: { type: "string" },
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
                  proposed_changes: {
                    type: "array",
                    description: "Actionable changes to the patient record detected from the dictation",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["medication", "diagnosis", "allergy"],
                          description: "What type of record to change",
                        },
                        action: {
                          type: "string",
                          enum: ["add", "remove", "update"],
                          description: "What action to take",
                        },
                        description: {
                          type: "string",
                          description: "Human-readable summary, e.g. 'Stop Metformin 500mg' or 'Add diagnosis: Urinary tract infection'",
                        },
                        data: {
                          type: "object",
                          description: "Structured data for the change",
                          properties: {
                            name: { type: "string", description: "Medication name, diagnosis condition, or allergen name" },
                            dosage: { type: "string", description: "For medications: dosage" },
                            frequency: { type: "string", description: "For medications: frequency" },
                            indication: { type: "string", description: "For medications: indication" },
                            icd_code: { type: "string", description: "For diagnoses: ICD code if known" },
                            status: { type: "string", description: "For diagnoses: active/resolved/chronic" },
                            reaction: { type: "string", description: "For allergies: reaction description" },
                          },
                        },
                      },
                      required: ["category", "action", "description", "data"],
                    },
                  },
                },
                required: ["note_type", "date_of_service", "provider_name", "provider_credentials", "subjective", "objective", "assessment", "plan", "proposed_changes"],
                additionalProperties: false,
              },
            },
          },
        ],
        temperature: 0.2,
        tool_choice: { type: "function", function: { name: "create_clinical_note_with_changes" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const { proposed_changes, ...note } = parsed;

    return new Response(JSON.stringify({ note, proposed_changes: proposed_changes || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-dictation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
