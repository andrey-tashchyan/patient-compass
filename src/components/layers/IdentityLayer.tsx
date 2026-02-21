import { Fingerprint, Lock, Edit3, Clock } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientIdentity } from "@/data/mockPatients";

const DataField = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="data-card">
    <div className="clinical-label mb-1">{label}</div>
    <div className={mono ? "font-mono text-sm font-medium text-data-value" : "text-sm font-medium text-data-value"}>{value}</div>
  </div>
);

const IdentityLayer = ({ identity }: { identity: PatientIdentity }) => {
  const age = Math.floor((Date.now() - new Date(identity.immutable.dateOfBirth).getTime()) / 31557600000);

  return (
    <CollapsibleLayer title="Identity Layer" icon={<Fingerprint className="h-4 w-4" />}>
      <div className="space-y-5">
        {/* Immutable */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Immutable Identifiers</span>
          </div>
          <div className="data-grid">
            <DataField label="MRN" value={identity.mrn} mono />
            <DataField label="Date of Birth" value={`${identity.immutable.dateOfBirth} (Age ${age})`} />
            <DataField label="Biological Sex" value={identity.immutable.biologicalSex} />
            <DataField label="Blood Type" value={identity.immutable.bloodType} />
            {identity.immutable.geneticMarkers && (
              <div className="data-card col-span-full">
                <div className="clinical-label mb-1">Genetic Markers</div>
                <div className="flex flex-wrap gap-1.5">
                  {identity.immutable.geneticMarkers.map((m, i) => (
                    <span key={i} className="clinical-badge-info">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mutable */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demographics & Contact</span>
          </div>
          <div className="data-grid">
            <DataField label="Full Name" value={`${identity.mutable.firstName} ${identity.mutable.lastName}`} />
            {identity.mutable.preferredName && <DataField label="Preferred Name" value={identity.mutable.preferredName} />}
            <DataField label="Phone" value={identity.mutable.phone} />
            <DataField label="Email" value={identity.mutable.email} />
            <DataField label="Address" value={identity.mutable.address} />
            <DataField label="Language" value={identity.mutable.preferredLanguage} />
            <DataField label="Emergency Contact" value={`${identity.mutable.emergencyContact.name} (${identity.mutable.emergencyContact.relation}) — ${identity.mutable.emergencyContact.phone}`} />
            <DataField label="Insurance" value={`${identity.mutable.insurance.provider} — ${identity.mutable.insurance.policyNumber}`} />
          </div>
        </div>

        {/* Temporal */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Life Events</span>
          </div>
          <div className="space-y-1.5">
            {identity.temporal.keyEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-data-label w-24 shrink-0">{e.date}</span>
                <span className="text-data-value">{e.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default IdentityLayer;
