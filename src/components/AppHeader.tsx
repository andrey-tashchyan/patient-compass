import PatientSearch from "./PatientSearch";
import cliniviewLogo from "@/assets/cliniview-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex items-center justify-between h-20 gap-4">
        <a href="/" className="flex items-center shrink-0">
          <img src={cliniviewLogo} alt="CliniVIEW" className="h-16" />
        </a>
        <div className="flex items-center gap-3">
          <PatientSearch />
          {user && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 h-9 px-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
