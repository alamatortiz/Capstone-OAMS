const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../../db");
const { authenticateToken, authorizeRoles } = require("../../middleware/authMiddleware");
const { getManilaDateString, manilaDayStartUTC, manilaDayEndExclusiveUTC } = require("../../utils/dateTime");
const { sendServerError } = require("../../utils/errorResponse");
const { logAudit } = require("../../utils/auditLog");
const { releaseFacultyLane, emitFacultyLaneReleased } = require("../../utils/queueHandoff");

// A professor who is deleted, suspended/deactivated or moved to another
// department can no longer serve the queue students the college office passed
// to them, so those students go back to the office line (keeping their place;
// cancelled with a priority credit if that office queue was already stopped).
// `alsoInTx` runs extra writes in the SAME transaction, under the faculty-row
// lock -- used by delete so the professor can't call a student in between the
// release and the account disappearing.
async function releaseFacultyQueueStudents(facultyId, changedBy, alsoInTx = null) {
  const conn = await pool.getConnection();
  let result;
  try {
    await conn.beginTransaction();
    result = await releaseFacultyLane(conn, facultyId, { changedBy });
    if (alsoInTx) await alsoInTx(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  emitFacultyLaneReleased(result);
}

// Mounted by routes/adminRoutes.js at its root, so every path below is still
// served at /api/admin/<path> exactly as before. None of these paths overlap
// an adminRoutes.js path, so the mount position doesn't change routing.

// ─────────────────────────────────────────────────────────────
// PINNACLE SYNC
// ─────────────────────────────────────────────────────────────

// GET /api/admin/system-analytics?startDate&endDate&departmentId
// University-wide (or one-college) queue / appointment / document aggregates
// for the System Administrator analytics page + dashboard. Dates are Manila
// calendar days; defaults to the last 30 days ending today.
router.get(
  "/system-analytics",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
      const DAY_MS = 24 * 60 * 60 * 1000;
      const endDate = req.query.endDate || getManilaDateString();
      if (!DATE_RE.test(endDate) || !manilaDayStartUTC(endDate)) {
        return res.status(400).json({ error: "Invalid endDate (expected YYYY-MM-DD)." });
      }
      const startDate =
        req.query.startDate ||
        getManilaDateString(new Date(manilaDayStartUTC(endDate).getTime() - 29 * DAY_MS));
      if (!DATE_RE.test(startDate) || !manilaDayStartUTC(startDate)) {
        return res.status(400).json({ error: "Invalid startDate (expected YYYY-MM-DD)." });
      }
      if (startDate > endDate) {
        return res.status(400).json({ error: "startDate must be on or before endDate." });
      }
      let deptId = null;
      if (req.query.departmentId !== undefined && req.query.departmentId !== "") {
        deptId = Number(req.query.departmentId);
        if (!Number.isInteger(deptId) || deptId <= 0) {
          return res.status(400).json({ error: "Invalid departmentId." });
        }
      }

      const startUTC = manilaDayStartUTC(startDate);
      const endUTC = manilaDayEndExclusiveUTC(endDate);
      const todayManila = getManilaDateString();
      const MANILA_DAY = "DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%Y-%m-%d')";

      // Each source is a derived table exposing normalized columns
      // (dept_id, name, status, created_at, ...), already range/dept-filtered.
      const queueSrc = {
        sql: `(SELECT q.status, q.created_at, q.called_at, q.completed_at,
                      COALESCE(qs.department_id, s.department_id) AS dept_id,
                      COALESCE(s.service_name, 'Unspecified') AS name
                 FROM queues q
                 LEFT JOIN queue_slots qs ON qs.slot_id = q.slot_id
                 LEFT JOIN services s ON s.service_id = q.service_id
                WHERE q.created_at >= ? AND q.created_at < ?
                  AND (? IS NULL OR COALESCE(qs.department_id, s.department_id) = ?)) t`,
        params: [startUTC, endUTC, deptId, deptId],
      };
      const apptSrc = {
        sql: `(SELECT a.status, a.created_at, a.approved_at, a.completed_at, a.cancelled_by, a.department_id AS dept_id,
                      COALESCE(aps.service_name, 'Unspecified') AS name
                 FROM appointments a
                 LEFT JOIN appointment_services aps ON aps.service_id = a.service_id
                WHERE a.created_at >= ? AND a.created_at < ?
                  AND (? IS NULL OR a.department_id = ?)) t`,
        params: [startUTC, endUTC, deptId, deptId],
      };
      const docSrc = {
        sql: `(SELECT * FROM (
                 SELECT 'request' AS source, ds.department_id AS dept_id, ds.service_name AS name,
                        dr.status, dr.created_at, dr.claimed_at, dr.claim_by, dr.ready_at
                   FROM document_requests dr
                   JOIN document_services ds ON ds.service_id = dr.service_id
                  WHERE dr.created_at >= ? AND dr.created_at < ?
                 UNION ALL
                 SELECT 'faculty_request', ds.department_id, ds.service_name,
                        fr.status, fr.created_at, fr.claimed_at, fr.claim_by, fr.ready_at
                   FROM faculty_document_requests fr
                   JOIN document_services ds ON ds.service_id = fr.service_id
                  WHERE fr.created_at >= ? AND fr.created_at < ?
                 UNION ALL
                 SELECT 'submission', sub.department_id, 'Document Submission',
                        sub.status, sub.created_at, sub.claimed_at, sub.claim_by, sub.ready_at
                   FROM document_submissions sub
                  WHERE sub.created_at >= ? AND sub.created_at < ?
               ) u WHERE (? IS NULL OR u.dept_id = ?)) t`,
        params: [startUTC, endUTC, startUTC, endUTC, startUTC, endUTC, deptId, deptId],
      };

      const grouped = async (src, expr, limit) => {
        const [rows] = await pool.query(
          `SELECT ${expr} AS k, COUNT(*) AS n FROM ${src.sql}
            GROUP BY k ORDER BY n DESC${limit ? ` LIMIT ${Number(limit)}` : ""}`,
          src.params,
        );
        return rows.map((r) => ({ k: r.k, n: Number(r.n) || 0 }));
      };
      const rangeDays = Math.round((endUTC - startUTC) / DAY_MS);
      const wantDaily = rangeDays <= 92;
      const dailyOf = async (src) => {
        if (!wantDaily) return [];
        const rows = await grouped(src, MANILA_DAY);
        const byDay = new Map(rows.map((r) => [r.k, r.n]));
        const out = [];
        for (let i = 0; i < rangeDays; i++) {
          const date = getManilaDateString(new Date(startUTC.getTime() + i * DAY_MS));
          out.push({ date, count: byDay.get(date) || 0 });
        }
        return out;
      };
      const round1 = (v) => (v == null ? null : Math.round(Number(v) * 10) / 10);
      // Per-college counts split by status, for stacked bars.
      const collegeStatus = async (src) => {
        const [rows] = await pool.query(
          `SELECT dept_id AS k, status AS st, COUNT(*) AS n FROM ${src.sql} GROUP BY dept_id, status`,
          src.params,
        );
        return rows;
      };

      const [
        [deptRows],
        [[qSum]],
        qPeak,
        qByDept,
        qTop,
        qDaily,
        [[aSum]],
        aByStatus,
        aByDept,
        aTop,
        aDaily,
        [[dSum]],
        dByStatus,
        dByDept,
        dTop,
        dDaily,
        qHourly,
        qCollegeStatus,
        aCollegeStatus,
        dCollegeStatus,
      ] = await Promise.all([
        pool.query(
          `SELECT department_id, department_name, department_abbreviation
             FROM departments ORDER BY department_abbreviation`,
        ),
        pool.query(
          `SELECT COUNT(*) AS joined,
                  SUM(status = 'completed') AS completed,
                  SUM(status = 'cancelled') AS cancelled,
                  SUM(status = 'no_show') AS no_shows,
                  SUM(status = 'waiting') AS waiting,
                  AVG(CASE WHEN called_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, created_at, called_at) END) AS avg_wait,
                  AVG(CASE WHEN status = 'completed' AND called_at IS NOT NULL AND completed_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, called_at, completed_at) END) AS avg_service
             FROM ${queueSrc.sql}`,
          queueSrc.params,
        ),
        grouped(queueSrc, "HOUR(CONVERT_TZ(created_at, '+00:00', '+08:00'))", 1),
        grouped(queueSrc, "dept_id"),
        grouped(queueSrc, "name", 5),
        dailyOf(queueSrc),
        pool.query(
          `SELECT COUNT(*) AS total,
                  SUM(cancelled_by = 'student_no_show') AS no_show_reports,
                  AVG(CASE WHEN approved_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, created_at, approved_at) END) / 60 AS avg_response_h,
                  AVG(CASE WHEN approved_at IS NOT NULL AND completed_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, approved_at, completed_at) END) / 60 AS avg_approved_to_done_h,
                  AVG(CASE WHEN status = 'completed' AND completed_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) END) / 60 AS avg_turnaround_h
             FROM ${apptSrc.sql}`,
          apptSrc.params,
        ),
        grouped(apptSrc, "status"),
        grouped(apptSrc, "dept_id"),
        grouped(apptSrc, "name", 5),
        dailyOf(apptSrc),
        pool.query(
          `SELECT COUNT(*) AS total,
                  AVG(CASE WHEN claimed_at IS NOT NULL
                           THEN TIMESTAMPDIFF(HOUR, created_at, claimed_at) END) / 24 AS avg_days,
                  AVG(CASE WHEN ready_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, created_at, ready_at) END) / 60 AS avg_processing_h,
                  AVG(CASE WHEN ready_at IS NOT NULL AND claimed_at IS NOT NULL
                           THEN TIMESTAMPDIFF(MINUTE, ready_at, claimed_at) END) / 60 AS avg_pickup_wait_h,
                  SUM(status = 'ready' AND claim_by IS NOT NULL AND claim_by < ?) AS overdue
             FROM ${docSrc.sql}`,
          [todayManila, ...docSrc.params],
        ),
        grouped(docSrc, "status"),
        grouped(docSrc, "dept_id"),
        grouped(docSrc, "name", 5),
        dailyOf(docSrc),
        grouped(queueSrc, "HOUR(CONVERT_TZ(created_at, '+00:00', '+08:00'))"),
        collegeStatus(queueSrc),
        collegeStatus(apptSrc),
        collegeStatus(docSrc),
      ]);

      const colleges = deptRows.map((d) => ({
        id: d.department_id,
        name: d.department_name,
        abbrev: d.department_abbreviation,
      }));
      const abbrevById = new Map(colleges.map((c) => [c.id, c.abbrev]));
      const byCollege = (rows) =>
        rows
          .filter((r) => r.n > 0 && r.k != null)
          .map((r) => ({ abbrev: abbrevById.get(r.k) || `Dept ${r.k}`, count: r.n }));
      const topList = (rows) => rows.map((r) => ({ name: r.k || "Unspecified", count: r.n }));
      const statusMap = (rows, keys) => {
        const m = Object.fromEntries(keys.map((k) => [k, 0]));
        for (const r of rows) if (r.k in m) m[r.k] = r.n;
        return m;
      };

      // [{abbrev, total, segments:{status:count}}] sorted by total desc.
      const stacked = (rows) => {
        const m = new Map();
        for (const r of rows) {
          if (r.k == null) continue;
          const abbrev = abbrevById.get(r.k) || `Dept ${r.k}`;
          const e = m.get(abbrev) || { abbrev, total: 0, segments: {} };
          const n = Number(r.n) || 0;
          e.segments[r.st] = (e.segments[r.st] || 0) + n;
          e.total += n;
          m.set(abbrev, e);
        }
        return [...m.values()].sort((a, b) => b.total - a.total);
      };
      const hourMap = new Map(qHourly.map((r) => [Number(r.k), r.n]));
      const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap.get(h) || 0 }));

      const apptTotal = Number(aSum.total) || 0;
      const apptByStatus = statusMap(aByStatus, ["pending", "approved", "completed", "rejected", "cancelled"]);

      res.json({
        startDate,
        endDate,
        departmentId: deptId,
        colleges,
        queues: {
          joined: Number(qSum.joined) || 0,
          completed: Number(qSum.completed) || 0,
          cancelled: Number(qSum.cancelled) || 0,
          noShows: Number(qSum.no_shows) || 0,
          waiting: Number(qSum.waiting) || 0,
          avgWaitMin: round1(qSum.avg_wait),
          avgServiceMin: round1(qSum.avg_service),
          peakHour: qPeak.length > 0 && qPeak[0].k != null ? Number(qPeak[0].k) : null,
          byCollege: byCollege(qByDept),
          byCollegeStatus: stacked(qCollegeStatus),
          hourly,
          topServices: topList(qTop),
          daily: qDaily,
        },
        appointments: {
          total: apptTotal,
          byStatus: apptByStatus,
          completionRate: apptTotal > 0 ? round1((apptByStatus.completed / apptTotal) * 100) : 0,
          noShowReports: Number(aSum.no_show_reports) || 0,
          avgResponseHours: round1(aSum.avg_response_h),
          avgApprovedToCompletedHours: round1(aSum.avg_approved_to_done_h),
          avgTurnaroundHours: round1(aSum.avg_turnaround_h),
          byCollege: byCollege(aByDept),
          byCollegeStatus: stacked(aCollegeStatus),
          topTypes: topList(aTop),
          daily: aDaily,
        },
        documents: {
          total: Number(dSum.total) || 0,
          byStatus: statusMap(dByStatus, ["pending", "processing", "ready", "claimed", "rejected", "cancelled"]),
          avgDaysToClaim: round1(dSum.avg_days),
          avgProcessingHours: round1(dSum.avg_processing_h),
          avgPickupWaitHours: round1(dSum.avg_pickup_wait_h),
          overdue: Number(dSum.overdue) || 0,
          byCollege: byCollege(dByDept),
          byCollegeStatus: stacked(dCollegeStatus),
          topTypes: topList(dTop),
          daily: dDaily,
        },
      });
    } catch (error) {
      sendServerError(res, error, "System analytics error:");
    }
  },
);

// GET /api/admin/pinnacle-sync/config
router.get(
  "/pinnacle-sync/config",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT setting_key, setting_value FROM system_settings
         WHERE setting_key IN ('pinnacle_api_url','pinnacle_api_key','pinnacle_sync_interval','pinnacle_sync_enabled')`,
      );
      const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
      res.json({
        apiUrl: map.pinnacle_api_url || "https://pinnacle-api.pnc.edu.ph/v1",
        // Never send the stored secret back. apiKey kept as "" so older
        // clients (mobile) that read the key don't break.
        apiKey: "",
        apiKeySet: !!map.pinnacle_api_key,
        // No real Pinnacle integration consumes this config yet.
        connected: false,
        syncInterval: parseInt(map.pinnacle_sync_interval || "60", 10),
        syncEnabled: map.pinnacle_sync_enabled === "true",
      });
    } catch (error) {
      sendServerError(res, error, "Pinnacle config get error:");
    }
  },
);

// POST /api/admin/pinnacle-sync/config
router.post(
  "/pinnacle-sync/config",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const { apiUrl, apiKey, syncInterval, syncEnabled } = req.body;
    const adminId = req.user.userId;
    try {
      const updates = [
        ["pinnacle_api_url", apiUrl ?? ""],
        ["pinnacle_sync_interval", String(syncInterval ?? 60)],
        ["pinnacle_sync_enabled", syncEnabled ? "true" : "false"],
      ];
      // Only overwrite the stored key when a new one is provided.
      if (typeof apiKey === "string" && apiKey.trim() !== "") {
        updates.push(["pinnacle_api_key", apiKey.trim()]);
      }
      for (const [key, value] of updates) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, value],
        );
      }
      await logAudit(adminId, "UPDATE", "system_settings", null, null, { apiUrl, syncInterval, syncEnabled });
      res.json({ message: "Configuration saved successfully." });
    } catch (error) {
      sendServerError(res, error, "Pinnacle config save error:");
    }
  },
);

// GET /api/admin/pinnacle-sync/stats
router.get(
  "/pinnacle-sync/stats",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const [roleRows] = await pool.query(
        `SELECT role, COUNT(*) AS cnt FROM users GROUP BY role`,
      );
      const counts = { student: 0, faculty: 0, admin: 0, superadmin: 0 };
      let total = 0;
      for (const r of roleRows) {
        counts[r.role] = parseInt(r.cnt, 10);
        total += counts[r.role];
      }

      const [logRows] = await pool.query(
        `SELECT sync_id, external_system, sync_type, sync_status, synced_at
         FROM external_sync_logs
         ORDER BY synced_at DESC
         LIMIT 10`,
      );

      res.json({
        total,
        students: counts.student,
        professors: counts.faculty,
        admins: counts.admin,
        recentLogs: logRows.map((l) => ({
          id: l.sync_id,
          system: l.external_system,
          type: l.sync_type,
          status: l.sync_status,
          syncedAt: l.synced_at,
        })),
      });
    } catch (error) {
      sendServerError(res, error, "Pinnacle stats error:");
    }
  },
);

// POST /api/admin/pinnacle-sync/trigger
router.post(
  "/pinnacle-sync/trigger",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    // No code in this server consumes the saved pinnacle_* settings, so a
    // "sync" would be fake. Record the attempt honestly as failed (so the Sync
    // History tab reflects it) and keep a non-2xx status: the mobile client
    // treats any 2xx as a successful sync.
    try {
      await pool.query(
        `INSERT INTO external_sync_logs (external_system, sync_type, sync_status) VALUES ('Pinnacle', 'profile', 'failed')`,
      );
    } catch (logError) {
      console.error("Pinnacle sync log insert error:", logError.message);
    }
    res.status(501).json({
      error: "No school records system is connected yet, so nothing was synced. The attempt was recorded in Sync History.",
    });
  },
);

// POST /api/admin/pinnacle-sync/test
// A real server round-trip for "Test Connection". There is no integration to
// reach yet, so it reports not-connected; a future API check plugs in here.
router.post(
  "/pinnacle-sync/test",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const [[row]] = await pool.query(
        `SELECT setting_value FROM system_settings WHERE setting_key = 'pinnacle_api_url'`,
      );
      res.json({
        connected: false,
        apiUrl: row?.setting_value || null,
        message: "No school records system is connected yet. Your settings are saved and will be used once the integration is available.",
      });
    } catch (error) {
      sendServerError(res, error, "Pinnacle test error:");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// SATISFACTION SURVEY
// Each department has its OWN external survey link (OAMS never builds or
// stores responses) -- stored directly on departments.satisfaction_survey_url,
// the same shape as that table's existing office_location column.
// Superadmin-only to configure. student.js and professor.js each expose
// their own read-only mirror, scoped to the caller's own department, so
// those roles can fetch just their department's link without admin auth.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/settings/satisfaction-survey
// Lists every department's configured (or blank) survey link, for the
// superadmin settings page to render and edit one row per college.
router.get(
  "/settings/satisfaction-survey",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT department_id, department_name, department_abbreviation, satisfaction_survey_url
         FROM departments
         ORDER BY department_name`,
      );
      res.json({
        departments: rows.map((d) => ({
          departmentId: d.department_id,
          departmentName: d.department_name,
          departmentAbbreviation: d.department_abbreviation,
          surveyUrl: d.satisfaction_survey_url || "",
        })),
      });
    } catch (error) {
      sendServerError(res, error, "Satisfaction survey config get error:");
    }
  },
);

// PUT /api/admin/settings/satisfaction-survey/:departmentId
router.put(
  "/settings/satisfaction-survey/:departmentId",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const departmentId = Number(req.params.departmentId);
    const surveyUrl = (req.body?.surveyUrl ?? "").trim();
    const adminId = req.user.userId;

    if (!Number.isInteger(departmentId)) {
      return res.status(400).json({ error: "Invalid department." });
    }

    if (surveyUrl) {
      try {
        const parsed = new URL(surveyUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return res.status(400).json({ error: "Survey link must start with http:// or https://." });
        }
      } catch {
        return res.status(400).json({ error: "Please enter a valid URL." });
      }
    }

    try {
      const [result] = await pool.query(
        `UPDATE departments SET satisfaction_survey_url = ? WHERE department_id = ?`,
        [surveyUrl || null, departmentId],
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Department not found." });
      }
      await logAudit(adminId, "UPDATE", "departments", departmentId, null, {
        satisfactionSurveyUrl: surveyUrl,
      });
      res.json({ message: "Satisfaction survey link saved.", departmentId, surveyUrl });
    } catch (error) {
      sendServerError(res, error, "Satisfaction survey config save error:");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// USER ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────

// GET /api/admin/users?role=&status=&search=
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    try {
      const [studentRows] = await pool.query(
        `SELECT u.user_id AS id, 'student' AS role, u.status, u.last_login_at, u.created_at,
                s.first_name, s.last_name, s.email, s.student_number AS studentId, NULL AS employeeId,
                d.department_abbreviation AS college
         FROM students s
         JOIN users u ON u.user_id = s.student_id
         LEFT JOIN departments d ON s.department_id = d.department_id`,
      );
      const [facultyRows] = await pool.query(
        `SELECT u.user_id AS id, 'professor' AS role, u.status, u.last_login_at, u.created_at,
                f.first_name, f.last_name, f.email, NULL AS studentId, f.employee_id AS employeeId,
                d.department_abbreviation AS college
         FROM faculty f
         JOIN users u ON u.user_id = f.faculty_id
         LEFT JOIN departments d ON f.department_id = d.department_id`,
      );
      const [adminRows] = await pool.query(
        `SELECT u.user_id AS id, 'admin' AS role, u.status, u.last_login_at, u.created_at,
                a.first_name, a.last_name, a.email, NULL AS studentId, a.employee_id AS employeeId,
                d.department_abbreviation AS college
         FROM administrators a
         JOIN users u ON u.user_id = a.admin_id
         LEFT JOIN departments d ON a.department_id = d.department_id`,
      );

      let users = [...studentRows, ...facultyRows, ...adminRows].map((u) => ({
        id: String(u.id),
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        college: u.college,
        studentId: u.studentId,
        employeeId: u.employeeId,
        status: u.status,
        lastLogin: u.last_login_at,
        createdDate: u.created_at,
      }));

      const { role, status, search } = req.query;
      if (role && role !== "all") users = users.filter((u) => u.role === role);
      if (status && status !== "all") users = users.filter((u) => u.status === status);
      if (search) {
        const q = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.studentId || "").toLowerCase().includes(q) ||
            (u.employeeId || "").toLowerCase().includes(q),
        );
      }

      // Existing callers get every user (same key) up to a sane cap; `total`
      // is the pre-cap match count. Optional ?page=&limit= slices server-side.
      const total = users.length;
      const MAX_USERS = 5000;
      const limitParam = parseInt(req.query.limit, 10);
      if (Number.isInteger(limitParam) && limitParam > 0) {
        const pageParam = Math.max(1, parseInt(req.query.page, 10) || 1);
        const lim = Math.min(limitParam, MAX_USERS);
        users = users.slice((pageParam - 1) * lim, pageParam * lim);
      } else if (users.length > MAX_USERS) {
        users = users.slice(0, MAX_USERS);
      }

      res.json({ users, total });
    } catch (error) {
      sendServerError(res, error, "GET /users error:");
    }
  },
);

// PUT /api/admin/users/:id
// Body: { name, email, college, studentId, employeeId, status } -- role is read-only.
router.put(
  "/users/:id",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, college, studentId, employeeId, status } = req.body;
    const adminId = req.user.userId;

    try {
      const [[userRow]] = await pool.query(`SELECT role, status FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });
      if (status && status !== "active" && status !== userRow.status) {
        if (userId === adminId) {
          return res.status(400).json({ error: "You cannot suspend or deactivate your own account" });
        }
        if (userRow.role === "superadmin") {
          return res.status(403).json({ error: "You cannot suspend or deactivate another system administrator" });
        }
      }

      let deptId = null;
      if (college) {
        const [[deptRow]] = await pool.query(
          `SELECT department_id FROM departments WHERE department_abbreviation = ?`,
          [college],
        );
        deptId = deptRow?.department_id ?? null;
      }

      const [firstName, ...rest] = (name || "").trim().split(" ");
      const lastName = rest.join(" ") || firstName;

      if (userRow.role === "faculty") {
        const [[facRow]] = await pool.query(
          `SELECT department_id FROM faculty WHERE faculty_id = ?`,
          [userId],
        );
        const deptChanging = deptId !== null && facRow && facRow.department_id !== deptId;
        const deactivating = status && status !== "active" && status !== userRow.status;
        if (deptChanging || deactivating) {
          await releaseFacultyQueueStudents(userId, adminId);
        }
      }

      if (userRow.role === "student") {
        await pool.query(
          `UPDATE students SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), student_number = COALESCE(?, student_number) WHERE student_id = ?`,
          [firstName, lastName, email, deptId, studentId, userId],
        );
      } else if (userRow.role === "faculty") {
        await pool.query(
          `UPDATE faculty SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), employee_id = COALESCE(?, employee_id) WHERE faculty_id = ?`,
          [firstName, lastName, email, deptId, employeeId, userId],
        );
      } else if (userRow.role === "admin") {
        await pool.query(
          `UPDATE administrators SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), employee_id = COALESCE(?, employee_id) WHERE admin_id = ?`,
          [firstName, lastName, email, deptId, employeeId, userId],
        );
      }

      if (status) {
        await pool.query(`UPDATE users SET status = ? WHERE user_id = ?`, [status, userId]);
      }

      await logAudit(adminId, "UPDATE", "users", userId, { status: userRow.status }, { status });

      res.json({ message: "User updated" });
    } catch (error) {
      sendServerError(res, error, "PUT /users/:id error:");
    }
  },
);

// PATCH /api/admin/users/:id/status
// Body: { status: 'active' | 'suspended' }
router.patch(
  "/users/:id/status",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const adminId = req.user.userId;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const [[userRow]] = await pool.query(`SELECT status, role FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      if (status !== "active") {
        if (userId === adminId) {
          return res.status(400).json({ error: "You cannot suspend or deactivate your own account" });
        }
        if (userRow.role === "superadmin") {
          return res.status(403).json({ error: "You cannot suspend or deactivate another system administrator" });
        }
      }

      if (userRow.role === "faculty" && status !== "active" && status !== userRow.status) {
        await releaseFacultyQueueStudents(userId, adminId);
      }

      await pool.query(`UPDATE users SET status = ? WHERE user_id = ?`, [status, userId]);
      await logAudit(adminId, "UPDATE", "users", userId, { status: userRow.status }, { status });

      res.json({ message: "Status updated", status });
    } catch (error) {
      sendServerError(res, error, "PATCH /users/:id/status error:");
    }
  },
);

// DELETE /api/admin/users/:id
router.delete(
  "/users/:id",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.userId;

    if (userId === adminId) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    try {
      const [[userRow]] = await pool.query(`SELECT role FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });
      if (userRow.role === "superadmin") {
        return res.status(403).json({ error: "You cannot delete another system administrator" });
      }

      if (userRow.role === "faculty") {
        await releaseFacultyQueueStudents(userId, adminId, (conn) =>
          conn.query(`DELETE FROM users WHERE user_id = ?`, [userId]),
        );
      } else {
        await pool.query(`DELETE FROM users WHERE user_id = ?`, [userId]);
      }
      await logAudit(adminId, "DELETE", "users", userId, { role: userRow.role }, null);

      res.json({ message: "User deleted" });
    } catch (error) {
      sendServerError(res, error, "DELETE /users/:id error:");
    }
  },
);

// POST /api/admin/users/:id/reset-password
// No email infrastructure exists in this codebase -- returns the generated
// temp password in the response for the admin to relay manually.
router.post(
  "/users/:id/reset-password",
  authenticateToken,
  authorizeRoles("superadmin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.userId;

    try {
      const [[userRow]] = await pool.query(`SELECT user_id FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      const tempPassword = crypto.randomBytes(9).toString("base64url");
      const hashed = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        `UPDATE users SET password = ?, failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?`,
        [hashed, userId],
      );
      await logAudit(adminId, "UPDATE", "users", userId, null, { action: "password_reset" });

      res.json({ message: "Temporary password generated", tempPassword });
    } catch (error) {
      sendServerError(res, error, "POST /users/:id/reset-password error:");
    }
  },
);

module.exports = router;
