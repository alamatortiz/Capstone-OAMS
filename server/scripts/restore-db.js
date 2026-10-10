// Restores a database from a mysqldump-format .sql file produced by
// backup-db.js (or any equivalent dump). DESTRUCTIVE -- this replaces
// existing data in the target database. Guarded accordingly:
//   - refuses to run at all without --yes
//   - if the target looks like Aiven (DB_HOST contains aivencloud.com),
//     --yes alone is not enough -- it interactively requires typing the
//     literal DB_HOST value before proceeding, regardless of --yes
//   - takes a fresh safety backup of current state immediately before
//     overwriting anything, unless --skip-safety-backup is passed
//
// Usage (from server/), same env-var convention as check-schema-drift.js:
//   npm run restore -- server/backups/<file>.sql --yes            # local
//   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... \
//     DB_SSL_CA_PATH=./ca.pem npm run restore -- <file>.sql --yes # Aiven
//
// See docs/backup-restore.md for the full writeup.

const fs = require("fs");
const readline = require("readline");
const { spawn } = require("child_process");
const { runBackup, resolveConfig } = require("./backup-db");

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.find((a) => !a.startsWith("--"));
  return {
    backupFile: positional,
    yes: flags.has("--yes"),
    skipSafetyBackup: flags.has("--skip-safety-backup"),
  };
}

function promptTypedConfirmation(expectedHost) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      `This target looks like Aiven (production). Type the host "${expectedHost}" to confirm: `,
      (answer) => {
        rl.close();
        resolve(answer.trim() === expectedHost);
      },
    );
  });
}

function buildRestoreArgs(config) {
  return [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    ...(config.sslCaPath ? [`--ssl-ca=${config.sslCaPath}`] : []),
    ...(config.isLocalHost ? ["--protocol=TCP"] : []),
    config.database,
  ];
}

async function main() {
  const { backupFile, yes, skipSafetyBackup } = parseArgs(
    process.argv.slice(2),
  );

  if (!backupFile) {
    console.error(
      "Usage: npm run restore -- <path-to-backup.sql> --yes [--skip-safety-backup]",
    );
    process.exit(1);
  }
  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }
  if (fs.statSync(backupFile).size === 0) {
    console.error(`Backup file is empty, refusing to restore: ${backupFile}`);
    process.exit(1);
  }

  const config = resolveConfig();
  const isAiven = /aivencloud\.com/i.test(config.host);

  console.log("=".repeat(60));
  console.log("RESTORE TARGET");
  console.log(`  Host:     ${config.host}:${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  File:     ${backupFile}`);
  console.log("This will REPLACE existing data in the target database.");
  console.log("=".repeat(60));

  if (isAiven) {
    const confirmed = await promptTypedConfirmation(config.host);
    if (!confirmed) {
      console.error("Confirmation did not match. Aborting, nothing changed.");
      process.exit(1);
    }
  } else if (!yes) {
    console.error("Refusing to proceed without --yes. Nothing changed.");
    process.exit(1);
  }

  if (!skipSafetyBackup) {
    console.log("Taking a safety backup of current state before restoring...");
    const safetyPath = await runBackup({ label: "pre-restore-safety" });
    console.log(`Safety backup written to: ${safetyPath}`);
  }

  const inFd = fs.openSync(backupFile, "r");
  try {
    await new Promise((resolve, reject) => {
      const child = spawn("mysql", buildRestoreArgs(config), {
        stdio: [inFd, "inherit", "inherit"],
        env: { ...process.env, MYSQL_PWD: config.password },
      });

      child.on("error", (err) => {
        if (err.code === "ENOENT") {
          reject(
            new Error(
              "mysql not found in PATH. See docs/backup-restore.md for setup.",
            ),
          );
        } else {
          reject(err);
        }
      });

      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mysql exited with code ${code}`));
      });
    });
  } finally {
    fs.closeSync(inFd);
  }

  console.log(`Restore complete: ${config.database} on ${config.host}`);
  if (isAiven) {
    console.log(
      "Reminder: rotate the Aiven password now, per docs/aiven-schema-sync.md.",
    );
  }
}

main().catch((err) => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});
