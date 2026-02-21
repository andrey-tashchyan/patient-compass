import { Activity, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import PatientSearch from "./PatientSearch";

const AppHeader = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex items-center justify-between h-14 gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight text-foreground hidden sm:inline">Clinical Data Layer</span>
        </div>
        <PatientSearch />
        <button
          onClick={() => setDark(d => !d)}
          className="p-2 rounded-md hover:bg-accent transition-colors shrink-0"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
