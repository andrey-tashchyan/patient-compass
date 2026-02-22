import AppHeader from "@/components/AppHeader";
import PatientEvolutionGenerator from "@/components/PatientEvolutionGenerator";

export default function PatientEvolution() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-5xl py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Patient Evolution Pipeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Server-side identity resolution, temporal fusion, narrative generation, and Supabase Storage persistence.
          </p>
        </div>

        <PatientEvolutionGenerator />
      </main>
    </div>
  );
}
