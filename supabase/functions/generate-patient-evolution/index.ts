import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  PatientEvolutionOrchestrator,
  persistPatientEvolutionOutput,
} from "../_shared/patient-evolution/pipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_STORAGE_BUCKET = "patient-evolution";
const DATA_BUCKET = "patient-evolution-data";

function resolveIdentifier(body: Record<string, unknown>): string {
  const candidate =
    (typeof body.identifier === "string" && body.identifier) ||
    (typeof body.query === "string" && body.query) ||
    (typeof body.patient_id === "string" && body.patient_id) ||
    (typeof body.patientId === "string" && body.patientId) ||
    (typeof body.patient_name === "string" && body.patient_name) ||
    (typeof body.patientName === "string" && body.patientName) ||
    "";

  return candidate.trim();
}

async function ensureBucketExists(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucketName: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin.storage.listBuckets();
  if (error) {
    throw new Error(error.message || "Failed to list storage buckets");
  }

  const exists = (data ?? []).some((bucket) => bucket.name === bucketName);
  if (exists) {
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["application/json"],
  });

  if (createError) {
    throw new Error(createError.message || `Failed to create storage bucket '${bucketName}'`);
  }
}

function createStorageFileIO(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucketName: string,
) {
  return {
    readText: async (path: string): Promise<string> => {
      const { data, error } = await supabaseAdmin.storage
        .from(bucketName)
        .download(path);

      if (error || !data) {
        throw new Error(
          `Storage read failed for ${bucketName}/${path}: ${error?.message ?? "no data"}`,
        );
      }

      return await data.text();
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const identifier = resolveIdentifier(body);

    if (!identifier) {
      return new Response(
        JSON.stringify({
          error:
            "Missing identifier. Provide one of: identifier, query, patient_id/patientId, or patient_name/patientName.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
    }

    console.log(`[evolution] Starting synchronous processing for: ${identifier}`);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const dataBucket = Deno.env.get("PATIENT_EVOLUTION_DATA_BUCKET") ?? DATA_BUCKET;
    const storageIO = createStorageFileIO(supabaseAdmin, dataBucket);

    const orchestrator = new PatientEvolutionOrchestrator(
      storageIO,
      {
        dataRoot: "final_10_patients",
        lovableApiKey: Deno.env.get("LOVABLE_API_KEY") ?? null,
        aiGatewayUrl:
          Deno.env.get("PATIENT_EVOLUTION_AI_GATEWAY_URL") ??
          "https://ai.gateway.lovable.dev/v1/chat/completions",
        aiModel:
          Deno.env.get("PATIENT_EVOLUTION_AI_MODEL") ?? "google/gemini-3-flash-preview",
        now: () => new Date(),
        fetchFn: fetch,
      },
    );

    const payload = await orchestrator.run(identifier);

    console.log(`[evolution] Completed for ${identifier}`);

    return new Response(
      JSON.stringify({
        status: "completed",
        payload,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("generate-patient-evolution error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
