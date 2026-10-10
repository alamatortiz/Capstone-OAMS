const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// A JWT stays cryptographically valid until it expires (up to 24h) even
// after /logout -- per the capstone paper's Logout diagram, logout must
// "cancel the login token on the server," not just note that the user left.
// user_sessions.logout_at (set by authController's logout()) is the
// server-side revocation record; a token whose session is closed is treated
// as dead here regardless of its own unexpired signature.
const isTokenRevoked = async (token) => {
  const [[row]] = await pool.query(
    `SELECT logout_at FROM user_sessions WHERE session_token = ? ORDER BY session_id DESC LIMIT 1`,
    [hashToken(token)],
  );
  return !!row?.logout_at;
};

/**
 * Verifies a raw JWT string and resolves to its decoded payload.
 * Shared by the REST auth middleware and the socket.io auth handshake
 * so both paths trust the exact same rules.
 */
const verifyAuthToken = async (token) => {
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) return reject(err);
      resolve(payload); // { userId, schoolId, role }
    });
  });
  if (await isTokenRevoked(token)) {
    throw new Error("Token revoked");
  }
  return decoded;
};

/**
 * Middleware to verify JWT and restrict access to authorized roles.
 * Expects header format: Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    try {
      if (await isTokenRevoked(token)) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
    } catch (revokeErr) {
      console.error("Token revocation check error:", revokeErr.message);
      return res.status(500).json({ message: "Internal server error" });
    }
    // Set user info on request
    req.user = decoded; // { userId, schoolId, role }
    next();
  });
};

/**
 * Middleware to restrict route access to specific roles.
 * Must be used AFTER authenticateToken.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied: Unauthorized role" });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  verifyAuthToken,
};
