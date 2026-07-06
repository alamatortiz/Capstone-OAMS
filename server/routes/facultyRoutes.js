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
      // 0. Current availability status (global Available/Unavailable toggle)
      const [[statusRow]] = await pool.query(
        "SELECT availability_status FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );

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
            ? r.appointment_date.toISOString().split("T")[0]
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
            fdr.purpose
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

    try {
      // Reject any slot whose window intersects an existing slot on the same
      // day — a professor can't run two overlapping consultation blocks at
      // once (different rooms/caps/types would make booking ambiguous).
      const [sameDay] = await pool.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ?",
        [facultyId, day_of_week]
      );
      const overlap = sameDay.find((s) => {
        const sStart = String(s.start_time).slice(0, 5);
        const sEnd = String(s.end_time).slice(0, 5);
        return start_time < sEnd && sStart < end_time;
      });
      if (overlap) {
        return res.status(409).json({
          message: `This time overlaps an existing slot on ${day_of_week} (${String(overlap.start_time).slice(0, 5)}–${String(overlap.end_time).slice(0, 5)})`,
        });
      }
      const [result] = await pool.query(
        "INSERT INTO faculty_availability (faculty_id, day_of_week, start_time, end_time, location, max_students) VALUES (?,?,?,?,?,?)",
        [facultyId, day_of_week, start_time, end_time, location ?? null, maxStu]
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
          "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
          [newId, svc.service_id]
        );
        linkedServices.push({ id: svc.service_id, name: svc.service_name });
      }
      res.status(201).json({
        availability_id: newId,
        message: "Availability added",
        max_students: maxStu,
        appointmentTypes: linkedServices,
      });
    } catch (err) {
      console.error("POST /availability error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
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

    try {
      const [[current]] = await pool.query(
        "SELECT day_of_week, start_time, end_time FROM faculty_availability WHERE availability_id = ? AND faculty_id = ?",
        [id, facultyId]
      );
      if (!current) return res.status(404).json({ message: "Availability not found" });

      // Resolve the effective day/time window this edit would produce (falling
      // back to the current row for any field not included in the request),
      // then apply the same overlap rule as creation — see POST /availability.
      const effectiveDay = day_of_week ?? current.day_of_week;
      const effectiveStart = start_time ?? String(current.start_time).slice(0, 5);
      const effectiveEnd = end_time ?? String(current.end_time).slice(0, 5);
      if (effectiveEnd <= effectiveStart) {
        return res.status(400).json({ message: "end_time must be after start_time" });
      }

      const [sameDay] = await pool.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ? AND availability_id != ?",
        [facultyId, effectiveDay, id]
      );
      const overlap = sameDay.find((s) => {
        const sStart = String(s.start_time).slice(0, 5);
        const sEnd = String(s.end_time).slice(0, 5);
        return effectiveStart < sEnd && sStart < effectiveEnd;
      });
      if (overlap) {
        return res.status(409).json({
          message: `This time overlaps an existing slot on ${effectiveDay} (${String(overlap.start_time).slice(0, 5)}–${String(overlap.end_time).slice(0, 5)})`,
        });
      }

      const [result] = await pool.query(
        `UPDATE faculty_availability
         SET day_of_week = COALESCE(?, day_of_week),
             start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             location = COALESCE(?, location),
             max_students = COALESCE(?, max_students)
         WHERE availability_id = ? AND faculty_id = ?`,
        [day_of_week ?? null, start_time ?? null, end_time ?? null, location ?? null, maxStu ?? null, id, facultyId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: "Availability not found" });

      if (replaceTypes) {
        await pool.query("DELETE FROM faculty_availability_services WHERE availability_id = ?", [id]);
        for (const name of types) {
          let [[svc]] = await pool.query(
            "SELECT service_id FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
            [facultyId, name]
          );
          if (!svc) {
            const [ins] = await pool.query(
              "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
              [name, facultyId]
            );
            svc = { service_id: ins.insertId };
          }
          await pool.query(
            "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
            [id, svc.service_id]
          );
        }
      }
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
        "SELECT * FROM document_services WHERE (department_id = ? OR department_id IS NULL) AND recipient_type IN ('faculty', 'both') AND status = 'active' ORDER BY service_name",
        [fac.department_id]
      );

      const serviceIds = rows.map((r) => r.service_id);
      let requirementsMap = {};
      if (serviceIds.length > 0) {
        const [reqRows] = await pool.query(
          "SELECT service_id, requirement_name FROM document_requirements WHERE service_id IN (?) ORDER BY is_mandatory DESC, requirement_id ASC",
          [serviceIds]
        );
        for (const req of reqRows) {
          if (!requirementsMap[req.service_id]) requirementsMap[req.service_id] = [];
          requirementsMap[req.service_id].push(req.requirement_name);
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
                COALESCE(d.department_name, 'All Departments') AS college
         FROM faculty_document_requests fdr
         JOIN document_services ds ON fdr.service_id = ds.service_id
         LEFT JOIN departments d ON ds.department_id = d.department_id
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
      const [result] = await pool.query(
        `INSERT INTO faculty_document_requests (faculty_id, service_id, request_type, purpose, notes)
         VALUES (?,?,?,?,?)`,
        [facultyId, service_id, request_type ?? "General", purpose, notes ?? null]
      );
      const [[newRequest]] = await pool.query(
        `SELECT request_id, tracking_number FROM faculty_document_requests WHERE request_id = ?`,
        [result.insertId]
      );
      res.status(201).json({
        request_id: newRequest.request_id,
        tracking_number: newRequest.tracking_number,
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

    try {
      const [[request]] = await pool.query(
        `SELECT request_id, faculty_id, status
         FROM faculty_document_requests WHERE request_id = ?`,
        [requestId]
      );

      if (!request) {
        return res.status(404).json({ message: "Document request not found" });
      }
      if (request.faculty_id !== facultyId) {
        return res
          .status(403)
          .json({ message: "You can only cancel your own document requests" });
      }
      if (!["pending", "processing"].includes(request.status)) {
        return res.status(409).json({
          message: `Cannot cancel a request that is already ${request.status}`,
        });
      }

      await pool.query(
        `DELETE FROM faculty_document_requests WHERE request_id = ?`,
        [requestId]
      );

      res.json({
        message: "Document request cancelled successfully",
        requestId,
      });
    } catch (err) {
      console.error("DELETE /my-document-requests/:requestId error:", err);
      res.status(500).json({ message: "Internal server error", dev_error: err.message });
    }
  }
);

module.exports = router;
