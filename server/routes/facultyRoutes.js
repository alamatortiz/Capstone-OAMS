const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { getManilaDateString } = require("../utils/dateTime");
const { createNotification } = require("../utils/notifications");
const { emitToUser, emitToDept } = require("../sockets");
const { isValidTransition } = require("../utils/appointmentStatus");

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// GET /api/faculty/dashboard-stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const manilaToday = getManilaDateString();

    try {
      // 0. Current availability status (global Available/Unavailable toggle)
      const [[statusRow]] = await pool.query(
        "SELECT availability_status FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );

      // 1. Pending + today's appointments
      const [[apptRow]] = await pool.query(
        `SELECT
           COUNT(*) AS pending_count,
           SUM(CASE WHEN appointment_date = ? AND status IN ('pending','approved') THEN 1 ELSE 0 END) AS today_count
         FROM appointments
         WHERE faculty_id = ?
           AND status IN ('pending', 'approved')
           AND appointment_date >= ?`,
        [manilaToday, facultyId, manilaToday],
      );

      // 2. Distinct students with pending requests
      const [[studentRow]] = await pool.query(
        `SELECT COUNT(DISTINCT student_id) AS student_count
         FROM appointments
         WHERE faculty_id = ? AND status = 'pending'`,
        [facultyId],
      );

      // 3. Faculty's own pending document requests
      const [[docRow]] = await pool.query(
        `SELECT COUNT(*) AS doc_count
         FROM faculty_document_requests
         WHERE faculty_id = ? AND status IN ('pending', 'processing')`,
        [facultyId],
      );

      // 4. Completed this month
      const [[completedRow]] = await pool.query(
        `SELECT COUNT(*) AS completed_count
         FROM appointments
         WHERE faculty_id = ?
           AND status = 'completed'
           AND MONTH(appointment_date) = MONTH(?)
           AND YEAR(appointment_date) = YEAR(?)`,
        [facultyId, manilaToday, manilaToday],
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
           AND a.appointment_date = ?
           AND a.status IN ('pending', 'approved')
         ORDER BY a.appointment_time ASC`,
        [facultyId, manilaToday],
      );

      // 6. Recent activity (last 5)
      const [recentActivity] = await pool.query(
        `SELECT
           a.appointment_id,
           a.status,
           a.cancelled_by,
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
        availabilityStatus: statusRow?.availability_status ?? "available",
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

// GET /api/faculty/availability-status
// Lightweight lookup for the global Available/Unavailable toggle, used by the
// sidebar on every faculty page (avoids pulling the full dashboard-stats payload).
router.get(
  "/availability-status",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[row]] = await pool.query(
        "SELECT availability_status FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      res.json({ availabilityStatus: row?.availability_status ?? "available" });
    } catch (err) {
      console.error("GET /availability-status error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  },
);

// PATCH /api/faculty/availability-status
// Global Available/Unavailable toggle. When 'unavailable', the professor's
// weekly slots are hidden from student browsing/booking without deleting them.
// Body: { status: 'available' | 'unavailable' }
router.patch(
  "/availability-status",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { status } = req.body;
    if (!["available", "unavailable"].includes(status)) {
      return res.status(400).json({ message: "status must be 'available' or 'unavailable'" });
    }
    try {
      await pool.query(
        "UPDATE faculty SET availability_status = ? WHERE faculty_id = ?",
        [status, facultyId],
      );
      res.json({ message: "Availability status updated", availabilityStatus: status });
    } catch (err) {
      console.error("PATCH /availability-status error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
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
  if (row.status === "cancelled") {
    // cancelled_by distinguishes a student's own cancellation from one this
    // faculty member triggered themselves, or an automatic cancellation
    // caused by editing/deleting the schedule slot the appointment was in --
    // without this, all three used to render as "cancelled by {student}".
    if (row.cancelled_by === "system") return `Appointment with ${row.student_name} auto-cancelled — schedule changed`;
    if (row.cancelled_by === "faculty") return `You cancelled the appointment with ${row.student_name}`;
    return `Appointment cancelled by ${row.student_name}`;
  }
  const map = {
    pending: `New appointment request from ${row.student_name}`,
    approved: `Appointment confirmed with ${row.student_name}`,
    completed: `Appointment completed with ${row.student_name}`,
    rejected: `Appointment rejected for ${row.student_name}`,
  };
  return map[row.status] ?? `Appointment update for ${row.student_name}`;
}

function statusToDot(status) {
  return (
    {
      pending: "dot-amber",
      approved: "dot-green",
      completed: "dot-green",
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
          svc.service_name AS appointment_type,
          fda.start_time AS window_start, fda.end_time AS window_end,
          fda.location
        FROM appointments a
        JOIN students s ON a.student_id = s.student_id
        LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
        LEFT JOIN faculty_availability fda ON a.availability_id = fda.availability_id
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
        appointmentType: r.appointment_type ?? null,
        purpose: r.notes || "No purpose specified",
        date:
          r.appointment_date instanceof Date
            ? getManilaDateString(r.appointment_date)
            : String(r.appointment_date).split("T")[0],
        time:
          r.window_start && r.window_end
            ? `${formatTime(r.window_start)} – ${formatTime(r.window_end)}`
            : formatTime(r.appointment_time),
        location: r.location ?? "TBA",
        status: r.status,
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
      return res.status(400).json({ error: "Invalid status value" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[appt]] = await conn.query(
        `SELECT student_id, department_id, status, availability_id, appointment_date
         FROM appointments WHERE appointment_id = ? AND faculty_id = ? FOR UPDATE`,
        [id, facultyId],
      );
      if (!appt) {
        await conn.rollback();
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (!isValidTransition(appt.status, status)) {
        await conn.rollback();
        return res.status(409).json({ error: `Cannot change status from ${appt.status} to ${status}` });
      }

      const apptDateStr = appt.appointment_date instanceof Date
        ? getManilaDateString(appt.appointment_date)
        : String(appt.appointment_date).split("T")[0];
      if (status === "completed" && apptDateStr > getManilaDateString()) {
        await conn.rollback();
        return res.status(400).json({ error: "Cannot mark a future appointment as completed" });
      }

      // Re-check capacity when reviving a pending request into approved --
      // book-slot only enforced this once, at creation time, so a slot that
      // filled up in the meantime must be re-verified here. Lock the
      // template row first, and exclude this appointment's own (already
      // counted, as 'pending') row from the count.
      if (status === "approved" && appt.availability_id) {
        const [[slot]] = await conn.query(
          "SELECT max_students FROM faculty_availability WHERE availability_id = ? FOR UPDATE",
          [appt.availability_id],
        );
        if (slot) {
          const [[{ total }]] = await conn.query(
            `SELECT COUNT(*) AS total FROM appointments
             WHERE availability_id = ? AND appointment_date = ? AND appointment_id != ?
               AND status NOT IN ('cancelled', 'rejected')`,
            [appt.availability_id, appt.appointment_date, id],
          );
          if (slot.max_students != null && total >= slot.max_students) {
            await conn.rollback();
            return res.status(409).json({ error: "This availability window is now fully booked" });
          }
        }
      }

      const cancelledBy = status === "cancelled" ? "faculty" : null;
      await conn.query(
        `UPDATE appointments
         SET status = ?, cancelled_by = COALESCE(?, cancelled_by)
         WHERE appointment_id = ? AND faculty_id = ?`,
        [status, cancelledBy, id, facultyId],
      );

      await conn.commit();

      emitToUser(appt.student_id, "appointment:status-updated", { appointmentId: Number(id), status });
      emitToDept(appt.department_id, "appointment:status-updated", { appointmentId: Number(id), status });
      createNotification(appt.student_id, `Your appointment has been ${status}.`);

      res.json({ message: "Status updated" });
    } catch (err) {
      await conn.rollback();
      console.error("PATCH /appointments/:id/status error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DOCUMENT REQUESTS (student requests in faculty's department)
// ─────────────────────────────────────────────────────────────


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

      // Faculty only see their OWN document requests here (not students' —
      // department-wide student document requests are admin-only data).
      if (filterType === "all" || filterType === "document") {
        let sql = `
          SELECT
            fdr.request_id AS id, 'document' AS type,
            ds.service_name AS description,
            fdr.status, fdr.created_at AS date, fdr.created_at,
            fdr.tracking_number AS trackingNumber,
            fdr.purpose, fdr.copies
          FROM faculty_document_requests fdr
          JOIN document_services ds ON fdr.service_id = ds.service_id
          WHERE fdr.faculty_id = ?`;
        const params = [facultyId];
        if (filterStatus !== "all") { sql += " AND fdr.status = ?"; params.push(filterStatus); }
        if (search) { sql += " AND (ds.service_name LIKE ? OR fdr.purpose LIKE ? OR fdr.tracking_number LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
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
// Recurring weekly schedule: faculty sets a day-of-week + time
// window (with location, capacity, and appointment types) that
// repeats every week until edited or removed.
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/locations
// Fixed premises the faculty can pick from for their availability slots:
// their own department's locations plus shared/global ones.
router.get(
  "/locations",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      const deptId = fac?.department_id ?? null;

      const [rows] = await pool.query(
        `SELECT location_id, department_id, location_name
         FROM locations
         WHERE department_id = ? OR department_id IS NULL
         ORDER BY department_id IS NULL, location_name ASC`,
        [deptId],
      );
      res.json({ locations: rows.map((r) => ({
        id: r.location_id,
        name: r.location_name,
        isGlobal: r.department_id === null,
      })) });
    } catch (err) {
      console.error("GET /locations error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  },
);

// POST /api/faculty/locations
// Body: { name }
// Lets a faculty member add a one-off premise not yet in the fixed list,
// scoped to their own department. Idempotent via uq_location_dept_name.
router.post(
  "/locations",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      const deptId = fac?.department_id ?? null;
      if (!deptId) return res.status(403).json({ message: "Faculty has no department assigned" });

      await pool.query(
        `INSERT INTO locations (department_id, location_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE location_name = location_name`,
        [deptId, name],
      );
      const [[loc]] = await pool.query(
        `SELECT location_id, location_name FROM locations WHERE department_id = ? AND location_name = ?`,
        [deptId, name],
      );
      res.status(201).json({ id: loc.location_id, name: loc.location_name, isGlobal: false });
    } catch (err) {
      console.error("POST /locations error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  },
);

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

      if (rows.length === 0) return res.json([]);

      // Attach appointment services (types) offered for each recurring slot
      const ids = rows.map((r) => r.availability_id);
      const [svcRows] = await pool.query(
        `SELECT fas.availability_id, aps.service_id, aps.service_name
         FROM faculty_availability_services fas
         JOIN appointment_services aps ON fas.service_id = aps.service_id
         WHERE fas.availability_id IN (?)
         ORDER BY fas.id ASC`,
        [ids]
      );
      const svcMap = {};
      for (const s of svcRows) {
        (svcMap[s.availability_id] ||= []).push({ id: s.service_id, name: s.service_name });
      }
      const result = rows.map((r) => ({ ...r, appointmentTypes: svcMap[r.availability_id] ?? [] }));
      res.json(result);
    } catch (err) {
      console.error("GET /availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// POST /api/faculty/availability
// Body: { day_of_week, start_time, end_time, location, max_students, appointmentTypes? }
router.post(
  "/availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { day_of_week, start_time, end_time, location, max_students, appointmentTypes } = req.body;
    if (!day_of_week || !start_time || !end_time) {
      return res.status(400).json({ message: "day_of_week, start_time, end_time are required" });
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

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock this faculty member's row so two concurrent create/edit requests
      // (double-submit, retried request) can't both pass the overlap check
      // below before either commits. A brand-new row can't be locked before
      // it exists, so the faculty row is used as the serialization point.
      const [[fac]] = await conn.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ? FOR UPDATE",
        [facultyId]
      );

      // Reject any slot whose window intersects an existing slot on the same
      // day — a professor can't run two overlapping consultation blocks at
      // once (different rooms/caps/types would make booking ambiguous).
      const [sameDay] = await conn.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ?",
        [facultyId, day_of_week]
      );
      const overlap = sameDay.find((s) => {
        const sStart = String(s.start_time).slice(0, 5);
        const sEnd = String(s.end_time).slice(0, 5);
        return start_time < sEnd && sStart < end_time;
      });
      if (overlap) {
        await conn.rollback();
        return res.status(409).json({
          message: `This time overlaps an existing slot on ${day_of_week} (${String(overlap.start_time).slice(0, 5)}–${String(overlap.end_time).slice(0, 5)})`,
        });
      }
      const [result] = await conn.query(
        "INSERT INTO faculty_availability (faculty_id, day_of_week, start_time, end_time, location, max_students) VALUES (?,?,?,?,?,?)",
        [facultyId, day_of_week, start_time, end_time, location ?? null, maxStu]
      );
      const newId = result.insertId;
      const linkedServices = [];
      for (const name of types) {
        // Find existing service for this faculty with the same name, or create it
        let [[svc]] = await conn.query(
          "SELECT service_id, service_name FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
          [facultyId, name]
        );
        if (!svc) {
          const [ins] = await conn.query(
            "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
            [name, facultyId]
          );
          svc = { service_id: ins.insertId, service_name: name };
        }
        await conn.query(
          "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
          [newId, svc.service_id]
        );
        linkedServices.push({ id: svc.service_id, name: svc.service_name });
      }

      await conn.commit();

      emitToDept(fac?.department_id, "appointment:slot-updated", { availabilityId: newId });

      res.status(201).json({
        availability_id: newId,
        message: "Availability added",
        max_students: maxStu,
        appointmentTypes: linkedServices,
      });
    } catch (err) {
      await conn.rollback();
      console.error("POST /availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    } finally {
      conn.release();
    }
  }
);

// PATCH /api/faculty/availability/:id
// Body: { day_of_week?, start_time?, end_time?, location?, max_students?, appointmentTypes? }
router.patch(
  "/availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const { day_of_week, start_time, end_time, location, max_students, appointmentTypes } = req.body;

    let maxStu;
    if (max_students !== undefined) {
      maxStu = parseInt(max_students, 10);
      if (isNaN(maxStu) || maxStu < 1) {
        return res.status(400).json({ message: "max_students must be a positive integer" });
      }
    }

    const replaceTypes = Array.isArray(appointmentTypes);
    const types = replaceTypes
      ? [...new Set(appointmentTypes.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20)
      : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock this faculty member's row so a concurrent create/edit can't
      // slip an overlapping slot past the check below before this commits.
      await conn.query("SELECT department_id FROM faculty WHERE faculty_id = ? FOR UPDATE", [facultyId]);

      const [[current]] = await conn.query(
        "SELECT day_of_week, start_time, end_time FROM faculty_availability WHERE availability_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (!current) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      // Resolve the effective day/time window this edit would produce (falling
      // back to the current row for any field not included in the request),
      // then apply the same overlap rule as creation — see POST /availability.
      const effectiveDay = day_of_week ?? current.day_of_week;
      const effectiveStart = start_time ?? String(current.start_time).slice(0, 5);
      const effectiveEnd = end_time ?? String(current.end_time).slice(0, 5);
      if (effectiveEnd <= effectiveStart) {
        await conn.rollback();
        return res.status(400).json({ message: "end_time must be after start_time" });
      }

      const [sameDay] = await conn.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ? AND availability_id != ?",
        [facultyId, effectiveDay, id]
      );
      const overlap = sameDay.find((s) => {
        const sStart = String(s.start_time).slice(0, 5);
        const sEnd = String(s.end_time).slice(0, 5);
        return effectiveStart < sEnd && sStart < effectiveEnd;
      });
      if (overlap) {
        await conn.rollback();
        return res.status(409).json({
          message: `This time overlaps an existing slot on ${effectiveDay} (${String(overlap.start_time).slice(0, 5)}–${String(overlap.end_time).slice(0, 5)})`,
        });
      }

      // Cancel bookings that no longer fit the edited window/day -- otherwise
      // a student's card would silently start showing the new window while
      // their actual (unvalidated) appointment_date/appointment_time stays
      // whatever it was originally booked as.
      const [bookings] = await conn.query(
        `SELECT appointment_id, student_id, department_id, appointment_date, appointment_time
         FROM appointments
         WHERE availability_id = ? AND status IN ('pending', 'approved')
         FOR UPDATE`,
        [id],
      );
      const noLongerFits = bookings.filter((b) => {
        const dateObj = b.appointment_date instanceof Date ? b.appointment_date : new Date(`${b.appointment_date}T00:00:00`);
        const weekday = WEEKDAY_NAMES[dateObj.getDay()];
        if (weekday !== effectiveDay) return true;
        const apptTime = String(b.appointment_time).slice(0, 5);
        return apptTime < effectiveStart || apptTime >= effectiveEnd;
      });
      if (noLongerFits.length > 0) {
        await conn.query(
          `UPDATE appointments SET status = 'cancelled', cancelled_by = 'system'
           WHERE appointment_id IN (?)`,
          [noLongerFits.map((b) => b.appointment_id)],
        );
      }

      const [result] = await conn.query(
        `UPDATE faculty_availability
         SET day_of_week = COALESCE(?, day_of_week),
             start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             location = COALESCE(?, location),
             max_students = COALESCE(?, max_students)
         WHERE availability_id = ? AND faculty_id = ?`,
        [day_of_week ?? null, start_time ?? null, end_time ?? null, location ?? null, maxStu ?? null, id, facultyId]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      if (replaceTypes) {
        await conn.query("DELETE FROM faculty_availability_services WHERE availability_id = ?", [id]);
        for (const name of types) {
          let [[svc]] = await conn.query(
            "SELECT service_id FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
            [facultyId, name]
          );
          if (!svc) {
            const [ins] = await conn.query(
              "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
              [name, facultyId]
            );
            svc = { service_id: ins.insertId };
          }
          await conn.query(
            "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
            [id, svc.service_id]
          );
        }
      }

      await conn.commit();

      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      emitToDept(fac?.department_id, "appointment:slot-updated", { availabilityId: Number(id) });

      for (const b of noLongerFits) {
        const dateStr = b.appointment_date instanceof Date
          ? getManilaDateString(b.appointment_date)
          : String(b.appointment_date).split("T")[0];
        emitToUser(b.student_id, "appointment:status-updated", {
          appointmentId: b.appointment_id,
          status: "cancelled",
          reason: "schedule_changed",
        });
        createNotification(
          b.student_id,
          `Your appointment on ${dateStr} was cancelled because the professor changed that time slot. Please book a new one.`,
        );
      }

      res.json({ message: "Availability updated", cancelledAppointments: noLongerFits.length });
    } catch (err) {
      await conn.rollback();
      console.error("PATCH /availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    } finally {
      conn.release();
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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[slot]] = await conn.query(
        "SELECT availability_id FROM faculty_availability WHERE availability_id = ? AND faculty_id = ? FOR UPDATE",
        [id, facultyId]
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      // Cancel every pending/approved booking against this template before
      // deleting it -- the FK is ON DELETE SET NULL, so without this they'd
      // survive with availability_id wiped and silently show "TBA"/a blank
      // window instead of being cancelled and the student notified.
      const [affected] = await conn.query(
        `SELECT appointment_id, student_id, department_id, appointment_date
         FROM appointments
         WHERE availability_id = ? AND status IN ('pending', 'approved')
         FOR UPDATE`,
        [id],
      );
      if (affected.length > 0) {
        await conn.query(
          `UPDATE appointments SET status = 'cancelled', cancelled_by = 'system'
           WHERE availability_id = ? AND status IN ('pending', 'approved')`,
          [id],
        );
      }

      const [result] = await conn.query(
        "DELETE FROM faculty_availability WHERE availability_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      await conn.commit();

      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      emitToDept(fac?.department_id, "appointment:slot-removed", { availabilityId: Number(id) });

      for (const appt of affected) {
        const dateStr = appt.appointment_date instanceof Date
          ? getManilaDateString(appt.appointment_date)
          : String(appt.appointment_date).split("T")[0];
        emitToUser(appt.student_id, "appointment:status-updated", {
          appointmentId: appt.appointment_id,
          status: "cancelled",
          reason: "schedule_removed",
        });
        createNotification(
          appt.student_id,
          `Your appointment on ${dateStr} was cancelled because the professor removed that time slot. Please book a new one.`,
        );
      }

      res.json({ message: "Availability deleted", cancelledAppointments: affected.length });
    } catch (err) {
      await conn.rollback();
      console.error("DELETE /availability/:id error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    } finally {
      conn.release();
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
        "SELECT service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time, requires_coding FROM document_services WHERE (department_id = ? OR is_cross_college = TRUE) AND recipient_type IN ('faculty', 'both') AND status = 'active' ORDER BY service_name",
        [fac.department_id]
      );

      const serviceIds = rows.map((r) => r.service_id);
      let requirementsMap = {};
      if (serviceIds.length > 0) {
        const [reqRows] = await pool.query(
          "SELECT service_id, requirement_name, description, is_mandatory FROM document_requirements WHERE service_id IN (?) ORDER BY is_mandatory DESC, requirement_id ASC",
          [serviceIds]
        );
        for (const req of reqRows) {
          if (!requirementsMap[req.service_id]) requirementsMap[req.service_id] = [];
          requirementsMap[req.service_id].push({
            name: req.requirement_name,
            description: req.description,
            isMandatory: !!req.is_mandatory,
          });
        }
      }

      res.json(rows.map((r) => ({ ...r, requirements: requirementsMap[r.service_id] ?? [] })));
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
        `SELECT fdr.*, ds.service_name, ds.processing_time,
                d.department_name AS college
         FROM faculty_document_requests fdr
         JOIN document_services ds ON fdr.service_id = ds.service_id
         JOIN departments d ON ds.department_id = d.department_id
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
// Body: { service_id, request_type, purpose, notes, needed_by, copies }
router.post(
  "/my-document-requests",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { service_id, request_type, purpose, notes, needed_by, copies } = req.body;
    if (!service_id || !purpose) return res.status(400).json({ message: "service_id and purpose are required" });
    if (purpose.length > 255) {
      return res.status(400).json({ message: "Purpose must be 255 characters or fewer" });
    }

    const copyCount = copies === undefined ? 1 : parseInt(copies, 10);
    if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 20) {
      return res.status(400).json({ message: "Number of copies must be a whole number between 1 and 20" });
    }

    const tomorrow = getManilaDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    if (needed_by && needed_by < tomorrow) {
      return res.status(400).json({ message: "Needed-by date must be at least tomorrow" });
    }

    try {
      // Confirm service_id is a real, active service actually visible to this faculty
      // member (own department, or cross-college) -- the client's dropdown already
      // filters this way, but the server shouldn't just trust whatever id it's sent.
      const [[fac]] = await pool.query(
        `SELECT department_id FROM faculty WHERE faculty_id = ?`,
        [facultyId]
      );
      const [[svc]] = await pool.query(
        `SELECT service_id, department_id FROM document_services
         WHERE service_id = ? AND status = 'active' AND recipient_type IN ('faculty','both')
           AND (department_id = ? OR is_cross_college = TRUE)`,
        [service_id, fac?.department_id]
      );
      if (!svc) {
        return res.status(404).json({ message: "No matching service configuration found" });
      }

      // Guard against a double-click/double-tap firing this twice before the client's
      // own disabled-button state catches up to the first request.
      const [[recentDup]] = await pool.query(
        `SELECT request_id FROM faculty_document_requests
         WHERE faculty_id = ? AND service_id = ? AND purpose = ?
           AND created_at >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [facultyId, service_id, purpose]
      );
      if (recentDup) {
        return res.status(409).json({ message: "This request was already submitted a moment ago" });
      }

      const [result] = await pool.query(
        `INSERT INTO faculty_document_requests (faculty_id, service_id, request_type, purpose, copies, notes, needed_by)
         VALUES (?,?,?,?,?,?,?)`,
        [facultyId, service_id, request_type ?? "General", purpose, copyCount, notes ?? null, needed_by || null]
      );
      const [[newRequest]] = await pool.query(
        `SELECT request_id, tracking_number, copies FROM faculty_document_requests WHERE request_id = ?`,
        [result.insertId]
      );

      emitToDept(svc.department_id, "document:new-request", { requestId: newRequest.request_id });

      res.status(201).json({
        request_id: newRequest.request_id,
        tracking_number: newRequest.tracking_number,
        copies: newRequest.copies,
        message: "Request submitted",
      });
    } catch (err) {
      console.error("POST /my-document-requests error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

// DELETE /api/faculty/my-document-requests/:requestId
// Cancels (removes) a pending or processing document request owned by the faculty member.
router.delete(
  "/my-document-requests/:requestId",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const requestId = parseInt(req.params.requestId, 10);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid requestId" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the row so an admin's status-changing UPDATE (e.g. to
      // "generated") can't land in the narrow window between this SELECT
      // and the DELETE below.
      const [[request]] = await conn.query(
        `SELECT fdr.request_id, fdr.faculty_id, fdr.status, s.department_id
         FROM faculty_document_requests fdr
         JOIN document_services s ON fdr.service_id = s.service_id
         WHERE fdr.request_id = ?
         FOR UPDATE`,
        [requestId]
      );

      if (!request) {
        await conn.rollback();
        return res.status(404).json({ message: "Document request not found" });
      }
      if (request.faculty_id !== facultyId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ message: "You can only cancel your own document requests" });
      }
      if (!["pending", "processing"].includes(request.status)) {
        await conn.rollback();
        return res.status(409).json({
          message: `Cannot cancel a request that is already ${request.status}`,
        });
      }

      await conn.query(
        `DELETE FROM faculty_document_requests WHERE request_id = ?`,
        [requestId]
      );

      await conn.commit();

      emitToDept(request.department_id, "document:cancelled", { requestId });

      res.json({
        message: "Document request cancelled successfully",
        requestId,
      });
    } catch (err) {
      await conn.rollback();
      console.error("DELETE /my-document-requests/:requestId error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    } finally {
      conn.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

// GET /api/faculty/notifications
router.get(
  "/notifications",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT notification_id, message, is_read, created_at
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [req.user.userId],
      );
      res.json({ notifications: rows });
    } catch (error) {
      console.error("GET /notifications error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/faculty/notifications/:id/read
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    try {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?`,
        [req.params.id, req.user.userId],
      );
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/faculty/notifications/read-all
router.patch(
  "/notifications/read-all",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    try {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
        [req.user.userId],
      );
      res.json({ message: "All marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

module.exports = router;
