import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Stage = "idle" | "reading" | "parsing" | "saving" | "done";

export default function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setStage("idle");
    setDragOver(false);
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file", description: "Please upload a PDF file.", variant: "destructive" });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 20 MB.", variant: "destructive" });
        return;
      }

      try {
        setStage("reading");
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), "")
        );

        setStage("parsing");
        const { data, error } = await supabase.functions.invoke("parse-patient-pdf", {
          body: { pdfBase64: base64 },
        });

        if (error) throw new Error(error.message || "Failed to parse PDF");
        if (data?.error) throw new Error(data.error);

        const patient = data.patient;
        if (!patient) throw new Error("No patient data returned");

        setStage("saving");
        const { error: insertError } = await supabase.from("patients").insert({
          user_id: "00000000-0000-0000-0000-000000000000",
          patient_data: patient,
        });
        if (insertError) throw insertError;

        setStage("done");
        queryClient.invalidateQueries({ queryKey: ["patients"] });
        toast({ title: "Patient added", description: `${patient.first_name} ${patient.last_name} has been added.` });

        setTimeout(() => {
          setOpen(false);
          reset();
        }, 1200);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Error",
          description: e.message || "Something went wrong.",
          variant: "destructive",
        });
        reset();
      }
    },
    [queryClient]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const stageLabel: Record<Stage, string> = {
    idle: "",
    reading: "Reading PDF…",
    parsing: "AI is extracting patient data…",
    saving: "Saving to database…",
    done: "Done!",
  };

  const busy = stage !== "idle" && stage !== "done";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
          <Plus className="h-3.5 w-3.5" /> Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Patient from PDF</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload a medical record PDF and AI will extract the patient data.
          </DialogDescription>
        </DialogHeader>

        {stage === "idle" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground mb-1">
              Drop a PDF here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">.pdf only · max 20 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            {stage === "done" ? (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
            <p className="text-sm font-medium text-foreground">{stageLabel[stage]}</p>
            {stage === "parsing" && (
              <p className="text-xs text-muted-foreground">This may take 15–30 seconds.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
