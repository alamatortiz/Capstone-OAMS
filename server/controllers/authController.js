const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");
const { sendServerError } = require("../utils/errorResponse");

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
    return sendServerError(res, error, "Login Server Error:");
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
    return sendServerError(res, error, "Get current user error:");
  }
};

// Upserts by token (not user_id): a device's token can outlive one user's
// session (shared/reissued campus devices), so re-registering on login just
// reattaches the token to whoever's logged in now rather than erroring on
// the existing unique constraint.
const registerPushToken = async (req, res) => {
  const { expoPushToken } = req.body;
  if (!expoPushToken) {
    return res.status(400).json({ error: "expoPushToken is required" });
  }

  try {
    await pool.query(
      `INSERT INTO push_tokens (user_id, expo_push_token) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP`,
      [req.user.userId, expoPushToken],
    );
    res.json({ message: "Push token registered" });
  } catch (error) {
    console.error("Register push token error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Registration is intentionally split into two endpoints instead of one
// shared handler with a `role` field -- the role is a literal baked into
// each function's own INSERT, never read from req.body, so a request
// against /register/student can only ever produce a student row no matter
// what else is in the payload. This is the actual guarantee behind handing
// out separate student/faculty registration links.
const registerStudent = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    studentNumber,
    yearLevel,
    collegeAbbrev,
    password,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !studentNumber ||
    !yearLevel ||
    !collegeAbbrev ||
    !password
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  const yearLevelNum = Number(yearLevel);
  if (!Number.isInteger(yearLevelNum) || yearLevelNum < 1 || yearLevelNum > 5) {
    return res
      .status(400)
      .json({ error: "Year level must be a whole number from 1 to 5" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[department]] = await conn.query(
      "SELECT department_id FROM departments WHERE department_abbreviation = ?",
      [collegeAbbrev],
    );
    if (!department) {
      await conn.rollback();
      return res.status(400).json({ error: "Invalid college selected" });
    }

    const [dupes] = await conn.query(
      "SELECT student_id FROM students WHERE student_number = ? OR email = ?",
      [studentNumber, email],
    );
    if (dupes.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: "An account with this student number or email already exists",
      });
    }

    const [userResult] = await conn.query(
      "INSERT INTO users (password, role, status) VALUES (?, 'student', 'active')",
      [hashedPassword],
    );
    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO students (student_id, student_number, first_name, last_name, year_level, email, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        studentNumber,
        firstName,
        lastName,
        yearLevelNum,
        email,
        department.department_id,
      ],
    );

    await conn.commit();
    console.log(
      `New student registration: user_id=${userId}, student_number=${studentNumber}, ${new Date().toISOString()}`,
    );
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "An account with this student number or email already exists",
      });
    }
    sendServerError(res, error, "Student registration error:");
  } finally {
    conn.release();
  }
};

const registerFaculty = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    employeeId,
    specialization,
    collegeAbbrev,
    password,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !employeeId ||
    !collegeAbbrev ||
    !password
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[department]] = await conn.query(
      "SELECT department_id FROM departments WHERE department_abbreviation = ?",
      [collegeAbbrev],
    );
    if (!department) {
      await conn.rollback();
      return res.status(400).json({ error: "Invalid college selected" });
    }

    const [dupes] = await conn.query(
      "SELECT faculty_id FROM faculty WHERE employee_id = ? OR email = ?",
      [employeeId, email],
    );
    if (dupes.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: "An account with this employee ID or email already exists",
      });
    }

    const [userResult] = await conn.query(
      "INSERT INTO users (password, role, status) VALUES (?, 'faculty', 'active')",
      [hashedPassword],
    );
    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        employeeId,
        firstName,
        lastName,
        specialization || null,
        email,
        department.department_id,
      ],
    );

    await conn.commit();
    console.log(
      `New faculty registration: user_id=${userId}, employee_id=${employeeId}, ${new Date().toISOString()}`,
    );
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "An account with this employee ID or email already exists",
      });
    }
    sendServerError(res, error, "Faculty registration error:");
  } finally {
    conn.release();
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

module.exports = {
  login,
  getCurrentUser,
  logout,
  registerPushToken,
  registerStudent,
  registerFaculty,
};
