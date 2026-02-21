

## Export Patient Record as Structured PDF

Add an "Export PDF" button to the patient dashboard header that generates a clean, structured PDF document containing the full patient record -- entirely on the client side using the `jspdf` library.

### What you'll get

1. An "Export PDF" button next to the Edit button in the patient header
2. A well-structured, multi-page PDF containing all patient data organized by section:
   - Header with patient name, MRN, DOB, gender, age
   - Clinical summary
   - Diagnoses (with ICD codes, status, date)
   - Medications (name, dosage, frequency, indication)
   - Allergies (allergen, reaction, status)
   - Lab Results (test, result, unit, reference range, flagged)
   - Imaging Studies (type, body part, findings, impression)
   - Diagnostic Tests (type, findings, interpretation)
   - Clinical Notes (SOAP format per note)
   - Demographics and contact info
   - Insurance details
3. Automatic page breaks and consistent formatting
4. File named `PatientRecord_LastName_FirstName_Date.pdf`

### How it works

- Uses `jspdf` (lightweight, no server needed) to build the PDF entirely in the browser
- A utility function `generatePatientPdf(patient)` handles all the layout logic
- Each section is rendered as a labeled block with tabular or list formatting
- Automatic page-break detection: if content would overflow, a new page is added

### Technical details

**New dependency:** `jspdf`

**New file: `src/lib/exportPatientPdf.ts`**

- Contains `exportPatientPdf(patient: Patient)` function
- Builds the PDF using jsPDF's text API with manual Y-cursor tracking
- Sections: Patient Header, Diagnoses, Medications, Allergies, Lab Results, Imaging, Diagnostic Tests, Clinical Notes, Demographics/Insurance
- Auto page-break when Y position exceeds page height minus margin
- Downloads the file automatically via `doc.save()`

**Modified file: `src/pages/PatientDashboard.tsx`**

- Add a "Export PDF" button (with `Download` icon from lucide) next to the Edit button
- Calls `exportPatientPdf(current)` on click

### Files

| File | Change |
|------|--------|
| `src/lib/exportPatientPdf.ts` | New -- PDF generation utility |
| `src/pages/PatientDashboard.tsx` | Add Export PDF button |
| `package.json` | Add `jspdf` dependency |
