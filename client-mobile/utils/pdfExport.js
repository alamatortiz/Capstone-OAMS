import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function escapeHtml(value) {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mirrors client/src/utils/exportPdf.js's exportTransactionsPdf() -- same
// header/table/footer shape -- but built as an HTML string handed to
// expo-print (RN has no jsPDF equivalent) rather than assembled with jsPDF +
// jspdf-autotable. `columns`/`rows` are the same plain arrays each screen
// already builds for its own CSV export, so this is a drop-in second
// consumer of that data, not a separate pipeline.
export async function exportRowsAsPdf({ title, subtitle = '', columns, rows, filename }) {
  if (!rows || rows.length === 0) {
    throw new Error('No data to export.');
  }
  const generatedAt = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const headHtml = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: landscape; margin: 24px; }
          body { font-family: Helvetica, Arial, sans-serif; color: #141414; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          .subtitle { font-size: 13px; color: #5a5a5a; margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #22c55e; color: #ffffff; text-align: left; padding: 6px 8px; }
          td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f5faf7; }
          .footer { margin-top: 16px; font-size: 10px; color: #969696; }
        </style>
      </head>
      <body>
        <h1>OAMS</h1>
        <p class="subtitle">${escapeHtml(title)}${subtitle ? ` — ${escapeHtml(subtitle)}` : ''}</p>
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
        <p class="footer">Generated ${escapeHtml(generatedAt)}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename });
}
