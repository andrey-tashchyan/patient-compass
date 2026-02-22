import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackUsage } from "../_shared/paid-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, patientData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a clinical AI assistant embedded in a patient dashboard. You help doctors query patient records and PROPOSE changes for their review.

CURRENT PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

You have two tools available:

1. "answer_question" — Use this when the doctor asks a read-only question about the patient (e.g. "What are the active diagnoses?", "List medications", "When was the last lab?"). Return a clear, concise answer.

2. "propose_modification" — Use this when the doctor instructs you to add, edit, or delete patient data (e.g. "Add allergy to penicillin", "Change metformin dosage to 1000mg", "Remove the resolved diagnosis"). Return a list of proposed changes for the doctor to review and approve.

CRITICAL RULES:
- You can NEVER directly modify patient records. You can only PROPOSE changes.
- Every proposed change must be reviewed and approved by the doctor before it takes effect.
- Be precise with medical data. Follow the existing data patterns.
- Each proposed change needs: category (medication/diagnosis/allergy/demographics/clinical_note/lab_result/imaging/diagnostic_test), action (add/remove/update), a human-readable description, and the structured data for the change.
- For "remove" actions, include enough identifying data (e.g. the medication name) to locate the item.
- For "update" actions, include the field being changed and both old and new values.
- For "add" actions, include all required fields for the new item.
- Always explain your reasoning in the summary.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "answer_question",
          description:
            "Answer a read-only question about the patient's data. Use for queries that don't modify any data.",
          parameters: {
            type: "object",
            properties: {
              answer: {
                type: "string",
                description: "The answer to the doctor's question, formatted in markdown.",
              },
            },
            required: ["answer"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "propose_modification",
          description:
            "Propose changes to the patient record for the doctor to review and approve. NEVER applies changes directly.",
          parameters: {
            type: "object",
            properties: {
              proposed_changes: {
                type: "array",
                description: "List of proposed changes to the patient record.",
                items: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: ["medication", "diagnosis", "allergy", "demographics", "clinical_note", "lab_result", "imaging", "diagnostic_test"],
                      description: "What type of record to change.",
                    },
                    action: {
                      type: "string",
                      enum: ["add", "remove", "update"],
                      description: "What action to take.",
                    },
                    description: {
                      type: "string",
                      description: "Human-readable summary of the change, e.g. 'Add penicillin allergy (anaphylaxis)'",
                    },
                    data: {
                      type: "object",
                      description: "Structured data for the change. For medications: name, dosage, frequency, indication. For diagnoses: condition, icd_code, status. For allergies: allergen, reaction, status. For updates: include field, old_value, new_value.",
                    },
                  },
                  required: ["category", "action", "description", "data"],
                },
              },
              summary: {
                type: "string",
                description: "Brief explanation of why these changes are being proposed, based on the doctor's request.",
              },
            },
            required: ["proposed_changes", "summary"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          tools,
          tool_choice: "auto",
          temperature: 0,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    trackUsage({
      eventName: "prescription_checked",
      data: {
        message_count: messages.length,
        has_patient_data: Boolean(patientData),
      },
    }).catch(() => {});

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("patient-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
