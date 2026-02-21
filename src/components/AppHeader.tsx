import { Eye } from "lucide-react";
import PatientSearch from "./PatientSearch";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex items-center justify-between h-14 gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Eye className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground">
            Clini<span className="text-primary">VIEW</span>
          </span>
        </div>
        <PatientSearch />
      </div>
    </header>
  );
};

export default AppHeader;
