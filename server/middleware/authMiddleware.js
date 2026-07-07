const jwt = require("jsonwebtoken");

/**
 * Verifies a raw JWT string and resolves to its decoded payload.
 * Shared by the REST auth middleware and the socket.io auth handshake
 * so both paths trust the exact same rules.
 */
const verifyAuthToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded); // { userId, schoolId, role }
    });
  });
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

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
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
