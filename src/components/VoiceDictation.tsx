import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, Check, AlertCircle, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClinicalNote, VitalSigns } from "@/types/patient";

export interface ProposedChange {
  change_type: "stop_medication" | "start_medication" | "add_diagnosis" | "resolve_diagnosis" | "add_allergy";
  description: string;
  medication_name?: string;
  medication_dosage?: string;
  medication_frequency?: string;
  medication_indication?: string;
  diagnosis_condition?: string;
  diagnosis_icd_code?: string;
  allergy_allergen?: string;
  allergy_reaction?: string;
  approved?: boolean;
}

interface VoiceDictationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: ClinicalNote, approvedChanges: ProposedChange[]) => void;
  patientContext: {
    name: string;
    age: number;
    activeDiagnoses: string[];
    medications: string[];
    allergies: string[];
  };
}

type Stage = "idle" | "recording" | "processing" | "review";

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  stop_medication: { label: "Stop Med", color: "bg-destructive/15 text-destructive border-destructive/30" },
  start_medication: { label: "Start Med", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  add_diagnosis: { label: "New Dx", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  resolve_diagnosis: { label: "Resolve Dx", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  add_allergy: { label: "New Allergy", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" },
};

const VoiceDictation = ({ open, onOpenChange, onSave, patientContext }: VoiceDictationProps) => {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState<Partial<ClinicalNote> | null>(null);
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);

  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const hasSpeechApi = !!SpeechRecognition;

  useEffect(() => {
    if (!open) {
      stopRecording();
      setStage("idle");
      setTranscript("");
      setInterimText("");
      setError("");
      setNote(null);
      setProposedChanges([]);
    }
  }, [open]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barCount = 64;
      const barWidth = w / barCount - 1;
      const step = Math.floor(bufferLength / barCount);
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const barHeight = Math.max(2, value * h * 0.85);
        const hue = 220;
        const sat = 65 + value * 20;
        const light = 48 + value * 15;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        const x = i * (barWidth + 1);
        const y = (h - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };
    draw();
  }, []);

  const startRecording = async () => {
    setError("");
    setTranscript("");
    setInterimText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      if (hasSpeechApi) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        let finalTranscript = "";
        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript + " ";
              setTranscript(finalTranscript.trim());
            } else {
              interim += result[0].transcript;
            }
          }
          setInterimText(interim);
        };
        recognition.onerror = (event: any) => {
          if (event.error !== "aborted") setError(`Speech recognition error: ${event.error}`);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
      setStage("recording");
      drawWaveform();
    } catch {
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    analyserRef.current = null;
  };

  const handleStopAndProcess = async () => {
    stopRecording();
    const finalTranscript = transcript || interimText;
    if (!finalTranscript.trim()) {
      setError("No speech detected. Please try again.");
      setStage("idle");
      return;
    }
    setTranscript(finalTranscript.trim());
    setInterimText("");
    setStage("processing");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("structure-dictation", {
        body: { transcript: finalTranscript.trim(), patientContext },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setNote(data.note);
      setProposedChanges((data.proposed_changes || []).map((c: ProposedChange) => ({ ...c, approved: true })));
      setStage("review");
    } catch (err: any) {
      setError(err.message || "Failed to structure note");
      setStage("idle");
    }
  };

  const toggleChange = (index: number) => {
    setProposedChanges((prev) => prev.map((c, i) => (i === index ? { ...c, approved: !c.approved } : c)));
  };

  const handleSave = () => {
    if (!note) return;
    const clinicalNote: ClinicalNote = {
      note_type: note.note_type || "Progress Note",
      date_of_service: note.date_of_service || new Date().toISOString().split("T")[0],
      provider_name: note.provider_name || "Dictating Provider",
      provider_credentials: note.provider_credentials || "MD",
      chief_complaint: note.chief_complaint || "",
      subjective: note.subjective || "",
      objective: note.objective || "",
      assessment: note.assessment || "",
      plan: note.plan || "",
      follow_up_instructions: note.follow_up_instructions || "",
      vital_signs: note.vital_signs as VitalSigns | undefined,
    };
    const approved = proposedChanges.filter((c) => c.approved);
    onSave(clinicalNote, approved);
    onOpenChange(false);
  };

  const updateNoteField = (field: string, value: string) => {
    setNote((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice-to-SOAP Dictation
          </DialogTitle>
        </DialogHeader>

        {/* Idle */}
        {stage === "idle" && (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {hasSpeechApi ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-6">
                  Click the button to start dictating. Speak naturally — AI will structure your dictation into a SOAP note and detect any record changes.
                </p>
                <Button size="lg" onClick={startRecording} className="gap-2">
                  <Mic className="h-5 w-5" />
                  Start Dictation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your browser doesn't support voice recognition. Type or paste your dictation below.
                </p>
                <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Type or paste your clinical dictation here..." className="min-h-[120px]" />
                <Button onClick={handleStopAndProcess} disabled={!transcript.trim()} className="w-full">Structure with AI</Button>
              </div>
            )}
          </div>
        )}

        {/* Recording */}
        {stage === "recording" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 border border-border">
              <canvas ref={canvasRef} width={560} height={80} className="w-full h-20 rounded-lg" />
            </div>
            <div className="min-h-[80px] rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-sm text-foreground leading-relaxed">
                {transcript}
                {interimText && <span className="text-muted-foreground italic"> {interimText}</span>}
                {!transcript && !interimText && <span className="text-muted-foreground italic">Listening...</span>}
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="destructive" size="lg" onClick={handleStopAndProcess} className="gap-2">
                <Square className="h-4 w-4" /> Stop & Process
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {stage === "processing" && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">AI is structuring your dictation and detecting record changes...</p>
            <div className="rounded-lg bg-muted/30 border border-border p-3 mx-auto max-w-md">
              <p className="text-xs text-muted-foreground line-clamp-3">{transcript}</p>
            </div>
          </div>
        )}

        {/* Review */}
        {stage === "review" && note && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review the structured note and approve any detected record changes.</p>

            {/* Proposed Changes */}
            {proposedChanges.length > 0 && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Detected Record Changes</span>
                  <span className="text-xs text-muted-foreground">({proposedChanges.filter(c => c.approved).length}/{proposedChanges.length} approved)</span>
                </div>
                <div className="space-y-2">
                  {proposedChanges.map((change, i) => {
                    const meta = CHANGE_TYPE_LABELS[change.change_type] || { label: change.change_type, color: "bg-muted text-foreground border-border" };
                    return (
                      <button
                        key={i}
                        onClick={() => toggleChange(i)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                          change.approved
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-muted/30 opacity-60"
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          change.approved ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                        }`}>
                          {change.approved && <Check className="h-3 w-3" />}
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-sm text-foreground flex-1">{change.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SOAP Note Fields */}
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="clinical-label mb-1 block">Note Type</label>
                  <input value={note.note_type || ""} onChange={(e) => updateNoteField("note_type", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" />
                </div>
                <div>
                  <label className="clinical-label mb-1 block">Chief Complaint</label>
                  <input value={note.chief_complaint || ""} onChange={(e) => updateNoteField("chief_complaint", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" />
                </div>
              </div>
              {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
                <div key={field}>
                  <label className="clinical-label mb-1 block">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <Textarea value={(note as any)[field] || ""} onChange={(e) => updateNoteField(field, e.target.value)} className="min-h-[60px] text-sm" />
                </div>
              ))}
              <div>
                <label className="clinical-label mb-1 block">Follow-up Instructions</label>
                <input value={note.follow_up_instructions || ""} onChange={(e) => updateNoteField("follow_up_instructions", e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" />
              </div>
              {note.vital_signs && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <label className="clinical-label mb-2 block">Extracted Vital Signs</label>
                  <div className="flex flex-wrap gap-3 text-xs font-mono">
                    {note.vital_signs.blood_pressure_systolic && note.vital_signs.blood_pressure_diastolic && (
                      <span>BP: {note.vital_signs.blood_pressure_systolic}/{note.vital_signs.blood_pressure_diastolic}</span>
                    )}
                    {note.vital_signs.heart_rate && <span>HR: {note.vital_signs.heart_rate}</span>}
                    {note.vital_signs.temperature_fahrenheit && <span>Temp: {note.vital_signs.temperature_fahrenheit}°F</span>}
                    {note.vital_signs.bmi && <span>BMI: {note.vital_signs.bmi}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setStage("idle"); setNote(null); setProposedChanges([]); }}>Discard</Button>
              <Button onClick={handleSave} className="gap-2">
                <Check className="h-4 w-4" />
                Save{proposedChanges.some(c => c.approved) ? " & Apply Changes" : " to Record"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceDictation;
