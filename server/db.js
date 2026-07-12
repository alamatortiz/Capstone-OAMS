const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Akosimatt123",
  database: process.env.DB_NAME || "oams_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // The DB container runs with TZ=Asia/Manila (see docker-compose.yml), so
  // MySQL's CURRENT_TIMESTAMP/NOW() store Manila wall-clock time. Tell the
  // driver the stored values are +08:00 so it doesn't mislabel them as UTC.
  timezone: "+08:00",
});

module.exports = pool;
