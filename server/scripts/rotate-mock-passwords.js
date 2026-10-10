// Rotates the shared mock-account password on a LIVE database. The mock
// seed files (server/db/mock/*.sql) commit the same bcrypt hash for
// "password123" across all 636 seeded accounts across all 6 colleges --
// fine for a local Docker container that's never internet-facing, but not
// fine once that same hash also protects a real, publicly reachable
// deployment (anyone who reads the repo has working logins, including the
// 6 admin accounts).
//
// This targets rows by matching the exact known-compromised hash, not by
// user_id/role -- so it can never touch a real account someone has since
// registered through the live site (bcrypt salts every hash uniquely per
// call, so a real user's own "password123" would NOT match this hash even
// if they happened to pick the same password).
//
// Usage (from server/), dry run first (no --confirm) to see the count:
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... DB_SSL_CA_PATH=... \
//     node scripts/rotate-mock-passwords.js
//
// Then actually apply it:
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... DB_SSL_CA_PATH=... \
//     node scripts/rotate-mock-passwords.js --confirm

const fs = require("fs");
const mysql = require("mysql2/promise");

const OLD_HASH = "$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK";
// Freshly generated for this rotation -- plaintext was shown once in chat,
// store it yourself (password manager / private notes), it is not written
// anywhere in this repo.
const NEW_HASH = "$2b$10$/kPv0rDh3xjVrNB6froZCO3eH3B6iESD0l/35bW7dk23eaTBGPmTa";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL_CA_PATH
      ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH) }
      : undefined,
  });

  const [rows] = await conn.query(
    "SELECT user_id, role FROM users WHERE password = ?",
    [OLD_HASH],
  );

  console.log(`Found ${rows.length} account(s) still on the compromised shared password.`);
  if (rows.length > 0) {
    const byRole = rows.reduce((acc, r) => {
      acc[r.role] = (acc[r.role] || 0) + 1;
      return acc;
    }, {});
    console.log("By role:", byRole);
  }

  if (!CONFIRM) {
    console.log("\nDry run only -- re-run with --confirm to actually rotate these.");
    await conn.end();
    return;
  }

  if (rows.length === 0) {
    console.log("Nothing to rotate.");
    await conn.end();
    return;
  }

  const userIds = rows.map((r) => r.user_id);

  const [result] = await conn.query(
    "UPDATE users SET password = ? WHERE password = ?",
    [NEW_HASH, OLD_HASH],
  );
  console.log(`Rotated ${result.affectedRows} account(s) to the new password.`);

  // A rotated password alone doesn't invalidate an already-issued JWT --
  // it stays cryptographically valid for up to 24h. Force-close every
  // still-open session for these accounts the same way authController.js's
  // logout() does, so anyone already holding one of those tokens (e.g. a
  // public admin session found via the repo) loses access immediately
  // instead of keeping it until natural expiry.
  const [sessionResult] = await conn.query(
    `UPDATE user_sessions SET logout_at = NOW()
     WHERE user_id IN (?) AND logout_at IS NULL`,
    [userIds],
  );
  console.log(`Revoked ${sessionResult.affectedRows} still-open session(s) for those accounts.`);

  await conn.end();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
