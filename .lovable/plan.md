

## Voice-to-SOAP: Real-Time Voice Dictation with AI-Powered Clinical Note Generation

Add a "Dictate Note" button to the patient dashboard that lets doctors speak naturally, see their words transcribed in real-time, then have AI automatically structure the dictation into a complete SOAP clinical note -- inserted directly into the patient's record.

This combines the browser's native Web Speech API (zero dependencies), real-time streaming transcription, and AI structuring via a backend function -- a genuinely useful clinical workflow that eliminates manual note entry.

### What you'll get

1. A "Dictate Note" button on the patient dashboard (next to Export PDF / Edit)
2. A modal with a live waveform visualizer (using Web Audio API + canvas) that responds to the doctor's voice in real-time
3. Real-time transcription displayed as the doctor speaks -- words appear letter-by-letter
4. When dictation ends, AI structures the raw transcript into a complete SOAP note:
   - Subjective, Objective, Assessment, Plan
   - Auto-fills provider name, note type, chief complaint, follow-up instructions
   - Extracts vital signs if mentioned ("BP 120/80, heart rate 72")
5. A review step where the doctor can see the structured note before confirming
6. One-click save that inserts the note into the patient's clinical notes and persists to the database

### How it works

```text
Doctor clicks "Dictate Note"
        |
        v
Modal opens with audio visualizer
Web Speech API starts listening
        |
        v
Real-time interim transcription displayed
(words appear as spoken, waveform pulses)
        |
        v
Doctor clicks "Stop" or pauses for 5s
Final transcript captured
        |
        v
Transcript + patient context sent to
"structure-dictation" edge function
        |
        v
AI returns structured SOAP note JSON
(using tool calling for reliable extraction)
        |
        v
Doctor reviews the structured note in the modal
Can edit fields before confirming
        |
        v
Note inserted into patient's clinical_notes array
Saved to database via existing useUpdatePatient hook
```

### Technical details

**New edge function: `supabase/functions/structure-dictation/index.ts`**

- Accepts POST with `{ transcript: string, patientContext: { name, age, activeDiagnoses, medications, allergies } }`
- Non-streaming (structured output via tool calling, not chat)
- Uses `google/gemini-3-flash-preview` with a `create_clinical_note` tool that returns:
  - `note_type`, `chief_complaint`, `subjective`, `objective`, `assessment`, `plan`, `follow_up_instructions`
  - `vital_signs` object (if any vitals mentioned in dictation)
- System prompt is clinically-aware: knows to separate subjective complaints from objective findings, formulate differential diagnoses, create actionable plans
- Handles 429/402 errors

**New component: `src/components/VoiceDictation.tsx`**

- Uses `window.SpeechRecognition` (WebkitSpeechRecognition fallback) for browser-native speech-to-text
- Audio visualizer built with Web Audio API:
  - `navigator.mediaDevices.getUserMedia({ audio: true })` to get mic stream
  - `AnalyserNode` with `getByteFrequencyData()` for frequency spectrum
  - Canvas renders animated bars/waveform synced to voice amplitude
- Three states: `idle` -> `recording` (live transcript + waveform) -> `processing` (AI structuring) -> `review` (editable SOAP fields) -> `done`
- Review step shows the SOAP fields in editable text areas so the doctor can correct before saving
- On confirm: calls `onSave(structuredNote)` which the parent uses to update the patient via the existing mutation hook
- Graceful fallback: if browser doesn't support Speech API, shows a textarea for manual transcript input (still gets AI structuring)

**Modified file: `src/pages/PatientDashboard.tsx`**

- Import and render `VoiceDictation` component
- Add a "Dictate Note" button with a `Mic` icon in the header actions area
- On save: appends the new note to `patient.clinical_notes`, calls `updatePatient.mutate()`

### Audio visualizer details

The waveform visualizer uses a canvas element with an `AnalyserNode` connected to the microphone. On each animation frame:
- Read 128-bin frequency data from the analyser
- Draw vertical bars with height proportional to amplitude
- Apply a gradient from the primary theme color (active) to muted (silent)
- Smooth transitions between frames using exponential decay
- When not recording, bars flatten to a flat line with a gentle idle animation

This creates a visually engaging, responsive indicator that the mic is actively listening.

### Files

| File | Change |
|------|---------|
| `supabase/functions/structure-dictation/index.ts` | New -- AI structuring of dictation into SOAP note |
| `src/components/VoiceDictation.tsx` | New -- Voice dictation modal with waveform visualizer |
| `src/pages/PatientDashboard.tsx` | Add Dictate Note button + integration |
| `supabase/config.toml` | Register structure-dictation function |

