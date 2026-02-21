import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const systemPrompt = `You are a clinical AI assistant embedded in a patient dashboard. You help doctors query and modify patient records using natural language.

CURRENT PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

You have two tools available:

1. "answer_question" — Use this when the doctor asks a read-only question about the patient (e.g. "What are the active diagnoses?", "List medications", "When was the last lab?"). Return a clear, concise answer.

2. "modify_patient" — Use this when the doctor instructs you to add, edit, or delete patient data (e.g. "Add allergy to penicillin", "Change metformin dosage to 1000mg", "Remove the resolved diagnosis of acute bronchitis"). Return the COMPLETE updated patient object with your changes applied, plus a short summary of what changed.

IMPORTANT RULES:
- For modify_patient, you MUST return the ENTIRE patient object with the modification applied, not just the changed field.
- Keep the patient_id, medical_record_number, and other identifiers unchanged.
- Be precise with medical data. If unsure about a field format, follow the existing data patterns.
- When removing items, filter them out of the relevant array.
- When adding items, append to the relevant array with reasonable defaults for optional fields.
- Always confirm what you changed in the summary field.`;

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
          name: "modify_patient",
          description:
            "Modify the patient record (add, edit, or delete data). Returns the complete updated patient object.",
          parameters: {
            type: "object",
            properties: {
              updated_patient: {
                type: "object",
                description:
                  "The COMPLETE updated patient JSON object with modifications applied.",
              },
              summary: {
                type: "string",
                description:
                  "A brief human-readable summary of what was changed (e.g. 'Added penicillin allergy with anaphylaxis reaction').",
              },
            },
            required: ["updated_patient", "summary"],
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
