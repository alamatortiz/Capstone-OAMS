// Prefixes a leading =/+/-/@ with a straight quote so a formula-looking cell
// (e.g. a details string starting with "=") can't execute as one when the CSV
// is opened in Excel/Sheets.
export function csvEscape(value) {
  const str = String(value ?? "");
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

// rows: array of arrays. Builds the CSV and triggers a browser download.
export function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
