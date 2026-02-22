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

const normalizeConsultationReport = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(Motif|S|O|A|P|Subjective|Objective|Assessment|Plan)\s*:\s*/gim, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const getSummaryFromResponse = (data: any): string => {
  const note = data?.note || {};
  if (typeof note.summary === "string" && note.summary.trim()) {
    return normalizeConsultationReport(note.summary);
  }
  if (typeof data?.formatted_note === "string" && data.formatted_note.trim()) {
    return normalizeConsultationReport(data.formatted_note);
  }

  // Backward compatibility if server still returns SOAP sections
  const parts = [
    note.chief_complaint ? `Motif: ${note.chief_complaint}` : "",
    note.subjective ? `S: ${note.subjective}` : "",
    note.objective ? `O: ${note.objective}` : "",
    note.assessment ? `A: ${note.assessment}` : "",
    note.plan ? `P: ${note.plan}` : "",
  ].filter(Boolean);

  return normalizeConsultationReport(parts.join("\n\n"));
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read recorded audio."));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Invalid recorded audio payload."));
        return;
      }

      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Recorded audio is empty."));
        return;
      }

      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });

const VoiceDictation = ({ open, onOpenChange, onSave, patientContext }: VoiceDictationProps) => {
  const [stage, setStage] = useState<Stage>("idle");
  const [mode, setMode] = useState<"voice" | "demo">("voice");
  const [transcript, setTranscript] = useState("");
  const [demoInput, setDemoInput] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState<Partial<ClinicalNote> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const hasRecordingApi =
    typeof window !== "undefined" &&
    !!window.navigator?.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const releaseAudioResources = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      releaseAudioResources();
      setStage("idle");
      setTranscript("");
      setDemoInput("");
      setError("");
      setNote(null);
    }
  }, [open, releaseAudioResources]);

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
    if (!hasRecordingApi) {
      setError("This browser does not support microphone recording.");
      return;
    }

    setError("");
    setTranscript("");
    setNote(null);

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

      const preferredMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;

      setStage("recording");
      drawWaveform();
    } catch {
      releaseAudioResources();
      setError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecordingAndCollectAudio = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      releaseAudioResources();
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const finalize = () => {
        const chunks = audioChunksRef.current;
        const recordedBlob =
          chunks.length > 0 ? new Blob(chunks, { type: recorder.mimeType || "audio/webm" }) : null;

        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        releaseAudioResources();
        resolve(recordedBlob);
      };

      recorder.addEventListener("stop", finalize, { once: true });
      if (recorder.state === "inactive") {
        recorder.removeEventListener("stop", finalize);
        finalize();
        return;
      }
      recorder.stop();
    });
  }, [releaseAudioResources]);

  const transcribeWithMedAsr = async (audioBlob: Blob): Promise<string> => {
    const audioBase64 = await blobToBase64(audioBlob);
    const response = await fetch("/api/medasr-transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        mimeType: audioBlob.type,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "MedASR transcription failed.");
    }

    const text = typeof payload?.transcript === "string" ? payload.transcript.trim() : "";
    if (!text) {
      throw new Error("MedASR returned an empty transcript.");
    }
    return text;
  };

  const processTranscript = async (input: string) => {
    const finalTranscript = input.trim();
    if (!finalTranscript) {
      setError("No input detected. Please provide text or speech.");
      setStage("idle");
      return;
    }

    setError("");
    setTranscript(finalTranscript);
    setStage("processing");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("structure-dictation", {
        body: { transcript: finalTranscript, patientContext },
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

  const handleStopAndProcess = async () => {
    setError("");
    setStage("processing");

    try {
      const audioBlob = await stopRecordingAndCollectAudio();
      if (!audioBlob) {
        throw new Error("No audio recorded. Please try again.");
      }
      const finalTranscript = await transcribeWithMedAsr(audioBlob);
      await processTranscript(finalTranscript);
    } catch (err: any) {
      setError(err.message || "Failed to process recording");
      setStage("idle");
    }
  };

  const handleDemoProcess = async () => {
    await processTranscript(demoInput);
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
            {hasRecordingApi && (
              <div className="flex items-center gap-2 justify-center">
                <Button
                  size="sm"
                  variant={mode === "voice" ? "default" : "outline"}
                  onClick={() => setMode("voice")}
                >
                  Voice
                </Button>
                <Button
                  size="sm"
                  variant={mode === "demo" ? "default" : "outline"}
                  onClick={() => setMode("demo")}
                >
                  Demo
                </Button>
              </div>
            )}
            {hasRecordingApi && mode === "voice" ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-6">
                  Click the button to start dictating. MedASR will transcribe your audio, then AI will generate a consultation report.
                </p>
                <Button size="lg" onClick={startRecording} className="gap-2">
                  <Mic className="h-5 w-5" /> Start Dictation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {hasRecordingApi
                    ? "Type or paste your dictation below to test output instantly in demo mode."
                    : "Your browser doesn't support microphone recording. Type or paste your dictation below."}
                </p>
                <Textarea
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  placeholder="Type or paste a demo consultation dictation here..."
                  className="min-h-[120px]"
                />
                <Button onClick={handleDemoProcess} disabled={!demoInput.trim()} className="w-full">
                  Generate Consultation Report
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
              <p className="text-sm text-muted-foreground italic">Recording in progress... click stop when done.</p>
            </div>
            <div className="flex justify-center">
              <Button variant="destructive" size="lg" onClick={handleStopAndProcess} className="gap-2">
                <Square className="h-4 w-4" /> Stop &amp; Process
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {stage === "processing" && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Transcribing with MedASR and generating your consultation report...</p>
            {transcript && (
              <div className="rounded-lg bg-muted/30 border border-border p-3 mx-auto max-w-md">
                <p className="text-xs text-muted-foreground line-clamp-3">{transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* Review */}
        {stage === "review" && note && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Review and edit the consultation report below.</p>

            <div>
              <label className="clinical-label mb-1 block">Consultation report</label>
              <Textarea
                value={note.summary || ""}
                onChange={(e) => updateReportText(e.target.value)}
                className="min-h-[260px] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setStage("idle");
                  setNote(null);
                }}
              >
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
