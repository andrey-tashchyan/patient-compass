export type JsonObject = Record<string, unknown>;

export interface IdentityPayload extends JsonObject {
  query_identifier?: string;
  csv_patient_uuid?: string | null;
  stable_patient_id?: string | null;
  medical_record_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  matched_by?: string[];
  confidence?: number;
  evidence?: unknown[];
}

export interface TimelineEvent extends JsonObject {
  event_id?: string;
  category?: string;
  subtype?: string;
  time_start?: string | null;
  time_end?: string | null;
  description?: string | null;
  code?: string | null;
  value?: string | null;
  unit?: string | null;
  flagged_abnormal?: boolean;
  source_dataset?: string | null;
  source_file?: string | null;
  context?: JsonObject;
  clinical_context?: JsonObject;
  provenance?: JsonObject;
}

export interface Episode extends JsonObject {
  episode_id: string;
  episode_type: string;
  time_start?: string | null;
  time_end?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  related_event_ids: string[];
  details: JsonObject;
}

export interface EvolutionAlert extends JsonObject {
  alert_id: string;
  severity: "low" | "medium" | "high";
  alert_type: string;
  message: string;
  time_detected: string;
  related_episode_ids: string[];
  related_event_ids: string[];
  recommended_action?: string | null;
  metadata: JsonObject;
}

export interface ProfilePayload extends JsonObject {
  patient?: JsonObject;
  identity?: IdentityPayload | null;
  source_counts?: JsonObject;
}

export interface TemporalPayload extends JsonObject {
  identity?: IdentityPayload | null;
  timeline?: TimelineEvent[];
  episodes?: Record<string, JsonObject[]>;
  source_counts?: JsonObject;
}

export interface ContextPayload extends JsonObject {
  identity?: IdentityPayload | null;
  timeline?: TimelineEvent[];
  episodes?: Record<string, JsonObject[]>;
  source_counts?: JsonObject;
}

export interface NarrativePayload extends JsonObject {
  baseline_profile?: string;
  evolution_by_condition?: string[];
  changes_last_30_days?: string;
  changes_last_90_days?: string;
  changes_last_365_days?: string;
  care_gaps_or_contradictions?: string[];
  evolution_timeline_summary?: string;
  generation_mode?: "ai" | "deterministic";
  generation_model?: string | null;
  generation_provider?: string | null;
}

export interface PatientEvolutionOutput extends JsonObject {
  patient?: JsonObject;
  timeline: TimelineEvent[];
  episodes: Episode[];
  alerts: EvolutionAlert[];
  identity?: IdentityPayload | null;
  narrative: NarrativePayload;
  metadata: {
    generated_at: string;
    source_counts: {
      timeline_events: number;
      episodes: number;
      alerts: number;
    };
    pipeline: {
      identity_agent: string;
      profile_builder_agent: string;
      temporal_evolution_agent: string;
      context_fusion_agent: string;
      narrative_agent: string;
    };
  };
}

export interface PipelineFileIO {
  readText(path: string): Promise<string>;
}

export interface PatientEvolutionPipelineOptions {
  dataRoot?: string;
  now?: () => Date;
  fetchFn?: typeof fetch;
  lovableApiKey?: string | null;
  aiGatewayUrl?: string;
  aiModel?: string;
}

export interface PipelineStage<I, O> {
  readonly name: string;
  run(input: I): Promise<O>;
}

type CsvRow = Record<string, string>;

type IdentityStageInput = { identifier: string };
type ProfileStageInput = { identity: IdentityPayload };
type TemporalStageInput = { identity: IdentityPayload };
type ContextStageInput = { identity: IdentityPayload; temporal: TemporalPayload };
type NarrativeStageInput = {
  patient: JsonObject;
  identity: IdentityPayload;
  timeline: TimelineEvent[];
  episodes: Record<string, JsonObject[]>;
};

const DEFAULT_DATA_ROOT = "public/data/final_10_patients";
const DEFAULT_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_AI_MODEL = "google/gemini-3-flash-preview";

function asString(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function lower(value: unknown): string {
  return asString(value).toLocaleLowerCase();
}

function normalizeName(value: unknown): string {
  return asString(value).replace(/\s+/g, " ").toLocaleLowerCase();
}

function toIsoDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.slice(0, 10);
}

function parseDateTime(raw: unknown): string | null {
  const text = asString(raw);
  if (!text) {
    return null;
  }

  const parsedIso = Date.parse(text);
  if (!Number.isNaN(parsedIso)) {
    return new Date(parsedIso).toISOString();
  }

  const compact = text.replace(/\s+/g, "");
  const compactMatch = compact.match(/^(\d{8})(\d{2})?(\d{2})?(\d{2})?([+-]\d{4})?$/);
  if (!compactMatch) {
    return null;
  }

  const datePart = compactMatch[1];
  const hh = compactMatch[2] ?? "00";
  const mm = compactMatch[3] ?? "00";
  const ss = compactMatch[4] ?? "00";
  const tz = compactMatch[5]
    ? `${compactMatch[5].slice(0, 3)}:${compactMatch[5].slice(3, 5)}`
    : "Z";

  const isoCandidate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(
    6,
    8,
  )}T${hh}:${mm}:${ss}${tz}`;
  const parsed = Date.parse(isoCandidate);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function parseNumber(raw: unknown): number | null {
  const value = Number(asString(raw));
  return Number.isFinite(value) ? value : null;
}

function parseInteger(raw: unknown): number | null {
  const value = parseNumber(raw);
  if (value == null) {
    return null;
  }
  return Math.round(value);
}

function parseCsv(text: string): CsvRow[] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const out: CsvRow = {};
    headers.forEach((header, index) => {
      out[header] = (cells[index] ?? "").trim();
    });
    return out;
  });
}

function localTagName(element: Element | null): string {
  if (!element) {
    return "";
  }
  return (element.localName ?? element.tagName.split(":").pop() ?? "").toLocaleLowerCase();
}

function firstChildByLocalName(parent: Element | null, name: string): Element | null {
  if (!parent) {
    return null;
  }
  const wanted = name.toLocaleLowerCase();
  for (const child of Array.from(parent.children)) {
    if (localTagName(child) === wanted) {
      return child;
    }
  }
  return null;
}

function nowIso(nowProvider: () => Date): string {
  return nowProvider().toISOString();
}

class DatasetAccessor {
  private readonly dataRoot: string;
  private readonly io: PipelineFileIO;

  constructor(io: PipelineFileIO, dataRoot: string) {
    this.io = io;
    this.dataRoot = dataRoot.replace(/\/$/, "");
  }

  private resolve(path: string): string {
    return `${this.dataRoot}/${path}`;
  }

  async readCsv(path: string): Promise<CsvRow[]> {
    const text = await this.io.readText(this.resolve(path));
    return parseCsv(text);
  }

  async readOptionalCsv(path: string): Promise<CsvRow[]> {
    try {
      return await this.readCsv(path);
    } catch {
      return [];
    }
  }

  async readJson(path: string): Promise<JsonObject | null> {
    try {
      const text = await this.io.readText(this.resolve(path));
      return JSON.parse(text) as JsonObject;
    } catch {
      return null;
    }
  }

  async readText(path: string): Promise<string | null> {
    try {
      return await this.io.readText(this.resolve(path));
    } catch {
      return null;
    }
  }
}

class IdentityResolverStage implements PipelineStage<IdentityStageInput, IdentityPayload> {
  readonly name = "identity_agent";

  constructor(private readonly dataset: DatasetAccessor) {}

  async run(input: IdentityStageInput): Promise<IdentityPayload> {
    const identifier = asString(input.identifier);
    if (!identifier) {
      throw new Error("identifier is required");
    }

    const patients = await this.dataset.readCsv("patients_list.csv");
    const byId = patients.find((row) => lower(row.Id) === lower(identifier));
    if (byId) {
      return {
        query_identifier: identifier,
        csv_patient_uuid: byId.Id,
        stable_patient_id: byId.Id,
        medical_record_number: null,
        first_name: asString(byId.FIRST) || null,
        last_name: asString(byId.LAST) || null,
        date_of_birth: asString(byId.BIRTHDATE) || null,
        gender: asString(byId.GENDER) || null,
        matched_by: ["patients_list.id"],
        confidence: 1,
        evidence: [
          {
            dataset_type: "patients_list",
            file_path: "public/data/final_10_patients/patients_list.csv",
            match_field: "Id",
          },
        ],
      };
    }

    const wantedName = normalizeName(identifier);
    const matches = patients.filter((row) => {
      const fullName = `${asString(row.FIRST)} ${asString(row.LAST)}`.trim();
      return normalizeName(fullName) === wantedName;
    });

    if (matches.length === 0) {
      throw new Error(`No patient found for identifier: ${identifier}`);
    }

    if (matches.length > 1) {
      throw new Error(`Ambiguous patient name match for: ${identifier}`);
    }

    const row = matches[0];
    return {
      query_identifier: identifier,
      csv_patient_uuid: row.Id,
      stable_patient_id: row.Id,
      medical_record_number: null,
      first_name: asString(row.FIRST) || null,
      last_name: asString(row.LAST) || null,
      date_of_birth: asString(row.BIRTHDATE) || null,
      gender: asString(row.GENDER) || null,
      matched_by: ["patients_list.full_name.case_insensitive_exact"],
      confidence: 0.95,
      evidence: [
        {
          dataset_type: "patients_list",
          file_path: "public/data/final_10_patients/patients_list.csv",
          match_field: "FIRST+LAST",
        },
      ],
    };
  }
}

class ProfileBuilderStage implements PipelineStage<ProfileStageInput, ProfilePayload> {
  readonly name = "profile_builder_agent";

  constructor(private readonly dataset: DatasetAccessor) {}

  private vitalsField(description: string): keyof JsonObject | null {
    const lowerDescription = description.toLocaleLowerCase();
    if (lowerDescription.includes("systolic blood pressure")) {
      return "blood_pressure_systolic";
    }
    if (lowerDescription.includes("diastolic blood pressure")) {
      return "blood_pressure_diastolic";
    }
    if (lowerDescription.includes("heart rate") || lowerDescription.includes("pulse")) {
      return "heart_rate";
    }
    if (lowerDescription.includes("body temperature") || lowerDescription.includes("temperature")) {
      return "temperature_fahrenheit";
    }
    if (lowerDescription.includes("body mass index") || lowerDescription === "bmi") {
      return "bmi";
    }
    return null;
  }

  async run(input: ProfileStageInput): Promise<ProfilePayload> {
    const patientId = asString(input.identity.csv_patient_uuid);
    if (!patientId) {
      throw new Error("identity did not include csv_patient_uuid");
    }

    const basePath = `by_patient/${patientId}/csv`;
    const [
      patientRows,
      encounterRows,
      providerRows,
      organizationRows,
      payerRows,
      allergyRows,
      medicationRows,
      conditionRows,
      observationRows,
      imagingRows,
      procedureRows,
    ] = await Promise.all([
      this.dataset.readOptionalCsv(`${basePath}/patients.csv`),
      this.dataset.readOptionalCsv(`${basePath}/encounters.csv`),
      this.dataset.readOptionalCsv(`${basePath}/providers.csv`),
      this.dataset.readOptionalCsv(`${basePath}/organizations.csv`),
      this.dataset.readOptionalCsv(`${basePath}/payers.csv`),
      this.dataset.readOptionalCsv(`${basePath}/allergies.csv`),
      this.dataset.readOptionalCsv(`${basePath}/medications.csv`),
      this.dataset.readOptionalCsv(`${basePath}/conditions.csv`),
      this.dataset.readOptionalCsv(`${basePath}/observations.csv`),
      this.dataset.readOptionalCsv(`${basePath}/imaging_studies.csv`),
      this.dataset.readOptionalCsv(`${basePath}/procedures.csv`),
    ]);

    const patientRow =
      patientRows.find((row) => lower(row.Id) === lower(patientId)) ?? patientRows[0] ?? {};

    const providerById = new Map(providerRows.map((row) => [asString(row.Id), row]));
    const organizationById = new Map(organizationRows.map((row) => [asString(row.Id), row]));
    const payerById = new Map(payerRows.map((row) => [asString(row.Id), row]));

    const encounterCounts = new Map<string, number>();
    const organizationCounts = new Map<string, number>();
    let latestPayerId = "";

    for (const row of encounterRows) {
      const providerId = asString(row.PROVIDER);
      const organizationId = asString(row.ORGANIZATION);
      const payerId = asString(row.PAYER);
      if (providerId) {
        encounterCounts.set(providerId, (encounterCounts.get(providerId) ?? 0) + 1);
      }
      if (organizationId) {
        organizationCounts.set(organizationId, (organizationCounts.get(organizationId) ?? 0) + 1);
      }
      if (payerId) {
        latestPayerId = payerId;
      }
    }

    const topProviderId =
      Array.from(encounterCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const topOrganizationId =
      Array.from(organizationCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const allergies = allergyRows.map((row) => ({
      allergen: asString(row.DESCRIPTION) || "Allergy",
      reaction: null,
      status: "CONFIRMED",
      recorded_at: parseDateTime(row.START),
    }));

    const medications = medicationRows.map((row) => ({
      name: asString(row.DESCRIPTION) || "Medication",
      dosage: "unknown",
      frequency: "unknown",
      indication: asString(row.REASONDESCRIPTION) || null,
      prescribed_at: parseDateTime(row.START),
    }));

    const diagnoses = conditionRows.map((row) => ({
      condition: asString(row.DESCRIPTION) || "Condition",
      icd_code: asString(row.CODE) || null,
      date_diagnosed: toIsoDate(parseDateTime(row.START)),
      status: asString(row.STOP) ? "resolved" : "active",
    }));

    const vitalsByDate = new Map<string, JsonObject>();
    const labResults: JsonObject[] = [];

    for (const row of observationRows) {
      const description = asString(row.DESCRIPTION) || "Observation";
      const measurementDate = parseDateTime(row.DATE);
      const vitalField = this.vitalsField(description);
      if (vitalField) {
        const key = measurementDate ?? "unknown";
        const current = vitalsByDate.get(key) ?? {
          measurement_date: measurementDate,
        };
        const numeric =
          vitalField === "heart_rate" ||
          vitalField === "blood_pressure_systolic" ||
          vitalField === "blood_pressure_diastolic"
            ? parseInteger(row.VALUE)
            : parseNumber(row.VALUE);
        if (numeric != null) {
          current[vitalField] = numeric;
        }
        vitalsByDate.set(key, current);
      } else {
        labResults.push({
          test_name: description,
          result: asString(row.VALUE),
          unit: asString(row.UNITS),
          reference_range: "",
          flagged: false,
          date_performed: toIsoDate(measurementDate),
        });
      }
    }

    const imagingStudies = imagingRows.map((row) => ({
      study_type: asString(row.MODALITY_DESCRIPTION) || "Imaging Study",
      body_part: asString(row.BODYSITE_DESCRIPTION) || "Unknown",
      findings: asString(row.SOP_DESCRIPTION),
      impression: asString(row.SOP_DESCRIPTION),
      date_performed: toIsoDate(parseDateTime(row.DATE)) ?? "1900-01-01",
      radiologist: null,
    }));

    const diagnosticTests = procedureRows.map((row) => ({
      test_type: asString(row.DESCRIPTION) || "Procedure",
      date_performed: toIsoDate(parseDateTime(row.DATE)) ?? "1900-01-01",
      findings: asString(row.DESCRIPTION),
      interpretation: asString(row.REASONDESCRIPTION),
      ordered_by: null,
    }));

    const patientPayload: JsonObject = {
      patient_id: patientId,
      medical_record_number: asString(input.identity.medical_record_number) || patientId,
      first_name: asString(patientRow.FIRST) || asString(input.identity.first_name),
      last_name: asString(patientRow.LAST) || asString(input.identity.last_name),
      date_of_birth:
        asString(patientRow.BIRTHDATE) || asString(input.identity.date_of_birth) || "1900-01-01",
      gender: asString(patientRow.GENDER) || asString(input.identity.gender) || "OTHER",
      contact_info: {
        phone: "",
        address: asString(patientRow.ADDRESS),
        emergency_contact_name: "",
        emergency_contact_relation: "",
        emergency_contact_phone: "",
      },
      insurance: {
        provider: asString((payerById.get(latestPayerId) ?? {}).NAME) || "unknown",
        plan_type: "unknown",
      },
      allergies,
      current_medications: medications,
      diagnoses,
      clinical_notes: [],
      lab_results: labResults,
      imaging_studies: imagingStudies,
      diagnostic_tests: diagnosticTests,
      primary_care_physician: asString((providerById.get(topProviderId) ?? {}).NAME) || null,
      hospital: asString((organizationById.get(topOrganizationId) ?? {}).NAME) || null,
      admission_date: toIsoDate(parseDateTime(encounterRows[0]?.START)),
      patient_signature: null,
      signature_date: null,
      vital_signs: Array.from(vitalsByDate.values()),
    };

    return {
      identity: input.identity,
      patient: patientPayload,
      source_counts: {
        encounters: encounterRows.length,
        allergies_csv: allergyRows.length,
        medications_csv: medicationRows.length,
        conditions_csv: conditionRows.length,
        observations_csv: observationRows.length,
        lab_results_total: labResults.length,
        imaging_total: imagingStudies.length,
        diagnostic_tests_total: diagnosticTests.length,
      },
    };
  }
}

class TemporalEvolutionStage implements PipelineStage<TemporalStageInput, TemporalPayload> {
  readonly name = "temporal_evolution_agent";

  private eventIndex = 0;

  constructor(private readonly dataset: DatasetAccessor) {}

  private nextEventId(): string {
    this.eventIndex += 1;
    return `ev_${String(this.eventIndex).padStart(6, "0")}`;
  }

  private event(input: {
    category: string;
    subtype: string;
    source_dataset: string;
    source_file: string;
    time_start: string | null;
    time_end?: string | null;
    description?: string | null;
    code?: string | null;
    value?: string | null;
    unit?: string | null;
    flagged_abnormal?: boolean;
    context?: JsonObject;
  }): TimelineEvent {
    return {
      event_id: this.nextEventId(),
      category: input.category,
      subtype: input.subtype,
      source_dataset: input.source_dataset,
      source_file: input.source_file,
      time_start: input.time_start,
      time_end: input.time_end ?? null,
      description: input.description ?? null,
      code: input.code ?? null,
      value: input.value ?? null,
      unit: input.unit ?? null,
      flagged_abnormal: input.flagged_abnormal ?? false,
      context: input.context ?? {},
    };
  }

  private rowsForPatient(rows: CsvRow[], patientId: string): CsvRow[] {
    if (rows.length === 0) {
      return rows;
    }
    if (!("PATIENT" in rows[0])) {
      return rows;
    }
    return rows.filter((row) => lower(row.PATIENT) === lower(patientId));
  }

  private buildCsvEvents(patientId: string, files: Record<string, CsvRow[]>): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const row of this.rowsForPatient(files.encounters, patientId)) {
      const start = parseDateTime(row.START);
      const stop = parseDateTime(row.STOP);
      const encounterId = asString(row.Id) || null;
      const description = asString(row.DESCRIPTION) || "Encounter";
      const code = asString(row.CODE) || null;

      events.push(
        this.event({
          category: "admission_discharge",
          subtype: "encounter_cycle",
          source_dataset: "csv",
          source_file: `by_patient/${patientId}/csv/encounters.csv`,
          time_start: start,
          time_end: stop,
          description,
          code,
          context: {
            encounter_id: encounterId,
            encounter_class: asString(row.ENCOUNTERCLASS) || null,
            provider_id: asString(row.PROVIDER) || null,
            organization_id: asString(row.ORGANIZATION) || null,
            payer_id: asString(row.PAYER) || null,
            reason: asString(row.REASONDESCRIPTION) || null,
          },
        }),
      );

      if (start) {
        events.push(
          this.event({
            category: "admission_discharge",
            subtype: "admission",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/encounters.csv`,
            time_start: start,
            description,
            code,
            context: { encounter_id: encounterId },
          }),
        );
      }

      if (stop) {
        events.push(
          this.event({
            category: "admission_discharge",
            subtype: "discharge",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/encounters.csv`,
            time_start: stop,
            description,
            code,
            context: { encounter_id: encounterId },
          }),
        );
      }
    }

    for (const row of this.rowsForPatient(files.conditions, patientId)) {
      const start = parseDateTime(row.START);
      const stop = parseDateTime(row.STOP);
      const description = asString(row.DESCRIPTION) || "Condition";
      const code = asString(row.CODE) || null;
      const encounterId = asString(row.ENCOUNTER) || null;

      if (start) {
        events.push(
          this.event({
            category: "diagnosis_onset",
            subtype: "diagnosis_start",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/conditions.csv`,
            time_start: start,
            description,
            code,
            context: { encounter_id: encounterId },
          }),
        );
      }

      if (stop) {
        events.push(
          this.event({
            category: "diagnosis_onset",
            subtype: "diagnosis_resolved",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/conditions.csv`,
            time_start: stop,
            description,
            code,
            context: { encounter_id: encounterId },
          }),
        );
      }
    }

    const medicationStartsByName = new Map<string, string[]>();
    for (const row of this.rowsForPatient(files.medications, patientId)) {
      const start = parseDateTime(row.START);
      const stop = parseDateTime(row.STOP);
      const description = asString(row.DESCRIPTION) || "Medication";
      const code = asString(row.CODE) || null;
      const context = {
        reason: asString(row.REASONDESCRIPTION) || null,
        encounter_id: asString(row.ENCOUNTER) || null,
      };

      if (start) {
        events.push(
          this.event({
            category: "treatment_change",
            subtype: "medication_start",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/medications.csv`,
            time_start: start,
            description,
            code,
            context,
          }),
        );
        const key = description.toLocaleLowerCase();
        const starts = medicationStartsByName.get(key) ?? [];
        starts.push(start);
        medicationStartsByName.set(key, starts);
      }

      if (stop) {
        events.push(
          this.event({
            category: "treatment_change",
            subtype: "medication_stop",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/medications.csv`,
            time_start: stop,
            description,
            code,
            context,
          }),
        );
      }
    }

    for (const [name, starts] of medicationStartsByName.entries()) {
      if (starts.length > 1) {
        const sorted = [...starts].sort();
        events.push(
          this.event({
            category: "treatment_change",
            subtype: "medication_restart_or_change",
            source_dataset: "csv",
            source_file: `by_patient/${patientId}/csv/medications.csv`,
            time_start: sorted[sorted.length - 1],
            description: name,
            context: { starts_observed: starts.length },
          }),
        );
      }
    }

    for (const row of this.rowsForPatient(files.observations, patientId)) {
      events.push(
        this.event({
          category: "lab_trend",
          subtype: "observation",
          source_dataset: "csv",
          source_file: `by_patient/${patientId}/csv/observations.csv`,
          time_start: parseDateTime(row.DATE),
          description: asString(row.DESCRIPTION) || "Observation",
          code: asString(row.CODE) || null,
          value: asString(row.VALUE) || null,
          unit: asString(row.UNITS) || null,
          context: {
            encounter_id: asString(row.ENCOUNTER) || null,
            type: asString(row.TYPE) || null,
          },
        }),
      );
    }

    for (const row of this.rowsForPatient(files.procedures, patientId)) {
      events.push(
        this.event({
          category: "treatment_change",
          subtype: "procedure",
          source_dataset: "csv",
          source_file: `by_patient/${patientId}/csv/procedures.csv`,
          time_start: parseDateTime(row.DATE),
          description: asString(row.DESCRIPTION) || "Procedure",
          code: asString(row.CODE) || null,
          context: {
            reason: asString(row.REASONDESCRIPTION) || null,
            encounter_id: asString(row.ENCOUNTER) || null,
          },
        }),
      );
    }

    for (const row of this.rowsForPatient(files.careplans, patientId)) {
      events.push(
        this.event({
          category: "treatment_change",
          subtype: "careplan_cycle",
          source_dataset: "csv",
          source_file: `by_patient/${patientId}/csv/careplans.csv`,
          time_start: parseDateTime(row.START),
          time_end: parseDateTime(row.STOP),
          description: asString(row.DESCRIPTION) || "Care Plan",
          code: asString(row.CODE) || null,
        }),
      );
    }

    for (const row of this.rowsForPatient(files.immunizations, patientId)) {
      events.push(
        this.event({
          category: "treatment_change",
          subtype: "immunization",
          source_dataset: "csv",
          source_file: `by_patient/${patientId}/csv/immunizations.csv`,
          time_start: parseDateTime(row.DATE),
          description: asString(row.DESCRIPTION) || "Immunization",
          code: asString(row.CODE) || null,
        }),
      );
    }

    return events;
  }

  private fhirTimes(resource: JsonObject): Array<{ label: string; start: string | null; end: string | null }> {
    const out: Array<{ label: string; start: string | null; end: string | null }> = [];

    const maybePush = (label: string, start: unknown, end?: unknown) => {
      const startIso = parseDateTime(start);
      const endIso = parseDateTime(end);
      if (startIso || endIso) {
        out.push({ label, start: startIso, end: endIso });
      }
    };

    maybePush("effectiveDateTime", resource.effectiveDateTime);
    maybePush("issued", resource.issued);
    maybePush("recordedDate", resource.recordedDate);
    maybePush("onsetDateTime", resource.onsetDateTime);

    if (resource.onsetPeriod && typeof resource.onsetPeriod === "object") {
      const period = resource.onsetPeriod as JsonObject;
      maybePush("onsetPeriod", period.start, period.end);
    }

    if (resource.period && typeof resource.period === "object") {
      const period = resource.period as JsonObject;
      maybePush("period", period.start, period.end);
    }

    maybePush("performedDateTime", resource.performedDateTime);

    if (resource.performedPeriod && typeof resource.performedPeriod === "object") {
      const period = resource.performedPeriod as JsonObject;
      maybePush("performedPeriod", period.start, period.end);
    }

    maybePush("authoredOn", resource.authoredOn);

    return out;
  }

  private extractFhirEvents(
    patientId: string,
    datasetType: "fhir" | "fhir_stu3" | "fhir_dstu2",
    bundle: JsonObject,
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const entries = Array.isArray(bundle.entry) ? bundle.entry : [];

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const resource = (entry as JsonObject).resource;
      if (!resource || typeof resource !== "object") {
        continue;
      }

      const resourceObj = resource as JsonObject;
      const resourceType = asString(resourceObj.resourceType) || "Resource";
      const resourceId = asString(resourceObj.id) || null;

      const codeObj =
        resourceObj.code && typeof resourceObj.code === "object"
          ? (resourceObj.code as JsonObject)
          : {};
      const coding = Array.isArray(codeObj.coding) ? (codeObj.coding[0] as JsonObject) : {};
      const code = asString(coding?.code) || null;
      const display =
        asString(codeObj.text) ||
        asString(coding?.display) ||
        asString(resourceObj.description) ||
        resourceType;

      let category = "clinical_context_time";
      let subtype = `${resourceType.toLocaleLowerCase()}_time`;

      if (resourceType === "Condition") {
        category = "diagnosis_onset";
        subtype = "condition_event";
      } else if (
        resourceType === "MedicationRequest" ||
        resourceType === "MedicationStatement" ||
        resourceType === "MedicationAdministration"
      ) {
        category = "treatment_change";
        subtype = "medication_event";
      } else if (
        resourceType === "Procedure" ||
        resourceType === "CarePlan" ||
        resourceType === "ServiceRequest"
      ) {
        category = "treatment_change";
        subtype = `${resourceType.toLocaleLowerCase()}_event`;
      } else if (resourceType === "Encounter") {
        category = "admission_discharge";
        subtype = "encounter_cycle";
      } else if (resourceType === "Observation") {
        category = "lab_trend";
        subtype = "observation";
      }

      let flaggedAbnormal = false;
      if (resourceType === "Observation" && Array.isArray(resourceObj.interpretation)) {
        for (const interpretation of resourceObj.interpretation) {
          const codingList =
            interpretation && typeof interpretation === "object" && Array.isArray((interpretation as JsonObject).coding)
              ? ((interpretation as JsonObject).coding as JsonObject[])
              : [];
          for (const codingEntry of codingList) {
            const abnormalCode = asString(codingEntry.code).toLocaleUpperCase();
            if (["H", "HH", "L", "LL", "A", "AA"].includes(abnormalCode)) {
              flaggedAbnormal = true;
            }
          }
        }
      }

      let value: string | null = null;
      let unit: string | null = null;
      if (resourceType === "Observation") {
        const quantity =
          resourceObj.valueQuantity && typeof resourceObj.valueQuantity === "object"
            ? (resourceObj.valueQuantity as JsonObject)
            : null;
        if (quantity) {
          value = asString(quantity.value) || null;
          unit = asString(quantity.unit) || null;
        } else if (resourceObj.valueString != null) {
          value = asString(resourceObj.valueString) || null;
        }
      }

      for (const point of this.fhirTimes(resourceObj)) {
        events.push(
          this.event({
            category,
            subtype: `${subtype}:${point.label}`,
            source_dataset: datasetType,
            source_file: `by_patient/${patientId}/docs/${datasetType}.json`,
            time_start: point.start ?? point.end,
            time_end: point.start ? point.end : null,
            description: display,
            code,
            value,
            unit,
            flagged_abnormal: flaggedAbnormal,
            context: {
              resource_type: resourceType,
              resource_id: resourceId,
            },
          }),
        );
      }
    }

    return events;
  }

  private extractCcdaEvents(patientId: string, xmlText: string): TimelineEvent[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    if (!doc) {
      return [];
    }

    const events: TimelineEvent[] = [];
    const targetTags = new Set(["effectivetime", "low", "high", "time"]);
    const clinicalContextTags = new Set([
      "encounter",
      "observation",
      "procedure",
      "substanceadministration",
      "act",
      "organizer",
    ]);

    const all = Array.from(doc.getElementsByTagName("*"));
    for (const node of all) {
      const tag = localTagName(node);
      if (!targetTags.has(tag)) {
        continue;
      }

      const rawTime = asString(node.getAttribute("value") ?? node.textContent);
      const parsedTime = parseDateTime(rawTime);
      if (!parsedTime) {
        continue;
      }

      let current: Element | null = node;
      let contextNode: Element | null = null;
      let sectionTitle: string | null = null;

      while (current) {
        const local = localTagName(current);
        if (!contextNode && clinicalContextTags.has(local)) {
          contextNode = current;
        }
        if (!sectionTitle && local === "section") {
          sectionTitle = asString(firstChildByLocalName(current, "title")?.textContent) || null;
        }
        current = current.parentElement;
      }

      const codeNode = firstChildByLocalName(contextNode, "code");
      const code = asString(codeNode?.getAttribute("code")) || null;
      const display = asString(codeNode?.getAttribute("displayName")) || null;

      let subtype = "ccda_time";
      if (tag === "low") {
        subtype = "ccda_period_start";
      } else if (tag === "high") {
        subtype = "ccda_period_end";
      } else if (tag === "effectivetime") {
        subtype = "ccda_effective_time";
      }

      events.push(
        this.event({
          category: "clinical_context_time",
          subtype,
          source_dataset: "ccda",
          source_file: `by_patient/${patientId}/docs/ccda.xml`,
          time_start: parsedTime,
          description: display || localTagName(contextNode) || "C-CDA time point",
          code,
          context: {
            section_title: sectionTitle,
            context_tag: localTagName(contextNode),
            time_tag: tag,
            raw_time: rawTime,
          },
        }),
      );
    }

    return events;
  }

  private abnormalLabEpisodes(timeline: TimelineEvent[]): JsonObject[] {
    const grouped = new Map<string, TimelineEvent[]>();

    for (const event of timeline) {
      if (event.category !== "lab_trend" || !event.time_start) {
        continue;
      }
      const key = lower(event.description) || "unknown";
      const items = grouped.get(key) ?? [];
      items.push(event);
      grouped.set(key, items);
    }

    const episodes: JsonObject[] = [];

    for (const items of grouped.values()) {
      items.sort((a, b) => asString(a.time_start).localeCompare(asString(b.time_start)));

      const abnormalItems = items.filter((event) => event.flagged_abnormal);
      if (abnormalItems.length > 0) {
        episodes.push({
          episode_type: "abnormal_lab_flag",
          test_name: items[0]?.description ?? "Lab",
          time_start: abnormalItems[0]?.time_start ?? null,
          time_end: abnormalItems[abnormalItems.length - 1]?.time_start ?? null,
          event_ids: abnormalItems.map((event) => asString(event.event_id)).filter(Boolean),
          details: { flags_count: abnormalItems.length },
        });
      }

      const numeric = items
        .map((event) => ({
          time_start: asString(event.time_start),
          value: parseNumber(event.value),
          event_id: asString(event.event_id),
        }))
        .filter((item) => item.time_start && item.value != null) as Array<{
        time_start: string;
        value: number;
        event_id: string;
      }>;

      if (numeric.length >= 3 && numeric[0].value !== 0) {
        const changeRatio = (numeric[numeric.length - 1].value - numeric[0].value) / Math.abs(numeric[0].value);
        if (Math.abs(changeRatio) >= 0.2) {
          episodes.push({
            episode_type: "abnormal_lab_trend",
            test_name: items[0]?.description ?? "Lab",
            time_start: numeric[0].time_start,
            time_end: numeric[numeric.length - 1].time_start,
            event_ids: items.map((event) => asString(event.event_id)).filter(Boolean),
            details: {
              trend: changeRatio > 0 ? "increasing" : "decreasing",
              relative_change: Number(changeRatio.toFixed(3)),
              points: numeric.length,
            },
          });
        }
      }
    }

    return episodes;
  }

  private buildEpisodes(timeline: TimelineEvent[]): Record<string, JsonObject[]> {
    const diagnosisOnset = timeline
      .filter(
        (event) =>
          event.category === "diagnosis_onset" && asString(event.subtype).toLocaleLowerCase().includes("start"),
      )
      .map((event) => ({
        episode_type: "diagnosis_onset",
        time_start: event.time_start,
        description: event.description,
        code: event.code,
        event_ids: [event.event_id].filter(Boolean),
      }));

    const treatmentChange = timeline
      .filter((event) => {
        const subtype = asString(event.subtype).toLocaleLowerCase();
        return (
          event.category === "treatment_change" &&
          ["start", "stop", "change", "restart", "procedure", "careplan"].some((key) => subtype.includes(key))
        );
      })
      .map((event) => ({
        episode_type: "treatment_change",
        time_start: event.time_start,
        time_end: event.time_end,
        description: event.description,
        subtype: event.subtype,
        event_ids: [event.event_id].filter(Boolean),
      }));

    const admissionDischargeCycles = timeline
      .filter(
        (event) =>
          event.category === "admission_discharge" &&
          asString(event.subtype).toLocaleLowerCase().includes("cycle"),
      )
      .map((event) => ({
        episode_type: "admission_discharge_cycle",
        time_start: event.time_start,
        time_end: event.time_end,
        description: event.description,
        source_dataset: event.source_dataset,
        event_ids: [event.event_id].filter(Boolean),
      }));

    return {
      diagnosis_onset: diagnosisOnset,
      treatment_change: treatmentChange,
      abnormal_lab_trend: this.abnormalLabEpisodes(timeline),
      admission_discharge_cycles: admissionDischargeCycles,
    };
  }

  async run(input: TemporalStageInput): Promise<TemporalPayload> {
    this.eventIndex = 0;

    const patientId = asString(input.identity.csv_patient_uuid);
    if (!patientId) {
      throw new Error("identity did not include csv_patient_uuid");
    }

    const basePath = `by_patient/${patientId}/csv`;
    const [encounters, conditions, medications, observations, procedures, careplans, immunizations] =
      await Promise.all([
        this.dataset.readOptionalCsv(`${basePath}/encounters.csv`),
        this.dataset.readOptionalCsv(`${basePath}/conditions.csv`),
        this.dataset.readOptionalCsv(`${basePath}/medications.csv`),
        this.dataset.readOptionalCsv(`${basePath}/observations.csv`),
        this.dataset.readOptionalCsv(`${basePath}/procedures.csv`),
        this.dataset.readOptionalCsv(`${basePath}/careplans.csv`),
        this.dataset.readOptionalCsv(`${basePath}/immunizations.csv`),
      ]);

    const csvEvents = this.buildCsvEvents(patientId, {
      encounters,
      conditions,
      medications,
      observations,
      procedures,
      careplans,
      immunizations,
    });

    const [fhir, fhirStu3, fhirDstu2, ccda] = await Promise.all([
      this.dataset.readJson(`by_patient/${patientId}/docs/fhir.json`),
      this.dataset.readJson(`by_patient/${patientId}/docs/fhir_stu3.json`),
      this.dataset.readJson(`by_patient/${patientId}/docs/fhir_dstu2.json`),
      this.dataset.readText(`by_patient/${patientId}/docs/ccda.xml`),
    ]);

    const fhirEvents = [
      ...(fhir ? this.extractFhirEvents(patientId, "fhir", fhir) : []),
      ...(fhirStu3 ? this.extractFhirEvents(patientId, "fhir_stu3", fhirStu3) : []),
      ...(fhirDstu2 ? this.extractFhirEvents(patientId, "fhir_dstu2", fhirDstu2) : []),
    ];

    const ccdaEvents = ccda ? this.extractCcdaEvents(patientId, ccda) : [];

    const timeline = [...csvEvents, ...fhirEvents, ...ccdaEvents]
      .filter((event) => event.time_start)
      .sort((a, b) => {
        const ta = asString(a.time_start);
        const tb = asString(b.time_start);
        if (ta === tb) {
          return asString(a.event_id).localeCompare(asString(b.event_id));
        }
        return ta.localeCompare(tb);
      });

    const episodes = this.buildEpisodes(timeline);

    return {
      identity: input.identity,
      timeline,
      episodes,
      source_counts: {
        csv_events: csvEvents.length,
        fhir_events: fhirEvents.length,
        ccda_events: ccdaEvents.length,
        timeline_total: timeline.length,
        diagnosis_onset_episodes: episodes.diagnosis_onset.length,
        treatment_change_episodes: episodes.treatment_change.length,
        abnormal_lab_trend_episodes: episodes.abnormal_lab_trend.length,
        admission_discharge_cycle_episodes: episodes.admission_discharge_cycles.length,
      },
    };
  }
}

class ContextFusionStage implements PipelineStage<ContextStageInput, ContextPayload> {
  readonly name = "context_fusion_agent";

  constructor(private readonly dataset: DatasetAccessor) {}

  private async buildIndexes(patientId: string): Promise<{
    encounters: Map<string, CsvRow>;
    providers: Map<string, CsvRow>;
    organizations: Map<string, CsvRow>;
    conditions: Array<{ description: string; code: string | null; start: string | null; stop: string | null; encounter_id: string | null }>;
    medications: Array<{ description: string; code: string | null; start: string | null; stop: string | null; encounter_id: string | null }>;
    labs: Array<{ description: string; code: string | null; date: string | null; value: string | null; units: string | null; encounter_id: string | null }>;
    procedures: Array<{ description: string; code: string | null; date: string | null; encounter_id: string | null }>;
  }> {
    const basePath = `by_patient/${patientId}/csv`;
    const [encounters, providers, organizations, conditions, medications, observations, procedures] =
      await Promise.all([
        this.dataset.readOptionalCsv(`${basePath}/encounters.csv`),
        this.dataset.readOptionalCsv(`${basePath}/providers.csv`),
        this.dataset.readOptionalCsv(`${basePath}/organizations.csv`),
        this.dataset.readOptionalCsv(`${basePath}/conditions.csv`),
        this.dataset.readOptionalCsv(`${basePath}/medications.csv`),
        this.dataset.readOptionalCsv(`${basePath}/observations.csv`),
        this.dataset.readOptionalCsv(`${basePath}/procedures.csv`),
      ]);

    const encounterMap = new Map<string, CsvRow>();
    for (const row of encounters) {
      if (lower(row.PATIENT) !== lower(patientId)) {
        continue;
      }
      const id = asString(row.Id);
      if (id) {
        encounterMap.set(id, row);
      }
    }

    return {
      encounters: encounterMap,
      providers: new Map(providers.map((row) => [asString(row.Id), row])),
      organizations: new Map(organizations.map((row) => [asString(row.Id), row])),
      conditions: conditions
        .filter((row) => lower(row.PATIENT) === lower(patientId))
        .map((row) => ({
          description: asString(row.DESCRIPTION) || "Condition",
          code: asString(row.CODE) || null,
          start: parseDateTime(row.START),
          stop: parseDateTime(row.STOP),
          encounter_id: asString(row.ENCOUNTER) || null,
        })),
      medications: medications
        .filter((row) => lower(row.PATIENT) === lower(patientId))
        .map((row) => ({
          description: asString(row.DESCRIPTION) || "Medication",
          code: asString(row.CODE) || null,
          start: parseDateTime(row.START),
          stop: parseDateTime(row.STOP),
          encounter_id: asString(row.ENCOUNTER) || null,
        })),
      labs: observations
        .filter((row) => lower(row.PATIENT) === lower(patientId))
        .map((row) => ({
          description: asString(row.DESCRIPTION) || "Observation",
          code: asString(row.CODE) || null,
          date: parseDateTime(row.DATE),
          value: asString(row.VALUE) || null,
          units: asString(row.UNITS) || null,
          encounter_id: asString(row.ENCOUNTER) || null,
        })),
      procedures: procedures
        .filter((row) => lower(row.PATIENT) === lower(patientId))
        .map((row) => ({
          description: asString(row.DESCRIPTION) || "Procedure",
          code: asString(row.CODE) || null,
          date: parseDateTime(row.DATE),
          encounter_id: asString(row.ENCOUNTER) || null,
        })),
    };
  }

  private encounterForEvent(
    event: TimelineEvent,
    indexes: Awaited<ReturnType<ContextFusionStage["buildIndexes"]>>,
  ): CsvRow | null {
    const eventContext = (event.context ?? {}) as JsonObject;
    const eventEncounterId = asString(eventContext.encounter_id);
    if (eventEncounterId && indexes.encounters.has(eventEncounterId)) {
      return indexes.encounters.get(eventEncounterId) ?? null;
    }

    const eventTime = parseDateTime(event.time_start);
    if (!eventTime) {
      return null;
    }

    const eventTimestamp = Date.parse(eventTime);
    let nearest: CsvRow | null = null;
    let nearestDelta: number | null = null;

    for (const encounter of indexes.encounters.values()) {
      const start = parseDateTime(encounter.START);
      const stop = parseDateTime(encounter.STOP);
      if (start && stop) {
        const startTs = Date.parse(start);
        const stopTs = Date.parse(stop);
        if (eventTimestamp >= startTs && eventTimestamp <= stopTs) {
          return encounter;
        }
      }

      if (start) {
        const delta = Math.abs(eventTimestamp - Date.parse(start));
        if (nearestDelta == null || delta < nearestDelta) {
          nearestDelta = delta;
          nearest = encounter;
        }
      }
    }

    return nearest;
  }

  private activeInWindow(start: string | null, stop: string | null, target: string | null): boolean {
    if (!start || !target) {
      return false;
    }
    const targetTs = Date.parse(target);
    const startTs = Date.parse(start);
    const stopTs = stop ? Date.parse(stop) : null;
    if (targetTs < startTs) {
      return false;
    }
    if (stopTs != null && targetTs > stopTs) {
      return false;
    }
    return true;
  }

  private nearby(source: string | null, target: string | null, days: number): boolean {
    if (!source || !target) {
      return false;
    }
    const delta = Math.abs(Date.parse(source) - Date.parse(target));
    return delta <= days * 24 * 60 * 60 * 1000;
  }

  async run(input: ContextStageInput): Promise<ContextPayload> {
    const patientId = asString(input.identity.csv_patient_uuid);
    if (!patientId) {
      throw new Error("identity did not include csv_patient_uuid");
    }

    const indexes = await this.buildIndexes(patientId);
    const fused: TimelineEvent[] = [];

    for (const event of input.temporal.timeline ?? []) {
      const eventTime = parseDateTime(event.time_start);
      const encounter = this.encounterForEvent(event, indexes);
      const encounterId = asString(encounter?.Id) || null;
      const providerId = asString(encounter?.PROVIDER);
      const organizationId = asString(encounter?.ORGANIZATION);

      const relatedDiagnosis = indexes.conditions
        .filter(
          (item) =>
            this.activeInWindow(item.start, item.stop, eventTime) ||
            (encounterId && item.encounter_id === encounterId),
        )
        .slice(0, 6)
        .map((item) => ({ condition: item.description, code: item.code }));

      const relatedMedication = indexes.medications
        .filter(
          (item) =>
            this.activeInWindow(item.start, item.stop, eventTime) ||
            (encounterId && item.encounter_id === encounterId),
        )
        .slice(0, 6)
        .map((item) => ({ medication: item.description, code: item.code }));

      const relatedLab = indexes.labs
        .filter(
          (item) =>
            (encounterId && item.encounter_id === encounterId) || this.nearby(item.date, eventTime, 7),
        )
        .slice(0, 8)
        .map((item) => ({
          lab: item.description,
          code: item.code,
          value: item.value,
          units: item.units,
        }));

      const relatedProcedure = indexes.procedures
        .filter(
          (item) =>
            (encounterId && item.encounter_id === encounterId) || this.nearby(item.date, eventTime, 7),
        )
        .slice(0, 6)
        .map((item) => ({ procedure: item.description, code: item.code }));

      fused.push({
        ...event,
        clinical_context: {
          encounter_id: encounterId,
          encounter_class: asString(encounter?.ENCOUNTERCLASS) || null,
          provider: asString(indexes.providers.get(providerId)?.NAME) || null,
          facility: asString(indexes.organizations.get(organizationId)?.NAME) || null,
          reason_code: asString(encounter?.REASONCODE) || null,
          reason_description: asString(encounter?.REASONDESCRIPTION) || null,
          related_diagnosis: relatedDiagnosis,
          related_medication: relatedMedication,
          related_lab: relatedLab,
          related_procedure: relatedProcedure,
        },
        provenance: {
          source_file: event.source_file,
          source_type: event.source_dataset,
          event_id: event.event_id,
          row_or_resource_id:
            asString((event.context ?? ({} as JsonObject)).resource_id) ||
            asString((event.context ?? ({} as JsonObject)).encounter_id) ||
            null,
          resource_type: asString((event.context ?? ({} as JsonObject)).resource_type) || null,
        },
      });
    }

    return {
      identity: input.identity,
      timeline: fused,
      episodes: input.temporal.episodes ?? {},
      source_counts: {
        input_timeline_events: (input.temporal.timeline ?? []).length,
        fused_timeline_events: fused.length,
      },
    };
  }
}

class NarrativeGeneratorStage implements PipelineStage<NarrativeStageInput, NarrativePayload> {
  readonly name = "narrative_agent";

  constructor(
    private readonly options: Required<
      Pick<
        PatientEvolutionPipelineOptions,
        "fetchFn" | "lovableApiKey" | "aiGatewayUrl" | "aiModel" | "now"
      >
    >,
  ) {}

  private baselineProfile(patient: JsonObject): string {
    const firstName = asString(patient.first_name);
    const lastName = asString(patient.last_name);
    const name = `${firstName} ${lastName}`.trim();
    const diagnoses = Array.isArray(patient.diagnoses) ? patient.diagnoses : [];
    const medications = Array.isArray(patient.current_medications) ? patient.current_medications : [];
    const allergies = Array.isArray(patient.allergies) ? patient.allergies : [];
    const insurance =
      patient.insurance && typeof patient.insurance === "object" ? (patient.insurance as JsonObject) : {};

    return (
      `Patient ${name || "Unknown"} (patient_id: ${asString(patient.patient_id) || "unknown"}, ` +
      `MRN: ${asString(patient.medical_record_number) || "unknown"}), DOB ${asString(patient.date_of_birth) || "unknown"}, ` +
      `gender ${asString(patient.gender) || "OTHER"}. Primary physician: ${asString(patient.primary_care_physician) || "not documented"}. ` +
      `Main facility: ${asString(patient.hospital) || "not documented"}. ` +
      `Insurance: ${asString(insurance.provider) || "unknown"} (${asString(insurance.plan_type) || "unknown"}). ` +
      `Current burden includes ${diagnoses.length} diagnoses, ${medications.length} medications, and ${allergies.length} documented allergies.`
    );
  }

  private evolutionByCondition(timeline: TimelineEvent[]): string[] {
    const grouped = new Map<string, TimelineEvent[]>();

    for (const event of timeline) {
      const clinicalContext =
        event.clinical_context && typeof event.clinical_context === "object"
          ? (event.clinical_context as JsonObject)
          : {};
      const relatedDiagnosis = Array.isArray(clinicalContext.related_diagnosis)
        ? (clinicalContext.related_diagnosis as JsonObject[])
        : [];

      for (const diagnosis of relatedDiagnosis) {
        const key = asString(diagnosis.condition) || "Unknown condition";
        const existing = grouped.get(key) ?? [];
        existing.push(event);
        grouped.set(key, existing);
      }

      if (event.category === "diagnosis_onset") {
        const key = asString(event.description) || "Unknown condition";
        const existing = grouped.get(key) ?? [];
        existing.push(event);
        grouped.set(key, existing);
      }
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
      .flatMap(([condition, events]) => {
        const dated = events.filter((event) => event.time_start).sort((a, b) => asString(a.time_start).localeCompare(asString(b.time_start)));
        if (dated.length === 0) {
          return [];
        }

        const medications = new Set<string>();
        const labs = new Set<string>();
        for (const event of dated) {
          const context =
            event.clinical_context && typeof event.clinical_context === "object"
              ? (event.clinical_context as JsonObject)
              : {};
          const relatedMedication = Array.isArray(context.related_medication)
            ? (context.related_medication as JsonObject[])
            : [];
          const relatedLab = Array.isArray(context.related_lab) ? (context.related_lab as JsonObject[]) : [];

          for (const medication of relatedMedication) {
            const name = asString(medication.medication);
            if (name) {
              medications.add(name);
            }
          }

          for (const lab of relatedLab) {
            const name = asString(lab.lab);
            if (name) {
              labs.add(name);
            }
          }
        }

        return [
          `${condition}: observed from ${asString(dated[0].time_start)} to ${asString(
            dated[dated.length - 1].time_start,
          )}; linked to ${medications.size} medication(s) and ${labs.size} lab signal(s).`,
        ];
      });
  }

  private windowChanges(timeline: TimelineEvent[], days: number): string {
    const cutoff = this.options.now().getTime() - days * 24 * 60 * 60 * 1000;
    const recent = timeline.filter((event) => {
      const parsed = parseDateTime(event.time_start);
      return parsed ? Date.parse(parsed) >= cutoff : false;
    });

    const diagnosis = recent.filter((event) => event.category === "diagnosis_onset");
    const treatment = recent.filter((event) => event.category === "treatment_change");
    const labs = recent.filter((event) => event.category === "lab_trend");
    const admissions = recent.filter((event) => event.category === "admission_discharge");
    const abnormalLabs = labs.filter((event) => event.flagged_abnormal);

    return `Last ${days} days: ${recent.length} events total, ${diagnosis.length} diagnosis events, ${treatment.length} treatment events, ${labs.length} lab events (${abnormalLabs.length} flagged abnormal), ${admissions.length} admission/discharge events.`;
  }

  private careGapsAndContradictions(
    timeline: TimelineEvent[],
    episodes: Record<string, JsonObject[]>,
  ): string[] {
    const issues: string[] = [];

    const cycles = Array.isArray(episodes.admission_discharge_cycles)
      ? (episodes.admission_discharge_cycles as JsonObject[])
      : [];
    for (const cycle of cycles) {
      const start = parseDateTime(cycle.time_start);
      const end = parseDateTime(cycle.time_end);
      if (start && end && Date.parse(end) < Date.parse(start)) {
        issues.push(
          `Contradiction: encounter cycle '${asString(cycle.description)}' has discharge before admission (${start} > ${end}).`,
        );
      }
    }

    const medicationStops = timeline.filter((event) => asString(event.subtype).includes("medication_stop"));
    const medicationStarts = timeline.filter((event) => asString(event.subtype).includes("medication_start"));
    if (medicationStops.length > 0 && medicationStarts.length === 0) {
      issues.push(
        "Potential contradiction: medication stop events exist without corresponding medication start events.",
      );
    }

    const nowTs = this.options.now().getTime();
    const recentEncounters = timeline.filter((event) => {
      if (event.category !== "admission_discharge") {
        return false;
      }
      const time = parseDateTime(event.time_start);
      return time ? Date.parse(time) >= nowTs - 365 * 24 * 60 * 60 * 1000 : false;
    });
    if (recentEncounters.length === 0) {
      issues.push("Care gap: no encounter/admission-discharge activity observed in the last 365 days.");
    }

    const recentLabs = timeline.filter((event) => {
      if (event.category !== "lab_trend") {
        return false;
      }
      const time = parseDateTime(event.time_start);
      return time ? Date.parse(time) >= nowTs - 180 * 24 * 60 * 60 * 1000 : false;
    });
    if (recentLabs.length === 0) {
      issues.push("Care gap: no lab trend events observed in the last 180 days.");
    }

    const abnormalEpisodes = Array.isArray(episodes.abnormal_lab_trend)
      ? (episodes.abnormal_lab_trend as JsonObject[])
      : [];
    if (abnormalEpisodes.length > 0) {
      issues.push(
        `Monitoring need: ${abnormalEpisodes.length} abnormal lab trend episode(s) detected and should be clinically reviewed.`,
      );
    }

    if (issues.length === 0) {
      issues.push("No major care gaps or timeline contradictions detected by rule-based checks.");
    }

    return issues;
  }

  private deterministicSummary(timeline: TimelineEvent[]): string {
    const dated = timeline
      .filter((event) => event.time_start)
      .sort((a, b) => asString(a.time_start).localeCompare(asString(b.time_start)));
    if (dated.length === 0) {
      return "No time-stamped evolution events were found.";
    }

    const diagnosis = dated.filter((event) => event.category === "diagnosis_onset").length;
    const treatment = dated.filter((event) => event.category === "treatment_change").length;
    const labs = dated.filter((event) => event.category === "lab_trend").length;
    const admissions = dated.filter((event) => event.category === "admission_discharge").length;
    const abnormal = dated.filter((event) => event.category === "lab_trend" && event.flagged_abnormal).length;

    return `Evolution spans ${asString(dated[0].time_start)} to ${asString(
      dated[dated.length - 1].time_start,
    )} with ${dated.length} events: ${diagnosis} diagnosis, ${treatment} treatment, ${labs} lab (${abnormal} abnormal), and ${admissions} admission/discharge events.`;
  }

  private async aiSummary(
    patient: JsonObject,
    identity: IdentityPayload,
    timeline: TimelineEvent[],
    episodes: Record<string, JsonObject[]>,
    deterministicSeed: NarrativePayload,
  ): Promise<string | null> {
    if (!this.options.lovableApiKey || !this.options.fetchFn) {
      return null;
    }

    const recentEvents = [...timeline]
      .filter((event) => event.time_start)
      .sort((a, b) => asString(b.time_start).localeCompare(asString(a.time_start)))
      .slice(0, 120);

    const compactContext = {
      identity,
      patient: {
        patient_id: patient.patient_id,
        medical_record_number: patient.medical_record_number,
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        primary_care_physician: patient.primary_care_physician,
        hospital: patient.hospital,
        insurance: patient.insurance,
        diagnoses: Array.isArray(patient.diagnoses) ? patient.diagnoses.slice(0, 20) : [],
        current_medications: Array.isArray(patient.current_medications)
          ? patient.current_medications.slice(0, 20)
          : [],
        allergies: Array.isArray(patient.allergies) ? patient.allergies.slice(0, 20) : [],
      },
      recent_timeline_events: recentEvents,
      episodes,
      rule_based_seed: deterministicSeed,
    };

    const systemPrompt =
      "You are a clinical summarization assistant. Generate a concise clinician-oriented summary of patient evolution over time from structured data. Do not invent facts. If uncertain, say so. Return plain text only, 5-10 sentences, focused on temporal progression.";
    const userPrompt =
      "Produce the temporal evolution summary from this patient evolution context:\n" +
      JSON.stringify(compactContext);

    try {
      const response = await this.options.fetchFn(this.options.aiGatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.aiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as JsonObject;
      const choices = Array.isArray(payload.choices) ? (payload.choices as JsonObject[]) : [];
      const firstChoice = choices[0] ?? {};
      const message =
        firstChoice.message && typeof firstChoice.message === "object"
          ? (firstChoice.message as JsonObject)
          : {};
      const content = message.content;

      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }

      if (Array.isArray(content)) {
        for (const part of content) {
          if (part && typeof part === "object") {
            const text = asString((part as JsonObject).text);
            if (text) {
              return text;
            }
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async run(input: NarrativeStageInput): Promise<NarrativePayload> {
    const deterministic: NarrativePayload = {
      baseline_profile: this.baselineProfile(input.patient),
      evolution_by_condition: this.evolutionByCondition(input.timeline),
      changes_last_30_days: this.windowChanges(input.timeline, 30),
      changes_last_90_days: this.windowChanges(input.timeline, 90),
      changes_last_365_days: this.windowChanges(input.timeline, 365),
      care_gaps_or_contradictions: this.careGapsAndContradictions(input.timeline, input.episodes),
    };

    const aiSummary = await this.aiSummary(
      input.patient,
      input.identity,
      input.timeline,
      input.episodes,
      deterministic,
    );

    return {
      ...deterministic,
      evolution_timeline_summary: aiSummary ?? this.deterministicSummary(input.timeline),
      generation_mode: aiSummary ? "ai" : "deterministic",
      generation_model: aiSummary ? this.options.aiModel : null,
      generation_provider: aiSummary ? "lovable_gateway" : null,
    };
  }
}

export class PatientEvolutionOrchestrator {
  private readonly identityStage: IdentityResolverStage;
  private readonly profileStage: ProfileBuilderStage;
  private readonly temporalStage: TemporalEvolutionStage;
  private readonly contextStage: ContextFusionStage;
  private readonly narrativeStage: NarrativeGeneratorStage;

  private readonly now: () => Date;

  constructor(
    private readonly io: PipelineFileIO,
    private readonly options: PatientEvolutionPipelineOptions = {},
  ) {
    const dataRoot = options.dataRoot ?? DEFAULT_DATA_ROOT;
    const dataset = new DatasetAccessor(io, dataRoot);

    this.now = options.now ?? (() => new Date());

    this.identityStage = new IdentityResolverStage(dataset);
    this.profileStage = new ProfileBuilderStage(dataset);
    this.temporalStage = new TemporalEvolutionStage(dataset);
    this.contextStage = new ContextFusionStage(dataset);
    this.narrativeStage = new NarrativeGeneratorStage({
      fetchFn: options.fetchFn ?? globalThis.fetch,
      lovableApiKey: options.lovableApiKey ?? null,
      aiGatewayUrl: options.aiGatewayUrl ?? DEFAULT_AI_GATEWAY_URL,
      aiModel: options.aiModel ?? DEFAULT_AI_MODEL,
      now: this.now,
    });
  }

  private normalizeEpisodes(
    episodesByGroup: Record<string, JsonObject[]>,
  ): Episode[] {
    const normalized: Episode[] = [];
    let index = 0;

    for (const [groupName, items] of Object.entries(episodesByGroup ?? {})) {
      for (const item of items ?? []) {
        index += 1;
        const rawEventIds = Array.isArray(item.event_ids) ? (item.event_ids as unknown[]) : [];
        normalized.push({
          episode_id: `ep_${String(index).padStart(6, "0")}`,
          episode_type: asString(item.episode_type) || groupName,
          time_start: asString(item.time_start) || null,
          time_end: asString(item.time_end) || null,
          title:
            asString(item.description) ||
            asString(item.test_name) ||
            groupName.replace(/_/g, " "),
          description: asString(item.description) || null,
          status: asString(item.status) || null,
          related_event_ids: rawEventIds.map((value) => asString(value)).filter(Boolean),
          details:
            item.details && typeof item.details === "object" ? (item.details as JsonObject) : {},
        });
      }
    }

    normalized.sort((a, b) => {
      const ta = asString(a.time_start);
      const tb = asString(b.time_start);
      if (ta === tb) {
        return a.episode_id.localeCompare(b.episode_id);
      }
      return ta.localeCompare(tb);
    });

    return normalized;
  }

  private buildAlerts(careItems: string[], episodes: Episode[]): EvolutionAlert[] {
    const alerts: EvolutionAlert[] = [];
    const detectedAt = nowIso(this.now);

    for (const [index, message] of careItems.entries()) {
      const lowerMessage = message.toLocaleLowerCase();
      let severity: "low" | "medium" | "high" = "medium";
      let alertType = "care_gap";

      if (lowerMessage.includes("contradiction")) {
        severity = "high";
        alertType = "contradiction";
      } else if (lowerMessage.includes("monitoring need") || lowerMessage.includes("abnormal lab")) {
        severity = "high";
        alertType = "abnormal_trend";
      }

      alerts.push({
        alert_id: `al_${String(index + 1).padStart(6, "0")}`,
        severity,
        alert_type: alertType,
        message,
        time_detected: detectedAt,
        related_episode_ids: [],
        related_event_ids: [],
        recommended_action: null,
        metadata: {},
      });
    }

    const abnormalEpisodes = episodes.filter((episode) =>
      episode.episode_type.toLocaleLowerCase().startsWith("abnormal_lab"),
    );
    const hasAbnormalAlert = alerts.some((alert) => alert.alert_type === "abnormal_trend");

    if (abnormalEpisodes.length > 0 && !hasAbnormalAlert) {
      alerts.push({
        alert_id: `al_${String(alerts.length + 1).padStart(6, "0")}`,
        severity: "high",
        alert_type: "abnormal_trend",
        message: `${abnormalEpisodes.length} abnormal lab trend episode(s) detected.`,
        time_detected: detectedAt,
        related_episode_ids: abnormalEpisodes.map((episode) => episode.episode_id),
        related_event_ids: abnormalEpisodes.flatMap((episode) => episode.related_event_ids),
        recommended_action:
          "Review trend, confirm clinical significance, and plan follow-up testing.",
        metadata: { episodes_count: abnormalEpisodes.length },
      });
    }

    return alerts;
  }

  async run(identifier: string): Promise<PatientEvolutionOutput> {
    const identity = await this.identityStage.run({ identifier });
    const [profile, temporal] = await Promise.all([
      this.profileStage.run({ identity }),
      this.temporalStage.run({ identity }),
    ]);

    const context = await this.contextStage.run({ identity, temporal });
    const timeline = [...(context.timeline ?? temporal.timeline ?? [])];
    const episodes = this.normalizeEpisodes(
      (context.episodes ?? temporal.episodes ?? {}) as Record<string, JsonObject[]>,
    );

    const narrative = await this.narrativeStage.run({
      patient: (profile.patient ?? {}) as JsonObject,
      identity,
      timeline,
      episodes: (context.episodes ?? temporal.episodes ?? {}) as Record<string, JsonObject[]>,
    });

    const careItems = (narrative.care_gaps_or_contradictions ?? []).filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    const alerts = this.buildAlerts(careItems, episodes);

    return {
      patient: profile.patient,
      timeline,
      episodes,
      alerts,
      identity,
      narrative,
      metadata: {
        generated_at: nowIso(this.now),
        source_counts: {
          timeline_events: timeline.length,
          episodes: episodes.length,
          alerts: alerts.length,
        },
        pipeline: {
          identity_agent: this.identityStage.name,
          profile_builder_agent: this.profileStage.name,
          temporal_evolution_agent: this.temporalStage.name,
          context_fusion_agent: this.contextStage.name,
          narrative_agent: this.narrativeStage.name,
        },
      },
    };
  }
}

export interface StorageBucketUploader {
  upload(
    path: string,
    body: string,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ error: { message?: string } | null }>;
}

export function generatedPatientEvolutionPath(patientId: string): string {
  return `final_10_patients/generated/${patientId}_patient_evolution.json`;
}

export async function persistPatientEvolutionOutput(params: {
  uploader: StorageBucketUploader;
  patientId: string;
  payload: PatientEvolutionOutput;
}): Promise<string> {
  const patientId = asString(params.patientId);
  if (!patientId) {
    throw new Error("patientId is required for persistence");
  }

  const storagePath = generatedPatientEvolutionPath(patientId);
  const serialized = JSON.stringify(params.payload, null, 2);

  const { error } = await params.uploader.upload(storagePath, serialized, {
    contentType: "application/json",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to persist patient evolution payload");
  }

  return storagePath;
}
