import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface EditableTextProps {
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}

export const EditableText = ({ value, editing, onChange, className = "", multiline, placeholder }: EditableTextProps) => {
  if (!editing) return <span className={className}>{value || "—"}</span>;
  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`text-[13px] min-h-[60px] ${className}`}
        placeholder={placeholder}
      />
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-7 text-[13px] ${className}`}
      placeholder={placeholder}
    />
  );
};

interface EditableSelectProps {
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const EditableSelect = ({ value, editing, onChange, options, className = "" }: EditableSelectProps) => {
  if (!editing) {
    const label = options.find((o) => o.value === value)?.label || value;
    return <span className={className}>{label}</span>;
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-[13px] w-auto min-w-[100px] ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface EditableCheckboxProps {
  checked: boolean;
  editing: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export const EditableCheckbox = ({ checked, editing, onChange, label }: EditableCheckboxProps) => {
  if (!editing) return null;
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {label && <span className="text-[12px] text-muted-foreground">{label}</span>}
    </div>
  );
};
