const express = require("express");
const router = express.Router();
const path = require("path");
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const { getManilaDateString, getManilaTimeString } = require("../utils/dateTime");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");
const { getQueueDisplayInfo } = require("../utils/queueDisplay");
const { STATUS_LABEL_MAP } = require("../utils/documentStatus");
const { createNotification } = require("../utils/notifications");
const { UPLOAD_DIR } = require("../middleware/upload");

// GET /api/student/dashboard-stats
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [activeQueues] = await pool.query(
        `SELECT
           q.queue_id,
           q.queue_number,
           q.slot_id,
           q.status,
           q.created_at,
           q.arrived_at,
           s.service_name,
           d.department_name,
           d.department_abbreviation,
           qs.max_capacity,
           (
             SELECT COUNT(*)
             FROM queues q2
             WHERE q2.slot_id = q.slot_id
               AND q2.status = 'waiting'
               AND q2.queue_number <= q.queue_number
           ) AS position,
           (
             SELECT COUNT(*)
             FROM queues q3
             WHERE q3.slot_id = q.slot_id
               AND q3.status = 'waiting'
           ) AS total_waiting,
           (
             SELECT COUNT(*)
             FROM queues q4
             WHERE q4.slot_id = q.slot_id
               AND q4.status IN ('waiting', 'serving', 'completed')
           ) AS total_in_queue,
           (
             SELECT COUNT(*)
             FROM queues q5
             WHERE q5.slot_id = q.slot_id
               AND q5.status = 'completed'
           ) AS serviced_count,
           qs.service_time_minutes AS avg_service_minutes
         FROM queues q
         JOIN queue_slots qs ON q.slot_id = qs.slot_id
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.student_id = ? AND q.status IN ('waiting', 'serving')
         ORDER BY (q.status = 'serving') DESC, position ASC, q.queue_id ASC`,
        [studentId],
      );

      const [[apptRow]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count
         FROM appointments
         WHERE student_id = ?
           AND status IN ('pending', 'approved')
           AND appointment_date >= ?`,
        [studentId, getManilaDateString()],
      );

      const [[docRow]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END) AS pending_only_count,
           SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_count,
           SUM(CASE WHEN status = 'generated'  THEN 1 ELSE 0 END) AS ready_count,
           SUM(CASE WHEN status = 'released'   THEN 1 ELSE 0 END) AS released_count
         FROM document_requests
         WHERE student_id = ?`,
        [studentId],
      );

      const [[completedRow]] = await pool.query(
        `SELECT
           (
             SELECT COUNT(*) FROM queues
             WHERE student_id = ? AND status = 'completed'
           ) +
           (
             SELECT COUNT(*) FROM appointments
             WHERE student_id = ? AND status = 'completed'
           ) +
           (
             SELECT COUNT(*) FROM document_requests
             WHERE student_id = ? AND status = 'claimed'
           ) AS total_completed`,
        [studentId, studentId, studentId],
      );

      const [[facultyRow]] = await pool.query(
        `SELECT COUNT(*) AS total_faculty
         FROM faculty f
         JOIN students s ON s.department_id = f.department_id
         WHERE s.student_id = ?`,
        [studentId],
      );

      const [recentActivity] = await pool.query(
        `(
           SELECT 
             'queue' AS type,
             CONCAT('Joined queue at ', s.service_name) AS title,
             d.department_name AS college,
             q.status,
             q.created_at AS event_time
           FROM queues q
           JOIN services s ON q.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE q.student_id = ?
         )
         UNION ALL
         (
           SELECT 
             'appointment' AS type,
             CONCAT('Appointment with ', CONCAT(f.first_name, ' ', f.last_name)) AS title,
             d.department_name AS college,
             a.status,
             a.created_at AS event_time
           FROM appointments a
           JOIN faculty f ON a.faculty_id = f.faculty_id
           JOIN departments d ON f.department_id = d.department_id
           WHERE a.student_id = ?
         )
         UNION ALL
         (
           SELECT 
             'document' AS type,
             CONCAT('Document request: ', dr.request_type) AS title,
             d.department_name AS college,
             dr.status,
             dr.created_at AS event_time
           FROM document_requests dr
           JOIN document_services s ON dr.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE dr.student_id = ?
         )
         ORDER BY event_time DESC
         LIMIT 3`,
        [studentId, studentId, studentId],
      );

      // Pick the queue with the lowest position (closest to being served)
      const closestQueue = activeQueues.length > 0 ? activeQueues[0] : null;

      const maxCapacity = closestQueue?.max_capacity || 0;
      const totalInQueue = closestQueue?.total_in_queue || 0;
      const servicedCount = closestQueue?.serviced_count || 0;
      const queueOccupancyPercent =
        maxCapacity > 0
          ? Math.min(100, Math.round((totalInQueue / maxCapacity) * 100))
          : 0;
      const servicedPercent =
        totalInQueue > 0
          ? Math.min(100, Math.round((servicedCount / totalInQueue) * 100))
          : 0;

      // Build the queue number badge for the closest queue
      const closestQueueNumberBadge = closestQueue
        ? (() => {
            const deptAbbrev = closestQueue.department_abbreviation;
            const serviceCode = closestQueue.service_name
              .split(' ')[0]
              .substring(0, 3)
              .toUpperCase();
            return `${deptAbbrev}-${serviceCode}-${String(closestQueue.queue_number).padStart(3, '0')}`;
          })()
        : null;

      const closestQueueDisplay = closestQueue
        ? getQueueDisplayInfo({
            status: closestQueue.status,
            rawPosition: closestQueue.position,
            arrivedAt: closestQueue.arrived_at,
            avgServiceMinutes: closestQueue.avg_service_minutes,
          })
        : null;

      res.json({
        stats: {
          queuePosition: closestQueueDisplay ? closestQueueDisplay.position : 0,
          queueNumberBadge: closestQueueNumberBadge,
          activeQueueCount: activeQueues.length,
          appointments: {
            upcoming: Number(apptRow.pending_count || 0) + Number(apptRow.approved_count || 0),
            pending: Number(apptRow.pending_count || 0),
            approved: Number(apptRow.approved_count || 0),
          },
          documents: (() => {
            const pendingOnly = Number(docRow.pending_only_count || 0);
            const processing = Number(docRow.processing_count || 0);
            const ready = Number(docRow.ready_count || 0);
            const released = Number(docRow.released_count || 0);
            const total = pendingOnly + processing + ready + released;
            return {
              total,
              pending: total,
              pendingOnly,
              processing,
              ready,
              released,
            };
          })(),
          completed: completedRow.total_completed || 0,
          totalFacultyCount: facultyRow.total_faculty || 0,
        },
        activeQueue: closestQueue
          ? {
              queueId: closestQueue.queue_id,
              queueNumber: closestQueue.queue_number,
              queueNumberBadge: closestQueueNumberBadge,
              service: closestQueue.service_name,
              college: closestQueue.department_name,
              collegeAbbrev: closestQueue.department_abbreviation,
              status: closestQueue.status,
              arrivedAt: closestQueue.arrived_at,
              position: closestQueueDisplay.position,
              totalWaiting: closestQueue.total_waiting,
              maxCapacity,
              totalInQueue,
              servicedCount,
              queueOccupancyPercent,
              servicedPercent,
              estimatedWaitTime: closestQueueDisplay.estimatedWait,
            }
          : null,
        recentActivity: recentActivity.map((row, i) => ({
          id: i + 1,
          type: row.type,
          title: row.title,
          college: row.college,
          status: row.status,
          time: formatRelativeTime(new Date(row.event_time)),
        })),
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS ENDPOINT
// ─────────────────────────────────────────────────────────────

// Lightweight keyword classifier so the UI's existing category
// tabs (important/event/reminder/general) keep working without
// requiring admins to pick a category when creating a notice.
// This is intentionally simple -- swap for a stored column later
// if admins need to override the auto-detected category.
function classifyAnnouncement(question = "", answer = "") {
  const text = `${question} ${answer}`.toLowerCase();

  if (
    text.includes("deadline") ||
    text.includes("maintenance") ||
    text.includes("must") ||
    text.includes("required") ||
    text.includes("suspension")
  ) {
    return "important";
  }
  if (
    text.includes("fair") ||
    text.includes("symposium") ||
    text.includes("week") ||
    text.includes("orientation") ||
    text.includes("defense")
  ) {
    return "event";
  }
  if (
    text.includes("reminder") ||
    text.includes("don't forget") ||
    text.includes("clearance") ||
    text.includes("schedule")
  ) {
    return "reminder";
  }
  return "general";
}

// GET /api/student/announcements
// Returns only the student's own department's announcements, plus any
// legacy announcements an admin marked cross-college before that option
// was removed from the admin UI.
router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    try {
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      const studentDeptId = stu?.department_id ?? null;

      const [rows] = await pool.query(
        `SELECT
           f.faq_id,
           f.question,
           f.answer,
           f.is_pinned,
           f.is_cross_college,
           f.created_at,
           f.attachment_filename,
           f.attachment_mime_type,
           d.department_id,
           d.department_name,
           d.department_abbreviation
         FROM faqs f
         JOIN departments d ON f.department_id = d.department_id
         WHERE f.department_id = ? OR f.is_cross_college = TRUE
         ORDER BY f.is_pinned DESC, f.created_at DESC`,
        [studentDeptId],
      );

      const announcements = rows.map((row) => ({
        id: String(row.faq_id),
        title: row.question,
        description: row.answer,
        category: classifyAnnouncement(row.question, row.answer),
        isPinned: !!row.is_pinned,
        date: row.created_at,
        departmentId: row.department_id,
        departmentName: row.department_name,
        departmentAbbrev: row.department_abbreviation,
        isCrossCollege: !!row.is_cross_college,
        college: `${row.department_name} (${row.department_abbreviation})`,
        hasAttachment: !!row.attachment_filename,
        attachmentMimeType: row.attachment_mime_type || null,
      }));

      res.json({ announcements });
    } catch (error) {
      console.error("Fetch announcements error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/announcements/:id/attachment
// Serves the announcement's attachment inline (image/PDF), visibility-scoped
// exactly like the list route above (own department, or cross-college).
router.get(
  "/announcements/:id/attachment",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const faqId = parseInt(req.params.id, 10);
    try {
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      const studentDeptId = stu?.department_id ?? null;

      const [[row]] = await pool.query(
        `SELECT department_id, is_cross_college, attachment_path, attachment_mime_type
         FROM faqs WHERE faq_id = ?`,
        [faqId],
      );
      if (!row || !row.attachment_path) {
        return res.status(404).json({ error: "No attachment found for this announcement" });
      }
      if (row.department_id !== studentDeptId && !row.is_cross_college) {
        return res.status(403).json({ error: "Cannot view this attachment" });
      }

      const resolvedPath = path.join(UPLOAD_DIR, row.attachment_path);
      if (!resolvedPath.startsWith(UPLOAD_DIR)) {
        return res.status(400).json({ error: "Invalid attachment path" });
      }

      res.type(row.attachment_mime_type || "application/octet-stream");
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error("Announcement attachment fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DOCUMENT REQUEST ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/student/documents
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `SELECT
           dr.request_id,
           dr.tracking_number,
           dr.request_type,
           dr.purpose,
           dr.copies,
           dr.status,
           dr.estimated_completion,
           dr.needed_by,
           dr.released_at,
           dr.claimed_at,
           dr.notes,
           dr.created_at,
           d.department_name AS college
         FROM document_requests dr
         JOIN document_services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE dr.student_id = ?
         ORDER BY dr.created_at DESC`,
        [studentId],
      );

      const documents = rows.map((d) => ({
        id: String(d.request_id),
        type: d.request_type,
        college: d.college,
        requestDate: d.created_at,
        purpose: d.purpose,
        copies: d.copies,
        status: STATUS_LABEL_MAP[d.status] ?? d.status,
        trackingNumber: d.tracking_number,
        notes: d.notes || undefined,
        estimatedCompletion: d.estimated_completion || undefined,
        neededBy: d.needed_by || undefined,
        releasedDate: d.released_at || undefined,
        claimedDate: d.claimed_at || undefined,
      }));

      res.json({ documents });
    } catch (error) {
      console.error("Get documents error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/student/documents
// Body: { type, college, purpose, copies }
router.post(
  "/documents",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { type, college, purpose, copies, neededBy } = req.body;

    if (!type || !college || !purpose) {
      return res
        .status(400)
        .json({ error: "type, college, and purpose are required" });
    }
    if (purpose.length > 255) {
      return res
        .status(400)
        .json({ error: "Purpose must be 255 characters or fewer" });
    }

    const copyCount = copies === undefined ? 1 : parseInt(copies, 10);
    if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 20) {
      return res
        .status(400)
        .json({ error: "Number of copies must be a whole number between 1 and 20" });
    }

    const tomorrow = getManilaDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    if (neededBy && neededBy < tomorrow) {
      return res
        .status(400)
        .json({ error: "Needed-by date must be at least tomorrow" });
    }

    // Strip an "(ABBR)" suffix, e.g. "College of Computing Studies (CCS)"
    const collegeName = college.replace(/\s*\([^)]*\)\s*$/, "").trim();

    try {
      // 1. Try to find a service matching both the document type and college
      let serviceId = null;

      const [exactMatch] = await pool.query(
        `SELECT s.service_id
         FROM document_services s
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.service_name = ? AND d.department_name = ?
         LIMIT 1`,
        [type, collegeName],
      );
      if (exactMatch.length) serviceId = exactMatch[0].service_id;

      // 2. Fall back to any document service under that college
      if (!serviceId) {
        const [deptMatch] = await pool.query(
          `SELECT s.service_id
           FROM document_services s
           JOIN departments d ON s.department_id = d.department_id
           WHERE d.department_name = ?
           LIMIT 1`,
          [collegeName],
        );
        if (deptMatch.length) serviceId = deptMatch[0].service_id;
      }

      // 3. Fall back to any document service under the student's own department
      if (!serviceId) {
        const [[stu]] = await pool.query(
          `SELECT department_id FROM students WHERE student_id = ?`,
          [studentId],
        );
        if (stu) {
          const [deptDefault] = await pool.query(
            `SELECT service_id FROM document_services WHERE department_id = ? LIMIT 1`,
            [stu.department_id],
          );
          if (deptDefault.length) serviceId = deptDefault[0].service_id;
        }
      }

      if (!serviceId) {
        return res.status(404).json({
          error:
            "No matching service configuration found for the selected college",
        });
      }

      // Guard against a double-click/double-tap firing this twice before the
      // client's own disabled-button state catches up to the first request.
      const [[recentDup]] = await pool.query(
        `SELECT request_id FROM document_requests
         WHERE student_id = ? AND service_id = ? AND purpose = ?
           AND created_at >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [studentId, serviceId, purpose],
      );
      if (recentDup) {
        return res.status(409).json({
          error: "This request was already submitted a moment ago",
        });
      }

      const estimatedCompletion = getManilaDateString(
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      );

      const [result] = await pool.query(
        `INSERT INTO document_requests
           (student_id, service_id, request_type, purpose, copies, status, estimated_completion, needed_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
        [studentId, serviceId, type, purpose, copyCount, estimatedCompletion, neededBy || null],
      );

      const [[newDoc]] = await pool.query(
        `SELECT
           dr.request_id, dr.tracking_number, dr.request_type, dr.purpose, dr.copies,
           dr.status, dr.estimated_completion, dr.needed_by, dr.notes, dr.created_at,
           d.department_name AS college, s.department_id
         FROM document_requests dr
         JOIN document_services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE dr.request_id = ?`,
        [result.insertId],
      );

      emitToDept(newDoc.department_id, "document:new-request", { requestId: newDoc.request_id });

      res.status(201).json({
        message: "Document request submitted successfully",
        document: {
          id: String(newDoc.request_id),
          type: newDoc.request_type,
          college: newDoc.college,
          requestDate: newDoc.created_at,
          purpose: newDoc.purpose,
          copies: newDoc.copies,
          status: newDoc.status,
          trackingNumber: newDoc.tracking_number,
          notes: newDoc.notes || undefined,
          estimatedCompletion: newDoc.estimated_completion || undefined,
          neededBy: newDoc.needed_by || undefined,
        },
      });
    } catch (error) {
      console.error("Create document request error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/documents/service-types
// Returns document services visible to the student: their own dept + global (NULL dept),
// filtered to recipient_type 'students' or 'both', active only.
router.get(
  "/documents/service-types",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const studentId = req.user.userId;
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      const studentDeptId = stu?.department_id ?? null;

      // All colleges, regardless of whether they have any configured document
      // types yet — lets the request form list every college and show
      // "No Documents Available" for ones with none, instead of omitting them.
      const [allDepartments] = await pool.query(
        `SELECT department_id AS id, department_name AS name, department_abbreviation AS abbrev
         FROM departments
         ORDER BY department_name ASC`,
      );

      const [rows] = await pool.query(
        `SELECT ds.service_id, ds.service_name, ds.department_id, ds.is_cross_college,
                ds.processing_time, d.department_name, d.department_abbreviation
         FROM document_services ds
         JOIN departments d ON ds.department_id = d.department_id
         WHERE (ds.department_id = ? OR ds.is_cross_college = TRUE)
           AND ds.recipient_type IN ('students', 'both')
           AND ds.status = 'active'
         ORDER BY ds.service_name ASC`,
        [studentDeptId],
      );

      const serviceIds = rows.map((r) => r.service_id);
      const requirementsMap = {};
      if (serviceIds.length > 0) {
        const [reqRows] = await pool.query(
          `SELECT service_id, requirement_name, description, is_mandatory
           FROM document_requirements WHERE service_id IN (?) ORDER BY is_mandatory DESC, requirement_id ASC`,
          [serviceIds],
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

      // Group services by their real owning department.
      const servicesByDepartmentId = {};
      for (const row of rows) {
        if (!servicesByDepartmentId[row.department_id]) {
          servicesByDepartmentId[row.department_id] = [];
        }
        servicesByDepartmentId[row.department_id].push({
          name: row.service_name,
          processingTime: row.processing_time,
          requirements: requirementsMap[row.service_id] ?? [],
        });
      }

      res.json({
        departments: allDepartments,
        servicesByDepartmentId,
      });
    } catch (error) {
      console.error("Document service types error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/student/documents/:requestId
// Cancels (removes) a pending or processing document request owned by the student.
router.delete(
  "/documents/:requestId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const requestId = parseInt(req.params.requestId, 10);

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid requestId" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the row so an admin's status-changing UPDATE (e.g. to
      // "generated") can't land in the narrow window between this SELECT
      // and the DELETE below.
      const [[request]] = await conn.query(
        `SELECT dr.request_id, dr.student_id, dr.status, s.department_id
         FROM document_requests dr
         JOIN document_services s ON dr.service_id = s.service_id
         WHERE dr.request_id = ?
         FOR UPDATE`,
        [requestId],
      );

      if (!request) {
        await conn.rollback();
        return res.status(404).json({ error: "Document request not found" });
      }
      if (request.student_id !== studentId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only cancel your own document requests" });
      }
      if (!["pending", "processing"].includes(request.status)) {
        await conn.rollback();
        return res.status(409).json({
          error: `Cannot cancel a request that is already ${request.status}`,
        });
      }

      await conn.query(
        `DELETE FROM document_requests WHERE request_id = ?`,
        [requestId],
      );

      await conn.commit();

      emitToDept(request.department_id, "document:cancelled", { requestId });

      res.json({
        message: "Document request cancelled successfully",
        requestId,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Cancel document request error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// ─────────────────────────────────────────────────────────────
// QUEUE ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/student/queues/available
// Returns today's queue slots students should know about, including ones
// currently 'full' (visible but not joinable, so a student can see it exists
// and check back if a seat frees up) -- 'expired'/'completed'/'closed' slots
// are done for the day and stay hidden. Scope:
//   - Service belongs to the student's own department, OR
//   - Service is cross-college (is_cross_college = TRUE) — owned by another
//     department but shared with every other department's students.
router.get(
  "/queues/available",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const studentId = req.user.userId;
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      const studentDeptId = stu?.department_id ?? null;
      const manilaToday = getManilaDateString();

      const [slots] = await pool.query(
        `SELECT
           qs.slot_id,
           qs.service_id,
           qs.slot_date,
           qs.start_time,
           qs.end_time,
           qs.max_capacity,
           qs.current_count,
           qs.status,
           qs.no_show_timeout_minutes,
           qs.service_time_minutes,
           s.service_name,
           s.is_cross_college,
           s.description AS service_description,
           l.location_name AS service_location,
           d.department_id,
           d.department_name,
           d.department_abbreviation,
           (
             SELECT q.queue_number
             FROM queues q
             WHERE q.slot_id = qs.slot_id AND q.status = 'serving'
             ORDER BY q.called_at DESC
             LIMIT 1
           ) AS currently_serving_number,
           (
             SELECT COUNT(*)
             FROM queues q2
             WHERE q2.slot_id = qs.slot_id AND q2.status = 'waiting'
           ) AS waiting_count,
           (
             -- Total daily cap usage: everyone who has claimed a spot today
             -- (waiting + serving + completed) — this is what max_capacity
             -- gates against, not just who's currently waiting.
             SELECT COUNT(*)
             FROM queues q6
             WHERE q6.slot_id = qs.slot_id AND q6.status IN ('waiting', 'serving', 'completed')
           ) AS claimed_count
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         WHERE qs.slot_date = ?
           AND qs.status IN ('open', 'paused', 'full')
           AND (s.department_id = ? OR s.is_cross_college = TRUE)
         ORDER BY department_abbreviation, s.service_name`,
        [manilaToday, studentDeptId],
      );

      const manilaNow = getManilaTimeString();
      const formatted = slots.map((slot) => {
        const waitingCount = slot.waiting_count || 0;
        const claimedCount = slot.claimed_count || 0;
        const avgWaitMin = waitingCount * slot.service_time_minutes;
        const deptAbbrev = slot.department_abbreviation;
        const serviceCode = slot.service_name
          .split(" ")[0]
          .substring(0, 3)
          .toUpperCase();
        const currentlyServing = slot.currently_serving_number
          ? `${deptAbbrev}-${serviceCode}-${String(slot.currently_serving_number).padStart(3, "0")}`
          : "—";

        return {
          slotId: slot.slot_id,
          serviceId: slot.service_id,
          serviceName: slot.service_name,
          departmentId: slot.department_id,
          departmentName: slot.department_name,
          departmentAbbrev: deptAbbrev,
          isCrossCollege: !!slot.is_cross_college,
          description: slot.service_description || null,
          location: slot.service_location || null,
          slotDate: slot.slot_date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          maxCapacity: slot.max_capacity,
          currentCount: claimedCount,
          hasCapacity:
            slot.status === "open" && claimedCount < slot.max_capacity,
          isWithinHours:
            manilaNow >= slot.start_time && manilaNow <= slot.end_time,
          status: slot.status,
          waitingCount,
          currentlyServing,
          avgWaitTime:
            waitingCount === 0 ? "No wait" : `~${avgWaitMin} min`,
          voidTimeoutMinutes: slot.no_show_timeout_minutes,
        };
      });

      res.json({ slots: formatted });
    } catch (error) {
      console.error("Available queues error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/queues/active
// Returns all waiting/serving queue entries for the logged-in student.
router.get(
  "/queues/active",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `SELECT
           q.queue_id,
           q.queue_number,
           q.slot_id,
           q.service_id,
           q.status,
           q.notes,
           q.created_at AS joined_at,
           q.arrived_at,
           qs.start_time,
           qs.end_time,
           qs.max_capacity,
           qs.status AS slot_status,
           qs.pause_reason,
           qs.no_show_timeout_minutes,
           s.service_name,
           s.description AS service_description,
           l.location_name AS service_location,
           d.department_name,
           d.department_abbreviation,
           -- Position: how many 'waiting' entries in this slot have queue_number <= mine
           (
             SELECT COUNT(*)
             FROM queues q2
             WHERE q2.slot_id = q.slot_id
               AND q2.status = 'waiting'
               AND q2.queue_number <= q.queue_number
           ) AS position,
           -- Total waiting in the same slot
           (
             SELECT COUNT(*)
             FROM queues q3
             WHERE q3.slot_id = q.slot_id
               AND q3.status = 'waiting'
           ) AS total_waiting,
           -- Cumulative headcount for this slot: everyone who joined today and
           -- hasn't cancelled (waiting + serving + completed)
           (
             SELECT COUNT(*)
             FROM queues q4
             WHERE q4.slot_id = q.slot_id
               AND q4.status IN ('waiting', 'serving', 'completed')
           ) AS total_in_queue,
           -- How many of those have already been fully serviced
           (
             SELECT COUNT(*)
             FROM queues q5
             WHERE q5.slot_id = q.slot_id
               AND q5.status = 'completed'
           ) AS serviced_count,
           qs.service_time_minutes AS avg_service_minutes
         FROM queues q
         JOIN queue_slots qs ON q.slot_id = qs.slot_id
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         WHERE q.student_id = ?
           AND q.status IN ('waiting', 'serving')
         ORDER BY q.created_at ASC`,
        [studentId],
      );

      const formatted = rows.map((row) => {
        const { position, estimatedWait } = getQueueDisplayInfo({
          status: row.status,
          rawPosition: row.position,
          arrivedAt: row.arrived_at,
          avgServiceMinutes: row.avg_service_minutes,
        });
        const deptAbbrev = row.department_abbreviation;
        const serviceCode = row.service_name
          .split(" ")[0]
          .substring(0, 3)
          .toUpperCase();
        const queueNumberBadge = `${deptAbbrev}-${serviceCode}-${String(row.queue_number).padStart(3, "0")}`;

        const maxCapacity = row.max_capacity || 0;
        const totalInQueue = row.total_in_queue || 0;
        const servicedCount = row.serviced_count || 0;
        const queueOccupancyPercent =
          maxCapacity > 0
            ? Math.min(100, Math.round((totalInQueue / maxCapacity) * 100))
            : 0;
        const servicedPercent =
          totalInQueue > 0
            ? Math.min(100, Math.round((servicedCount / totalInQueue) * 100))
            : 0;

        return {
          queueId: row.queue_id,
          queueNumber: row.queue_number,
          queueNumberBadge,
          slotId: row.slot_id,
          serviceId: row.service_id,
          serviceName: row.service_name,
          departmentName: row.department_name,
          departmentAbbrev: deptAbbrev,
          status: row.status,
          arrivedAt: row.arrived_at,
          notes: row.notes ?? null,
          description: row.service_description || null,
          location: row.service_location || null,
          slotStatus: row.slot_status,
          slotPauseReason: row.pause_reason ?? null,
          position,
          totalWaiting: row.total_waiting || 0,
          maxCapacity,
          totalInQueue,
          servicedCount,
          queueOccupancyPercent,
          servicedPercent,
          estimatedWait,
          joinedAt: new Date(row.joined_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }),
          startTime: formatTime12h(row.start_time),
          endTime: formatTime12h(row.end_time),
          voidTimeoutMinutes: row.no_show_timeout_minutes,
        };
      });

      res.json({ queues: formatted });
    } catch (error) {
      console.error("Active queues error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

router.get(
  "/queues/history",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `SELECT
           q.queue_id,
           q.queue_number,
           q.status,
           q.created_at,
           q.completed_at,
           q.cancelled_at,
           s.service_name,
           d.department_name,
           d.department_abbreviation
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.student_id = ?
           AND q.status IN ('completed', 'cancelled', 'no_show')
         ORDER BY q.created_at DESC
         LIMIT 50`,
        [studentId],
      );

      const formatted = rows.map((row) => {
        const deptAbbrev = row.department_abbreviation;
        const serviceCode = row.service_name
          .split(" ")[0]
          .substring(0, 3)
          .toUpperCase();
        const endTime = row.completed_at || row.cancelled_at;

        let actualWaitTime = "—";
        if (row.completed_at) {
          const diffMs = new Date(row.completed_at) - new Date(row.created_at);
          const diffMin = Math.max(0, Math.round(diffMs / 60000));
          actualWaitTime = `${diffMin} min`;
        }

        return {
          id: row.queue_id,
          service: row.service_name,
          college: row.department_name,
          queueNumber: `${deptAbbrev}-${serviceCode}-${String(row.queue_number).padStart(3, "0")}`,
          status: row.status,
          joinedAt: new Date(row.created_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }),
          completedAt: endTime
            ? new Date(endTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Manila",
              })
            : "—",
          actualWaitTime,
        };
      });

      res.json({ history: formatted });
    } catch (error) {
      console.error("Queue history error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/student/queues/join
// Body: { slotId, notes? }
router.post(
  "/queues/join",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { slotId, notes } = req.body;
    const trimmedNotes = typeof notes === "string" ? notes.trim() : "";

    if (!slotId) {
      return res.status(400).json({ error: "slotId is required" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lock and fetch the slot, including the owning service's
      // department/cross-college scope so we can re-check eligibility
      // below (the same condition GET /queues/available already applies
      // when deciding what to show — this re-applies it at write time so
      // a department-exclusive queue can't be joined by guessing/reusing
      // a slotId that was never actually shown to this student).
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.service_id, qs.status, qs.current_count, qs.max_capacity,
                qs.start_time, qs.end_time,
                s.department_id AS service_department_id, s.is_cross_college
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? AND qs.slot_date = ?
         FOR UPDATE`,
        [slotId, getManilaDateString()],
      );

      if (!slot) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "Queue slot not found or not available today" });
      }

      const [[stu]] = await conn.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      if (!slot.is_cross_college && slot.service_department_id !== stu?.department_id) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "This queue is not available to your department" });
      }

      if (slot.status !== "open") {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "This queue is not currently open" });
      }

      const manilaNow = getManilaTimeString();
      if (manilaNow < slot.start_time) {
        await conn.rollback();
        return res.status(409).json({
          error: `This queue hasn't opened yet — it opens at ${slot.start_time}`,
        });
      }
      if (manilaNow > slot.end_time) {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "This queue's hours have ended for today" });
      }

      // 1b. Live capacity check — max_capacity is a total daily cap, not a
      // concurrent-waiting-room limit, so it counts everyone who has already
      // claimed a spot today (waiting + serving + completed), not just those
      // still waiting. Avoids relying on drifted current_count.
      const [[countRow]] = await conn.query(
        `SELECT COUNT(*) AS claimed
         FROM queues
         WHERE slot_id = ? AND status IN ('waiting', 'serving', 'completed')`,
        [slotId],
      );
      if (countRow.claimed >= slot.max_capacity) {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "This queue is at full capacity" });
      }

      // 2. Check if student is already in this slot
      const [[existing]] = await conn.query(
        `SELECT queue_id FROM queues
         WHERE student_id = ? AND slot_id = ? AND status IN ('waiting', 'serving')
         LIMIT 1`,
        [studentId, slotId],
      );

      if (existing) {
        await conn.rollback();
        return res.status(409).json({ error: "You are already in this queue" });
      }

      // 3. Generate next queue_number for this slot
      const [[maxRow]] = await conn.query(
        `SELECT COALESCE(MAX(queue_number), 0) AS max_num
         FROM queues WHERE slot_id = ?`,
        [slotId],
      );
      const queueNumber = maxRow.max_num + 1;

      // 4. Insert queue entry
      const [insertResult] = await conn.query(
        `INSERT INTO queues (student_id, service_id, slot_id, queue_number, status, notes, created_at)
         VALUES (?, ?, ?, ?, 'waiting', ?, NOW())`,
        [studentId, slot.service_id, slotId, queueNumber, trimmedNotes || null],
      );
      const queueId = insertResult.insertId;

      // 5. Increment slot current_count
      await conn.query(
        `UPDATE queue_slots SET current_count = current_count + 1 WHERE slot_id = ?`,
        [slotId],
      );

      // 5b. This join may have used up the last spot for the day — mark the
      // slot 'full' to block new joins. Already-queued students keep being
      // served normally; only /queues/join and /queues/available check this
      // status. Reopens automatically (see settleSlotAfterEntryChange) if a
      // seat frees up before the slot's posted hours end.
      let slotAutoClosed = false;
      if (countRow.claimed + 1 >= slot.max_capacity) {
        await conn.query(
          `UPDATE queue_slots SET status = 'full', close_reason = 'Capacity reached — queue full for today' WHERE slot_id = ?`,
          [slotId],
        );
        slotAutoClosed = true;
      }

      // 6. Write audit log
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, NULL, 'waiting', ?, 'Student joined queue', NOW())`,
        [queueId, studentId],
      );

      await conn.commit();

      // 7. Fetch full details for the response
      const [[newEntry]] = await conn.query(
        `SELECT
           q.queue_id, q.queue_number, q.slot_id, q.service_id, q.status, q.created_at AS joined_at, q.arrived_at,
           qs.max_capacity,
           qs.status AS slot_status,
           qs.no_show_timeout_minutes,
           s.service_name,
           d.department_id,
           d.department_name,
           d.department_abbreviation,
           (
             SELECT COUNT(*) FROM queues q2
             WHERE q2.slot_id = q.slot_id AND q2.status = 'waiting' AND q2.queue_number <= q.queue_number
           ) AS position,
           (
             SELECT COUNT(*) FROM queues q3
             WHERE q3.slot_id = q.slot_id AND q3.status = 'waiting'
           ) AS total_waiting,
           (
             SELECT COUNT(*) FROM queues q4
             WHERE q4.slot_id = q.slot_id AND q4.status IN ('waiting', 'serving', 'completed')
           ) AS total_in_queue,
           (
             SELECT COUNT(*) FROM queues q5
             WHERE q5.slot_id = q.slot_id AND q5.status = 'completed'
           ) AS serviced_count,
           qs.service_time_minutes AS avg_service_minutes
         FROM queues q
         JOIN queue_slots qs ON q.slot_id = qs.slot_id
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.queue_id = ?`,
        [queueId],
      );

      const deptAbbrev = newEntry.department_abbreviation;
      const serviceCode = newEntry.service_name
        .split(" ")[0]
        .substring(0, 3)
        .toUpperCase();
      const { position, estimatedWait } = getQueueDisplayInfo({
        status: newEntry.status,
        rawPosition: newEntry.position,
        arrivedAt: newEntry.arrived_at,
        avgServiceMinutes: newEntry.avg_service_minutes,
      });
      const maxCapacity = newEntry.max_capacity || 0;
      const totalInQueue = newEntry.total_in_queue || 0;
      const servicedCount = newEntry.serviced_count || 0;
      const queueOccupancyPercent =
        maxCapacity > 0
          ? Math.min(100, Math.round((totalInQueue / maxCapacity) * 100))
          : 0;
      const servicedPercent =
        totalInQueue > 0
          ? Math.min(100, Math.round((servicedCount / totalInQueue) * 100))
          : 0;

      emitToSlot(slotId, "queue:student-joined", {
        slotId,
        queueId,
        studentId,
        queueNumber: newEntry.queue_number,
        currentCount: totalInQueue,
      });
      emitToDept(newEntry.department_id, "queue:student-joined", {
        slotId,
        queueId,
        studentId,
        queueNumber: newEntry.queue_number,
        currentCount: totalInQueue,
      });
      if (slotAutoClosed) {
        const closedPayload = {
          slotId,
          status: "full",
          reason: "Capacity reached — queue full for today",
        };
        emitToSlot(slotId, "queue:slot-status", closedPayload);
        emitToDept(newEntry.department_id, "queue:slot-status", closedPayload);
      }

      res.status(201).json({
        message: "Successfully joined the queue",
        queue: {
          queueId: newEntry.queue_id,
          queueNumber: newEntry.queue_number,
          queueNumberBadge: `${deptAbbrev}-${serviceCode}-${String(newEntry.queue_number).padStart(3, "0")}`,
          slotId: newEntry.slot_id,
          serviceId: newEntry.service_id,
          serviceName: newEntry.service_name,
          departmentName: newEntry.department_name,
          departmentAbbrev: deptAbbrev,
          status: newEntry.status,
          arrivedAt: newEntry.arrived_at,
          slotStatus: newEntry.slot_status,
          position,
          totalWaiting: newEntry.total_waiting || 0,
          maxCapacity,
          totalInQueue,
          servicedCount,
          queueOccupancyPercent,
          servicedPercent,
          estimatedWait,
          joinedAt: new Date(newEntry.joined_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }),
          voidTimeoutMinutes: newEntry.no_show_timeout_minutes,
        },
      });
    } catch (error) {
      await conn.rollback();
      console.error("Join queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// POST /api/student/queues/:queueId/leave
router.post(
  "/queues/:queueId/leave",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const queueId = parseInt(req.params.queueId, 10);

    if (!queueId || isNaN(queueId)) {
      return res.status(400).json({ error: "Invalid queueId" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Look up which slot this entry belongs to. This plain read is
      // safe without a lock because slot_id is immutable once a queue
      // entry is created.
      const [[entryLookup]] = await conn.query(
        `SELECT slot_id FROM queues WHERE queue_id = ?`,
        [queueId],
      );
      if (!entryLookup) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue entry not found" });
      }

      // 2. Lock order: queue_slots row first, then the queues row — matches
      // join/pause/close/call-next/mark-arrived/serve/skip, so this can
      // never deadlock against them.
      await conn.query(
        `SELECT slot_id FROM queue_slots WHERE slot_id = ? FOR UPDATE`,
        [entryLookup.slot_id],
      );

      const [[entry]] = await conn.query(
        `SELECT queue_id, student_id, slot_id, status
         FROM queues WHERE queue_id = ? FOR UPDATE`,
        [queueId],
      );

      if (!entry) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue entry not found" });
      }
      if (entry.student_id !== studentId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only leave your own queue" });
      }
      if (entry.status !== "waiting" && entry.status !== "serving") {
        await conn.rollback();
        return res.status(409).json({
          error: `Queue is already ${entry.status}`,
        });
      }

      // 2. Cancel the queue entry
      await conn.query(
        `UPDATE queues SET status = 'cancelled', cancelled_at = NOW() WHERE queue_id = ?`,
        [queueId],
      );

      // 3. Decrement slot current_count (floor at 0)
      await conn.query(
        `UPDATE queue_slots SET current_count = GREATEST(current_count - 1, 0) WHERE slot_id = ?`,
        [entry.slot_id],
      );

      // 3b. Cancelling frees a spot under the daily cap and removes this
      // entry from the unserved count -- settle the slot: reopen it if it
      // was 'full' and there's room again (and hours haven't ended), or
      // mark it 'completed' if nobody's left waiting/serving.
      const settleResult = await settleSlotAfterEntryChange(conn, entry.slot_id);

      // 4. Write audit log
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, ?, 'cancelled', ?, 'Student left queue', NOW())`,
        [queueId, entry.status, studentId],
      );

      const [[deptRow]] = await conn.query(
        `SELECT s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ?`,
        [entry.slot_id],
      );

      await conn.commit();

      const leftPayload = { slotId: entry.slot_id, queueId, studentId };
      emitToSlot(entry.slot_id, "queue:student-left", leftPayload);
      emitToDept(deptRow?.department_id, "queue:student-left", leftPayload);
      if (settleResult) {
        const settledPayload = { slotId: entry.slot_id, status: settleResult.newStatus };
        emitToSlot(entry.slot_id, "queue:slot-status", settledPayload);
        emitToDept(deptRow?.department_id, "queue:slot-status", settledPayload);
      }

      res.json({ message: "Successfully left the queue", queueId });
    } catch (error) {
      await conn.rollback();
      console.error("Leave queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// GET /api/student/queues/metrics
// Returns aggregate queue stats for the student's "Analytics" tab.
router.get(
  "/queues/metrics",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [[counts]] = await pool.query(
        `SELECT
           COUNT(*) AS total_joined,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS total_completed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS total_cancelled
         FROM queues
         WHERE student_id = ?`,
        [studentId],
      );

      res.json({
        totalQueuesJoined: counts.total_joined || 0,
        totalQueuesCompleted: counts.total_completed || 0,
        totalQueuesCancelled: counts.total_cancelled || 0,
      });
    } catch (error) {
      console.error("Queue metrics error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/student/queues/:queueId/notes
// Body: { notes }
// Lets the student edit the "concern" text on their own active queue entry.
router.patch(
  "/queues/:queueId/notes",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const queueId = parseInt(req.params.queueId, 10);
    const { notes } = req.body;

    if (!queueId || isNaN(queueId)) {
      return res.status(400).json({ error: "Invalid queueId" });
    }

    try {
      const [[entry]] = await pool.query(
        `SELECT queue_id, student_id, slot_id, status FROM queues WHERE queue_id = ?`,
        [queueId],
      );

      if (!entry) {
        return res.status(404).json({ error: "Queue entry not found" });
      }
      if (entry.student_id !== studentId) {
        return res
          .status(403)
          .json({ error: "You can only edit your own queue entry" });
      }

      await pool.query(`UPDATE queues SET notes = ? WHERE queue_id = ?`, [
        notes ?? null,
        queueId,
      ]);

      const [[deptRow]] = await pool.query(
        `SELECT s.department_id
         FROM queue_slots qs JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ?`,
        [entry.slot_id],
      );
      emitToDept(deptRow?.department_id, "queue:notes-updated", {
        queueId,
        notes: notes ?? null,
      });

      res.json({ message: "Updated", queueId, notes: notes ?? null });
    } catch (error) {
      console.error("Update queue notes error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// APPOINTMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/student/appointments
// Returns all appointments for the logged-in student (upcoming + past).
router.get(
  "/appointments",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `SELECT
           a.appointment_id,
           a.availability_id,
           a.appointment_date,
           a.status,
           a.notes,
           a.created_at,
           f.faculty_id,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.specialization                        AS faculty_role,
           d.department_name                       AS college,
           d.department_abbreviation               AS college_abbrev,
           fda.start_time                          AS window_start,
           fda.end_time                            AS window_end,
           fda.location,
           s.service_name
         FROM appointments a
         JOIN faculty      f ON a.faculty_id    = f.faculty_id
         JOIN departments  d ON f.department_id = d.department_id
         LEFT JOIN faculty_availability fda ON a.availability_id = fda.availability_id
         LEFT JOIN appointment_services s ON a.service_id = s.service_id
         WHERE a.student_id = ?
         ORDER BY a.appointment_date DESC, fda.start_time DESC`,
        [studentId],
      );

      const formatted = rows.map((row) => ({
        id: row.appointment_id,
        availabilityId: row.availability_id,
        title: row.service_name ?? row.faculty_role ?? "Faculty Consultation",
        appointmentType: row.service_name ?? null,
        college: row.college,
        collegeAbbrev: row.college_abbrev ?? "",
        person: row.faculty_name,
        personRole: row.faculty_role ?? "Faculty",
        date:
          row.appointment_date instanceof Date
            ? getManilaDateString(row.appointment_date)
            : String(row.appointment_date).split("T")[0],
        windowStart: row.window_start ? formatTime12h(row.window_start) : null,
        windowEnd: row.window_end ? formatTime12h(row.window_end) : null,
        location: row.location ?? "TBA",
        purpose: row.notes ?? "",
        status: row.status,
        createdAt: row.created_at
          ? getManilaDateString(row.created_at)
          : null,
      }));

      res.json({ appointments: formatted });
    } catch (error) {
      console.error("Fetch appointments error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/student/appointments/:appointmentId
// Cancels a pending appointment. Only the owning student may cancel.
router.delete(
  "/appointments/:appointmentId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const appointmentId = parseInt(req.params.appointmentId, 10);

    if (!appointmentId || isNaN(appointmentId)) {
      return res.status(400).json({ error: "Invalid appointmentId" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[appt]] = await conn.query(
        `SELECT appointment_id, student_id, status, faculty_id, department_id
         FROM appointments WHERE appointment_id = ? FOR UPDATE`,
        [appointmentId],
      );

      if (!appt) {
        await conn.rollback();
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (appt.student_id !== studentId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only cancel your own appointments" });
      }
      if (!["pending", "approved"].includes(appt.status)) {
        await conn.rollback();
        return res.status(409).json({
          error: `Cannot cancel an appointment that is already ${appt.status}`,
        });
      }

      const [result] = await conn.query(
        `UPDATE appointments SET status = 'cancelled', cancelled_by = 'student'
         WHERE appointment_id = ? AND status = ?`,
        [appointmentId, appt.status],
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(409).json({
          error: "This appointment was just updated elsewhere. Please refresh and try again.",
        });
      }

      await conn.commit();

      emitToDept(appt.department_id, "appointment:status-updated", {
        appointmentId,
        status: "cancelled",
      });
      emitToUser(appt.faculty_id, "appointment:status-updated", {
        appointmentId,
        status: "cancelled",
      });
      createNotification(appt.faculty_id, "A student cancelled their appointment with you.");

      res.json({
        message: "Appointment cancelled successfully",
        appointmentId,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Cancel appointment error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// ─────────────────────────────────────────────────────────────
// PROFESSOR SCHEDULE ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/student/professor-schedules
 *
 * Returns every department together with its faculty members and
 * each faculty member's weekly consultation availability, grouped
 * by day. Single aggregated query — mirrors the pattern used in
 * /services/by-department so the frontend never waterfalls requests.
 */
router.get(
  "/professor-schedules",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const [departments] = await pool.query(
        `SELECT department_id, department_name, department_abbreviation
         FROM departments
         ORDER BY department_name ASC`,
      );

      const [rows] = await pool.query(
        `SELECT
           f.faculty_id,
           f.first_name,
           f.last_name,
           f.position,
           f.specialization,
           f.email,
           f.department_id,
           f.availability_status,
           fa.availability_id,
           fa.day_of_week,
           fa.start_time,
           fa.end_time,
           fa.location
         FROM faculty f
         LEFT JOIN faculty_availability fa
           ON fa.faculty_id = f.faculty_id
         ORDER BY f.department_id, f.last_name ASC,
           FIELD(fa.day_of_week, 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'),
           fa.start_time ASC`,
      );

      // Group rows -> faculty (faculty_id -> { ...info, availability: [] })
      const facultyMap = new Map();
      for (const row of rows) {
        if (!facultyMap.has(row.faculty_id)) {
          facultyMap.set(row.faculty_id, {
            facultyId: row.faculty_id,
            name: `${row.first_name} ${row.last_name}`,
            position: row.position,
            specialization: row.specialization,
            email: row.email,
            departmentId: row.department_id,
            availabilityStatus: row.availability_status,
            availability: [],
          });
        }
        if (row.availability_id) {
          facultyMap.get(row.faculty_id).availability.push({
            day: row.day_of_week,
            timeStart: formatTime12h(row.start_time),
            timeEnd: formatTime12h(row.end_time),
            location: row.location ?? "TBA",
          });
        }
      }

      // Group faculty -> department
      const deptMap = new Map();
      for (const dept of departments) {
        deptMap.set(dept.department_id, {
          departmentId: dept.department_id,
          departmentName: dept.department_name,
          departmentAbbrev: dept.department_abbreviation,
          faculty: [],
        });
      }
      for (const fac of facultyMap.values()) {
        const dept = deptMap.get(fac.departmentId);
        if (dept) dept.faculty.push(fac);
      }

      const result = [...deptMap.values()].filter((d) => d.faculty.length > 0);

      res.json({ departments: result });
    } catch (error) {
      console.error("Professor schedules error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/transactions
// Returns a unified history of queues, appointments, and document requests
router.get(
  "/transactions",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `(
           SELECT
             'queue' AS type,
             q.queue_id AS id,
             IF(q.admin_reason IS NOT NULL, 'Queue Stopped', CONCAT('Queue for ', s.service_name)) AS title,
             d.department_name AS college,
             q.status AS raw_status,
             COALESCE(q.admin_reason, q.notes) AS details,
             q.created_at AS event_time
           FROM queues q
           JOIN services s ON q.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE q.student_id = ?
         )
         UNION ALL
         (
           SELECT
             'appointment' AS type,
             a.appointment_id AS id,
             CONCAT('Appointment with ', CONCAT(f.first_name, ' ', f.last_name)) AS title,
             d.department_name AS college,
             a.status AS raw_status,
             a.notes AS details,
             a.created_at AS event_time
           FROM appointments a
           JOIN faculty f ON a.faculty_id = f.faculty_id
           JOIN departments d ON f.department_id = d.department_id
           WHERE a.student_id = ?
         )
         UNION ALL
         (
           SELECT
             'document' AS type,
             dr.request_id AS id,
             CONCAT(dr.request_type, ' Request') AS title,
             d.department_name AS college,
             dr.status AS raw_status,
             dr.purpose AS details,
             dr.created_at AS event_time
           FROM document_requests dr
           JOIN document_services s ON dr.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE dr.student_id = ?
         )
         ORDER BY event_time DESC`,
        [studentId, studentId, studentId],
      );

      // Map raw DB statuses -> the 3 badge states the UI understands. This is
      // deliberately a coarser, differently-shaped mapping than admin's
      // equivalent map in adminRoutes.js's GET /transactions (which keeps
      // granular per-status labels for its filter dropdown) -- the two
      // aren't meant to agree, since they serve different audiences/UIs, so
      // don't merge them into one shared map.
      const statusMap = {
        waiting: "ongoing",
        serving: "ongoing",
        completed: "completed",
        cancelled: "cancelled",
        no_show: "cancelled",
        pending: "ongoing",
        approved: "ongoing",
        rejected: "cancelled",
        processing: "ongoing",
        generated: "ongoing",
        released: "ongoing",
        claimed: "completed",
      };

      const transactions = rows.map((row) => {
        const eventDate = new Date(row.event_time);
        return {
          id: `${row.type}-${row.id}`,
          type: row.type,
          title: row.title,
          college: row.college,
          date: eventDate.toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          }),
          time: eventDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Manila",
          }),
          status: statusMap[row.raw_status] ?? "ongoing",
          details: row.details || "No additional details provided.",
        };
      });

      res.json({ transactions });
    } catch (error) {
      console.error("Fetch transactions error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// BOOKING SLOTS ENDPOINTS (derived from faculty_availability — a recurring
// weekly template is projected onto upcoming calendar dates below, so
// students still pick from a list of concrete dated windows even though
// only the day-of-week pattern is actually stored.)
// ─────────────────────────────────────────────────────────────

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// GET /api/student/appointments/available-slots
// Returns open availability windows with occupancy counts.
// Optional query params: ?facultyId=&date=
router.get(
  "/appointments/available-slots",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const DAYS_AHEAD = 30;
    const { facultyId, date } = req.query;

    try {
      // Professors toggled 'unavailable' are still included (with their
      // status flagged) rather than filtered out, so students can see they
      // exist but can't currently be booked, instead of the professor
      // silently disappearing from the list.
      let tmplQuery = `
        SELECT
          fa.availability_id, fa.faculty_id, fa.day_of_week,
          fa.start_time, fa.end_time, fa.location, fa.max_students,
          CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
          f.specialization, f.availability_status,
          d.department_abbreviation AS college,
          d.department_id
        FROM faculty_availability fa
        JOIN faculty f ON fa.faculty_id = f.faculty_id
        JOIN departments d ON f.department_id = d.department_id`;
      const tmplParams = [];
      if (facultyId) { tmplQuery += " WHERE fa.faculty_id = ?"; tmplParams.push(facultyId); }
      tmplQuery += " ORDER BY fa.faculty_id, fa.start_time";

      const [templates] = await pool.query(tmplQuery, tmplParams);
      if (templates.length === 0) return res.json({ slots: [] });

      const availabilityIds = templates.map((t) => t.availability_id);

      // Fetch appointment services (types) linked to each recurring template
      const [typeRows] = await pool.query(
        `SELECT fas.availability_id, aps.service_id, aps.service_name
         FROM faculty_availability_services fas
         JOIN appointment_services aps ON fas.service_id = aps.service_id
         WHERE fas.availability_id IN (?)
         ORDER BY fas.id ASC`,
        [availabilityIds],
      );
      const typeMap = {};
      for (const t of typeRows) {
        (typeMap[t.availability_id] ||= []).push({ id: t.service_id, name: t.service_name });
      }

      // Count confirmed bookings per (template, specific date) pair across the
      // whole projection window in one query, to avoid one query per day.
      const now = new Date();
      const todayStr = getManilaDateString(now);
      const [bookingCounts] = await pool.query(
        `SELECT availability_id, appointment_date, COUNT(*) AS booked
         FROM appointments
         WHERE availability_id IN (?)
           AND appointment_date >= ?
           AND appointment_date < ? + INTERVAL ? DAY
           AND status NOT IN ('cancelled', 'rejected')
         GROUP BY availability_id, appointment_date`,
        [availabilityIds, todayStr, todayStr, DAYS_AHEAD],
      );
      const bookedMap = {};
      for (const b of bookingCounts) {
        const dStr = b.appointment_date instanceof Date
          ? getManilaDateString(b.appointment_date)
          : String(b.appointment_date).split("T")[0];
        bookedMap[`${b.availability_id}_${dStr}`] = b.booked;
      }

      const slots = [];

      // Project each template onto every matching weekday within the window.
      const datesToCheck = date ? [date] : Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return getManilaDateString(d);
      });

      for (const dateStr of datesToCheck) {
        const weekday = WEEKDAY_NAMES[new Date(`${dateStr}T00:00:00`).getDay()];
        for (const t of templates) {
          if (t.day_of_week !== weekday) continue;

          // Windows that have already ended (only relevant for today) and
          // fully-booked windows are still returned -- flagged as isPast /
          // isFull -- so the frontend can show them disabled instead of
          // silently disappearing. Anchored to +08:00 explicitly so this is
          // correct regardless of the server process's own timezone, not
          // just when TZ=Asia/Manila happens to be set (see adminRoutes.js's
          // manilaMidnightUTC for the same pattern).
          let isPast = false;
          if (dateStr === todayStr) {
            const windowEnd = new Date(`${dateStr}T${t.end_time}+08:00`);
            isPast = windowEnd <= now;
          }

          const totalBooked = bookedMap[`${t.availability_id}_${dateStr}`] ?? 0;
          const spotsLeft = t.max_students != null ? t.max_students - totalBooked : null;
          const isFull = t.max_students != null && totalBooked >= t.max_students;

          slots.push({
            availabilityId: t.availability_id,
            professorId: t.faculty_id,
            professorName: t.faculty_name,
            specialization: t.specialization,
            college: t.college,
            departmentId: t.department_id,
            date: dateStr,
            windowStart: String(t.start_time).slice(0, 5),
            windowEnd: String(t.end_time).slice(0, 5),
            location: t.location ?? "TBA",
            maxStudents: t.max_students,
            totalBooked,
            spotsLeft,
            isPast,
            isFull,
            appointmentTypes: typeMap[t.availability_id] ?? [],
            professorAvailabilityStatus: t.availability_status,
          });
        }
      }

      slots.sort((a, b) => a.date.localeCompare(b.date) || a.professorId - b.professorId);

      res.json({ slots });
    } catch (error) {
      console.error("Available slots error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/student/appointments/book-slot
// Body: { availabilityId, appointmentDate, purpose, appointmentType? }
// availabilityId identifies the recurring weekly template (faculty_availability);
// appointmentDate is the specific projected date the student is booking into,
// since one template now spans many possible calendar dates.
// Occupies one spot in that (template, date) pair (first come, first served).
router.post(
  "/appointments/book-slot",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { availabilityId, appointmentDate, purpose, appointmentType } = req.body;

    if (!availabilityId || !appointmentDate) {
      return res.status(400).json({
        error: "availabilityId and appointmentDate are required",
      });
    }
    if (appointmentDate < getManilaDateString()) {
      return res.status(400).json({ error: "Appointment date cannot be in the past" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the recurring template row to prevent race conditions
      const [[slot]] = await conn.query(
        `SELECT availability_id, faculty_id, day_of_week, start_time, end_time, max_students
         FROM faculty_availability
         WHERE availability_id = ?
         FOR UPDATE`,
        [availabilityId],
      );

      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Availability slot not found" });
      }

      // The chosen date must actually fall on this template's weekday —
      // guards against a tampered/stale request pairing a template with an
      // unrelated date.
      const weekday = WEEKDAY_NAMES[new Date(`${appointmentDate}T00:00:00`).getDay()];
      if (weekday !== slot.day_of_week) {
        await conn.rollback();
        return res.status(400).json({ error: `${appointmentDate} is not a ${slot.day_of_week}` });
      }

      // Reject a same-day booking whose window has already ended — mirrors
      // the identical check in GET /appointments/available-slots, which the
      // client's cached list can drift out of sync with if left open past
      // the window's end without a refresh. Anchored to +08:00 explicitly,
      // same reasoning as that check.
      if (appointmentDate === getManilaDateString()) {
        const windowEnd = new Date(`${appointmentDate}T${slot.end_time}+08:00`);
        if (windowEnd <= new Date()) {
          await conn.rollback();
          return res.status(409).json({ error: "This availability window has already ended for today" });
        }
      }

      // Guard against the professor toggling themselves unavailable between
      // the student loading the slot list and submitting this booking.
      const [[facultyStatus]] = await conn.query(
        `SELECT availability_status FROM faculty WHERE faculty_id = ?`,
        [slot.faculty_id],
      );
      if (facultyStatus?.availability_status === "unavailable") {
        await conn.rollback();
        return res.status(409).json({ error: "This professor is currently unavailable for booking" });
      }

      // Enforce capacity: count active bookings for this (template, date) pair
      const [[{ total }]] = await conn.query(
        `SELECT COUNT(*) AS total FROM appointments
         WHERE availability_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'rejected')`,
        [availabilityId, appointmentDate],
      );
      if (slot.max_students != null && total >= slot.max_students) {
        await conn.rollback();
        return res.status(409).json({ error: "This availability window is fully booked" });
      }

      // Guard: student cannot book the same (template, date) pair twice
      const [[dup]] = await conn.query(
        `SELECT appointment_id FROM appointments
         WHERE student_id = ? AND availability_id = ? AND appointment_date = ?
           AND status NOT IN ('cancelled', 'rejected')`,
        [studentId, availabilityId, appointmentDate],
      );
      if (dup) {
        await conn.rollback();
        return res.status(409).json({
          error: "You already have a booking in this availability window",
        });
      }

      // Validate appointmentType against the template's linked services (if any)
      const [tmplServices] = await conn.query(
        `SELECT fas.service_id FROM faculty_availability_services fas
         WHERE fas.availability_id = ?`,
        [availabilityId],
      );
      const validServiceIds = tmplServices.map((r) => r.service_id);
      const chosenServiceId = appointmentType ? parseInt(appointmentType, 10) : null;
      if (validServiceIds.length > 0 && !chosenServiceId) {
        await conn.rollback();
        return res.status(400).json({ error: "Please select an appointment type" });
      }
      if (validServiceIds.length > 0 && !validServiceIds.includes(chosenServiceId)) {
        await conn.rollback();
        return res.status(400).json({ error: "Invalid appointment type for this slot" });
      }

      const [[facultyRow]] = await conn.query(
        `SELECT department_id FROM faculty WHERE faculty_id = ?`,
        [slot.faculty_id],
      );
      if (!facultyRow) {
        await conn.rollback();
        return res.status(404).json({ error: "Faculty member not found" });
      }

      // Store the window's start_time as appointment_time for reference
      const appointmentTime = String(slot.start_time).slice(0, 8);

      // A prior cancelled/rejected booking for this exact
      // (student, faculty, date, time) combination collides with the DB's
      // uq_appointment_slot unique key on a fresh INSERT, even though it's
      // an entirely ordinary workflow to cancel then rebook the same slot.
      // Reactivate that row instead of inserting a new one -- the unique
      // constraint itself stays untouched, so real double-booking is still
      // prevented.
      const [[staleRow]] = await conn.query(
        `SELECT appointment_id FROM appointments
         WHERE student_id = ? AND faculty_id = ? AND appointment_date = ? AND appointment_time = ?
           AND status IN ('cancelled', 'rejected')
         LIMIT 1`,
        [studentId, slot.faculty_id, appointmentDate, appointmentTime],
      );

      let appointmentId;
      if (staleRow) {
        await conn.query(
          `UPDATE appointments
             SET department_id = ?, service_id = ?, availability_id = ?,
                 status = 'pending', notes = ?, created_at = NOW()
           WHERE appointment_id = ?`,
          [facultyRow.department_id, chosenServiceId, availabilityId, purpose?.trim() || null, staleRow.appointment_id],
        );
        appointmentId = staleRow.appointment_id;
      } else {
        const [result] = await conn.query(
          `INSERT INTO appointments
             (student_id, faculty_id, department_id, service_id, availability_id,
              appointment_date, appointment_time, status, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
          [
            studentId,
            slot.faculty_id,
            facultyRow.department_id,
            chosenServiceId,
            availabilityId,
            appointmentDate,
            appointmentTime,
            purpose?.trim() || null,
          ],
        );
        appointmentId = result.insertId;
      }

      await conn.commit();

      const newSpotsLeft = slot.max_students != null ? slot.max_students - (total + 1) : null;
      emitToDept(facultyRow.department_id, "appointment:slot-updated", {
        availabilityId,
        date: appointmentDate,
        spotsLeft: newSpotsLeft,
      });
      emitToUser(slot.faculty_id, "appointment:slot-updated", {
        availabilityId,
        date: appointmentDate,
        spotsLeft: newSpotsLeft,
      });
      createNotification(slot.faculty_id, "A student booked an appointment with you.");

      const [[newRow]] = await pool.query(
        `SELECT
           a.appointment_id, a.appointment_date, a.status, a.notes,
           fa.start_time AS window_start, fa.end_time AS window_end,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.specialization AS faculty_role,
           d.department_name AS college,
           fa.location
         FROM appointments a
         JOIN faculty f ON a.faculty_id = f.faculty_id
         JOIN departments d ON f.department_id = d.department_id
         JOIN faculty_availability fa ON a.availability_id = fa.availability_id
         WHERE a.appointment_id = ?`,
        [appointmentId],
      );

      res.status(201).json({
        message: "Appointment booked successfully",
        appointment: {
          id: newRow.appointment_id,
          title: newRow.faculty_role ?? "Faculty Consultation",
          professorName: newRow.faculty_name,
          personRole: newRow.faculty_role ?? "Faculty",
          college: newRow.college,
          date: String(newRow.appointment_date).split("T")[0],
          windowStart: formatTime12h(newRow.window_start),
          windowEnd: formatTime12h(newRow.window_end),
          location: newRow.location ?? "TBA",
          purpose: newRow.notes ?? "",
          status: newRow.status,
        },
      });
    } catch (error) {
      await conn.rollback();
      console.error("Book slot error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// ─────────────────────────────────────────────────────────────
// AVAIL-SERVICES ENDPOINTS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/student/services/by-department
 *
 * Returns every department together with its services.
 * For each service we also attach:
 *   - requirements  → rows from service_requirements (or the service description as fallback)
 *   - todaySlot     → the open queue_slot for today, if one exists (null otherwise)
 *
 * This single endpoint powers the entire Avail-Services page so the
 * frontend never needs to waterfall multiple requests.
 */
router.get(
  "/services/by-department",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      // 1. All departments
      const [departments] = await pool.query(
        `SELECT department_id, department_name, department_abbreviation, office_location
         FROM departments
         ORDER BY department_name ASC`,
      );

      // 2. All services with their requirements (LEFT JOIN so services without
      //    rows in service_requirements are still returned).
      const [services] = await pool.query(
        `SELECT
           s.service_id,
           s.service_name,
           s.description,
           s.department_id,
           s.is_cross_college,
           sr.requirement_id,
           sr.requirement_name,
           sr.description  AS req_description,
           sr.is_mandatory
         FROM services s
         LEFT JOIN service_requirements sr ON sr.service_id = s.service_id
         ORDER BY s.department_id, s.service_name, sr.requirement_id`,
      );

      // 2b. All procedure steps for every service, ordered by step_number.
      const [procedureSteps] = await pool.query(
        `SELECT step_id, service_id, step_number, step_title, description
         FROM service_procedure_steps
         ORDER BY service_id, step_number ASC`,
      );

      // 3. Open queue slots for today (one per service; we pick the first open one)
      const [slots] = await pool.query(
        `SELECT
           qs.slot_id,
           qs.service_id,
           qs.start_time,
           qs.end_time,
           qs.max_capacity,
           qs.current_count,
           qs.status,
           qs.no_show_timeout_minutes,
           qs.service_time_minutes,
           (
             SELECT COUNT(*)
             FROM queues q
             WHERE q.slot_id = qs.slot_id AND q.status = 'waiting'
           ) AS waiting_count,
           (
             SELECT q2.queue_number
             FROM queues q2
             WHERE q2.slot_id = qs.slot_id AND q2.status = 'serving'
             ORDER BY q2.called_at DESC
             LIMIT 1
           ) AS currently_serving_number,
           (
             -- Total daily cap usage: everyone who has claimed a spot today
             -- (waiting + serving + completed) — this is what max_capacity
             -- gates against, not just who's currently waiting.
             SELECT COUNT(*)
             FROM queues q3
             WHERE q3.slot_id = qs.slot_id AND q3.status IN ('waiting', 'serving', 'completed')
           ) AS claimed_count
         FROM queue_slots qs
         WHERE qs.slot_date = ?
           AND qs.status IN ('open', 'paused')
         ORDER BY qs.start_time ASC`,
        [getManilaDateString()],
      );

      // ── Assemble: group requirements per service ──────────────────────────
      // serviceMap: service_id → { ...service fields, requirements: [], procedureSteps: [] }
      const serviceMap = new Map();
      for (const row of services) {
        if (!serviceMap.has(row.service_id)) {
          serviceMap.set(row.service_id, {
            serviceId: row.service_id,
            serviceName: row.service_name,
            description: row.description ?? "",
            departmentId: row.department_id,
            isCrossCollege: !!row.is_cross_college,
            requirements: [],
            procedureSteps: [],
          });
        }
        // Attach requirement row if it exists
        if (row.requirement_id) {
          serviceMap.get(row.service_id).requirements.push({
            id: row.requirement_id,
            name: row.requirement_name,
            description: row.req_description ?? "",
            isMandatory: !!row.is_mandatory,
          });
        }
      }

      // ── Assemble: attach procedure steps per service ──────────────────────
      for (const step of procedureSteps) {
        const svc = serviceMap.get(step.service_id);
        if (svc) {
          svc.procedureSteps.push({
            id: step.step_id,
            stepNumber: step.step_number,
            title: step.step_title,
            description: step.description ?? "",
          });
        }
      }

      // ── Assemble: index slots by service_id (first open slot wins) ────────
      const slotByService = new Map();
      for (const slot of slots) {
        if (!slotByService.has(slot.service_id)) {
          const waitingCount = Number(slot.waiting_count) || 0;
          const claimedCount = Number(slot.claimed_count) || 0;
          const avgWaitMin = waitingCount * slot.service_time_minutes;
          slotByService.set(slot.service_id, {
            slotId: slot.slot_id,
            startTime: formatTime12h(slot.start_time),
            endTime: formatTime12h(slot.end_time),
            maxCapacity: slot.max_capacity,
            currentCount: claimedCount,
            waitingCount,
            hasCapacity:
              slot.status === "open" && claimedCount < slot.max_capacity,
            status: slot.status,
            avgWaitTime:
              waitingCount === 0 ? "No wait" : `~${avgWaitMin} min`,
            currentlyServingNumber: slot.currently_serving_number ?? null,
            voidTimeoutMinutes: slot.no_show_timeout_minutes,
          });
        }
      }

      // ── Assemble: group services under their real owning department ───────
      // Cross-college services still belong to one department; the UI uses
      // each service's isCrossCollege flag to also surface it under other
      // colleges' filters instead of relying on a synthetic bucket.
      const deptMap = new Map();
      for (const dept of departments) {
        deptMap.set(dept.department_id, {
          departmentId: dept.department_id,
          departmentName: dept.department_name,
          departmentAbbrev: dept.department_abbreviation,
          officeLocation: dept.office_location ?? "",
          services: [],
        });
      }

      for (const svc of serviceMap.values()) {
        const dept = deptMap.get(svc.departmentId);
        if (!dept) continue;

        const todaySlot = slotByService.get(svc.serviceId) ?? null;

        dept.services.push({
          serviceId: svc.serviceId,
          serviceName: svc.serviceName,
          description: svc.description,
          isCrossCollege: svc.isCrossCollege,
          requirements: svc.requirements,
          procedureSteps: svc.procedureSteps,
          todaySlot,
          // Convenience flags the UI uses directly
          hasQueueToday: todaySlot !== null,
          isQueueOpen: todaySlot?.hasCapacity ?? false,
        });
      }

      const result = [...deptMap.values()].filter((d) => d.services.length > 0);

      res.json({ departments: result });
    } catch (error) {
      console.error("Services by-department error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// OFFICE HOURS ENDPOINT
// ─────────────────────────────────────────────────────────────

// GET /api/student/office-hours
router.get(
  "/office-hours",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    try {
      const [[dept]] = await pool.query(
        `SELECT d.department_name, d.department_abbreviation, d.office_location, d.office_hours
         FROM students s
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.student_id = ?`,
        [studentId],
      );
      if (!dept) return res.status(404).json({ message: "Department not found" });
      res.json({
        departmentName: dept.department_name,
        departmentAbbrev: dept.department_abbreviation,
        officeLocation: dept.office_location ?? "",
        officeHours: dept.office_hours ?? "",
      });
    } catch (error) {
      console.error("Office hours error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Converts a MySQL TIME string (HH:MM:SS) to 12-hour format (e.g. "2:00 PM").
 */
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${suffix}`;
}
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

// GET /api/student/notifications
router.get(
  "/notifications",
  authenticateToken,
  authorizeRoles("student"),
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

// PATCH /api/student/notifications/:id/read
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  authorizeRoles("student"),
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

// PATCH /api/student/notifications/read-all
router.patch(
  "/notifications/read-all",
  authenticateToken,
  authorizeRoles("student"),
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
