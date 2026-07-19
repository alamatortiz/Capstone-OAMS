import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(','));
  }
  return lines.join('\n');
}

// Writes `rows` (array of flat objects, keys become the header row) to a CSV
// file in the cache dir and opens the native share sheet so the user can
// save/send it — no backend export endpoint involved.
export async function exportRowsAsCsv(rows, filename) {
  if (!rows || rows.length === 0) {
    throw new Error('No data to export.');
  }
  const csv = buildCsv(rows);
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename });
}
