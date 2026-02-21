import { Fingerprint, Lock, Edit3, Clock } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { PatientIdentity } from "@/data/mockPatients";

const DataField = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="data-card">
    <div className="clinical-label mb-1.5">{label}</div>
    <div className={`text-[13px] font-medium text-data-value ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

const IdentityLayer = ({ identity }: { identity: PatientIdentity }) => {
  const age = Math.floor((Date.now() - new Date(identity.immutable.dateOfBirth).getTime()) / 31557600000);

  return (
    <CollapsibleLayer title="Identité" icon={<Fingerprint className="h-4 w-4" />}>
      <div className="space-y-8">
        {/* Immutable */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="clinical-label">Identifiants permanents</span>
          </div>
          <div className="data-grid">
            <DataField label="MRN" value={identity.mrn} mono />
            <DataField label="Date de naissance" value={`${identity.immutable.dateOfBirth} (${age} ans)`} />
            <DataField label="Sexe biologique" value={identity.immutable.biologicalSex} />
            <DataField label="Groupe sanguin" value={identity.immutable.bloodType} />
            {identity.immutable.geneticMarkers && (
              <div className="data-card col-span-full">
                <div className="clinical-label mb-2">Marqueurs génétiques</div>
                <div className="flex flex-wrap gap-2">
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
          <div className="flex items-center gap-2 mb-4">
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="clinical-label">Coordonnées & contact</span>
          </div>
          <div className="data-grid">
            <DataField label="Nom complet" value={`${identity.mutable.firstName} ${identity.mutable.lastName}`} />
            {identity.mutable.preferredName && <DataField label="Nom d'usage" value={identity.mutable.preferredName} />}
            <DataField label="Téléphone" value={identity.mutable.phone} />
            <DataField label="Email" value={identity.mutable.email} />
            <DataField label="Adresse" value={identity.mutable.address} />
            <DataField label="Langue" value={identity.mutable.preferredLanguage} />
            <DataField label="Contact d'urgence" value={`${identity.mutable.emergencyContact.name} (${identity.mutable.emergencyContact.relation}) — ${identity.mutable.emergencyContact.phone}`} />
            <DataField label="Assurance" value={`${identity.mutable.insurance.provider} — ${identity.mutable.insurance.policyNumber}`} />
          </div>
        </div>

        {/* Temporal */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="clinical-label">Événements clés</span>
          </div>
          <div className="space-y-3">
            {identity.temporal.keyEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-4 text-[13px]">
                <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{e.date}</span>
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
