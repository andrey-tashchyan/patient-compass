import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  PatientEvolutionOrchestrator,
  persistPatientEvolutionOutput,
  generatedPatientEvolutionPath,
  type PatientEvolutionOutput,
} from "../../supabase/functions/_shared/patient-evolution/pipeline.ts";

const FIXED_NOW = new Date("2026-02-22T00:00:00.000Z");
const PATIENT_ID = "20c3ca32-ec09-4e7c-abab-9f7711cbe235";

function createPipeline() {
  return new PatientEvolutionOrchestrator(
    {
      readText: (path: string) => readFile(path, "utf-8"),
    },
    {
      dataRoot: "public/data/final_10_patients",
      now: () => FIXED_NOW,
      lovableApiKey: null,
      fetchFn: fetch,
    },
  );
}

describe("patient evolution pipeline", () => {
  let byIdOutput: PatientEvolutionOutput;

  beforeAll(async () => {
    byIdOutput = await createPipeline().run(PATIENT_ID);
  });

  it("looks up by patient id", async () => {
    expect(byIdOutput.identity?.csv_patient_uuid).toBe(PATIENT_ID);
    expect(byIdOutput.identity?.matched_by).toContain("patients_list.id");
  });

  it("looks up by case-insensitive exact patient name", async () => {
    const byName = await createPipeline().run("SCOTTY190 SPENCER878");
    expect(byName.identity?.csv_patient_uuid).toBe(PATIENT_ID);
    expect(byName.identity?.matched_by).toContain(
      "patients_list.full_name.case_insensitive_exact",
    );
  });

  it("produces narrative content", async () => {
    expect(byIdOutput.narrative.evolution_timeline_summary).toBeTruthy();
    expect((byIdOutput.narrative.evolution_timeline_summary ?? "").length).toBeGreaterThan(30);
  });

  it("persists JSON payload through storage uploader contract", async () => {
    const upload = vi.fn(async () => ({ error: null }));

    const path = await persistPatientEvolutionOutput({
      uploader: { upload },
      patientId: PATIENT_ID,
      payload: byIdOutput,
    });

    const expectedPath = generatedPatientEvolutionPath(PATIENT_ID);
    expect(path).toBe(expectedPath);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(expectedPath, expect.any(String), {
      contentType: "application/json",
      upsert: true,
    });

    const uploadedBody = upload.mock.calls[0][1] as string;
    const parsed = JSON.parse(uploadedBody) as PatientEvolutionOutput;
    expect(parsed.identity?.csv_patient_uuid).toBe(PATIENT_ID);
    expect(parsed.narrative.evolution_timeline_summary).toBeTruthy();
  });
});
