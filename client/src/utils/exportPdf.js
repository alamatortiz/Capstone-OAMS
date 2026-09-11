import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Shared by all three transaction pages (student/professor/admin) so the
// PDF's layout (header, table style, footer/page-numbers) stays visually
// consistent and isn't re-implemented three times. `columns`/`rows` are
// plain arrays -- each page already builds these same shapes for its own
// CSV export, so the caller just passes the identical data through here too
// instead of maintaining a second, parallel column list.
// `summary` is an optional [{ label, value }] array -- when passed, it's
// rendered as a compact "label: value" strip between the subtitle and the
// main table (e.g. the on-screen stat cards' totals), so a report isn't just
// a raw row dump. Omit it and this behaves exactly as before.
export function exportTransactionsPdf({ title, subtitle, columns, rows, filename, summary }) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("OAMS", 14, 15);

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(title, 14, 22);
  if (subtitle) doc.text(subtitle, 14, 28);

  let tableStartY = subtitle ? 33 : 27;
  if (summary && summary.length > 0) {
    const summaryY = tableStartY + 4;
    doc.setFontSize(9);
    doc.setTextColor(40);
    const summaryLine = summary.map((s) => `${s.label}: ${s.value}`).join("     ");
    doc.text(summaryLine, 14, summaryY);
    tableStartY = summaryY + 6;
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255 }, // matches the app's --primary-color green
    alternateRowStyles: { fillColor: [245, 250, 247] },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.internal.getNumberOfPages();
  const generatedAt = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated ${generatedAt} — Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  doc.save(filename);
}
