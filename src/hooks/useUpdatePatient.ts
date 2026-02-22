import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Patient } from "@/types/patient";
import { toast } from "sonner";

const DEMO_USER_ID = "demo-user";

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: Patient) => {
      const { data: rows, error: fetchError } = await supabase
        .from("patients")
        .select("id, patient_data")
        .eq("user_id", DEMO_USER_ID);

      if (fetchError) throw fetchError;

      const row = rows?.find(
        (r: any) => (r.patient_data as any)?.patient_id === patient.patient_id
      );
      if (!row) throw new Error("Patient record not found");

      const { error } = await supabase
        .from("patients")
        .update({ patient_data: JSON.parse(JSON.stringify(patient)) })
        .eq("id", row.id);

      if (error) throw error;
      return patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient record updated");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });
}
