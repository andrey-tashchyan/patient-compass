import type { GeneratePatientEvolutionResponse } from "@/types/patientEvolution";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function generatePatientEvolution(identifier: string): Promise<GeneratePatientEvolutionResponse> {
  const query = identifier.trim();
  if (!query) {
    throw new Error("Patient identifier is required");
  }

  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL is not configured.");
  }

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

  if (!response.ok) {
    const serverMsg = (data as Record<string, unknown>)?.error;
    throw new Error(
      typeof serverMsg === "string" && serverMsg
        ? serverMsg
        : `Edge function returned ${response.status}`
    );
  }

  if ((data as Record<string, unknown>)?.error) {
    throw new Error(String((data as Record<string, unknown>).error));
  }

  const payload = data as Partial<GeneratePatientEvolutionResponse> | null;
  if (!payload?.payload || !payload.patient_id || !payload.storage_path || !payload.storage_bucket) {
    throw new Error("Edge function returned an invalid response");
  }

  return payload as GeneratePatientEvolutionResponse;
}
