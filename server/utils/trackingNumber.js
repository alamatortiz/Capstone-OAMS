// Generates the next sequential tracking number for a table (REQ-00001,
// FDR-00001, SUB-00001, ...). TiDB doesn't support triggers, so this runs
// in application code, computed just before the INSERT that uses it --
// pass the same pool/connection the insert itself will use, so a caller
// inside a transaction gets a consistent read.
//
// MAX(id)+1 scheme: reads the table's current max before the new row's
// own auto-increment id is assigned. Not perfectly race-proof under truly
// simultaneous inserts.
async function nextTrackingNumber(executor, table, idColumn, prefix) {
  const [[row]] = await executor.query(
    `SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id FROM ${table}`,
  );
  return `${prefix}-${String(row.next_id).padStart(5, "0")}`;
}

module.exports = { nextTrackingNumber };
