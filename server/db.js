const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Akosimatt123",
  database: process.env.DB_NAME || "oams_db",
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
