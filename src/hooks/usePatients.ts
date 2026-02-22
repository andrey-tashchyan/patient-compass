import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mockPatients } from "@/data/mockPatientData";
import type { Patient } from "@/types/patient";
import { useAuth } from "./useAuth";
import { useEffect, useRef } from "react";

type PatientRow = { patient: Patient; createdAt: string | null };

function normalizeText(value?: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value?: string): string {
  return (value || "").replace(/\D/g, "");
}

function fullName(patient: Patient): string {
  return normalizeText(`${patient.first_name || ""} ${patient.last_name || ""}`.trim());
}

function hasValue(value?: string | null): boolean {
  return !!value && value.trim().length > 0;
}

function parseDate(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

function getPatientKey(patient: Patient): string {
  const patientId = patient.patient_id?.trim();
  if (patientId) return `id:${patientId}`;
  const mrn = normalizeText(patient.medical_record_number);
  if (mrn) return `mrn:${mrn}`;
  return `name:${fullName(patient)}-${patient.date_of_birth || ""}`;
}

function sameIdentityInfo(a: Patient, b: Patient): boolean {
  const aMrn = normalizeText(a.medical_record_number);
  const bMrn = normalizeText(b.medical_record_number);
  if (aMrn && bMrn && aMrn === bMrn) return true;

  const aPhone = normalizePhone(a.contact_info?.phone);
  const bPhone = normalizePhone(b.contact_info?.phone);
  if (aPhone && bPhone && aPhone === bPhone) return true;

  const aEmergencyPhone = normalizePhone(a.contact_info?.emergency_contact_phone);
  const bEmergencyPhone = normalizePhone(b.contact_info?.emergency_contact_phone);
  if (aEmergencyPhone && bEmergencyPhone && aEmergencyPhone === bEmergencyPhone) return true;

  const aAddress = normalizeText(a.contact_info?.address);
  const bAddress = normalizeText(b.contact_info?.address);
  if (aAddress && bAddress && aAddress === bAddress) return true;

  const aEmergencyName = normalizeText(a.contact_info?.emergency_contact_name);
  const bEmergencyName = normalizeText(b.contact_info?.emergency_contact_name);
  if (aEmergencyName && bEmergencyName && aEmergencyName === bEmergencyName) return true;

  return false;
}

function isLikelySamePatient(a: Patient, b: Patient): boolean {
  if (!a.date_of_birth || !b.date_of_birth || a.date_of_birth !== b.date_of_birth) return false;
  if (!sameIdentityInfo(a, b)) return false;

  const aName = fullName(a);
  const bName = fullName(b);
  const nameScore = similarity(aName, bName);
  const aLast = normalizeText(a.last_name);
  const bLast = normalizeText(b.last_name);
  const sameLastName = !!aLast && !!bLast && aLast === bLast;
  const aInitial = normalizeText(a.first_name).slice(0, 1);
  const bInitial = normalizeText(b.first_name).slice(0, 1);
  const sameFirstInitial = !!aInitial && !!bInitial && aInitial === bInitial;
  return nameScore >= 0.7 || sameLastName || sameFirstInitial;
}

function completenessScore(p: Patient): number {
  let score = 0;

  const scalarFields = [
    p.first_name, p.last_name, p.date_of_birth, p.medical_record_number,
    p.primary_care_physician, p.hospital, p.admission_date, p.patient_signature,
    p.signature_date, p.contact_info?.phone, p.contact_info?.address,
    p.contact_info?.emergency_contact_name, p.contact_info?.emergency_contact_relation,
    p.contact_info?.emergency_contact_phone, p.insurance?.provider, p.insurance?.plan_type,
  ];
  score += scalarFields.filter(hasValue).length;

  score += (p.allergies?.length || 0) * 2;
  score += (p.current_medications?.length || 0) * 2;
  score += (p.diagnoses?.length || 0) * 2;
  score += (p.clinical_notes?.length || 0) * 3;
  score += (p.lab_results?.length || 0);
  score += (p.imaging_studies?.length || 0);
  score += (p.diagnostic_tests?.length || 0);

  return score;
}

function mergeUniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, item);
  }
  return Array.from(map.values());
}

function mergePatientRecords(primary: Patient, secondary: Patient): Patient {
  const merged: Patient = JSON.parse(JSON.stringify(primary));
  merged.contact_info = merged.contact_info || {
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
  };
  merged.insurance = merged.insurance || {
    provider: "",
    plan_type: "",
  };
  const secondaryContact = secondary.contact_info || {
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
  };
  const secondaryInsurance = secondary.insurance || {
    provider: "",
    plan_type: "",
  };

  if (!hasValue(merged.patient_id) && hasValue(secondary.patient_id)) merged.patient_id = secondary.patient_id;
  if (!hasValue(merged.medical_record_number) && hasValue(secondary.medical_record_number)) {
    merged.medical_record_number = secondary.medical_record_number;
  }
  if (!hasValue(merged.first_name) && hasValue(secondary.first_name)) merged.first_name = secondary.first_name;
  if (!hasValue(merged.last_name) && hasValue(secondary.last_name)) merged.last_name = secondary.last_name;
  if (!hasValue(merged.primary_care_physician) && hasValue(secondary.primary_care_physician)) {
    merged.primary_care_physician = secondary.primary_care_physician;
  }
  if (!hasValue(merged.hospital) && hasValue(secondary.hospital)) merged.hospital = secondary.hospital;

  if (!hasValue(merged.contact_info.phone) && hasValue(secondaryContact.phone)) {
    merged.contact_info.phone = secondaryContact.phone;
  }
  if (!hasValue(merged.contact_info.address) && hasValue(secondaryContact.address)) {
    merged.contact_info.address = secondaryContact.address;
  }
  if (!hasValue(merged.contact_info.emergency_contact_name) && hasValue(secondaryContact.emergency_contact_name)) {
    merged.contact_info.emergency_contact_name = secondaryContact.emergency_contact_name;
  }
  if (!hasValue(merged.contact_info.emergency_contact_relation) && hasValue(secondaryContact.emergency_contact_relation)) {
    merged.contact_info.emergency_contact_relation = secondaryContact.emergency_contact_relation;
  }
  if (!hasValue(merged.contact_info.emergency_contact_phone) && hasValue(secondaryContact.emergency_contact_phone)) {
    merged.contact_info.emergency_contact_phone = secondaryContact.emergency_contact_phone;
  }

  if (!hasValue(merged.insurance.provider) && hasValue(secondaryInsurance.provider)) {
    merged.insurance.provider = secondaryInsurance.provider;
  }
  if (!hasValue(merged.insurance.plan_type) && hasValue(secondaryInsurance.plan_type)) {
    merged.insurance.plan_type = secondaryInsurance.plan_type;
  }

  merged.admission_date =
    parseDate(secondary.admission_date) > parseDate(merged.admission_date)
      ? secondary.admission_date
      : merged.admission_date;

  merged.allergies = mergeUniqueBy(
    [...(merged.allergies || []), ...(secondary.allergies || [])],
    (a) => `${normalizeText(a.allergen)}|${normalizeText(a.reaction)}`
  );
  merged.current_medications = mergeUniqueBy(
    [...(merged.current_medications || []), ...(secondary.current_medications || [])],
    (m) => `${normalizeText(m.name)}|${normalizeText(m.dosage)}|${normalizeText(m.frequency)}`
  );
  merged.diagnoses = mergeUniqueBy(
    [...(merged.diagnoses || []), ...(secondary.diagnoses || [])],
    (d) => `${normalizeText(d.condition)}|${normalizeText(d.icd_code)}`
  );
  merged.clinical_notes = mergeUniqueBy(
    [...(merged.clinical_notes || []), ...(secondary.clinical_notes || [])],
    (n) => `${normalizeText(n.note_type)}|${normalizeText(n.date_of_service)}|${normalizeText(n.summary)}`
  ).sort((a, b) => parseDate(b.date_of_service) - parseDate(a.date_of_service));
  merged.lab_results = mergeUniqueBy(
    [...(merged.lab_results || []), ...(secondary.lab_results || [])],
    (l) => `${normalizeText(l.test_name)}|${normalizeText(l.date_performed)}|${normalizeText(l.result)}`
  );
  merged.imaging_studies = mergeUniqueBy(
    [...(merged.imaging_studies || []), ...(secondary.imaging_studies || [])],
    (i) => `${normalizeText(i.study_type)}|${normalizeText(i.body_part)}|${normalizeText(i.date_performed)}`
  );
  merged.diagnostic_tests = mergeUniqueBy(
    [...(merged.diagnostic_tests || []), ...(secondary.diagnostic_tests || [])],
    (t) => `${normalizeText(t.test_type)}|${normalizeText(t.date_performed)}`
  );

  return merged;
}

function dedupePatients(rows: PatientRow[]): Patient[] {
  const groups: PatientRow[][] = [];

  for (const row of rows) {
    const matchedGroup = groups.find((group) =>
      group.some((g) =>
        getPatientKey(g.patient) === getPatientKey(row.patient) ||
        isLikelySamePatient(g.patient, row.patient)
      )
    );
    if (matchedGroup) {
      matchedGroup.push(row);
    } else {
      groups.push([row]);
    }
  }

  const merged = groups.map((group) => {
    const sorted = [...group].sort((a, b) => {
      const completenessDiff = completenessScore(b.patient) - completenessScore(a.patient);
      if (completenessDiff !== 0) return completenessDiff;
      return parseDate(b.createdAt) - parseDate(a.createdAt);
    });

    const base = sorted[0];
    let mergedPatient = JSON.parse(JSON.stringify(base.patient)) as Patient;
    for (let i = 1; i < sorted.length; i++) {
      mergedPatient = mergePatientRecords(mergedPatient, sorted[i].patient);
    }

    return { patient: mergedPatient, createdAt: base.createdAt };
  });

  return merged
    .sort((a, b) => parseDate(a.createdAt) - parseDate(b.createdAt))
    .map((x) => x.patient);
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
  const rows: PatientRow[] = (data ?? []).map((row: any) => ({
    patient: row.patient_data as Patient,
    createdAt: row.created_at || null,
  }));
  return dedupePatients(rows);
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

  // Auto-seed missing mock patients (runs once per session per user)
  useEffect(() => {
    if (
      user &&
      query.data &&
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
