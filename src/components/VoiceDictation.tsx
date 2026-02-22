import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ClinicalNote, VitalSigns } from "@/types/patient";

export interface ProposedChange {
  category: "medication" | "diagnosis" | "allergy";
  action: "add" | "remove" | "update";
  description: string;
  data: {
    name?: string;
    dosage?: string;
    frequency?: string;
    indication?: string;
    icd_code?: string;
    status?: string;
    reaction?: string;
  };
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

const getSummaryFromResponse = (data: any): string => {
  const note = data?.note || {};
  if (typeof note.summary === "string" && note.summary.trim()) return note.summary.trim();
  if (typeof data?.formatted_note === "string" && data.formatted_note.trim()) return data.formatted_note.trim();

  // Backward compatibility if server still returns SOAP sections
  const parts = [
    note.chief_complaint ? `Motif: ${note.chief_complaint}` : "",
    note.subjective ? `S: ${note.subjective}` : "",
    note.objective ? `O: ${note.objective}` : "",
    note.assessment ? `A: ${note.assessment}` : "",
    note.plan ? `P: ${note.plan}` : "",
  ].filter(Boolean);

  return parts.join("\n\n");
};

const VoiceDictation = ({ open, onOpenChange, onSave, patientContext }: VoiceDictationProps) => {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState<Partial<ClinicalNote> | null>(null);

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
    }
  }, [open]);

  // ── Audio visualizer ──
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

      const summary = getSummaryFromResponse(data);
      setNote({
        ...(data?.note || {}),
        summary,
      });
      setStage("review");
    } catch (err: any) {
      setError(err.message || "Failed to structure note");
      setStage("idle");
    }
  };

  const handleSave = () => {
    if (!note) return;
    const clinicalNote: ClinicalNote = {
      note_type: note.note_type || "Progress Note",
      date_of_service: note.date_of_service || new Date().toISOString().split("T")[0],
      provider_name: note.provider_name || "Dictating Provider",
      provider_credentials: note.provider_credentials || "MD",
      chief_complaint: note.chief_complaint || "",
      summary: note.summary || "",
      follow_up_instructions: note.follow_up_instructions || "",
      vital_signs: note.vital_signs as VitalSigns | undefined,
    };
    onSave(clinicalNote, []);
    onOpenChange(false);
  };

  const updateReportText = (value: string) => {
    setNote((prev) => (prev ? { ...prev, summary: value } : prev));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Voice Dictation
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
                  Click the button to start dictating. AI will transcribe, clean, and generate a consultation report.
                </p>
                <Button size="lg" onClick={startRecording} className="gap-2">
                  <Mic className="h-5 w-5" /> Start Dictation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your browser doesn't support voice recognition. Type or paste your dictation below.
                </p>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Type or paste your clinical dictation here..."
                  className="min-h-[120px]"
                />
                <Button onClick={handleStopAndProcess} disabled={!transcript.trim()} className="w-full">
                  Structure with AI
                </Button>
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
            <p className="text-sm text-muted-foreground">AI is generating your consultation report...</p>
            <div className="rounded-lg bg-muted/30 border border-border p-3 mx-auto max-w-md">
              <p className="text-xs text-muted-foreground line-clamp-3">{transcript}</p>
            </div>
          </div>
        )}

        {/* Review */}
        {stage === "review" && note && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review and edit the consultation report below.
            </p>

            <div>
              <label className="clinical-label mb-1 block">Consultation report</label>
              <Textarea
                value={note.summary || ""}
                onChange={(e) => updateReportText(e.target.value)}
                className="min-h-[260px] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setStage("idle"); setNote(null); }}>
                Discard
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Check className="h-4 w-4" />
                Save to Record
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceDictation;
