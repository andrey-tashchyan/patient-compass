import { jsPDF } from "jspdf";
import type { Patient } from "@/types/patient";
import { Gender, getPatientAge } from "@/types/patient";
import { generatePatientSummary } from "./patientSummary";

export function exportPatientPdf(patient: Patient) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed = 20) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    checkPage(30);
    y += 8;
    doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(30, 30, 30);
    doc.text(text.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(180).setLineWidth(0.5).line(margin, y, pageW - margin, y);
    y += 14;
  };

  const label = (l: string, v: string) => {
    checkPage(16);
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(80, 80, 80);
    doc.text(l + ":", margin, y);
    doc.setFont("helvetica", "normal").setTextColor(30, 30, 30);
    doc.text(v || "—", margin + 100, y);
    y += 14;
  };

  const wrappedText = (text: string, indent = 0) => {
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text || "—", contentW - indent);
    for (const line of lines) {
      checkPage(12);
      doc.text(line, margin + indent, y);
      y += 12;
    }
  };

  // ── Header ──
  const age = getPatientAge(patient);
  const gender = patient.gender === Gender.MALE ? "Male" : patient.gender === Gender.FEMALE ? "Female" : "Other";
  doc.setFontSize(18).setFont("helvetica", "bold").setTextColor(20, 20, 20);
  doc.text(`${patient.first_name} ${patient.last_name}`, margin, y);
  y += 18;
  doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(100, 100, 100);
  doc.text(`MRN: ${patient.medical_record_number}  |  ${gender}, ${age} yrs  |  DOB: ${patient.date_of_birth}`, margin, y);
  y += 10;
  if (patient.admission_date) {
    doc.text(`Admitted: ${patient.admission_date}`, margin, y);
    y += 10;
  }
  y += 6;

  // ── Clinical Summary ──
  heading("Clinical Summary");
  wrappedText(generatePatientSummary(patient));

  // ── Diagnoses ──
  if (patient.diagnoses.length) {
    heading("Diagnoses");
    for (const d of patient.diagnoses) {
      checkPage(16);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`• ${d.condition}`, margin + 4, y);
      const meta = [d.icd_code, d.status, d.date_diagnosed].filter(Boolean).join(" · ");
      if (meta) {
        doc.setFont("helvetica", "normal").setTextColor(100, 100, 100);
        doc.text(meta, margin + 220, y);
      }
      y += 14;
    }
  }

  // ── Medications ──
  if (patient.current_medications.length) {
    heading("Medications");
    for (const m of patient.current_medications) {
      checkPage(16);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`• ${m.name}`, margin + 4, y);
      doc.setFont("helvetica", "normal").setTextColor(80, 80, 80);
      doc.text(`${m.dosage} · ${m.frequency}${m.indication ? ` · ${m.indication}` : ""}`, margin + 160, y);
      y += 14;
    }
  }

  // ── Allergies ──
  if (patient.allergies.length) {
    heading("Allergies");
    for (const a of patient.allergies) {
      checkPage(16);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`• ${a.allergen}`, margin + 4, y);
      const meta = [a.reaction, a.status].filter(Boolean).join(" · ");
      if (meta) {
        doc.setFont("helvetica", "normal").setTextColor(100, 100, 100);
        doc.text(meta, margin + 160, y);
      }
      y += 14;
    }
  }

  // ── Lab Results ──
  if (patient.lab_results.length) {
    heading("Lab Results");
    for (const l of patient.lab_results) {
      checkPage(16);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(l.flagged ? 180 : 30, 30, 30);
      doc.text(`• ${l.test_name}`, margin + 4, y);
      doc.setFont("helvetica", "normal").setTextColor(80, 80, 80);
      doc.text(`${l.result} ${l.unit}  (ref: ${l.reference_range})${l.flagged ? "  ⚑" : ""}`, margin + 160, y);
      y += 14;
    }
  }

  // ── Imaging ──
  if (patient.imaging_studies.length) {
    heading("Imaging Studies");
    for (const s of patient.imaging_studies) {
      checkPage(40);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`${s.study_type} — ${s.body_part} (${s.date_performed})`, margin + 4, y);
      y += 14;
      wrappedText(`Findings: ${s.findings}`, 8);
      wrappedText(`Impression: ${s.impression}`, 8);
      y += 4;
    }
  }

  // ── Diagnostic Tests ──
  if (patient.diagnostic_tests.length) {
    heading("Diagnostic Tests");
    for (const t of patient.diagnostic_tests) {
      checkPage(40);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`${t.test_type} (${t.date_performed})`, margin + 4, y);
      y += 14;
      wrappedText(`Findings: ${t.findings}`, 8);
      wrappedText(`Interpretation: ${t.interpretation}`, 8);
      y += 4;
    }
  }

  // ── Clinical Notes ──
  if (patient.clinical_notes.length) {
    heading("Clinical Notes");
    for (const n of patient.clinical_notes) {
      checkPage(60);
      doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(30, 30, 30);
      doc.text(`${n.note_type} — ${n.date_of_service} — ${n.provider_name}, ${n.provider_credentials}`, margin + 4, y);
      y += 14;
      if (n.chief_complaint) { label("Chief Complaint", n.chief_complaint); }
      label("Subjective", ""); wrappedText(n.subjective, 8);
      label("Objective", ""); wrappedText(n.objective, 8);
      label("Assessment", ""); wrappedText(n.assessment, 8);
      label("Plan", ""); wrappedText(n.plan, 8);
      if (n.follow_up_instructions) { label("Follow-up", n.follow_up_instructions); }
      y += 6;
    }
  }

  // ── Demographics ──
  heading("Demographics & Contact");
  label("Phone", patient.contact_info.phone);
  label("Address", patient.contact_info.address);
  label("Emergency", `${patient.contact_info.emergency_contact_name} (${patient.contact_info.emergency_contact_relation})${patient.contact_info.emergency_contact_phone ? " — " + patient.contact_info.emergency_contact_phone : ""}`);
  if (patient.primary_care_physician) label("PCP", patient.primary_care_physician);
  if (patient.hospital) label("Hospital", patient.hospital);

  heading("Insurance");
  label("Provider", patient.insurance.provider);
  label("Plan", patient.insurance.plan_type);

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7).setFont("helvetica", "normal").setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${totalPages}  ·  Generated ${new Date().toISOString().split("T")[0]}`, margin, pageH - 20);
  }

  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  doc.save(`PatientRecord_${patient.last_name}_${patient.first_name}_${date}.pdf`);
}
