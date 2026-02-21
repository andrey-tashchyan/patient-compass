

## Patient AI Chat Agent

Add a collapsible chat panel to the patient dashboard (`/patient/[id]`) that lets doctors ask natural language questions about the patient's data, and instruct the AI to edit or delete specific fields -- all without leaving the page.

### What you'll get

1. A floating "Ask AI" button in the bottom-right corner of the patient dashboard
2. A slide-up chat panel with message history, streaming AI responses rendered in markdown
3. The AI has full read access to the patient's structured data and can answer questions like:
   - "What are the active diagnoses?"
   - "When was the last CBC performed?"
   - "List all medications and their dosages"
4. The AI can modify data when instructed:
   - "Add allergy to penicillin with anaphylaxis reaction"
   - "Change metformin dosage to 1000mg twice daily"
   - "Remove the resolved diagnosis of acute bronchitis"
   - "Update the emergency contact phone to 555-1234"
5. Changes are persisted to the database immediately and the UI refreshes

### How it works

```text
Doctor types question or instruction
           |
           v
Frontend sends message + full patient_data JSON
to "patient-chat" edge function
           |
           v
Edge function builds prompt with patient context
and sends to AI (google/gemini-3-flash-preview)
with two tools: "answer_question" and "modify_patient"
           |
           v
If AI calls "answer_question":
  -> Return text answer, display in chat
           |
If AI calls "modify_patient":
  -> Return updated patient JSON
  -> Frontend saves to DB via existing useUpdatePatient hook
  -> UI refreshes, confirmation shown in chat
```

### Technical details

**New edge function: `supabase/functions/patient-chat/index.ts`**

- Accepts POST with `{ messages: [...], patientData: Patient }`
- Streams the response back via SSE for real-time token rendering
- System prompt includes the full patient JSON as context and instructions on the two tools
- Two tools available to the AI:
  - `answer_question` -- returns `{ answer: string }` for read-only queries
  - `modify_patient` -- returns `{ updated_patient: Patient, summary: string }` for edits/deletes
- The `modify_patient` tool receives the entire patient object so the AI can make precise changes and return the full updated object
- Handles 429 (rate limit) and 402 (credits) errors

**New component: `src/components/PatientChatPanel.tsx`**

- Floating button with chat icon, expands to a panel (400px wide, docked bottom-right)
- Message list with markdown rendering (using a simple markdown-to-JSX approach with prose styles)
- Input field with send button, disabled while streaming
- When AI returns a `modify_patient` tool call:
  - Calls `updatePatient.mutate()` with the new patient data
  - Shows a confirmation message in chat: "Updated: [summary]"
  - React Query invalidates and the dashboard data refreshes
- Conversation history maintained in component state (resets on page leave)

**Modified file: `src/pages/PatientDashboard.tsx`**

- Import and render `PatientChatPanel`, passing current patient data and the update mutation

**Update `supabase/config.toml`**

- Register the `patient-chat` function with `verify_jwt = false`

### New files

| File | Purpose |
|------|---------|
| `supabase/functions/patient-chat/index.ts` | Edge function: streams AI responses with tool calling |
| `src/components/PatientChatPanel.tsx` | Chat UI component with streaming + edit capability |

### Modified files

| File | Change |
|------|--------|
| `src/pages/PatientDashboard.tsx` | Add PatientChatPanel to the page |
| `supabase/config.toml` | Register patient-chat function |
