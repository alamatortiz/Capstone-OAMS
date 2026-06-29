const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// GET /api/faculty/dashboard-stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;

    try {
      // 1. Pending + today's appointments
      const [[apptRow]] = await pool.query(
        `SELECT
           COUNT(*) AS pending_count,
           SUM(CASE WHEN appointment_date = CURDATE() AND status IN ('pending','approved') THEN 1 ELSE 0 END) AS today_count
         FROM appointments
         WHERE faculty_id = ?
           AND status IN ('pending', 'approved')
           AND appointment_date >= CURDATE()`,
        [facultyId],
      );

      // 2. Distinct students with pending requests
      const [[studentRow]] = await pool.query(
        `SELECT COUNT(DISTINCT student_id) AS student_count
         FROM appointments
         WHERE faculty_id = ? AND status = 'pending'`,
        [facultyId],
      );

      // 3. Documents to review (services under faculty's department)
      const [[docRow]] = await pool.query(
        `SELECT COUNT(*) AS doc_count
         FROM document_requests dr
         JOIN document_services s ON dr.service_id = s.service_id
         JOIN faculty f ON f.department_id = s.department_id
         WHERE f.faculty_id = ? AND dr.status IN ('pending', 'processing')`,
        [facultyId],
      );

      // 4. Completed this month
      const [[completedRow]] = await pool.query(
        `SELECT COUNT(*) AS completed_count
         FROM appointments
         WHERE faculty_id = ?
           AND status = 'completed'
           AND MONTH(appointment_date) = MONTH(CURDATE())
           AND YEAR(appointment_date) = YEAR(CURDATE())`,
        [facultyId],
      );

      // 5. Today's appointments list
      const [todayAppointments] = await pool.query(
        `SELECT
           a.appointment_id,
           a.appointment_time,
           a.status,
           a.notes,
           s.first_name,
           s.last_name,
           s.student_number,
           s.course
         FROM appointments a
         JOIN students s ON a.student_id = s.student_id
         WHERE a.faculty_id = ?
           AND a.appointment_date = CURDATE()
           AND a.status IN ('pending', 'approved')
         ORDER BY a.appointment_time ASC`,
        [facultyId],
      );

      // 6. Recent activity (last 5)
      const [recentActivity] = await pool.query(
        `SELECT
           a.appointment_id,
           a.status,
           a.created_at AS event_time,
           CONCAT(s.first_name, ' ', s.last_name) AS student_name,
           a.notes AS purpose
         FROM appointments a
         JOIN students s ON a.student_id = s.student_id
         WHERE a.faculty_id = ?
         ORDER BY a.created_at DESC
         LIMIT 5`,
        [facultyId],
      );

      res.json({
        stats: {
          pendingAppointments: apptRow.pending_count || 0,
          todayAppointments: apptRow.today_count || 0,
          studentRequests: studentRow.student_count || 0,
          documentsToReview: docRow.doc_count || 0,
          completedThisMonth: completedRow.completed_count || 0,
        },
        todayAppointments: todayAppointments.map((a) => ({
          id: a.appointment_id,
          student: `${a.first_name} ${a.last_name}`,
          studentNumber: a.student_number,
          course: a.course,
          purpose: a.notes ?? "No notes provided",
          time: formatTime(a.appointment_time),
          status: a.status,
        })),
        recentActivity: recentActivity.map((row, i) => ({
          id: i + 1,
          title: buildActivityTitle(row),
          dot: statusToDot(row.status),
          time: formatRelativeTime(new Date(row.event_time)),
        })),
      });
    } catch (error) {
      console.error("Faculty dashboard stats error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${suffix}`;
}

function buildActivityTitle(row) {
  const map = {
    pending: `New appointment request from ${row.student_name}`,
    approved: `Appointment confirmed with ${row.student_name}`,
    completed: `Appointment completed with ${row.student_name}`,
    rejected: `Appointment rejected for ${row.student_name}`,
    cancelled: `Appointment cancelled by ${row.student_name}`,
  };
  return map[row.status] ?? `Appointment update for ${row.student_name}`;
}

function statusToDot(status) {
  return (
    {
      pending: "dot-green",
      approved: "dot-blue",
      completed: "dot-purple",
      rejected: "dot-red",
      cancelled: "dot-gray",
    }[status] ?? "dot-gray"
  );
}

function formatRelativeTime(date) {
  const diffMs = new Date() - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/appointments
router.get(
  "/appointments",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { status } = req.query;
    try {
      let sql = `
        SELECT
          a.appointment_id, a.appointment_date, a.appointment_time,
          a.status, a.notes, a.created_at,
          s.first_name, s.last_name, s.student_number, s.course,
          svc.service_name AS purpose
        FROM appointments a
        JOIN students s ON a.student_id = s.student_id
        LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
        WHERE a.faculty_id = ?`;
      const params = [facultyId];
      if (status && status !== "all") {
        sql += " AND a.status = ?";
        params.push(status);
      }
      sql += " ORDER BY a.appointment_date DESC, a.appointment_time ASC";
      const [rows] = await pool.query(sql, params);
      res.json(rows.map((r) => ({
        id: r.appointment_id,
        studentName: `${r.first_name} ${r.last_name}`,
        studentId: r.student_number,
        course: r.course,
        purpose: r.purpose ?? r.notes ?? "No notes provided",
        date: r.appointment_date,
        time: formatTime(r.appointment_time),
        status: r.status,
        notes: r.notes,
        requestedAt: r.created_at,
      })));
    } catch (err) {
      console.error("GET /appointments error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PATCH /api/faculty/appointments/:id/status
router.patch(
  "/appointments/:id/status",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["approved", "rejected", "completed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    try {
      const [result] = await pool.query(
        "UPDATE appointments SET status = ? WHERE appointment_id = ? AND faculty_id = ?",
        [status, id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Appointment not found" });
      res.json({ message: "Status updated" });
    } catch (err) {
      console.error("PATCH /appointments/:id/status error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DOCUMENT REQUESTS (student requests in faculty's department)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/document-requests
router.get(
  "/document-requests",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { status } = req.query;
    try {
      let sql = `
        SELECT
          dr.request_id, dr.tracking_number, dr.request_type, dr.purpose,
          dr.status, dr.notes, dr.created_at, dr.estimated_completion,
          s.first_name, s.last_name, s.student_number,
          ds.service_name
        FROM document_requests dr
        JOIN document_services ds ON dr.service_id = ds.service_id
        JOIN students s ON dr.student_id = s.student_id
        JOIN faculty f ON f.department_id = ds.department_id
        WHERE f.faculty_id = ?`;
      const params = [facultyId];
      if (status && status !== "all") {
        sql += " AND dr.status = ?";
        params.push(status);
      }
      sql += " ORDER BY dr.created_at DESC";
      const [rows] = await pool.query(sql, params);
      res.json(rows.map((r) => ({
        id: r.request_id,
        trackingNumber: r.tracking_number,
        studentName: `${r.first_name} ${r.last_name}`,
        studentId: r.student_number,
        documentType: r.service_name,
        requestType: r.request_type,
        purpose: r.purpose,
        status: r.status,
        notes: r.notes,
        requestDate: r.created_at,
        estimatedCompletion: r.estimated_completion,
      })));
    } catch (err) {
      console.error("GET /document-requests error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PATCH /api/faculty/document-requests/:id/status
router.patch(
  "/document-requests/:id/status",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { status, notes } = req.body;
    const allowed = ["processing", "generated", "released", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    try {
      const [[doc]] = await pool.query(
        `SELECT dr.request_id FROM document_requests dr
         JOIN document_services ds ON dr.service_id = ds.service_id
         JOIN faculty f ON f.department_id = ds.department_id
         WHERE dr.request_id = ? AND f.faculty_id = ?`,
        [id, facultyId]
      );
      if (!doc) return res.status(404).json({ message: "Document request not found" });
      await pool.query(
        "UPDATE document_requests SET status = ?, notes = COALESCE(?, notes) WHERE request_id = ?",
        [status, notes ?? null, id]
      );
      res.json({ message: "Status updated" });
    } catch (err) {
      console.error("PATCH /document-requests/:id/status error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS (combined appointment + document history)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/transactions
router.get(
  "/transactions",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { search = "", filterType = "all", filterStatus = "all" } = req.query;
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      if (!fac) return res.status(404).json({ message: "Faculty not found" });
      const deptId = fac.department_id;

      let rows = [];

      if (filterType === "all" || filterType === "appointment") {
        let sql = `
          SELECT
            a.appointment_id AS id, 'appointment' AS type,
            CONCAT(s.first_name,' ',s.last_name) AS studentName,
            s.student_number AS studentId,
            COALESCE(svc.service_name, a.notes, 'Consultation') AS description,
            a.status, a.appointment_date AS date, a.created_at
          FROM appointments a
          JOIN students s ON a.student_id = s.student_id
          LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
          WHERE a.faculty_id = ?`;
        const params = [facultyId];
        if (filterStatus !== "all") { sql += " AND a.status = ?"; params.push(filterStatus); }
        if (search) { sql += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const [appts] = await pool.query(sql, params);
        rows = rows.concat(appts);
      }

      if (filterType === "all" || filterType === "document") {
        let sql = `
          SELECT
            dr.request_id AS id, 'document' AS type,
            CONCAT(s.first_name,' ',s.last_name) AS studentName,
            s.student_number AS studentId,
            ds.service_name AS description,
            dr.status, dr.created_at AS date, dr.created_at
          FROM document_requests dr
          JOIN document_services ds ON dr.service_id = ds.service_id
          JOIN students s ON dr.student_id = s.student_id
          WHERE ds.department_id = ?`;
        const params = [deptId];
        if (filterStatus !== "all") { sql += " AND dr.status = ?"; params.push(filterStatus); }
        if (search) { sql += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        const [docs] = await pool.query(sql, params);
        rows = rows.concat(docs);
      }

      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.json(rows);
    } catch (err) {
      console.error("GET /transactions error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// SCHEDULE / AVAILABILITY
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/availability
router.get(
  "/availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM faculty_availability WHERE faculty_id = ? ORDER BY FIELD(day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time",
        [facultyId]
      );
      res.json(rows);
    } catch (err) {
      console.error("GET /availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/availability
router.post(
  "/availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { day_of_week, start_time, end_time, location } = req.body;
    if (!day_of_week || !start_time || !end_time) {
      return res.status(400).json({ message: "day_of_week, start_time, end_time are required" });
    }
    try {
      const [existing] = await pool.query(
        "SELECT availability_id FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ? AND start_time = ? AND end_time = ?",
        [facultyId, day_of_week, start_time, end_time]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "A slot with the same day and time already exists" });
      }
      const [result] = await pool.query(
        "INSERT INTO faculty_availability (faculty_id, day_of_week, start_time, end_time, location) VALUES (?,?,?,?,?)",
        [facultyId, day_of_week, start_time, end_time, location ?? null]
      );
      res.status(201).json({ availability_id: result.insertId, message: "Availability added" });
    } catch (err) {
      console.error("POST /availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PATCH /api/faculty/availability/:id
router.patch(
  "/availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { day_of_week, start_time, end_time, location } = req.body;
    try {
      const [result] = await pool.query(
        `UPDATE faculty_availability
         SET day_of_week = COALESCE(?, day_of_week),
             start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             location = COALESCE(?, location)
         WHERE availability_id = ? AND faculty_id = ?`,
        [day_of_week ?? null, start_time ?? null, end_time ?? null, location ?? null, id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Availability not found" });
      res.json({ message: "Availability updated" });
    } catch (err) {
      console.error("PATCH /availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/availability/:id
router.delete(
  "/availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    try {
      const [result] = await pool.query(
        "DELETE FROM faculty_availability WHERE availability_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Availability not found" });
      res.json({ message: "Availability deleted" });
    } catch (err) {
      console.error("DELETE /availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// BLOCKED DATES (specific-date availability overrides)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/blocked-dates
router.get(
  "/blocked-dates",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM faculty_blocked_dates WHERE faculty_id = ? ORDER BY blocked_date ASC",
        [facultyId]
      );
      res.json(rows);
    } catch (err) {
      console.error("GET /blocked-dates error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/blocked-dates
router.post(
  "/blocked-dates",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ message: "date is required" });
    try {
      const [result] = await pool.query(
        "INSERT INTO faculty_blocked_dates (faculty_id, blocked_date, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason)",
        [facultyId, date, reason ?? null]
      );
      res.status(201).json({ blocked_id: result.insertId, message: "Date blocked" });
    } catch (err) {
      console.error("POST /blocked-dates error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/blocked-dates/:id
router.delete(
  "/blocked-dates/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    try {
      const [result] = await pool.query(
        "DELETE FROM faculty_blocked_dates WHERE blocked_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Blocked date not found" });
      res.json({ message: "Date unblocked" });
    } catch (err) {
      console.error("DELETE /blocked-dates/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DATE-SPECIFIC AVAILABILITY (replaces recurring day_of_week model)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/date-availability
// Optional query: ?year=2026&month=6  → filters to that month
router.get(
  "/date-availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { year, month } = req.query;
    try {
      let query = "SELECT * FROM faculty_date_availability WHERE faculty_id = ?";
      const params = [facultyId];
      if (year && month) {
        query += " AND YEAR(available_date) = ? AND MONTH(available_date) = ?";
        params.push(Number(year), Number(month));
      }
      query += " ORDER BY available_date ASC, start_time ASC";
      const [rows] = await pool.query(query, params);

      if (rows.length === 0) return res.json([]);

      // Attach appointment services (types) offered for each slot
      const ids = rows.map((r) => r.id);
      const [svcRows] = await pool.query(
        `SELECT ss.availability_id, aps.service_id, aps.service_name
         FROM slot_services ss
         JOIN appointment_services aps ON ss.service_id = aps.service_id
         WHERE ss.availability_id IN (?)
         ORDER BY ss.id ASC`,
        [ids]
      );
      const svcMap = {};
      for (const s of svcRows) {
        (svcMap[s.availability_id] ||= []).push({ id: s.service_id, name: s.service_name });
      }
      const result = rows.map((r) => ({ ...r, appointmentTypes: svcMap[r.id] ?? [] }));
      res.json(result);
    } catch (err) {
      console.error("GET /date-availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/date-availability
// Body: { available_date, start_time, end_time, location, max_students, appointmentTypes? }
router.post(
  "/date-availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { available_date, start_time, end_time, location, max_students, appointmentTypes } = req.body;
    if (!available_date || !start_time || !end_time) {
      return res.status(400).json({ message: "available_date, start_time, end_time are required" });
    }
    if (end_time <= start_time) {
      return res.status(400).json({ message: "end_time must be after start_time" });
    }

    if (max_students == null || max_students === "") {
      return res.status(400).json({ message: "max_students is required" });
    }
    const maxStu = parseInt(max_students, 10);
    if (isNaN(maxStu) || maxStu < 1) {
      return res.status(400).json({ message: "max_students must be a positive integer" });
    }

    // Sanitize appointment types: unique, non-empty strings, max 20
    const types = Array.isArray(appointmentTypes)
      ? [...new Set(appointmentTypes.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20)
      : [];

    try {
      const [existing] = await pool.query(
        "SELECT id FROM faculty_date_availability WHERE faculty_id = ? AND available_date = ? AND start_time = ? AND end_time = ?",
        [facultyId, available_date, start_time, end_time]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "A slot with the same date and time already exists" });
      }
      const [result] = await pool.query(
        `INSERT INTO faculty_date_availability
           (faculty_id, available_date, start_time, end_time, max_students, location)
         VALUES (?,?,?,?,?,?)`,
        [facultyId, available_date, start_time, end_time, maxStu, location ?? null]
      );
      const newId = result.insertId;
      const linkedServices = [];
      for (const name of types) {
        // Find existing service for this faculty with the same name, or create it
        let [[svc]] = await pool.query(
          "SELECT service_id, service_name FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
          [facultyId, name]
        );
        if (!svc) {
          const [ins] = await pool.query(
            "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
            [name, facultyId]
          );
          svc = { service_id: ins.insertId, service_name: name };
        }
        await pool.query(
          "INSERT IGNORE INTO slot_services (availability_id, service_id) VALUES (?, ?)",
          [newId, svc.service_id]
        );
        linkedServices.push({ id: svc.service_id, name: svc.service_name });
      }
      res.status(201).json({
        id: newId,
        message: "Availability slot added",
        max_students: maxStu,
        appointmentTypes: linkedServices,
      });
    } catch (err) {
      console.error("POST /date-availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PATCH /api/faculty/date-availability/:id
// Body: { max_students?, status?, location?, appointmentTypes? }
router.patch(
  "/date-availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { max_students, status, location, appointmentTypes } = req.body;

    const updates = {};
    if (max_students !== undefined) {
      const maxStu = parseInt(max_students, 10);
      if (isNaN(maxStu) || maxStu < 1) {
        return res.status(400).json({ message: "max_students must be a positive integer" });
      }
      updates.max_students = maxStu;
    }
    if (status !== undefined) {
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ message: "status must be 'open' or 'closed'" });
      }
      updates.status = status;
    }
    if (location !== undefined) updates.location = location;

    const replaceTypes = Array.isArray(appointmentTypes);
    const types = replaceTypes
      ? [...new Set(appointmentTypes.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20)
      : null;

    if (Object.keys(updates).length === 0 && !replaceTypes) {
      return res.status(400).json({ message: "No updatable fields provided" });
    }

    try {
      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
        const values = [...Object.values(updates), id, facultyId];
        const [result] = await pool.query(
          `UPDATE faculty_date_availability SET ${setClause} WHERE id = ? AND faculty_id = ?`,
          values
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: "Slot not found" });
      }
      if (replaceTypes) {
        // Get the faculty_id that owns this slot (for upsert into appointment_services)
        const [[slotOwner]] = await pool.query(
          "SELECT faculty_id FROM faculty_date_availability WHERE id = ?", [id]
        );
        const ownerFacultyId = slotOwner?.faculty_id ?? facultyId;

        await pool.query("DELETE FROM slot_services WHERE availability_id = ?", [id]);
        for (const name of types) {
          let [[svc]] = await pool.query(
            "SELECT service_id FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
            [ownerFacultyId, name]
          );
          if (!svc) {
            const [ins] = await pool.query(
              "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
              [name, ownerFacultyId]
            );
            svc = { service_id: ins.insertId };
          }
          await pool.query(
            "INSERT IGNORE INTO slot_services (availability_id, service_id) VALUES (?, ?)",
            [id, svc.service_id]
          );
        }
      }
      res.json({ message: "Slot updated" });
    } catch (err) {
      console.error("PATCH /date-availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/date-availability/:id
router.delete(
  "/date-availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    try {
      const [result] = await pool.query(
        "DELETE FROM faculty_date_availability WHERE id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Slot not found" });
      res.json({ message: "Slot deleted" });
    } catch (err) {
      console.error("DELETE /date-availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS (stored in faqs table)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/announcements
router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[fac]] = await pool.query(
        "SELECT employee_id, department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      if (!fac) return res.status(404).json({ message: "Faculty not found" });
      const [rows] = await pool.query(
        "SELECT * FROM faqs WHERE created_by = ? ORDER BY created_at DESC",
        [fac.employee_id]
      );
      res.json(rows.map((r) => ({
        id: r.faq_id,
        title: r.question,
        content: r.answer,
        type: r.type,
        status: r.status === "active" ? "published" : "draft",
        isPinned: r.is_pinned,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error("GET /announcements error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/announcements
router.post(
  "/announcements",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { title, content, type = "general", status = "draft", isPinned = false } = req.body;
    if (!title || !content) return res.status(400).json({ message: "title and content are required" });
    try {
      const [[fac]] = await pool.query(
        "SELECT employee_id, department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      const dbStatus = status === "published" ? "active" : "archived";
      const [result] = await pool.query(
        "INSERT INTO faqs (question, answer, type, status, created_by, is_pinned, department_id) VALUES (?,?,?,?,?,?,?)",
        [title, content, type, dbStatus, fac.employee_id, isPinned ? 1 : 0, fac.department_id]
      );
      res.status(201).json({ id: result.insertId, message: "Announcement created" });
    } catch (err) {
      console.error("POST /announcements error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PUT /api/faculty/announcements/:id
router.put(
  "/announcements/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { title, content, type, status, isPinned } = req.body;
    try {
      const [[fac]] = await pool.query(
        "SELECT employee_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      const dbStatus = status === "published" ? "active" : status === "draft" ? "archived" : null;
      const [result] = await pool.query(
        `UPDATE faqs SET
           question = COALESCE(?, question),
           answer = COALESCE(?, answer),
           type = COALESCE(?, type),
           status = COALESCE(?, status),
           is_pinned = COALESCE(?, is_pinned)
         WHERE faq_id = ? AND created_by = ?`,
        [title ?? null, content ?? null, type ?? null, dbStatus, isPinned != null ? (isPinned ? 1 : 0) : null, id, fac.employee_id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Announcement not found" });
      res.json({ message: "Announcement updated" });
    } catch (err) {
      console.error("PUT /announcements/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/announcements/:id
router.delete(
  "/announcements/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    try {
      const [[fac]] = await pool.query(
        "SELECT employee_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      const [result] = await pool.query(
        "DELETE FROM faqs WHERE faq_id = ? AND created_by = ?",
        [id, fac.employee_id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Announcement not found" });
      res.json({ message: "Announcement deleted" });
    } catch (err) {
      console.error("DELETE /announcements/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// APPOINTMENT SERVICES (slot management)
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/appointment-services
router.get(
  "/appointment-services",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM appointment_services WHERE faculty_id = ? ORDER BY service_id",
        [facultyId]
      );
      res.json(rows);
    } catch (err) {
      console.error("GET /appointment-services error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/appointment-services
router.post(
  "/appointment-services",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { service_name, description } = req.body;
    if (!service_name) return res.status(400).json({ message: "service_name is required" });
    try {
      const [result] = await pool.query(
        "INSERT INTO appointment_services (service_name, description, faculty_id) VALUES (?,?,?)",
        [service_name, description ?? null, facultyId]
      );
      res.status(201).json({ service_id: result.insertId, message: "Service created" });
    } catch (err) {
      console.error("POST /appointment-services error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// PUT /api/faculty/appointment-services/:id
router.put(
  "/appointment-services/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { service_name, description } = req.body;
    try {
      const [result] = await pool.query(
        `UPDATE appointment_services
         SET service_name = COALESCE(?, service_name),
             description = COALESCE(?, description)
         WHERE service_id = ? AND faculty_id = ?`,
        [service_name ?? null, description ?? null, id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
      res.json({ message: "Service updated" });
    } catch (err) {
      console.error("PUT /appointment-services/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/appointment-services/:id
router.delete(
  "/appointment-services/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    try {
      const [result] = await pool.query(
        "DELETE FROM appointment_services WHERE service_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Service not found" });
      res.json({ message: "Service deleted" });
    } catch (err) {
      console.error("DELETE /appointment-services/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// FACULTY'S OWN DOCUMENT REQUESTS
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/document-services — available services for faculty's department
router.get(
  "/document-services",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      const [rows] = await pool.query(
        "SELECT * FROM document_services WHERE department_id = ? AND status = 'active' ORDER BY service_name",
        [fac.department_id]
      );
      res.json(rows);
    } catch (err) {
      console.error("GET /document-services error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// GET /api/faculty/my-document-requests
router.get(
  "/my-document-requests",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        `SELECT fdr.*, ds.service_name, ds.processing_time
         FROM faculty_document_requests fdr
         JOIN document_services ds ON fdr.service_id = ds.service_id
         WHERE fdr.faculty_id = ?
         ORDER BY fdr.created_at DESC`,
        [facultyId]
      );
      res.json(rows);
    } catch (err) {
      console.error("GET /my-document-requests error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/my-document-requests
router.post(
  "/my-document-requests",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { service_id, request_type, purpose, notes } = req.body;
    if (!service_id || !purpose) return res.status(400).json({ message: "service_id and purpose are required" });
    try {
      const tracking_number = `FDR-${Date.now()}-${facultyId}`;
      const [result] = await pool.query(
        `INSERT INTO faculty_document_requests (faculty_id, service_id, request_type, purpose, notes, tracking_number)
         VALUES (?,?,?,?,?,?)`,
        [facultyId, service_id, request_type ?? "General", purpose, notes ?? null, tracking_number]
      );
      res.status(201).json({ request_id: result.insertId, tracking_number, message: "Request submitted" });
    } catch (err) {
      console.error("POST /my-document-requests error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

module.exports = router;
