/**
 * Medication CSV parser, search engine, and contraindication checker.
 * Loads the real French medication CSV (~15k rows) at runtime.
 */

export interface MedicationRecord {
  cis: string;
  denomination: string;
  forme: string;
  voie: string;
  substances: string[];
  interactions: ParsedInteraction[];
}

export interface ParsedInteraction {
  substanceA: string;
  substanceB: string;
  severity: "Contre-indiquee" | "Deconseillee";
}

export interface ContraindicationAlert {
  type: "drug_interaction" | "allergy";
  severity: "Severe" | "Moderate";
  title: string;
  explanation: string;
  interactingWith?: string;
}

// ── Singleton cache ──
let cachedMeds: MedicationRecord[] | null = null;
let loadingPromise: Promise<MedicationRecord[]> | null = null;

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseInteractions(raw: string): ParsedInteraction[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(";").map((chunk) => {
    const trimmed = chunk.trim();
    // Format: "SUBSTANCE_A ↔ SUBSTANCE_B (Severity)"
    const match = trimmed.match(/^(.+?)\s*↔\s*(.+?)\s*\((\w[\w-]*)\)\s*$/);
    if (!match) return null;
    return {
      substanceA: match[1].trim(),
      substanceB: match[2].trim(),
      severity: match[3].trim() as ParsedInteraction["severity"],
    };
  }).filter(Boolean) as ParsedInteraction[];
}

export async function loadMedications(): Promise<MedicationRecord[]> {
  if (cachedMeds) return cachedMeds;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/data/medications.csv")
    .then((r) => r.text())
    .then((text) => {
      const lines = text.split("\n").filter((l) => l.trim());
      // Skip header
      const records: MedicationRecord[] = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length < 6) continue;
        records.push({
          cis: fields[0].trim(),
          denomination: fields[1].trim(),
          forme: fields[2].trim(),
          voie: fields[3].trim(),
          substances: fields[4].split(";").map((s) => s.trim()).filter(Boolean),
          interactions: parseInteractions(fields[5]),
        });
      }
      cachedMeds = records;
      return records;
    });

  return loadingPromise;
}

export async function searchMedications(query: string, limit = 15): Promise<MedicationRecord[]> {
  const meds = await loadMedications();
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: MedicationRecord[] = [];
  for (const med of meds) {
    if (
      med.denomination.toLowerCase().includes(q) ||
      med.substances.some((s) => s.toLowerCase().includes(q))
    ) {
      results.push(med);
      if (results.length >= limit) break;
    }
  }
  return results;
}

/**
 * Check a selected medication against patient data for contraindications.
 */
export function checkContraindications(
  medication: MedicationRecord,
  patientMedications: string[],
  patientAllergies: string[]
): ContraindicationAlert[] {
  const alerts: ContraindicationAlert[] = [];

  // 1. Check drug interactions against current patient medications
  for (const interaction of medication.interactions) {
    const interactingSubstances = [interaction.substanceA, interaction.substanceB];
    for (const patientMed of patientMedications) {
      const patientMedLower = patientMed.toLowerCase();
      for (const iSub of interactingSubstances) {
        // Don't match the drug's own substances
        if (medication.substances.some((s) => s.toLowerCase() === iSub.toLowerCase())) continue;
        if (iSub.toLowerCase().includes(patientMedLower) || patientMedLower.includes(iSub.toLowerCase())) {
          alerts.push({
            type: "drug_interaction",
            severity: interaction.severity === "Contre-indiquee" ? "Severe" : "Moderate",
            title: `Drug Interaction: ${patientMed}`,
            explanation: `${interaction.substanceA} ↔ ${interaction.substanceB} — ${interaction.severity === "Contre-indiquee" ? "Contraindicated" : "Not recommended"}`,
            interactingWith: patientMed,
          });
          break;
        }
      }
    }
  }

  // 2. Check allergies — match substance names against patient allergies
  for (const allergen of patientAllergies) {
    const allergenLower = allergen.toLowerCase();
    for (const substance of medication.substances) {
      if (substance.toLowerCase().includes(allergenLower) || allergenLower.includes(substance.toLowerCase())) {
        alerts.push({
          type: "allergy",
          severity: "Severe",
          title: `Allergy Risk: ${allergen}`,
          explanation: `Patient has a known allergy to "${allergen}". This medication contains "${substance}".`,
        });
      }
    }
    // Also check denomination
    if (medication.denomination.toLowerCase().includes(allergenLower)) {
      alerts.push({
        type: "allergy",
        severity: "Severe",
        title: `Allergy Risk: ${allergen}`,
        explanation: `Patient is allergic to "${allergen}" and this medication name matches.`,
      });
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}
