import { jsPDF } from "jspdf";
import { getCollegeLogo } from "../data/collegeLogo";
import { formatTimeString } from "./dateTime";

// jsPDF's addImage needs actual image data (base64/Uint8Array/canvas), not a
// bare URL string -- it doesn't fetch URLs itself. The logo comes in as a
// Vite-bundled asset URL, so it's fetched and converted to a data URL first.
function loadImageAsDataUrl(url) {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}

// Builds a one-page, portrait "official document" for a single appointment
// (e.g. a Grade Consultation), formatted for a school submission -- distinct
// from exportPdf.js's exportTransactionsPdf, which is a bulk table export.
// `data` is the response shape of
// GET /admin/appointments/:appointmentId/certificate-data.
//
// This header/layout is a first-draft design (no letterhead template exists
// anywhere in the repo to copy from) -- expect wording/spacing tweaks once
// someone reviews an actual printout against the school's real letterhead.
export async function exportAppointmentCertificate(data) {
  const doc = new jsPDF({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  let y = 20;

  // ── Header: logo + university name ────────────────────────────────────────
  try {
    const logoUrl = getCollegeLogo(data.departmentAbbrev || data.departmentName);
    const logoDataUrl = await loadImageAsDataUrl(logoUrl);
    doc.addImage(logoDataUrl, "PNG", marginX, y - 8, 22, 22);
  } catch {
    // Non-fatal -- a missing/unloadable logo shouldn't block the document.
  }
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text("Pamantasan ng Cabuyao", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("Katapatan Homesite, Barangay Banay-Banay, Cabuyao City, Laguna", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.text(`Office of the ${data.departmentName || "College"}`, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setDrawColor(180);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 12;

  // ── Title ──────────────────────────────────────────────────────────────────
  const titleText = `CERTIFICATE OF ${(data.serviceName || "CONSULTATION").toUpperCase()} APPOINTMENT`;
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(titleText, pageWidth / 2, y, { align: "center", maxWidth: pageWidth - marginX * 2 });
  y += 14;

  // ── Body ───────────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setTextColor(30);
  const line = (label, value) => {
    doc.setFont(undefined, "bold");
    doc.text(`${label}:`, marginX, y);
    doc.setFont(undefined, "normal");
    doc.text(String(value ?? "—"), marginX + 45, y, { maxWidth: pageWidth - marginX * 2 - 45 });
    y += 8;
  };

  line("Student Name", data.studentName);
  line("Student Number", data.studentNumber);
  if (data.course) line("Program", `${data.course}${data.yearLevel ? ` — Year ${data.yearLevel}` : ""}`);
  line("Faculty Member", `${data.facultyName} (${data.facultyRole})`);
  line("Appointment Type", data.serviceName);
  line("Date", data.date);
  line(
    "Time",
    data.windowStart && data.windowEnd
      ? `${formatTimeString(data.windowStart)} – ${formatTimeString(data.windowEnd)}`
      : "—",
  );
  line("Location", data.location);
  y += 4;

  if (data.purpose) {
    doc.setFont(undefined, "bold");
    doc.text("Purpose:", marginX, y);
    y += 7;
    doc.setFont(undefined, "normal");
    const wrapped = doc.splitTextToSize(data.purpose, pageWidth - marginX * 2);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 6 + 6;
  }

  y += 10;
  doc.setFont(undefined, "normal");
  doc.setFontSize(10.5);
  doc.text(
    doc.splitTextToSize(
      `This certifies that the above-named student had a scheduled ${data.serviceName || "consultation"} appointment as recorded in the Office Automation Management System (OAMS) of Pamantasan ng Cabuyao.`,
      pageWidth - marginX * 2,
    ),
    marginX,
    y,
  );

  // ── Signature block ──────────────────────────────────────────────────────
  const sigY = Math.max(y + 40, 230);
  doc.line(marginX, sigY, marginX + 70, sigY);
  doc.setFontSize(10);
  doc.text("Prepared by", marginX, sigY + 6);
  doc.line(pageWidth - marginX - 70, sigY, pageWidth - marginX, sigY);
  doc.text("Date", pageWidth - marginX - 70, sigY + 6);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated ${generatedAt} via OAMS`, marginX, doc.internal.pageSize.getHeight() - 10);

  doc.save(`appointment-certificate-${data.appointmentId}.pdf`);
}
