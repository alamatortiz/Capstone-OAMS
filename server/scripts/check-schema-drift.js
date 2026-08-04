// Compares server/oams_db.sql against a live database and reports any table
// or column the schema file defines that the live database is missing.
// Read-only -- prints a report, does not modify anything. When it finds
// something missing, pull the matching CREATE TABLE / write an ALTER TABLE
// yourself and run it against the target database (see server/db/*.sql for
// examples of one-off migrations already written this way).
//
// Usage (from server/):
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... DB_SSL_CA_PATH=... \
//     node scripts/check-schema-drift.js

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const SCHEMA_PATH = path.join(__dirname, "..", "oams_db.sql");

// Lines that start a real column always start with a bare identifier
// followed by whitespace then a type. Constraint/index lines and
// continuation lines from multi-line expressions (generated columns'
// CASE/WHEN/THEN/ELSE/END, or a lone closing paren) never look like that,
// so they're excluded by keyword rather than guessed at structurally.
const NON_COLUMN_KEYWORDS = [
  "FOREIGN",
  "CONSTRAINT",
  "INDEX",
  "UNIQUE",
  "PRIMARY",
  "CHECK",
  "KEY",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
];

function stripSqlComments(sql) {
  // Line comments only (-- ...) -- this schema file doesn't use /* */ for
  // anything other than the file's own header banners, which sit outside
  // any CREATE TABLE body.
  return sql.replace(/--.*$/gm, "");
}

function parseSchemaFile(sql) {
  const tables = {};
  const clean = stripSqlComments(sql);
  const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)\s*\(([\s\S]*?)\n\);/g;
  let match;
  while ((match = tableRegex.exec(clean)) !== null) {
    const [, tableName, body] = match;
    const columns = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => /^[A-Za-z_]\w*\s/.test(line)) // real column lines start "name<space>TYPE..."; continuation/punctuation lines don't
      .filter((line) => !NON_COLUMN_KEYWORDS.includes(line.split(/\s+/)[0].toUpperCase()))
      .map((line) => line.split(/\s+/)[0].replace(/,$/, ""))
      .filter(Boolean);
    tables[tableName] = columns;
  }
  return tables;
}

async function getLiveSchema(pool) {
  const [tableRows] = await pool.query("SHOW TABLES");
  const dbNameKey = Object.keys(tableRows[0] || {})[0];
  const tableNames = tableRows.map((row) => row[dbNameKey]);

  const live = {};
  for (const name of tableNames) {
    const [columnRows] = await pool.query(`SHOW COLUMNS FROM \`${name}\``);
    live[name] = columnRows.map((row) => row.Field);
  }
  return live;
}

async function main() {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");
  const expected = parseSchemaFile(schemaSql);

  const ssl = process.env.DB_SSL_CA_PATH
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
    : undefined;

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "oams_db",
    ssl,
  });

  const live = await getLiveSchema(pool);
  await pool.end();

  let foundDrift = false;

  for (const [table, expectedColumns] of Object.entries(expected)) {
    if (!live[table]) {
      foundDrift = true;
      console.log(`[MISSING TABLE] ${table}`);
      continue;
    }
    const liveColumns = new Set(live[table]);
    const missingColumns = expectedColumns.filter((col) => !liveColumns.has(col));
    if (missingColumns.length > 0) {
      foundDrift = true;
      console.log(`[MISSING COLUMNS] ${table}: ${missingColumns.join(", ")}`);
    }
  }

  const extraTables = Object.keys(live).filter((t) => !expected[t]);
  if (extraTables.length > 0) {
    console.log(`[EXTRA TABLES] not in oams_db.sql (harmless, informational only): ${extraTables.join(", ")}`);
  }

  if (!foundDrift) {
    console.log("No drift found -- live database matches oams_db.sql.");
  }
}

main().catch((err) => {
  console.error("check-schema-drift failed:", err.message);
  process.exit(1);
});
