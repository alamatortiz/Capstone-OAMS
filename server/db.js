const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Akosimatt123",
  database: process.env.DB_NAME || "oams_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // MySQL (SYSTEM/UTC in this container) stores and returns TIMESTAMP values
  // in UTC; tell the driver they're UTC so it doesn't re-shift them. Display
  // conversion to Philippine time happens explicitly via the Asia/Manila
  // formatters in server/utils/dateTime.js and client/src/utils/dateTime.js.
  timezone: "Z",
});

module.exports = pool;
