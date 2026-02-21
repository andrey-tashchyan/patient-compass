import { useState, useRef, useEffect } from "react";
import { Search, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchPatients, mockPatients } from "@/data/mockPatientData";
import { getPatientAge, type Patient } from "@/types/patient";

const PatientSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults(mockPatients);
    } else {
      setResults(searchPatients(query));
    }
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setIsOpen(true); }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (patient: Patient) => {
    setQuery("");
    setIsOpen(false);
    navigate(`/patient/${patient.patient_id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && selectedIndex >= 0) handleSelect(results[selectedIndex]);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors">
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rechercher un patient…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded text-muted-foreground">⌘K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-foreground/20 backdrop-blur-sm">
          <div ref={panelRef} className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Nom, MRN…" className="flex-1 h-12 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Aucun patient trouvé</div>
              ) : (
                <div className="py-1">
                  {!query.trim() && <div className="px-4 pt-2 pb-1"><span className="clinical-label">Tous les patients</span></div>}
                  {results.map((p, i) => {
                    const age = getPatientAge(p);
                    const hasActive = p.diagnoses.some(d => d.status === "active");
                    return (
                      <button key={p.patient_id} onClick={() => handleSelect(p)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm transition-colors ${i === selectedIndex ? 'bg-primary/5' : 'hover:bg-muted/60'}`}>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{p.first_name} {p.last_name}</div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono">{p.medical_record_number}</span>
                            <span>{age} ans</span>
                          </div>
                        </div>
                        {hasActive && <span className="w-2 h-2 rounded-full bg-clinical-warning animate-pulse shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientSearch;
