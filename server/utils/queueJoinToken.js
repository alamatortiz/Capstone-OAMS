const crypto = require("crypto");

// The on-site join code. The 2026-09-30 panel required that queueing stop
// being joinable from anywhere, so possession of this token is the system's
// only evidence that the student is physically standing at the office.
//
// That makes it a credential, not an identifier, which drives three choices
// the older document QR (a plain `QR-<trackingNumber>` string) does not make:
//
//   1. It is random, not derived. A predictable code could be constructed
//      off-site without ever seeing the host's screen.
//   2. Only its sha256 hash is stored. A leaked DB dump must not yield a
//      working code.
//   3. It expires in ~1 minute and the host's screen re-issues continuously,
//      so a screenshot forwarded to a friend at home is already dead.
//
// Tokens are deliberately MULTI-USE inside their window: a queue is a crowd,
// and many students scan the same screen within the same minute. Replay is
// bounded by the short TTL plus the per-slot duplicate-join guard, not by
// burning the token on first use.

// Lifetime of an issued token. Longer than ROTATE_AFTER_MS so a student who
// started scanning just before the screen flips still lands a valid code --
// without that overlap, every rotation would produce a burst of failures.
const TOKEN_TTL_MS = 60 * 1000;

// How long the host's screen should wait before asking for a fresh token.
const ROTATE_AFTER_MS = 45 * 1000;

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}

function generateRawToken() {
  // base64url: safe inside a QR payload and a URL without escaping.
  return crypto.randomBytes(32).toString("base64url");
}

// Issues a token for a slot and revokes any still-live ones, so the code last
// shown on screen is the only one that works. Runs on the caller's connection
// so it can join an in-flight transaction.
async function issueSlotToken(db, { slotId, issuedBy }) {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.query(
    `UPDATE queue_slot_tokens
        SET revoked_at = NOW()
      WHERE slot_id = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [slotId],
  );
  await db.query(
    `INSERT INTO queue_slot_tokens (slot_id, token_hash, issued_by, expires_at)
     VALUES (?, ?, ?, ?)`,
    [slotId, tokenHash, issuedBy, expiresAt],
  );

  return { token: rawToken, expiresAt, rotateAfterMs: ROTATE_AFTER_MS };
}

// Resolves a scanned token to its slot. Expiry is evaluated by MySQL's NOW(),
// never the caller's clock, so a device with a skewed clock can't widen its
// own window. Returns null when unknown/expired/revoked -- callers must not
// distinguish those cases to the student beyond "ask for the current code".
async function resolveSlotToken(db, rawToken) {
  if (typeof rawToken !== "string" || rawToken.length === 0) return null;
  const [[row]] = await db.query(
    `SELECT token_id, slot_id, expires_at
       FROM queue_slot_tokens
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [hashToken(rawToken)],
  );
  return row ?? null;
}

// Called when a queue stops accepting scans (paused/closed) so a code still
// displayed on a sleeping screen dies immediately rather than lingering for
// the rest of its TTL.
async function revokeSlotTokens(db, slotId) {
  await db.query(
    `UPDATE queue_slot_tokens
        SET revoked_at = NOW()
      WHERE slot_id = ? AND revoked_at IS NULL`,
    [slotId],
  );
}

module.exports = {
  TOKEN_TTL_MS,
  ROTATE_AFTER_MS,
  hashToken,
  generateRawToken,
  issueSlotToken,
  resolveSlotToken,
  revokeSlotTokens,
};
