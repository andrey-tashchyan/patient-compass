import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mockPatients } from "@/data/mockPatientData";
import type { Patient } from "@/types/patient";
import { useAuth } from "./useAuth";
import { useEffect, useRef } from "react";

function getPatientKey(patient: Patient): string {
  const patientId = patient.patient_id?.trim();
  if (patientId) return `id:${patientId}`;

  const mrn = patient.medical_record_number?.trim().toLowerCase();
  if (mrn) return `mrn:${mrn}`;

  // Fallback key if imported data is malformed.
  return `name:${patient.first_name?.trim().toLowerCase()}-${patient.last_name?.trim().toLowerCase()}-${patient.date_of_birth}`;
}

function dedupePatients(patients: Patient[]): Patient[] {
  const result: Patient[] = [];
  const keyToIndex = new Map<string, number>();

  for (const patient of patients) {
    const key = getPatientKey(patient);
    const existingIndex = keyToIndex.get(key);

    if (existingIndex == null) {
      keyToIndex.set(key, result.length);
      result.push(patient);
    } else {
      // Keep list order stable while letting the latest row win.
      result[existingIndex] = patient;
    }
  }

  return result;
}

async function seedPatients(userId: string) {
  const { data: existingRows, error: existingError } = await supabase
    .from("patients")
    .select("patient_data")
    .eq("user_id", userId);
  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingRows ?? [])
      .map((row: any) => row.patient_data as Patient)
      .map(getPatientKey)
  );

  const rows = mockPatients.map((p) => ({
    user_id: userId,
    patient_data: JSON.parse(JSON.stringify(p)),
  })).filter((row) => !existingKeys.has(getPatientKey(row.patient_data as Patient)));

  if (rows.length === 0) return;
  await supabase.from("patients").insert(rows);
}

async function fetchPatients(userId: string): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const patients = (data ?? []).map((row: any) => row.patient_data as Patient);
  return dedupePatients(patients);
}

export function usePatients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seededRef = useRef(false);

  useEffect(() => {
    seededRef.current = false;
  }, [user?.id]);

  const query = useQuery({
    queryKey: ["patients", user?.id],
    queryFn: () => fetchPatients(user!.id),
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
