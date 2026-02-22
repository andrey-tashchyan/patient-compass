import { supabase } from "@/integrations/supabase/client";
import type { GeneratePatientEvolutionResponse } from "@/types/patientEvolution";

export async function generatePatientEvolution(identifier: string): Promise<GeneratePatientEvolutionResponse> {
  const query = identifier.trim();
  if (!query) {
    throw new Error("Patient identifier is required");
  }

  const { data, error } = await supabase.functions.invoke("generate-patient-evolution", {
    body: { identifier: query },
  });

  if (error) {
    throw new Error(error.message || "Failed to generate patient evolution");
  }

  const payload = data as Partial<GeneratePatientEvolutionResponse> | null;
  if (!payload?.payload || !payload.patient_id || !payload.storage_path || !payload.storage_bucket) {
    throw new Error("Edge function returned an invalid response");
  }

  return payload as GeneratePatientEvolutionResponse;
}
