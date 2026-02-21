import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mockPatients } from "@/data/mockPatientData";
import type { Patient } from "@/types/patient";
import { useAuth } from "./useAuth";
import { useEffect, useRef } from "react";

async function seedPatients(userId: string) {
  // Double-check count to prevent race condition duplicates
  const { count } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;

  const rows = mockPatients.map((p) => ({
    user_id: userId,
    patient_data: JSON.parse(JSON.stringify(p)),
  }));
  await supabase.from("patients").insert(rows);
}

async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => row.patient_data as Patient);
}

export function usePatients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  const query = useQuery({
    queryKey: ["patients", user?.id],
    queryFn: fetchPatients,
    enabled: !!user,
  });

  // Auto-seed on first login if no patients exist
  useEffect(() => {
    if (
      user &&
      query.data &&
      query.data.length === 0 &&
      !query.isLoading &&
      !seededRef.current
    ) {
      seededRef.current = true;
      seedPatients(user.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["patients", user.id] });
      });
    }
  }, [user, query.data, query.isLoading, queryClient]);

  return query;
}

export function usePatient(patientId: string) {
  const { data: patients, ...rest } = usePatients();
  const patient = patients?.find((p) => p.patient_id === patientId) ?? null;
  return { patient, ...rest };
}
