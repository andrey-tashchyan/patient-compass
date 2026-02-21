import PatientSearch from "./PatientSearch";
import cliniviewLogo from "@/assets/cliniview-logo.png";

const AppHeader = () => {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex items-center justify-between h-20 gap-4">
        <a href="/" className="flex items-center shrink-0">
          <img src={cliniviewLogo} alt="CliniVIEW" className="h-16" />
        </a>
        <PatientSearch />
      </div>
    </header>
  );
};

export default AppHeader;
