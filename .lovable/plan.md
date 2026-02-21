

## Add Patient from PDF Upload

Add an "Add Patient" button to the dashboard that opens a dialog where users upload a PDF of medical records. An AI agent parses the PDF text into the structured Patient format and saves it to the database.

### What you'll get

1. An "Add Patient" button on the dashboard next to the "Patients" label
2. A dialog with a file upload area (drag-and-drop or click to browse) for PDF files
3. A backend function that extracts text from the PDF and uses AI to parse it into structured patient data
4. The parsed patient is inserted into the database and the list refreshes automatically
5. Loading state and error handling throughout the flow

### How it works

```text
User uploads PDF
       |
       v
Frontend reads file, converts to base64
       |
       v
Calls "parse-patient-pdf" edge function
       |
       v
Edge function extracts text from PDF (pdf-parse library)
       |
       v
Sends text + Patient schema to Lovable AI (Gemini 2.5 Pro)
with tool calling to get structured JSON output
       |
       v
Validates and returns structured Patient object
       |
       v
Frontend inserts into patients table via Supabase client
       |
       v
React Query invalidates cache, list refreshes
```

### Technical details

**New edge function: `supabase/functions/parse-patient-pdf/index.ts`**

- Accepts a POST with `{ pdfBase64: string }` (the PDF file as base64)
- Uses pdf-parse (npm) to extract raw text from the PDF
- Sends the extracted text to the Lovable AI Gateway (`google/gemini-2.5-pro`) with tool calling
- The tool schema mirrors the Patient interface exactly, ensuring structured output
- Returns the parsed Patient JSON to the frontend
- Handles errors: invalid PDF, AI parsing failure, rate limits (429), payment required (402)

**Update `supabase/config.toml`:**
- Add the `parse-patient-pdf` function with `verify_jwt = false` (auth validated in code)

**New component: `src/components/AddPatientDialog.tsx`**

- Dialog with file upload (accepts `.pdf` only, max 20MB)
- Drag-and-drop zone with visual feedback
- Shows progress states: uploading, parsing, saving
- On success: inserts the patient into the database via Supabase client, invalidates the patients query, closes dialog, shows success toast
- On error: shows error toast with message

**Modified file: `src/pages/Index.tsx`**

- Add an "Add Patient" button (with Plus icon) next to the Patients label
- Render the AddPatientDialog component

**AI Prompt Strategy:**

The edge function uses tool calling (not raw JSON output) to extract structured data. The tool schema defines every field of the Patient interface. The system prompt instructs the AI to:
- Generate a unique patient_id and medical_record_number if not found in the document
- Extract all available clinical data: demographics, allergies, medications, diagnoses, lab results, imaging, diagnostic tests, clinical notes
- Use reasonable defaults for required fields that aren't in the document
- Map free-text diagnoses to appropriate status values (active/resolved/chronic)

**Model choice:** `google/gemini-2.5-pro` -- best for complex document parsing with large context and structured extraction. This model is available through the built-in Lovable AI gateway at no extra setup cost.

