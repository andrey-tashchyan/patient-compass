import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle2, AlertTriangle, ShieldAlert, ChevronDown, ChevronUp, Loader2, Pill, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePatient } from "@/hooks/usePatients";
import {
  searchMedications,
  checkContraindications,
  type MedicationRecord,
  type ContraindicationAlert,
} from "@/lib/medicationSearch";

const PrescriptionWindow = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patient, isLoading: patientLoading } = usePatient(id || "");

  // Drug search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicationRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<MedicationRecord | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Prescription fields
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");

  // Contraindication check
  const [alerts, setAlerts] = useState<ContraindicationAlert[]>([]);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());

  // Validation
  const [justification, setJustification] = useState("");
  const [showJustification, setShowJustification] = useState(false);
  const [validated, setValidated] = useState(false);

  // Click-outside to close dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedDrug(null);
    setAlerts([]);
    setValidated(false);
    setShowJustification(false);
    setJustification("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchMedications(value, 12);
      setResults(res);
      setShowDropdown(true);
      setSearching(false);
    }, 250);
  }, []);

  const selectDrug = (med: MedicationRecord) => {
    setSelectedDrug(med);
    setQuery(med.denomination);
    setShowDropdown(false);
    setValidated(false);
    setShowJustification(false);
    setJustification("");

    // Run contraindication checks
    if (patient) {
      const patientMedNames = patient.current_medications.map((m) => m.name);
      const patientAllergens = patient.allergies.map((a) => a.allergen);
      const found = checkContraindications(med, patientMedNames, patientAllergens);
      setAlerts(found);
    }
  };

  const toggleAlert = (idx: number) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const hasSevere = alerts.some((a) => a.severity === "Severe");
  const hasModerate = alerts.some((a) => a.severity === "Moderate");
  const canValidate = selectedDrug && dosage.trim() && duration.trim();

  const handleValidate = () => {
    if (hasSevere) return;
    if (hasModerate && !justification.trim()) {
      setShowJustification(true);
      return;
    }
    setValidated(true);
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-16 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Patient not found</h2>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline">Back to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(`/patient/${id}`)} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">New Prescription</h1>
            <p className="text-sm text-muted-foreground">
              {patient.first_name} {patient.last_name} · {patient.medical_record_number}
            </p>
          </div>
        </div>

        {/* Patient context strip */}
        <div className="flex flex-wrap gap-2 mb-8">
          {patient.allergies.length > 0 && (
            <span className="clinical-badge-critical">
              Allergies: {patient.allergies.map((a) => a.allergen).join(", ")}
            </span>
          )}
          {patient.current_medications.length > 0 && (
            <span className="clinical-badge-info">
              {patient.current_medications.length} active medication{patient.current_medications.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Prescription Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          {/* Drug Search */}
          <div ref={searchRef} className="relative">
            <label className="clinical-label mb-2 block">Medication</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                placeholder="Search by drug name or active substance..."
                className="pl-10 h-11"
              />
              {selectedDrug && (
                <button
                  onClick={() => { setQuery(""); setSelectedDrug(null); setAlerts([]); setValidated(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showDropdown && results.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
                {results.map((med) => (
                  <button
                    key={med.cis}
                    onClick={() => selectDrug(med)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/60 transition-colors border-b border-border last:border-0"
                  >
                    <p className="text-sm font-medium text-foreground leading-tight truncate">{med.denomination}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {med.substances.join(", ")} · {med.forme} · {med.voie}
                    </p>
                    {med.interactions.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {med.interactions.length} known interaction{med.interactions.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !searching && query.trim() && results.length === 0 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-lg p-4">
                <p className="text-sm text-muted-foreground text-center">No medications found</p>
              </div>
            )}
          </div>

          {/* Selected drug info */}
          {selectedDrug && (
            <div className="rounded-lg bg-muted/40 border border-border p-4">
              <div className="flex items-start gap-3">
                <Pill className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{selectedDrug.denomination}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Active substance:</span> {selectedDrug.substances.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Form:</span> {selectedDrug.forme} · <span className="font-medium">Route:</span> {selectedDrug.voie}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dosage & Duration */}
          {selectedDrug && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="clinical-label mb-2 block">Dosage</label>
                <Input
                  value={dosage}
                  onChange={(e) => { setDosage(e.target.value); setValidated(false); }}
                  placeholder="e.g. 500 mg, 2x/day"
                  className="h-10"
                />
              </div>
              <div>
                <label className="clinical-label mb-2 block">Duration</label>
                <Input
                  value={duration}
                  onChange={(e) => { setDuration(e.target.value); setValidated(false); }}
                  placeholder="e.g. 7 days, 2 weeks"
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* Contraindication Results */}
          {selectedDrug && (
            <div className="space-y-3">
              <label className="clinical-label block">Safety Check</label>

              {alerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg p-4 border" style={{ borderColor: "hsl(var(--clinical-normal) / 0.3)", background: "hsl(var(--clinical-normal) / 0.05)" }}>
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--clinical-normal))" }} />
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--clinical-normal))" }}>
                    No known contraindications for this patient.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border overflow-hidden"
                      style={{
                        borderColor: alert.severity === "Severe"
                          ? "hsl(var(--clinical-critical) / 0.3)"
                          : "hsl(var(--clinical-warning) / 0.3)",
                        background: alert.severity === "Severe"
                          ? "hsl(var(--clinical-critical) / 0.04)"
                          : "hsl(var(--clinical-warning) / 0.04)",
                      }}
                    >
                      <button
                        onClick={() => toggleAlert(idx)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        {alert.severity === "Severe" ? (
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0" style={{ color: "hsl(var(--clinical-critical))" }} />
                        ) : (
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0" style={{ color: "hsl(var(--clinical-warning))" }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{alert.title}</span>
                            <span
                              className={alert.severity === "Severe" ? "clinical-badge-critical" : "clinical-badge-warning"}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{alert.type.replace("_", " ")}</p>
                        </div>
                        {expandedAlerts.has(idx) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                      {expandedAlerts.has(idx) && (
                        <div className="px-3 pb-3 pt-0 ml-8">
                          <p className="text-sm text-foreground/80 leading-relaxed">{alert.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Justification for moderate risk override */}
          {showJustification && hasModerate && !hasSevere && (
            <div className="space-y-2">
              <label className="clinical-label block">Override Justification</label>
              <p className="text-xs text-muted-foreground">
                Moderate risk detected. Please provide clinical justification to proceed.
              </p>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Enter clinical justification for prescribing despite moderate risk..."
                className="min-h-[80px] text-sm"
              />
            </div>
          )}

          {/* Validated confirmation */}
          {validated && (
            <div className="flex items-center gap-3 rounded-lg p-4 border" style={{ borderColor: "hsl(var(--clinical-normal) / 0.3)", background: "hsl(var(--clinical-normal) / 0.06)" }}>
              <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(var(--clinical-normal))" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--clinical-normal))" }}>
                  Prescription validated
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedDrug?.denomination} · {dosage} · {duration}
                </p>
              </div>
            </div>
          )}

          {/* Validate button */}
          {selectedDrug && !validated && (
            <div className="pt-2">
              <Button
                className="w-full h-11"
                disabled={!canValidate || hasSevere}
                onClick={handleValidate}
              >
                {hasSevere ? (
                  <>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Cannot Validate — Severe Contraindication
                  </>
                ) : (
                  "Validate Prescription"
                )}
              </Button>
              {hasSevere && (
                <p className="text-xs text-center mt-2" style={{ color: "hsl(var(--clinical-critical))" }}>
                  This prescription is blocked due to a severe contraindication. Choose an alternative medication.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PrescriptionWindow;
