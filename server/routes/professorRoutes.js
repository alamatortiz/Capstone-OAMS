const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const {
  getManilaDateString,
  formatTime12h: formatTime,
  formatRelativeTime,
} = require("../utils/dateTime");
// const { createNotification } = require("../utils/notifications");
const {
  createNotification,
  notifyDepartmentAdmins,
} = require("../utils/notifications");
const notificationsController = require("../controllers/notificationsController");
const { emitToUser, emitToDept } = require("../sockets");
const { isValidTransition } = require("../utils/appointmentStatus");
const { cancelOwnDocumentRequest } = require("../utils/documentStatus");
const { sendServerError } = require("../utils/errorResponse");
const {
  getAttachmentsMap,
  serveAnnouncementAttachment,
} = require("../utils/announcementAttachments");
const { documentSubmissionUpload, MAX_FILES } = require("../middleware/upload");
const { nextTrackingNumber } = require("../utils/trackingNumber");
const {
  getFilesMap,
  getFiles,
  insertFiles,
  validateBudget,
  deleteFiles,
  serveFacultyDocumentSubmissionFile,
} = require("../utils/documentSubmissionAttachments");

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// GET /api/professor/dashboard-stats
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

      // 1. Pending + today's appointments, plus the pending/approved split
      // that powers the "Pending Appointments" stat card's description
      // (mirrors student's own appointments.{pending,approved} breakdown).
      const [[apptRow]] = await pool.query(
        `SELECT
           COUNT(*) AS pending_count,
           SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_only,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_only,
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

      // 3. Faculty's own document requests, broken down by status -- mirrors
      // student's stats.documents.{pendingOnly,processing,ready,released}
      // breakdown so the "Documents" stat card's description can be built
      // the same way. `doc_count` (pending+processing only) is kept for the
      // Document Requests quick-action badge, which still wants "needs
      // attention" semantics, not the full active-document total below.
      const [[docRow]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END) AS pending_only,
           SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
           SUM(CASE WHEN status = 'generated'  THEN 1 ELSE 0 END) AS ready_count,
           SUM(CASE WHEN status = 'released'   THEN 1 ELSE 0 END) AS released_count
         FROM faculty_document_requests
         WHERE faculty_id = ?`,
        [facultyId],
      );
      const docPendingOnly = Number(docRow.pending_only || 0);
      const docProcessing = Number(docRow.processing_count || 0);
      const docReady = Number(docRow.ready_count || 0);
      const docReleased = Number(docRow.released_count || 0);
      const docCount = docPendingOnly + docProcessing;

      // 4. Completed, all-time -- appointments completed + the faculty
      // member's own document requests claimed. Mirrors student's own
      // completedRow pattern (studentRoutes.js), minus the queue term since
      // professors don't have queues.
      const [[completedRow]] = await pool.query(
        `SELECT
           (
             SELECT COUNT(*) FROM appointments
             WHERE faculty_id = ? AND status = 'completed'
           ) +
           (
             SELECT COUNT(*) FROM faculty_document_requests
             WHERE faculty_id = ? AND status = 'claimed'
           ) AS total_completed`,
        [facultyId, facultyId],
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
           s.course,
           COALESCE(svc.service_name, a.notes, 'Consultation') AS appointment_type
         FROM appointments a
         JOIN students s ON a.student_id = s.student_id
         LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
         WHERE a.faculty_id = ?
           AND a.appointment_date = ?
           AND a.status IN ('pending', 'approved')
         ORDER BY a.appointment_time ASC`,
        [facultyId, manilaToday],
      );

      // 6. Recent activity (last 5) — union of appointment events and the
      // faculty member's own document-request events. Both branches select a
      // literal `type` column so buildActivityTitle/buildDocumentActivityTitle
      // know which one they're formatting; the document branch has no
      // cancelled_by/student_name equivalent, so those are NULL placeholders
      // kept only to line up the two branches' column counts for the UNION.
      const [recentActivity] = await pool.query(
        `(
           SELECT
             'appointment' AS type,
             a.status,
             a.cancelled_by,
             a.created_at AS event_time,
             CONCAT(s.first_name, ' ', s.last_name) AS student_name,
             a.notes AS purpose,
             NULL AS request_type
           FROM appointments a
           JOIN students s ON a.student_id = s.student_id
           WHERE a.faculty_id = ?
         )
         UNION ALL
         (
           SELECT
             'document' AS type,
             fdr.status,
             NULL AS cancelled_by,
             fdr.created_at AS event_time,
             NULL AS student_name,
             fdr.purpose,
             fdr.request_type
           FROM faculty_document_requests fdr
           WHERE fdr.faculty_id = ?
         )
         ORDER BY event_time DESC
         LIMIT 5`,
        [facultyId, facultyId],
      );

      res.json({
        availabilityStatus: statusRow?.availability_status ?? "available",
        stats: {
          pendingAppointments: apptRow.pending_count || 0,
          appointments: {
            pending: Number(apptRow.pending_only || 0),
            approved: Number(apptRow.approved_only || 0),
          },
          todayAppointments: apptRow.today_count || 0,
          studentRequests: studentRow.student_count || 0,
          documentsToReview: docCount,
          documents: {
            total: docCount + docReady + docReleased,
            pendingOnly: docPendingOnly,
            processing: docProcessing,
            ready: docReady,
            released: docReleased,
          },
          completed: completedRow.total_completed || 0,
        },
        todayAppointments: todayAppointments.map((a) => ({
          id: a.appointment_id,
          student: `${a.first_name} ${a.last_name}`,
          studentNumber: a.student_number,
          course: a.course,
          purpose: a.notes ?? "No notes provided",
          appointmentType: a.appointment_type,
          time: formatTime(a.appointment_time),
          status: a.status,
        })),
        recentActivity: recentActivity.map((row, i) => ({
          id: i + 1,
          type: row.type,
          title:
            row.type === "document"
              ? buildDocumentActivityTitle(row)
              : buildActivityTitle(row),
          status: row.status,
          time: formatRelativeTime(new Date(row.event_time)),
        })),
      });
    } catch (error) {
      sendServerError(res, error, "Faculty dashboard stats error:");
    }
  },
);

// GET /api/professor/availability-status
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
      sendServerError(res, err, "GET /availability-status error:");
    }
  },
);

// GET /api/professor/office-hours
// The logged-in faculty member's own department office hours/location --
// mirrors GET /api/student/office-hours (studentRoutes.js), just joined
// through the faculty table instead of students.
router.get(
  "/office-hours",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[dept]] = await pool.query(
        `SELECT d.department_name, d.department_abbreviation, d.office_location, d.office_hours
         FROM faculty f
         JOIN departments d ON f.department_id = d.department_id
         WHERE f.faculty_id = ?`,
        [facultyId],
      );
      if (!dept)
        return res.status(404).json({ message: "Department not found" });
      res.json({
        departmentName: dept.department_name,
        departmentAbbrev: dept.department_abbreviation,
        officeLocation: dept.office_location ?? "",
        officeHours: dept.office_hours ?? "",
      });
    } catch (error) {
      sendServerError(res, error, "Faculty office hours error:");
    }
  },
);

// PATCH /api/professor/availability-status
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
      return res
        .status(400)
        .json({ message: "status must be 'available' or 'unavailable'" });
    }
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      await pool.query(
        "UPDATE faculty SET availability_status = ? WHERE faculty_id = ?",
        [status, facultyId],
      );
      emitToDept(fac?.department_id, "faculty:availability-status-changed", {
        facultyId: Number(facultyId),
        availabilityStatus: status,
      });
      res.json({
        message: "Availability status updated",
        availabilityStatus: status,
      });
    } catch (err) {
      sendServerError(res, err, "PATCH /availability-status error:");
    }
  },
);

function buildActivityTitle(row) {
  if (row.status === "cancelled") {
    // cancelled_by distinguishes a student's own cancellation from one this
    // faculty member triggered themselves, or an automatic cancellation
    // caused by editing/deleting the schedule slot the appointment was in --
    // without this, all three used to render as "cancelled by {student}".
    if (row.cancelled_by === "system")
      return `Appointment with ${row.student_name} auto-cancelled — schedule changed`;
    if (row.cancelled_by === "system_expired")
      return `Appointment with ${row.student_name} auto-cancelled — you never responded`;
    if (row.cancelled_by === "faculty")
      return `You cancelled the appointment with ${row.student_name}`;
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

function buildDocumentActivityTitle(row) {
  const map = {
    pending: `Document request submitted: ${row.request_type}`,
    processing: `Document request being processed: ${row.request_type}`,
    generated: `Document ready for pickup: ${row.request_type}`,
    released: `Document released: ${row.request_type}`,
    claimed: `Document claimed: ${row.request_type}`,
    rejected: `Document request rejected: ${row.request_type}`,
    cancelled: `You cancelled the document request: ${row.request_type}`,
  };
  return map[row.status] ?? `Document request update: ${row.request_type}`;
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

// GET /api/professor/appointments
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
          COALESCE(a.window_start_snapshot, fda.start_time) AS window_start,
          COALESCE(a.window_end_snapshot,   fda.end_time)   AS window_end,
          COALESCE(a.location_snapshot,     fda.location)   AS location
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
      res.json(
        rows.map((r) => ({
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
          requestedAt: new Date(r.created_at).toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          // Raw instant for the client to format itself (calendar/clock split) --
          // same interpretation as requestedAt above, which stays for older clients.
          requestedAtRaw: r.created_at,
        })),
      );
    } catch (err) {
      sendServerError(res, err, "GET /appointments error:");
    }
  },
);

// PATCH /api/professor/appointments/:id/status
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
        `SELECT a.student_id, a.department_id, a.status, a.availability_id, a.appointment_date,
                a.appointment_time, sv.service_name
         FROM appointments a
         LEFT JOIN appointment_services sv ON a.service_id = sv.service_id
         WHERE a.appointment_id = ? AND a.faculty_id = ? FOR UPDATE`,
        [id, facultyId],
      );
      if (!appt) {
        await conn.rollback();
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (!isValidTransition(appt.status, status)) {
        await conn.rollback();
        return res.status(409).json({
          error: `Cannot change status from ${appt.status} to ${status}`,
        });
      }

      const apptDateStr =
        appt.appointment_date instanceof Date
          ? getManilaDateString(appt.appointment_date)
          : String(appt.appointment_date).split("T")[0];
      if (status === "completed" && apptDateStr > getManilaDateString()) {
        await conn.rollback();
        return res
          .status(400)
          .json({ error: "Cannot mark a future appointment as completed" });
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
            return res
              .status(409)
              .json({ error: "This availability window is now fully booked" });
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

      emitToUser(appt.student_id, "appointment:status-updated", {
        appointmentId: Number(id),
        status,
      });
      emitToDept(appt.department_id, "appointment:status-updated", {
        appointmentId: Number(id),
        status,
      });
      const apptServicePart = appt.service_name
        ? `${appt.service_name} appointment`
        : "appointment";
      const apptWhenPart = ` on ${getManilaDateString(appt.appointment_date)} at ${formatTime(appt.appointment_time)}`;
      createNotification(
        appt.student_id,
        `Your ${apptServicePart}${apptWhenPart} has been ${status}.`,
        "appointment",
      );

      res.json({ message: "Status updated" });
    } catch (err) {
      await conn.rollback();
      sendServerError(res, err, "PATCH /appointments/:id/status error:");
    } finally {
      conn.release();
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DOCUMENT REQUESTS (student requests in faculty's department)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS (combined appointment + document history)
// ─────────────────────────────────────────────────────────────

// GET /api/professor/transactions
// NOTE: `description` is kept computing its original value (unchanged) even
// though the web page now prefers `title`/`details` below -- client-mobile's
// professor transactions screen reads `description` directly, and this
// endpoint's response shape must stay backward-compatible for it (only the
// URL path itself was renamed for mobile; no payload/shape changes are in
// scope there). `title`/`details` are purely additive fields for web.
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
            CONCAT('Student Appointment - ', COALESCE(svc.service_name, a.notes, 'Consultation')) AS title,
            COALESCE(svc.service_name, a.notes, 'Consultation') AS details,
            a.status, a.updated_at AS date, a.updated_at AS event_time
          FROM appointments a
          JOIN students s ON a.student_id = s.student_id
          LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
          WHERE a.faculty_id = ?`;
        const params = [facultyId];
        if (filterStatus !== "all") {
          sql += " AND a.status = ?";
          params.push(filterStatus);
        }
        if (search) {
          sql +=
            " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ?)";
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
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
            CONCAT(fdr.request_type, ' Request') AS title,
            fdr.purpose AS details,
            fdr.status, fdr.updated_at AS date, fdr.updated_at AS event_time,
            fdr.tracking_number AS trackingNumber,
            fdr.purpose, fdr.copies
          FROM faculty_document_requests fdr
          JOIN document_services ds ON fdr.service_id = ds.service_id
          WHERE fdr.faculty_id = ?`;
        const params = [facultyId];
        if (filterStatus !== "all") {
          sql += " AND fdr.status = ?";
          params.push(filterStatus);
        }
        if (search) {
          sql +=
            " AND (ds.service_name LIKE ? OR fdr.purpose LIKE ? OR fdr.tracking_number LIKE ?)";
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const [docs] = await pool.query(sql, params);
        rows = rows.concat(docs);
      }

      // Faculty's own sent documents (submissions) -- same document_submissions
      // table the admin "Send a Document" queue and student transactions
      // already read from, never surfaced on the professor's own history
      // page before. No studentName/studentId here (unlike the appointment
      // branch above) -- this is the faculty member's own submission, there's
      // no other party to name, same as the document-request branch above it.
      if (filterType === "all" || filterType === "submission") {
        let sql = `
          SELECT
            sub.submission_id AS id, 'submission' AS type,
            CONCAT('Document Submission: ', sub.title) AS title,
            sub.purpose AS details,
            sub.status, sub.updated_at AS date, sub.updated_at AS event_time,
            sub.tracking_number AS trackingNumber, sub.purpose
          FROM document_submissions sub
          WHERE sub.faculty_id = ? AND sub.submitter_type = 'faculty'`;
        const params = [facultyId];
        if (filterStatus !== "all") {
          sql += " AND sub.status = ?";
          params.push(filterStatus);
        }
        if (search) {
          sql += " AND sub.title LIKE ?";
          params.push(`%${search}%`);
        }
        const [subs] = await pool.query(sql, params);
        rows = rows.concat(subs);
      }

      rows.sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
      res.json(rows);
    } catch (err) {
      sendServerError(res, err, "GET /transactions error:");
    }
  },
);

// GET /api/professor/transactions/stats
// Full-history (unfiltered) transaction stats for the web transactions
// page's stat cards, computed server-side over ALL of the faculty member's
// appointments + own document requests -- mirrors studentRoutes.js's
// STATUS_MAP/STATUS_GROUPS "this month" pattern so the stat cards never
// reflect whatever search/type/status filter happens to be active client-side.
// Shipped as a separate, additive endpoint (rather than folding stats into
// GET /transactions above) specifically so that endpoint's existing bare-array
// response shape never changes -- client-mobile's professor transactions
// screen depends on that shape and isn't otherwise being touched in this pass.
const TXN_STATUS_BUCKET = {
  completed: "completed",
  claimed: "completed",
  pending: "ongoing",
  approved: "ongoing",
  processing: "ongoing",
  generated: "ongoing",
  released: "ongoing",
  rejected: "cancelled",
  cancelled: "cancelled",
  no_show: "cancelled",
};
const TXN_STATUS_GROUPS = { completed: [], ongoing: [], cancelled: [] };
for (const [raw, mapped] of Object.entries(TXN_STATUS_BUCKET)) {
  TXN_STATUS_GROUPS[mapped].push(raw);
}

router.get(
  "/transactions/stats",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [manilaYear, manilaMonth] = getManilaDateString()
        .split("-")
        .map(Number);
      const monthStartUTC = new Date(
        `${manilaYear}-${String(manilaMonth).padStart(2, "0")}-01T00:00:00+08:00`,
      );
      const [[statsRow]] = await pool.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(raw_status IN (?)), 0) AS completed,
           COALESCE(SUM(raw_status IN (?)), 0) AS ongoing,
           COALESCE(SUM(event_time >= ?), 0) AS thisMonth
         FROM (
           (SELECT a.status AS raw_status, a.updated_at AS event_time FROM appointments a WHERE a.faculty_id = ?)
           UNION ALL
           (SELECT fdr.status AS raw_status, fdr.updated_at AS event_time FROM faculty_document_requests fdr WHERE fdr.faculty_id = ?)
           UNION ALL
           (SELECT sub.status AS raw_status, sub.updated_at AS event_time FROM document_submissions sub WHERE sub.faculty_id = ? AND sub.submitter_type = 'faculty')
         ) AS combined`,
        [
          TXN_STATUS_GROUPS.completed,
          TXN_STATUS_GROUPS.ongoing,
          monthStartUTC,
          facultyId,
          facultyId,
          facultyId,
        ],
      );
      res.json({
        total: statsRow.total || 0,
        completed: statsRow.completed || 0,
        ongoing: statsRow.ongoing || 0,
        thisMonth: statsRow.thisMonth || 0,
      });
    } catch (err) {
      sendServerError(res, err, "GET /transactions/stats error:");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// SCHEDULE / AVAILABILITY
// Recurring weekly schedule: faculty sets a day-of-week + time
// window (with location, capacity, and appointment types) that
// repeats every week until edited or removed.
// ─────────────────────────────────────────────────────────────

// GET /api/professor/locations
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
      res.json({
        locations: rows.map((r) => ({
          id: r.location_id,
          name: r.location_name,
          isGlobal: r.department_id === null,
        })),
      });
    } catch (err) {
      sendServerError(res, err, "GET /locations error:");
    }
  },
);

// POST /api/professor/locations
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
      if (!deptId)
        return res
          .status(403)
          .json({ message: "Faculty has no department assigned" });

      await pool.query(
        `INSERT INTO locations (department_id, location_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE location_name = location_name`,
        [deptId, name],
      );
      const [[loc]] = await pool.query(
        `SELECT location_id, location_name FROM locations WHERE department_id = ? AND location_name = ?`,
        [deptId, name],
      );
      res.status(201).json({
        id: loc.location_id,
        name: loc.location_name,
        isGlobal: false,
      });
    } catch (err) {
      sendServerError(res, err, "POST /locations error:");
    }
  },
);

// GET /api/professor/availability
router.get(
  "/availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        "SELECT * FROM faculty_availability WHERE faculty_id = ? ORDER BY FIELD(day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time",
        [facultyId],
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
        [ids],
      );
      const svcMap = {};
      for (const s of svcRows) {
        (svcMap[s.availability_id] ||= []).push({
          id: s.service_id,
          name: s.service_name,
        });
      }

      // Current worst-case (highest-booked) future date per template, so the
      // edit UI can warn before the professor tries to set max_students too low.
      const todayStr = getManilaDateString();
      const [bookingCounts] = await pool.query(
        `SELECT availability_id, appointment_date, COUNT(*) AS booked
         FROM appointments
         WHERE availability_id IN (?) AND appointment_date >= ?
           AND status NOT IN ('cancelled', 'rejected')
         GROUP BY availability_id, appointment_date`,
        [ids, todayStr],
      );
      const maxBookedMap = {};
      for (const b of bookingCounts) {
        if ((maxBookedMap[b.availability_id] ?? 0) < b.booked)
          maxBookedMap[b.availability_id] = b.booked;
      }

      const result = rows.map((r) => ({
        ...r,
        appointmentTypes: svcMap[r.availability_id] ?? [],
        currentMaxBooked: maxBookedMap[r.availability_id] ?? 0,
      }));
      res.json(result);
    } catch (err) {
      sendServerError(res, err, "GET /availability error:");
    }
  },
);

// POST /api/professor/availability
// Body: { day_of_week, start_time, end_time, location, max_students, appointmentTypes? }
router.post(
  "/availability",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const {
      day_of_week,
      start_time,
      end_time,
      location,
      max_students,
      appointmentTypes,
    } = req.body;
    if (!day_of_week || !start_time || !end_time) {
      return res
        .status(400)
        .json({ message: "day_of_week, start_time, end_time are required" });
    }
    if (!VALID_DAYS.includes(day_of_week)) {
      return res.status(400).json({ message: "Invalid day_of_week" });
    }
    if (end_time <= start_time) {
      return res
        .status(400)
        .json({ message: "end_time must be after start_time" });
    }

    if (max_students == null || max_students === "") {
      return res.status(400).json({ message: "max_students is required" });
    }
    const maxStu = Number(max_students);
    if (!Number.isInteger(maxStu) || maxStu < 1) {
      return res
        .status(400)
        .json({ message: "max_students must be a positive integer" });
    }

    // Sanitize appointment types: unique, non-empty strings, max 20
    const types = Array.isArray(appointmentTypes)
      ? [
          ...new Set(
            appointmentTypes.map((t) => String(t).trim()).filter(Boolean),
          ),
        ].slice(0, 20)
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
        [facultyId],
      );

      // Reject any slot whose window intersects an existing slot on the same
      // day — a professor can't run two overlapping consultation blocks at
      // once (different rooms/caps/types would make booking ambiguous).
      const [sameDay] = await conn.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ?",
        [facultyId, day_of_week],
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
        [
          facultyId,
          day_of_week,
          start_time,
          end_time,
          location ?? null,
          maxStu,
        ],
      );
      const newId = result.insertId;
      const linkedServices = [];
      for (const name of types) {
        // Find existing service for this faculty with the same name, or create it
        let [[svc]] = await conn.query(
          "SELECT service_id, service_name FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
          [facultyId, name],
        );
        if (!svc) {
          const [ins] = await conn.query(
            "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
            [name, facultyId],
          );
          svc = { service_id: ins.insertId, service_name: name };
        }
        await conn.query(
          "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
          [newId, svc.service_id],
        );
        linkedServices.push({ id: svc.service_id, name: svc.service_name });
      }

      await conn.commit();

      emitToDept(fac?.department_id, "appointment:slot-updated", {
        availabilityId: newId,
      });

      res.status(201).json({
        availability_id: newId,
        message: "Availability added",
        max_students: maxStu,
        appointmentTypes: linkedServices,
      });
    } catch (err) {
      await conn.rollback();
      sendServerError(res, err, "POST /availability error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/professor/availability/:id
// Body: { day_of_week?, start_time?, end_time?, location?, max_students?, appointmentTypes? }
router.patch(
  "/availability/:id",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { id } = req.params;
    const {
      day_of_week,
      start_time,
      end_time,
      location,
      max_students,
      appointmentTypes,
    } = req.body;

    if (day_of_week !== undefined && !VALID_DAYS.includes(day_of_week)) {
      return res.status(400).json({ message: "Invalid day_of_week" });
    }

    let maxStu;
    if (max_students !== undefined) {
      maxStu = Number(max_students);
      if (!Number.isInteger(maxStu) || maxStu < 1) {
        return res
          .status(400)
          .json({ message: "max_students must be a positive integer" });
      }
    }

    const replaceTypes = Array.isArray(appointmentTypes);
    const types = replaceTypes
      ? [
          ...new Set(
            appointmentTypes.map((t) => String(t).trim()).filter(Boolean),
          ),
        ].slice(0, 20)
      : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock this faculty member's row so a concurrent create/edit can't
      // slip an overlapping slot past the check below before this commits.
      await conn.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ? FOR UPDATE",
        [facultyId],
      );

      const [[current]] = await conn.query(
        "SELECT day_of_week, start_time, end_time FROM faculty_availability WHERE availability_id = ? AND faculty_id = ?",
        [id, facultyId],
      );
      if (!current) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      // Resolve the effective day/time window this edit would produce (falling
      // back to the current row for any field not included in the request),
      // then apply the same overlap rule as creation — see POST /availability.
      const effectiveDay = day_of_week ?? current.day_of_week;
      const effectiveStart =
        start_time ?? String(current.start_time).slice(0, 5);
      const effectiveEnd = end_time ?? String(current.end_time).slice(0, 5);
      if (effectiveEnd <= effectiveStart) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "end_time must be after start_time" });
      }

      const [sameDay] = await conn.query(
        "SELECT start_time, end_time FROM faculty_availability WHERE faculty_id = ? AND day_of_week = ? AND availability_id != ?",
        [facultyId, effectiveDay, id],
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
        const dateObj =
          b.appointment_date instanceof Date
            ? b.appointment_date
            : new Date(`${b.appointment_date}T00:00:00`);
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

      // Never let max_students drop below the number of students already
      // booked into a future date for this template -- otherwise a student
      // can be left "in" the appointment list with no slot to be approved
      // into. Runs after the noLongerFits cancellation above so bookings
      // being cancelled by this same edit don't count against the new cap.
      if (maxStu !== undefined) {
        const todayStr = getManilaDateString();
        const [[worst]] = await conn.query(
          `SELECT appointment_date, COUNT(*) AS booked
           FROM appointments
           WHERE availability_id = ? AND appointment_date >= ?
             AND status NOT IN ('cancelled', 'rejected')
           GROUP BY appointment_date
           ORDER BY booked DESC LIMIT 1`,
          [id, todayStr],
        );
        if (worst && maxStu < worst.booked) {
          await conn.rollback();
          const dateStr =
            worst.appointment_date instanceof Date
              ? getManilaDateString(worst.appointment_date)
              : String(worst.appointment_date).split("T")[0];
          return res.status(409).json({
            message: `Cannot set max students to ${maxStu} — ${worst.booked} students are already booked on ${dateStr}.`,
          });
        }
      }

      const [result] = await conn.query(
        `UPDATE faculty_availability
         SET day_of_week = COALESCE(?, day_of_week),
             start_time = COALESCE(?, start_time),
             end_time = COALESCE(?, end_time),
             location = COALESCE(?, location),
             max_students = COALESCE(?, max_students)
         WHERE availability_id = ? AND faculty_id = ?`,
        [
          day_of_week ?? null,
          start_time ?? null,
          end_time ?? null,
          location ?? null,
          maxStu ?? null,
          id,
          facultyId,
        ],
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      if (replaceTypes) {
        await conn.query(
          "DELETE FROM faculty_availability_services WHERE availability_id = ?",
          [id],
        );
        for (const name of types) {
          let [[svc]] = await conn.query(
            "SELECT service_id FROM appointment_services WHERE faculty_id = ? AND service_name = ?",
            [facultyId, name],
          );
          if (!svc) {
            const [ins] = await conn.query(
              "INSERT INTO appointment_services (service_name, faculty_id) VALUES (?, ?)",
              [name, facultyId],
            );
            svc = { service_id: ins.insertId };
          }
          await conn.query(
            "INSERT IGNORE INTO faculty_availability_services (availability_id, service_id) VALUES (?, ?)",
            [id, svc.service_id],
          );
        }
      }

      await conn.commit();

      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      emitToDept(fac?.department_id, "appointment:slot-updated", {
        availabilityId: Number(id),
      });

      for (const b of noLongerFits) {
        const dateStr =
          b.appointment_date instanceof Date
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
          "appointment",
        );
      }

      res.json({
        message: "Availability updated",
        cancelledAppointments: noLongerFits.length,
      });
    } catch (err) {
      await conn.rollback();
      sendServerError(res, err, "PATCH /availability/:id error:");
    } finally {
      conn.release();
    }
  },
);

// DELETE /api/professor/availability/:id
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
        [id, facultyId],
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
        [id, facultyId],
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Availability not found" });
      }

      await conn.commit();

      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      emitToDept(fac?.department_id, "appointment:slot-removed", {
        availabilityId: Number(id),
      });

      for (const appt of affected) {
        const dateStr =
          appt.appointment_date instanceof Date
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
          "appointment",
        );
      }

      res.json({
        message: "Availability deleted",
        cancelledAppointments: affected.length,
      });
    } catch (err) {
      await conn.rollback();
      sendServerError(res, err, "DELETE /availability/:id error:");
    } finally {
      conn.release();
    }
  },
);

// ─────────────────────────────────────────────────────────────
// FACULTY'S OWN DOCUMENT REQUESTS
// ─────────────────────────────────────────────────────────────

// GET /api/professor/documents/service-types — available services for faculty's department
router.get(
  "/documents/service-types",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      const [rows] = await pool.query(
        "SELECT service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time, requires_coding FROM document_services WHERE (department_id = ? OR is_cross_college = TRUE) AND recipient_type IN ('faculty', 'both') AND status = 'active' ORDER BY service_name",
        [fac.department_id],
      );

      const serviceIds = rows.map((r) => r.service_id);
      let requirementsMap = {};
      if (serviceIds.length > 0) {
        const [reqRows] = await pool.query(
          "SELECT service_id, requirement_name, description, is_mandatory FROM document_requirements WHERE service_id IN (?) ORDER BY is_mandatory DESC, requirement_id ASC",
          [serviceIds],
        );
        for (const req of reqRows) {
          if (!requirementsMap[req.service_id])
            requirementsMap[req.service_id] = [];
          requirementsMap[req.service_id].push({
            name: req.requirement_name,
            description: req.description,
            isMandatory: !!req.is_mandatory,
          });
        }
      }

      res.json(
        rows.map((r) => ({
          ...r,
          requirements: requirementsMap[r.service_id] ?? [],
        })),
      );
    } catch (err) {
      sendServerError(res, err, "GET /documents/service-types error:");
    }
  },
);

// GET /api/professor/documents
// Merges the old fixed-type faculty_document_requests with the newer
// free-form document_submissions ('Send a Document', submitter_type =
// 'faculty') -- mirrors studentRoutes.js's own combined GET /documents.
// request_id is returned prefixed ("req-12"/"sub-7") since the two source
// tables' auto-increment ids would otherwise collide once merged.
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [rows] = await pool.query(
        `SELECT * FROM (
           (
             SELECT
               'request' AS kind,
               fdr.request_id AS request_id,
               fdr.tracking_number,
               fdr.request_type AS service_name,
               fdr.purpose,
               fdr.copies,
               fdr.status,
               fdr.estimated_completion,
               fdr.needed_by,
               fdr.released_at,
               fdr.claimed_at,
               fdr.notes,
               fdr.created_at,
               d.department_name AS college
             FROM faculty_document_requests fdr
             JOIN document_services ds ON fdr.service_id = ds.service_id
             JOIN departments d ON ds.department_id = d.department_id
             WHERE fdr.faculty_id = ?
           )
           UNION ALL
           (
             SELECT
               'submission' AS kind,
               dsub.submission_id AS request_id,
               dsub.tracking_number,
               dsub.title AS service_name,
               dsub.purpose,
               NULL AS copies,
               dsub.status,
               NULL AS estimated_completion,
               dsub.needed_by,
               NULL AS released_at,
               dsub.claimed_at,
               dsub.notes,
               dsub.created_at,
               d.department_name AS college
             FROM document_submissions dsub
             JOIN departments d ON dsub.department_id = d.department_id
             WHERE dsub.faculty_id = ? AND dsub.submitter_type = 'faculty'
           )
         ) AS combined
         ORDER BY created_at DESC`,
        [facultyId, facultyId],
      );

      const submissionIds = rows
        .filter((r) => r.kind === "submission")
        .map((r) => r.request_id);
      const [facultyFilesMap, adminFilesMap] = await Promise.all([
        getFilesMap(submissionIds, "student_upload"),
        getFilesMap(submissionIds, "admin_return"),
      ]);

      const documents = rows.map((r) => {
        const rawId = r.request_id;
        const doc = {
          ...r,
          request_id: `${r.kind === "submission" ? "sub" : "req"}-${rawId}`,
        };
        if (r.kind === "submission") {
          doc.faculty_files = facultyFilesMap[rawId] || [];
          doc.admin_files = adminFilesMap[rawId] || [];
        }
        return doc;
      });

      res.json(documents);
    } catch (err) {
      sendServerError(res, err, "GET /documents error:");
    }
  },
);

// POST /api/professor/documents
// Body: { service_id, request_type, purpose, notes, needed_by, copies }
router.post(
  "/documents",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { service_id, request_type, purpose, notes, needed_by, copies } =
      req.body;
    if (!service_id || !purpose)
      return res
        .status(400)
        .json({ message: "service_id and purpose are required" });
    if (purpose.length > 255) {
      return res
        .status(400)
        .json({ message: "Purpose must be 255 characters or fewer" });
    }

    const copyCount = copies === undefined ? 1 : parseInt(copies, 10);
    if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 20) {
      return res.status(400).json({
        message: "Number of copies must be a whole number between 1 and 20",
      });
    }

    const tomorrow = getManilaDateString(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    if (needed_by && needed_by < tomorrow) {
      return res
        .status(400)
        .json({ message: "Needed-by date must be at least tomorrow" });
    }

    try {
      // Confirm service_id is a real, active service actually visible to this faculty
      // member (own department, or cross-college) -- the client's dropdown already
      // filters this way, but the server shouldn't just trust whatever id it's sent.
      const [[fac]] = await pool.query(
        `SELECT department_id FROM faculty WHERE faculty_id = ?`,
        [facultyId],
      );
      const [[svc]] = await pool.query(
        `SELECT service_id, department_id FROM document_services
         WHERE service_id = ? AND status = 'active' AND recipient_type IN ('faculty','both')
           AND (department_id = ? OR is_cross_college = TRUE)`,
        [service_id, fac?.department_id],
      );
      if (!svc) {
        return res
          .status(404)
          .json({ message: "No matching service configuration found" });
      }

      // Guard against a double-click/double-tap firing this twice before the client's
      // own disabled-button state catches up to the first request.
      const [[recentDup]] = await pool.query(
        `SELECT request_id FROM faculty_document_requests
         WHERE faculty_id = ? AND service_id = ? AND purpose = ?
           AND created_at >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [facultyId, service_id, purpose],
      );
      if (recentDup) {
        return res
          .status(409)
          .json({ message: "This request was already submitted a moment ago" });
      }

      const fdrTrackingNumber = await nextTrackingNumber(pool, "faculty_document_requests", "request_id", "FDR");
      const [result] = await pool.query(
        `INSERT INTO faculty_document_requests (tracking_number, faculty_id, service_id, request_type, purpose, copies, notes, needed_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          fdrTrackingNumber,
          facultyId,
          service_id,
          request_type ?? "General",
          purpose,
          copyCount,
          notes ?? null,
          needed_by || null,
        ],
      );
      const [[newRequest]] = await pool.query(
        `SELECT request_id, tracking_number, copies FROM faculty_document_requests WHERE request_id = ?`,
        [result.insertId],
      );

      emitToDept(svc.department_id, "document:new-request", {
        requestId: newRequest.request_id,
      });

      notifyDepartmentAdmins(
        svc.department_id,
        `New faculty document request: ${request_type ?? "General"} (${newRequest.tracking_number})`,
        "document",
      );

      res.status(201).json({
        request_id: newRequest.request_id,
        tracking_number: newRequest.tracking_number,
        copies: newRequest.copies,
        message: "Request submitted",
      });
    } catch (err) {
      sendServerError(res, err, "POST /documents error:");
    }
  },
);

// DELETE /api/professor/documents/:requestId
// Cancels a pending or processing document request/submission owned by the
// faculty member. Soft-cancel (status = 'cancelled'), not a real delete, so
// it stays visible in the faculty member's transaction history the same way
// a cancelled queue ticket or appointment does. requestId is prefixed
// ("req-12"/"sub-7") since GET /documents merges two tables whose
// auto-increment ids would otherwise collide -- mirrors
// studentRoutes.js's own DELETE /documents/:docId.
router.delete(
  "/documents/:requestId",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const match = /^(req|sub)-(\d+)$/.exec(req.params.requestId);
    if (!match) {
      return res.status(400).json({ message: "Invalid requestId" });
    }
    const role = match[1] === "sub" ? "facultySubmission" : "faculty";
    const requestId = parseInt(match[2], 10);

    const conn = await pool.getConnection();
    try {
      const result = await cancelOwnDocumentRequest(conn, {
        role,
        ownerId: facultyId,
        requestId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ message: result.message });
      }

      emitToUser(facultyId, "document:cancelled", { requestId, facultyId });
      emitToDept(result.departmentId, "document:cancelled", {
        requestId,
        facultyId,
      });

      res.json({
        message: "Document request cancelled successfully",
        requestId: req.params.requestId,
      });
    } catch (err) {
      await conn.rollback();
      sendServerError(res, err, "DELETE /documents/:requestId error:");
    } finally {
      conn.release();
    }
  },
);

// POST /api/professor/document-submissions ("Send a Document")
// Body (multipart/form-data): title, purpose, neededBy, attachments[] (max
// MAX_FILES, 10MB each). No document type/college/copies -- the faculty
// member can only send to their own department, resolved server-side from
// faculty.department_id, never trusted from the client. Exact mirror of
// studentRoutes.js's own POST /document-submissions.
router.post(
  "/document-submissions",
  authenticateToken,
  authorizeRoles("faculty"),
  documentSubmissionUpload.upload.array("attachments", MAX_FILES),
  async (req, res) => {
    const facultyId = req.user.userId;
    const { title, purpose, neededBy } = req.body;

    if (!title || !purpose) {
      deleteFiles(req.files);
      return res
        .status(400)
        .json({ message: "title and purpose are required" });
    }
    if (title.length > 255) {
      deleteFiles(req.files);
      return res
        .status(400)
        .json({ message: "Title must be 255 characters or fewer" });
    }
    if (purpose.length > 255) {
      deleteFiles(req.files);
      return res
        .status(400)
        .json({ message: "Purpose must be 255 characters or fewer" });
    }

    const tomorrow = getManilaDateString(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    if (neededBy && neededBy < tomorrow) {
      deleteFiles(req.files);
      return res
        .status(400)
        .json({ message: "Needed-by date must be at least tomorrow" });
    }

    const budgetError = validateBudget(req.files || []);
    if (budgetError) {
      deleteFiles(req.files);
      return res.status(400).json({ message: budgetError });
    }

    let committed = false;
    try {
      const [[fac]] = await pool.query(
        `SELECT department_id FROM faculty WHERE faculty_id = ?`,
        [facultyId],
      );
      if (!fac) {
        deleteFiles(req.files);
        return res.status(404).json({ message: "Faculty member not found" });
      }
      const departmentId = fac.department_id;

      // Guard against a double-click/double-tap firing this twice before the
      // client's own disabled-button state catches up to the first request.
      const [[recentDup]] = await pool.query(
        `SELECT submission_id FROM document_submissions
         WHERE faculty_id = ? AND submitter_type = 'faculty' AND title = ? AND purpose = ?
           AND status != 'cancelled'
           AND created_at >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [facultyId, title, purpose],
      );
      if (recentDup) {
        deleteFiles(req.files);
        return res
          .status(409)
          .json({ message: "This document was already sent a moment ago" });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const facSubmissionTrackingNumber = await nextTrackingNumber(conn, "document_submissions", "submission_id", "SUB");
        const [result] = await conn.query(
          `INSERT INTO document_submissions (tracking_number, faculty_id, submitter_type, department_id, title, purpose, needed_by, status, created_at)
           VALUES (?, ?, 'faculty', ?, ?, ?, ?, 'pending', NOW())`,
          [facSubmissionTrackingNumber, facultyId, departmentId, title, purpose, neededBy || null],
        );

        await insertFiles(
          result.insertId,
          "student_upload",
          req.files,
          facultyId,
          conn,
        );
        await conn.commit();
        committed = true;

        const [[newSub]] = await pool.query(
          `SELECT ds.submission_id, ds.tracking_number, ds.title, ds.purpose, ds.status,
                  ds.needed_by, ds.notes, ds.created_at, d.department_name AS college
           FROM document_submissions ds
           JOIN departments d ON ds.department_id = d.department_id
           WHERE ds.submission_id = ?`,
          [result.insertId],
        );
        const facultyFiles = await getFiles(
          newSub.submission_id,
          "student_upload",
        );

        emitToDept(departmentId, "document:new-request", {
          requestId: newSub.submission_id,
        });

        notifyDepartmentAdmins(
          departmentId,
          `New document sent by faculty: ${newSub.title} (${newSub.tracking_number})`,
          "document",
        );

        res.status(201).json({
          message: "Document sent successfully",
          document: {
            id: `sub-${newSub.submission_id}`,
            kind: "submission",
            type: newSub.title,
            college: newSub.college,
            requestDate: newSub.created_at,
            purpose: newSub.purpose,
            copies: null,
            status: newSub.status,
            trackingNumber: newSub.tracking_number,
            notes: newSub.notes || undefined,
            neededBy: newSub.needed_by || undefined,
            facultyFiles,
            adminFiles: [],
          },
        });
      } catch (error) {
        if (!committed) {
          await conn.rollback();
          deleteFiles(req.files);
        }
        sendServerError(res, error, "Create document submission error");
      } finally {
        conn.release();
      }
    } catch (error) {
      if (!committed) deleteFiles(req.files);
      sendServerError(res, error, "Create document submission error");
    }
  },
);

// GET /api/professor/document-submissions/:submissionId/files/:fileId
// Serves one file (either the faculty member's own upload or the office's
// return file) to the faculty member who owns the submission.
router.get(
  "/document-submissions/:submissionId/files/:fileId",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const submissionId = parseInt(req.params.submissionId, 10);
    const fileId = parseInt(req.params.fileId, 10);
    if (!submissionId || !fileId) {
      return res.status(400).json({ message: "Invalid submission or file id" });
    }
    try {
      await serveFacultyDocumentSubmissionFile(res, {
        submissionId,
        fileId,
        facultyId,
      });
    } catch (error) {
      sendServerError(res, error, "Get document submission file error");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

// GET /api/professor/notifications
router.get(
  "/notifications",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    try {
      const result = await notificationsController.getNotifications(
        req.user.userId,
        {
          type: req.query.type,
          page: req.query.page,
        },
      );
      res.json(result);
    } catch (error) {
      sendServerError(res, error, "GET /notifications error:");
    }
  },
);

// PATCH /api/professor/notifications/:id/read
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const notificationId = parseInt(req.params.id, 10);
    if (!notificationId || isNaN(notificationId)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    try {
      const affectedRows = await notificationsController.markNotificationRead(
        req.user.userId,
        notificationId,
      );
      if (affectedRows === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ message: "Marked as read" });
    } catch (error) {
      sendServerError(res, error, "PATCH /notifications/:id/read error:");
    }
  },
);

// PATCH /api/professor/notifications/read-all
router.patch(
  "/notifications/read-all",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    try {
      await notificationsController.markAllNotificationsRead(req.user.userId);
      res.json({ message: "All marked as read" });
    } catch (error) {
      sendServerError(res, error, "PATCH /notifications/read-all error:");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS ENDPOINT (faculty-audience only)
// ─────────────────────────────────────────────────────────────

// GET /api/professor/announcements
// Returns only the faculty member's own department's faculty-audience
// announcements (audience='faculty'). There's no category/type filter here
// the way the student endpoint has one -- the professor screen has no tabs,
// since faculty announcements never carry a real category.
//
// `page` is optional and toggles between two call shapes, mirroring the
// student endpoint's `category`-presence toggle:
//  - omitted: full, unpaginated list -- the shape the dashboard's
//    quick-action tile relies on for its live pinned count, since it needs
//    the complete set, not one page. { announcements }
//  - provided: paged result for the dedicated Announcements screen's Load
//    More. { announcements, page, totalPages }
const FACULTY_ANNOUNCEMENTS_PAGE_SIZE = 10;

router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      const facultyDeptId = fac?.department_id ?? null;

      const whereClause =
        "WHERE a.department_id = ? AND a.status = 'active' AND a.audience = 'faculty'";
      const filterParams = [facultyDeptId];

      const baseSelect = `
        SELECT
           a.announcement_id,
           a.title,
           a.content,
           a.is_pinned,
           a.created_at,
           a.updated_at,
           d.department_id,
           d.department_name,
           d.department_abbreviation
         FROM announcements a
         JOIN departments d ON a.department_id = d.department_id
         ${whereClause}
         ORDER BY a.is_pinned DESC, a.updated_at DESC`;

      let rows;
      let page;
      let totalPages;
      if (req.query.page) {
        page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const offset = (page - 1) * FACULTY_ANNOUNCEMENTS_PAGE_SIZE;
        const [[{ total }]] = await pool.query(
          `SELECT COUNT(*) AS total FROM announcements a ${whereClause}`,
          filterParams,
        );
        totalPages = Math.max(
          1,
          Math.ceil(total / FACULTY_ANNOUNCEMENTS_PAGE_SIZE),
        );
        [rows] = await pool.query(`${baseSelect} LIMIT ? OFFSET ?`, [
          ...filterParams,
          FACULTY_ANNOUNCEMENTS_PAGE_SIZE,
          offset,
        ]);
      } else {
        [rows] = await pool.query(baseSelect, filterParams);
      }

      const attachmentsMap = await getAttachmentsMap(
        rows.map((row) => row.announcement_id),
      );

      const announcements = rows.map((row) => ({
        id: String(row.announcement_id),
        title: row.title,
        description: row.content,
        isPinned: !!row.is_pinned,
        date: row.updated_at,
        isReposted:
          new Date(row.updated_at).getTime() !==
          new Date(row.created_at).getTime(),
        departmentId: row.department_id,
        departmentName: row.department_name,
        departmentAbbrev: row.department_abbreviation,
        college: `${row.department_name} (${row.department_abbreviation})`,
        attachments: attachmentsMap[row.announcement_id] || [],
      }));

      res.json(
        req.query.page
          ? { announcements, page, totalPages }
          : { announcements },
      );
    } catch (error) {
      sendServerError(res, error, "Fetch faculty announcements error");
    }
  },
);

// GET /api/professor/announcements/:id/attachments/:attachmentId
// Serves one specific attachment inline (image/PDF/etc.), visibility-scoped
// exactly like the list route above (own department, faculty audience only).
router.get(
  "/announcements/:id/attachments/:attachmentId",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const announcementId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (isNaN(announcementId) || isNaN(attachmentId)) {
      return res
        .status(400)
        .json({ error: "Invalid announcement or attachment id" });
    }
    try {
      const [[fac]] = await pool.query(
        "SELECT department_id FROM faculty WHERE faculty_id = ?",
        [facultyId],
      );
      await serveAnnouncementAttachment(res, {
        announcementId,
        attachmentId,
        callerDeptId: fac?.department_id ?? null,
        expectedAudience: "faculty",
        forbiddenMessage: "Cannot view this attachment",
      });
    } catch (error) {
      sendServerError(res, error, "Announcement attachment fetch error");
    }
  },
);

module.exports = router;
