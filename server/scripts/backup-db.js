// Dumps the full database (schema + data) to server/backups/ via the real
// mysqldump binary -- not a row-by-row export through mysql2 -- so stored
// TIMESTAMP/DATETIME values round-trip as the exact literal text already in
// the database, sidestepping db.js's "timezone: Z" UTC-storage convention
// entirely rather than having to carefully replicate it.
//
// Also importable as a module (see restore-db.js, which calls runBackup()
// directly for its pre-restore safety backup).
//
// Usage (from server/), same env-var convention as check-schema-drift.js:
//   npm run backup                                  # local Docker, zero config
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
//     DB_SSL_CA_PATH=./ca.pem npm run backup         # Aiven
//
// See docs/backup-restore.md for the full writeup.

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BACKUPS_DIR = path.join(__dirname, "..", "backups");

function resolveConfig() {
  const host = process.env.DB_HOST || "localhost";
  return {
    host,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Akosimatt123",
    database: process.env.DB_NAME || "oams_db",
    sslCaPath: process.env.DB_SSL_CA_PATH || null,
    // The mysql/mysqldump C-client defaults to a named pipe (not TCP) when
    // the host is literally "localhost" on Windows -- unlike mysql2 (pure
    // JS, always TCP), which is why db.js never had to think about this. On
    // a machine with both a native MySQL service AND the Docker container,
    // that ambiguity could silently dump/restore the wrong instance with no
    // error. Force TCP whenever we mean "the Docker container".
    isLocalHost: host === "localhost" || host === "127.0.0.1",
  };
}

function buildArgs(config) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    ...(config.sslCaPath ? [`--ssl-ca=${config.sslCaPath}`] : []),
    ...(config.isLocalHost ? ["--protocol=TCP"] : []),
    "--single-transaction", // consistent InnoDB snapshot, no table locking against a live app
    "--routines",
    "--triggers",
    "--events",
    // Aiven runs GTID-enabled MySQL; avnadmin may lack privileges to read
    // gtid_executed, and a dump's GTID_PURGED statement wouldn't cleanly
    // cross environments (Aiven <-> local) anyway.
    "--set-gtid-purged=OFF",
    "--no-tablespaces", // avoids a common PROCESS-privilege error on managed MySQL
    // This machine's mysqldump is 8.4; the Docker image and Aiven are both
    // 8.0.x -- that exact version skew is the classic trigger for the
    // "Unknown table 'COLUMN_STATISTICS'" mysqldump failure.
    "--column-statistics=0",
    config.database,
  ];
}

async function runBackup({ label } = {}) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const config = resolveConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `oams_db_${label ? label + "_" : ""}${timestamp}`;
  const finalPath = path.join(BACKUPS_DIR, `${baseName}.sql`);
  const tmpPath = `${finalPath}.tmp`;

  const outFd = fs.openSync(tmpPath, "w");
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("mysqldump", buildArgs(config), {
        stdio: ["ignore", outFd, "inherit"],
        env: { ...process.env, MYSQL_PWD: config.password },
      });

      child.on("error", (err) => {
        if (err.code === "ENOENT") {
          reject(
            new Error(
              "mysqldump not found in PATH. See docs/backup-restore.md for setup.",
            ),
          );
        } else {
          reject(err);
        }
      });

      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mysqldump exited with code ${code}`));
      });
    });
  } finally {
    fs.closeSync(outFd);
  }

  // Only claim the final name once mysqldump has actually succeeded -- a
  // mid-dump failure (dropped connection, disk full) must never leave a
  // truncated file indistinguishable from a good one.
  fs.renameSync(tmpPath, finalPath);
  return finalPath;
}

if (require.main === module) {
  runBackup()
    .then((backupPath) => {
      console.log(`Backup complete: ${backupPath}`);
    })
    .catch((err) => {
      console.error("Backup failed:", err.message);
      process.exit(1);
    });
}

module.exports = { runBackup, resolveConfig };
