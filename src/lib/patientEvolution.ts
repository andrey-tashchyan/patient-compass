import { supabase } from "@/integrations/supabase/client";
import type { GeneratePatientEvolutionResponse, PatientEvolutionOutput } from "@/types/patientEvolution";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const STORAGE_BUCKET = "patient-evolution";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes max

/**
 * Kick off the evolution pipeline (returns 202) then poll storage for the result.
 */
export async function generatePatientEvolution(identifier: string): Promise<GeneratePatientEvolutionResponse> {
  const query = identifier.trim();
  if (!query) {
    throw new Error("Patient identifier is required");
  }

  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL is not configured.");
  }

  // Step 1: Trigger the edge function (returns 202 immediately)
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-patient-evolution`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
      ...(SUPABASE_PUBLISHABLE_KEY ? { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` } : {}),
    },
    body: JSON.stringify({ identifier: query }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok && response.status !== 202) {
    const serverMsg = (data as Record<string, unknown>)?.error;
    throw new Error(
      typeof serverMsg === "string" && serverMsg
        ? serverMsg
        : `Edge function returned ${response.status}`
    );
  }

  // Step 2: Poll the storage bucket for the generated result
  const storagePath = `final_10_patients/generated/${query}_patient_evolution.json`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      // File not ready yet, continue polling
      continue;
    }

    try {
      const text = await fileData.text();
      const payload = JSON.parse(text) as PatientEvolutionOutput;

      return {
        patient_id: query,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        payload,
      };
    } catch {
      // Parse error, continue polling (file might be partially written)
      continue;
    }
  }

  throw new Error("Evolution analysis timed out. Please try again.");
}
