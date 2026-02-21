import { Fingerprint, Phone, Shield } from "lucide-react";
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
  <CollapsibleLayer title="Demographics" icon={<Fingerprint className="h-4 w-4" />}>
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="clinical-label">Contact</span>
        </div>
        <div className="data-grid">
          <DataField label="Phone" value={contactInfo.phone} />
          <DataField label="Address" value={contactInfo.address} />
          <DataField
            label="Emergency contact"
            value={`${contactInfo.emergency_contact_name} (${contactInfo.emergency_contact_relation})${contactInfo.emergency_contact_phone ? ` — ${contactInfo.emergency_contact_phone}` : ''}`}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="clinical-label">Insurance & care</span>
        </div>
        <div className="data-grid">
          <DataField label="Insurance" value={`${insurance.provider} — ${insurance.plan_type}`} />
          {primaryCarePhysician && <DataField label="Primary care physician" value={primaryCarePhysician} />}
          {hospital && <DataField label="Facility" value={hospital} />}
        </div>
      </div>
    </div>
  </CollapsibleLayer>
);

export default DemographicsLayer;
