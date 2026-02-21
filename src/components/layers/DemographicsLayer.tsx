import { Fingerprint, Phone, Shield } from "lucide-react";
import CollapsibleLayer from "../CollapsibleLayer";
import type { ContactInfo, Insurance } from "@/types/patient";
import { EditableText } from "../EditableField";

const DataField = ({ label, value, mono, editing, onChange }: { label: string; value: string; mono?: boolean; editing?: boolean; onChange?: (v: string) => void }) => (
  <div className="data-card">
    <div className="clinical-label mb-1.5">{label}</div>
    {editing && onChange ? (
      <EditableText value={value} editing onChange={onChange} placeholder={label} className={mono ? 'font-mono' : ''} />
    ) : (
      <div className={`text-[13px] font-medium text-data-value ${mono ? 'font-mono' : ''}`}>{value}</div>
    )}
  </div>
);

interface Props {
  contactInfo: ContactInfo;
  insurance: Insurance;
  primaryCarePhysician?: string;
  hospital?: string;
  editing?: boolean;
  onUpdate?: (updates: { contactInfo?: ContactInfo; insurance?: Insurance; primaryCarePhysician?: string; hospital?: string }) => void;
}

const DemographicsLayer = ({ contactInfo, insurance, primaryCarePhysician, hospital, editing, onUpdate }: Props) => {
  const updateContact = (field: keyof ContactInfo, value: string) => {
    onUpdate?.({ contactInfo: { ...contactInfo, [field]: value } });
  };

  const updateInsurance = (field: keyof Insurance, value: string) => {
    onUpdate?.({ insurance: { ...insurance, [field]: value } });
  };

  return (
    <CollapsibleLayer title="Demographics" icon={<Fingerprint className="h-4 w-4" />}>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="clinical-label">Contact</span>
          </div>
          <div className="data-grid">
            <DataField label="Phone" value={contactInfo.phone} editing={editing} onChange={(v) => updateContact("phone", v)} />
            <DataField label="Address" value={contactInfo.address} editing={editing} onChange={(v) => updateContact("address", v)} />
            <DataField
              label="Emergency contact"
              value={`${contactInfo.emergency_contact_name} (${contactInfo.emergency_contact_relation})${contactInfo.emergency_contact_phone ? ` — ${contactInfo.emergency_contact_phone}` : ''}`}
              editing={editing}
              onChange={(v) => updateContact("emergency_contact_name", v)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="clinical-label">Insurance & care</span>
          </div>
          <div className="data-grid">
            <DataField label="Insurance" value={`${insurance.provider} — ${insurance.plan_type}`} editing={editing} onChange={(v) => updateInsurance("provider", v)} />
            <DataField label="Primary care physician" value={primaryCarePhysician || "—"} editing={editing} onChange={(v) => onUpdate?.({ primaryCarePhysician: v })} />
            <DataField label="Facility" value={hospital || "—"} editing={editing} onChange={(v) => onUpdate?.({ hospital: v })} />
          </div>
        </div>
      </div>
    </CollapsibleLayer>
  );
};

export default DemographicsLayer;
