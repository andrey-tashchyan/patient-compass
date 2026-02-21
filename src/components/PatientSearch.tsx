import { useState, useRef, useEffect } from "react";
import { Search, User, Hash, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchPatients, type Patient } from "@/data/mockPatients";

const PatientSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const r = searchPatients(query);
    setResults(r);
    setIsOpen(query.length > 0 && r.length > 0);
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (patient: Patient) => {
    setQuery("");
    setIsOpen(false);
    navigate(`/patient/${patient.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && results.length > 0 && setIsOpen(true)}
          placeholder="Search by name, MRN, or date of birth..."
          className="w-full h-10 pl-10 pr-4 text-sm bg-search-bg border border-search-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {results.map((p, i) => {
            const age = Math.floor((Date.now() - new Date(p.identity.immutable.dateOfBirth).getTime()) / 31557600000);
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-4 py-3 flex items-center gap-4 text-sm transition-colors ${
                  i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                } ${i > 0 ? 'border-t border-border/50' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{p.identity.mutable.firstName} {p.identity.mutable.lastName}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{p.identity.mrn}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.identity.immutable.dateOfBirth} (Age {age})</span>
                    <span>{p.identity.immutable.biologicalSex}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-xs ${p.state.activeDiagnoses.some(d => d.severity === 'critical') ? 'clinical-badge-critical' : 'clinical-badge-normal'}`}>
                  {p.state.activeDiagnoses.filter(d => d.status === 'active' || d.status === 'chronic').length} Dx
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
