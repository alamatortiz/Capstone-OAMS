const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

// Per the capstone paper's User Login Activity Diagram: "a three-tries limit
// before a temporary lockout of the account." The paper doesn't specify an
// exact lockout duration (just "temporary"), so 15 minutes is used as a
// reasonable default -- adjust if the paper is later revised with a number.
const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const fetchUserProfile = async (userId, role) => {
  let query = "";
  if (role === "student") {
    query = `
      SELECT u.user_id, u.role, u.status,
             s.student_number, s.first_name, s.last_name, s.course, s.year_level, s.email, s.department_id,
             d.department_name, d.department_abbreviation
      FROM users u
      JOIN students s ON u.user_id = s.student_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE u.user_id = ?
    `;
  } else if (role === "faculty") {
    query = `
      SELECT u.user_id, u.role, u.status,
             f.employee_id, f.first_name, f.last_name, f.specialization, f.email, f.department_id,
             d.department_name, d.department_abbreviation
      FROM users u
      JOIN faculty f ON u.user_id = f.faculty_id
      LEFT JOIN departments d ON f.department_id = d.department_id
      WHERE u.user_id = ?
    `;
  } else if (role === "admin") {
    query = `
      SELECT u.user_id, u.role, u.status,
             a.employee_id, a.first_name, a.last_name, a.position, a.email, a.department_id,
             d.department_name, d.department_abbreviation
      FROM users u
      JOIN administrators a ON u.user_id = a.admin_id
      LEFT JOIN departments d ON a.department_id = d.department_id
      WHERE u.user_id = ?
    `;
  } else {
    throw new Error("Invalid user role");
  }

  const [rows] = await pool.query(query, [userId]);
  return rows[0] || null;
};

const login = async (req, res) => {
  const { emailOrSchoolId, password } = req.body;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
  const userAgent = req.headers["user-agent"] || "";

  if (!emailOrSchoolId || !password) {
    return res
      .status(400)
      .json({ error: "Email/School ID and password are required" });
  }

  try {
    const userQuery = `
      SELECT u.user_id, u.password, u.role, u.status, u.failed_login_attempts, u.locked_until
      FROM users u
      LEFT JOIN students s ON u.user_id = s.student_id
      LEFT JOIN faculty f ON u.user_id = f.faculty_id
      LEFT JOIN administrators a ON u.user_id = a.admin_id
      WHERE s.student_number = ? OR f.employee_id = ? OR a.employee_id = ? OR s.email = ? OR f.email = ? OR a.email = ?
      LIMIT 1
    `;

    const [users] = await pool.query(userQuery, [
      emailOrSchoolId,
      emailOrSchoolId,
      emailOrSchoolId,
      emailOrSchoolId,
      emailOrSchoolId,
      emailOrSchoolId,
    ]);

    if (users.length === 0) {
      await pool.query(
        `INSERT INTO login_logs (user_id, user_id_attempted, ip_address, user_agent, login_status, failure_reason)
         VALUES (NULL, ?, ?, ?, 'failed', 'User not found')`,
        [emailOrSchoolId, ipAddress, userAgent],
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    if (user.status !== "active") {
      await pool.query(
        `INSERT INTO login_logs (user_id, user_id_attempted, ip_address, user_agent, login_status, failure_reason)
         VALUES (?, ?, ?, ?, 'failed', ?)`,
        [
          user.user_id,
          emailOrSchoolId,
          ipAddress,
          userAgent,
          `Account ${user.status}`,
        ],
      );
      return res.status(403).json({
        error: `Your account is currently ${user.status}. Please contact the administrator.`,
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await pool.query(
        `INSERT INTO login_logs (user_id, user_id_attempted, ip_address, user_agent, login_status, failure_reason)
         VALUES (?, ?, ?, ?, 'failed', 'account_locked')`,
        [user.user_id, emailOrSchoolId, ipAddress, userAgent],
      );
      const unlockTime = new Date(user.locked_until).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return res.status(423).json({
        error: `Too many failed login attempts. Try again after ${unlockTime}.`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const nextAttempts = user.failed_login_attempts + 1;
      const lockingNow = nextAttempts >= MAX_FAILED_ATTEMPTS;

      await pool.query(
        `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE user_id = ?`,
        [
          lockingNow ? 0 : nextAttempts,
          lockingNow
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
          user.user_id,
        ],
      );
      await pool.query(
        `INSERT INTO login_logs (user_id, user_id_attempted, ip_address, user_agent, login_status, failure_reason)
         VALUES (?, ?, ?, ?, 'failed', 'Incorrect password')`,
        [user.user_id, emailOrSchoolId, ipAddress, userAgent],
      );

      if (lockingNow) {
        return res.status(423).json({
          error: `Too many failed login attempts. Your account has been locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const tokenPayload = {
      userId: user.user_id,
      role: user.role,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });

    await pool.query(
      "UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?",
      [user.user_id],
    );
    await pool.query(
      `INSERT INTO login_logs (user_id, user_id_attempted, ip_address, user_agent, login_status, failure_reason)
       VALUES (?, ?, ?, ?, 'success', NULL)`,
      [user.user_id, emailOrSchoolId, ipAddress, userAgent],
    );

    const decoded = jwt.decode(token);
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))`,
      [user.user_id, hashToken(token), ipAddress, userAgent, decoded.exp],
    );

    const profile = await fetchUserProfile(user.user_id, user.role);

    res.json({ message: "Login successful", token, user: profile });
  } catch (error) {
    console.error("Login Server Error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", dev_error: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const profile = await fetchUserProfile(userId, role);
    if (!profile)
      return res.status(404).json({ error: "User profile not found" });
    res.json({ user: profile });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
      await pool.query(
        `UPDATE user_sessions SET logout_at = NOW() WHERE session_token = ? AND logout_at IS NULL`,
        [hashToken(token)],
      );
    }
  } catch (error) {
    console.error("Logout session update error:", error.message);
  }
  res.json({ message: "Logout successful" });
};

module.exports = { login, getCurrentUser, logout };
