import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const patientTool = {
  type: "function" as const,
  function: {
    name: "create_patient",
    description:
      "Create a structured patient record from extracted medical document text.",
    parameters: {
      type: "object",
      properties: {
        patient_id: { type: "string", description: "Unique patient ID (generate UUID if not found)" },
        medical_record_number: { type: "string", description: "MRN from document or generate one like MRN-XXXXXXX" },
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
          properties: {
            provider: { type: "string" },
            plan_type: { type: "string" },
          },
          required: ["provider", "plan_type"],
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
        diagnoses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: { type: "string" },
              icd_code: { type: "string" },
              date_diagnosed: { type: "string" },
              status: { type: "string", enum: ["active", "resolved", "chronic"] },
            },
            required: ["condition"],
          },
        },
        clinical_notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              note_type: { type: "string" },
              date_of_service: { type: "string" },
              provider_name: { type: "string" },
              provider_credentials: { type: "string" },
              subjective: { type: "string" },
              objective: { type: "string" },
              assessment: { type: "string" },
              plan: { type: "string" },
              chief_complaint: { type: "string" },
              follow_up_instructions: { type: "string" },
            },
            required: ["note_type", "date_of_service", "provider_name", "provider_credentials", "subjective", "objective", "assessment", "plan"],
          },
        },
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
        primary_care_physician: { type: "string" },
        hospital: { type: "string" },
        admission_date: { type: "string" },
      },
      required: [
        "patient_id", "medical_record_number", "first_name", "last_name",
        "date_of_birth", "gender", "contact_info", "insurance",
        "allergies", "current_medications", "diagnoses", "clinical_notes",
        "lab_results", "imaging_studies", "diagnostic_tests",
      ],
      additionalProperties: false,
    },
  },
};

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

    // Decode PDF and extract text using pdf-parse
    const pdfBytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const { default: pdfParse } = await import("npm:pdf-parse@1.1.1");
    const pdfData = await pdfParse(pdfBytes);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Could not extract meaningful text from the PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call AI gateway with tool calling
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a medical document parser. Extract ALL patient data from the provided text into the create_patient tool. Rules:
- Generate a UUID for patient_id if not found (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
- Generate MRN like MRN-XXXXXXX if not found
- Use empty arrays for sections with no data
- Map diagnoses to active/resolved/chronic status
- Use "Unknown" for required string fields not in the document
- Dates should be YYYY-MM-DD format
- Extract every piece of clinical information you can find`,
            },
            {
              role: "user",
              content: `Parse this medical document:\n\n${pdfText}`,
            },
          ],
          tools: [patientTool],
          tool_choice: { type: "function", function: { name: "create_patient" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to parse document with AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured patient data." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const patient = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ patient }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-patient-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
