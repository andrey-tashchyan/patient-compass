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

    const systemPrompt = `You are a clinical documentation specialist. You will receive a raw voice dictation from a doctor describing a patient encounter. Your job is to structure it into a complete SOAP clinical note using the create_clinical_note tool.

Patient context:
- Name: ${patientContext?.name || "Unknown"}
- Age: ${patientContext?.age || "Unknown"}
- Active diagnoses: ${patientContext?.activeDiagnoses?.join(", ") || "None listed"}
- Current medications: ${patientContext?.medications?.join(", ") || "None listed"}
- Known allergies: ${patientContext?.allergies?.join(", ") || "NKDA"}

Rules:
- Separate subjective complaints (what the patient reports) from objective findings (exam findings, vitals, test results)
- If vitals are mentioned (e.g. "BP 120/80", "heart rate 72", "temp 98.6"), extract them into the vital_signs object
- Formulate a clear assessment with differential diagnoses if applicable
- Create an actionable plan with specific next steps
- Infer the chief_complaint from the dictation
- Set note_type to the most appropriate type (e.g. "Progress Note", "Follow-Up", "New Patient", "Urgent Care")
- Set date_of_service to today's date: ${new Date().toISOString().split("T")[0]}
- Use professional clinical language`;

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
              name: "create_clinical_note",
              description: "Create a structured SOAP clinical note from dictation",
              parameters: {
                type: "object",
                properties: {
                  note_type: { type: "string", description: "Type of clinical note (e.g. Progress Note, Follow-Up)" },
                  date_of_service: { type: "string", description: "Date in YYYY-MM-DD format" },
                  provider_name: { type: "string", description: "Provider name if mentioned, otherwise 'Dictating Provider'" },
                  provider_credentials: { type: "string", description: "Provider credentials if mentioned, otherwise 'MD'" },
                  chief_complaint: { type: "string", description: "Primary reason for the visit" },
                  subjective: { type: "string", description: "Patient's reported symptoms, history, and complaints" },
                  objective: { type: "string", description: "Physical exam findings, observations, test results" },
                  assessment: { type: "string", description: "Clinical assessment and diagnoses" },
                  plan: { type: "string", description: "Treatment plan and next steps" },
                  follow_up_instructions: { type: "string", description: "Follow-up timing and instructions" },
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
                required: ["note_type", "date_of_service", "provider_name", "provider_credentials", "subjective", "objective", "assessment", "plan"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_clinical_note" } },
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

    const note = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ note }), {
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
