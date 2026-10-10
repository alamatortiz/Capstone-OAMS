// Sequential tracking numbers (APT-00001, REQ-00001, FDR-00001, SUB-00001)
// handed out from a dedicated per-prefix counter row in `tracking_counters`.
//
// Why a counter instead of MAX(id)+1: two simultaneous requests used to read
// the same MAX, compute the same number, and the second INSERT then failed on
// the UNIQUE tracking_number (a booking even reported it as "you already have
// an active booking"). Numbers also skipped whenever record ids did.
//
// nextTrackingNumber locks the prefix's counter row (SELECT ... FOR UPDATE),
// so a concurrent request waits for the first transaction to finish. Call it
// with the same connection, inside the same transaction, as the INSERT that
// uses the number -- the increment then commits or rolls back together with
// the record, so a failed request never burns a number (no gaps).

// Which table/column each prefix's existing numbers live in -- used only to
// seed a counter from the highest number already issued.
const PREFIX_SOURCES = {
  APT: "appointments",
  REQ: "document_requests",
  FDR: "faculty_document_requests",
  SUB: "document_submissions",
};

function formatTrackingNumber(prefix, value) {
  // padStart never truncates (unlike SQL LPAD), so 100000+ stays intact.
  return `${prefix}-${String(value).padStart(5, "0")}`;
}

function seedSql(prefix) {
  const table = PREFIX_SOURCES[prefix];
  if (!table) throw new Error(`Unknown tracking number prefix: ${prefix}`);
  // INSERT IGNORE never overwrites a counter that already exists.
  return {
    sql: `INSERT IGNORE INTO tracking_counters (prefix, last_number)
          SELECT ?, COALESCE(MAX(CAST(SUBSTRING_INDEX(tracking_number, '-', -1) AS UNSIGNED)), 0)
          FROM ${table}`,
    params: [prefix],
  };
}

// Creates and seeds the counter table. DDL lives here (server startup) and
// NEVER inside a request: MySQL implicitly commits any open transaction on
// CREATE TABLE, even with IF NOT EXISTS. Takes the executor as a parameter
// so this module doesn't import db.js (keeps its unit test DB-free).
async function ensureTrackingCounters(executor) {
  await executor.query(
    `CREATE TABLE IF NOT EXISTS tracking_counters (
       prefix     VARCHAR(10)  PRIMARY KEY,
       last_number INT UNSIGNED NOT NULL
     )`,
  );
  for (const prefix of Object.keys(PREFIX_SOURCES)) {
    const { sql, params } = seedSql(prefix);
    await executor.query(sql, params);
  }
}

async function nextTrackingNumber(conn, prefix) {
  let [[row]] = await conn.query(
    `SELECT last_number FROM tracking_counters WHERE prefix = ? FOR UPDATE`,
    [prefix],
  );
  if (!row) {
    // Safety net if startup seeding missed this prefix -- DML only, so it's
    // safe inside the caller's transaction.
    const { sql, params } = seedSql(prefix);
    await conn.query(sql, params);
    [[row]] = await conn.query(
      `SELECT last_number FROM tracking_counters WHERE prefix = ? FOR UPDATE`,
      [prefix],
    );
  }
  const next = Number(row.last_number) + 1;
  await conn.query(`UPDATE tracking_counters SET last_number = ? WHERE prefix = ?`, [next, prefix]);
  return formatTrackingNumber(prefix, next);
}

module.exports = { nextTrackingNumber, ensureTrackingCounters, formatTrackingNumber };
