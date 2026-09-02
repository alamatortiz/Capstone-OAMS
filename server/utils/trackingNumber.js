// Generates the next sequential tracking number for a table (REQ-00001,
// FDR-00001, SUB-00001, ...), replacing the DB-trigger-based approach this
// project used to rely on (ts_auto_tracking_number / _faculty / _submission).
// TiDB doesn't support triggers at all, so this now happens in application
// code, computed just before the INSERT that uses it -- pass the same
// pool/connection the insert itself will use, so a caller inside a
// transaction gets a consistent read.
//
// Same MAX(id)+1 scheme the triggers used (they read the table's current
// max BEFORE the new row's own auto-increment id was assigned, same as
// this does) -- not perfectly race-proof under truly simultaneous inserts,
// but that was already true of the trigger version too. Not a regression,
// just relocated.
async function nextTrackingNumber(executor, table, idColumn, prefix) {
  const [[row]] = await executor.query(
    `SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id FROM ${table}`,
  );
  return `${prefix}-${String(row.next_id).padStart(5, "0")}`;
}

module.exports = { nextTrackingNumber };
