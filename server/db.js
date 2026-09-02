const fs = require("fs");
const mysql = require("mysql2/promise");

// TiDB Cloud (and most managed MySQL hosts) require SSL; local Docker MySQL
// does not use or need it. Only attach ssl when a CA cert path is actually
// given, so this stays a no-op against docker-compose's local db service.
// (TiDB Cloud's cert is publicly signed, unlike Aiven's -- Node's own
// trusted CA store would likely accept it without DB_SSL_CA_PATH at all,
// but pointing this at a plain CA bundle, e.g. curl.se's cacert.pem, works
// too and is what's actually configured/tested.)
const ssl = process.env.DB_SSL_CA_PATH
  ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Akosimatt123",
  database: process.env.DB_NAME || "oams_db",
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // The DB container has no TZ override (see docker-compose.yml) and MySQL
  // defaults to SYSTEM/UTC, so CURRENT_TIMESTAMP/NOW() store UTC instants.
  // "Z" tells the driver the connection is UTC so it does NOT re-shift those
  // values -- all Manila conversion happens app-side via getManilaDateString
  // / formatManilaDate* (client) and getManilaDateString / getManilaTimeString
  // (server). DO NOT change this to "+08:00" unless the db container is also
  // given TZ: Asia/Manila in docker-compose.yml -- doing one without the
  // other silently shifts every TIMESTAMP column by ~8 hours (this has
  // happened before; if you're about to "fix" this, check docker-compose.yml
  // first, not just this comment).
  timezone: "Z",
});

module.exports = pool;
