import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Search, Users, Shield, ArrowRight } from "lucide-react";
import { mockPatients } from "@/data/mockPatients";
import AppHeader from "@/components/AppHeader";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
            <Shield className="h-3.5 w-3.5" /> Clinical-Grade Patient Intelligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Clinical Data Layer Dashboard
          </h1>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Unified aggregation of patient data across labs, vitals, medications, encounters, and care teams — structured into a coherent intelligence layer.
          </p>
        </div>

        {/* Quick access patients */}
        <div className="mb-8">
          <div className="clinical-label mb-4 flex items-center gap-2">
            <Users className="h-3.5 w-3.5" /> Recent Patients
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockPatients.map(p => {
              const age = Math.floor((Date.now() - new Date(p.identity.immutable.dateOfBirth).getTime()) / 31557600000);
              const criticalDx = p.state.activeDiagnoses.filter(d => d.severity === 'critical');
              const criticalVitals = p.state.vitals.filter(v => v.status === 'critical');

              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/patient/${p.id}`)}
                  className="data-card text-left group hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{p.identity.mutable.firstName} {p.identity.mutable.lastName}</span>
                      {p.identity.mutable.preferredName && (
                        <span className="text-xs text-muted-foreground ml-1">"{p.identity.mutable.preferredName}"</span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="font-mono">{p.identity.mrn}</span>
                    <span>{p.identity.immutable.biologicalSex}, {age}y</span>
                    <span>{p.identity.immutable.bloodType}</span>
                  </div>

                  {/* Status indicators */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {criticalVitals.length > 0 && (
                      <span className="clinical-badge-critical animate-pulse-critical">{criticalVitals.length} Critical Vital{criticalVitals.length > 1 ? 's' : ''}</span>
                    )}
                    {criticalDx.length > 0 && (
                      <span className="clinical-badge-warning">{criticalDx.map(d => d.name.split(',')[0]).join(', ')}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.state.activeDiagnoses.slice(0, 3).map((d, i) => (
                      <span key={i} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">{d.name.split(',')[0]}</span>
                    ))}
                    {p.state.activeDiagnoses.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{p.state.activeDiagnoses.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Patients", value: mockPatients.length, icon: <Users className="h-4 w-4" /> },
            { label: "Critical Alerts", value: mockPatients.reduce((a, p) => a + p.state.vitals.filter(v => v.status === 'critical').length, 0), icon: <Activity className="h-4 w-4" /> },
            { label: "Active Meds", value: mockPatients.reduce((a, p) => a + p.interventions.medications.filter(m => m.status === 'active').length, 0), icon: <Search className="h-4 w-4" /> },
            { label: "Care Team", value: mockPatients.reduce((a, p) => a + p.network.careTeam.length, 0), icon: <Shield className="h-4 w-4" /> },
          ].map((s, i) => (
            <div key={i} className="data-card text-center">
              <div className="flex justify-center mb-2 text-primary">{s.icon}</div>
              <div className="font-mono text-2xl font-bold text-foreground">{s.value}</div>
              <div className="clinical-label mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
