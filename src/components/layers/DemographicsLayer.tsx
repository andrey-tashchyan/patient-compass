import { Fingerprint, Phone, MapPin, Shield, Heart } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ContactInfo, Insurance } from "@/types/patient";

const DataField = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="data-card">
    <div className="clinical-label mb-1.5">{label}</div>
    <div className={`text-[13px] font-medium text-data-value ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);

interface Props {
  contactInfo: ContactInfo;
  insurance: Insurance;
  primaryCarePhysician?: string;
  hospital?: string;
}

const DemographicsLayer = ({ contactInfo, insurance, primaryCarePhysician, hospital }: Props) => (
  <CollapsibleLayer title="Données démographiques" icon={<Fingerprint className="h-4 w-4" />}>
    <div className="space-y-8">
      {/* Contact */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="clinical-label">Contact</span>
        </div>
        <div className="data-grid">
          <DataField label="Téléphone" value={contactInfo.phone} />
          <DataField label="Adresse" value={contactInfo.address} />
          <DataField
            label="Contact d'urgence"
            value={`${contactInfo.emergency_contact_name} (${contactInfo.emergency_contact_relation})${contactInfo.emergency_contact_phone ? ` — ${contactInfo.emergency_contact_phone}` : ''}`}
          />
        </div>
      </div>

      {/* Insurance & Care */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="clinical-label">Assurance & soins</span>
        </div>
        <div className="data-grid">
          <DataField label="Assurance" value={`${insurance.provider} — ${insurance.plan_type}`} />
          {primaryCarePhysician && <DataField label="Médecin traitant" value={primaryCarePhysician} />}
          {hospital && <DataField label="Établissement" value={hospital} />}
        </div>
      </div>
    </div>
  </CollapsibleLayer>
);

export default DemographicsLayer;
