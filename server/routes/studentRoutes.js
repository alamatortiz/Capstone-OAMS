const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const { getManilaDateString, getManilaTimeString, formatTime12h, formatRelativeTime } = require("../utils/dateTime");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");
const { getQueueDisplayInfo } = require("../utils/queueDisplay");
const { STATUS_LABEL_MAP, cancelOwnDocumentRequest } = require("../utils/documentStatus");
const { createNotification } = require("../utils/notifications");
const notificationsController = require("../controllers/notificationsController");
const { getAttachmentsMap, serveAnnouncementAttachment } = require("../utils/announcementAttachments");
const { documentSubmissionUpload, MAX_FILES } = require("../middleware/upload");
const {
  getFilesMap,
  getFiles,
  insertFiles,
  validateBudget,
  deleteFiles,
  serveStudentDocumentSubmissionFile,
} = require("../utils/documentSubmissionAttachments");

// Logs the real error server-side (unchanged from before) but only ever
// sends a generic, safe message to the client under the `error` key --
// every student-facing catch block reads `err.response.data.error`, so
// raw internal error text (e.g. SQL details) previously shipped to the
// browser via a `dev_error` field that nothing actually read.
function sendServerError(res, error, label) {
  console.error(`${label}:`, error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

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
           SUM(CASE WHEN status = 'pending'  AND appointment_date >= ? THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN status = 'approved' AND appointment_date >= ? THEN 1 ELSE 0 END) AS approved_count,
           SUM(CASE WHEN status IN ('pending', 'approved') AND appointment_date >= ? THEN 1 ELSE 0 END) AS active_count
         FROM appointments
         WHERE student_id = ?`,
        [getManilaDateString(), getManilaDateString(), getManilaDateString(), studentId],
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

      // document_submissions has no 'generated'/'released' states (nothing is
      // physically produced/picked up in that direction), so only
      // pending/processing counts fold into the combined documents stat below.
      const [[subRow]] = await pool.query(
        `SELECT
           SUM(CASE WHEN status = 'pending'    THEN 1 ELSE 0 END) AS pending_only_count,
           SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing_count
         FROM document_submissions
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
           ) +
           (
             SELECT COUNT(*) FROM document_submissions
             WHERE student_id = ? AND status = 'claimed'
           ) AS total_completed`,
        [studentId, studentId, studentId, studentId],
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
           SELECT 'queue' AS type, s.service_name, NULL AS professor_name, NULL AS request_type,
                  d.department_name AS college, q.status, q.admin_reason, NULL AS cancelled_by,
                  q.created_at AS event_time
           FROM queues q
           JOIN services s ON q.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE q.student_id = ?
         )
         UNION ALL
         (
           SELECT 'appointment' AS type, NULL AS service_name, CONCAT(f.first_name, ' ', f.last_name) AS professor_name,
                  NULL AS request_type, d.department_name AS college, a.status, NULL AS admin_reason, a.cancelled_by,
                  a.created_at AS event_time
           FROM appointments a
           JOIN faculty f ON a.faculty_id = f.faculty_id
           JOIN departments d ON f.department_id = d.department_id
           WHERE a.student_id = ?
         )
         UNION ALL
         (
           SELECT 'document' AS type, NULL AS service_name, NULL AS professor_name, dr.request_type,
                  d.department_name AS college, dr.status, NULL AS admin_reason, NULL AS cancelled_by,
                  dr.created_at AS event_time
           FROM document_requests dr
           JOIN document_services s ON dr.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE dr.student_id = ?
         )
         UNION ALL
         (
           SELECT 'submission' AS type, NULL AS service_name, NULL AS professor_name, ds.title AS request_type,
                  d.department_name AS college, ds.status, NULL AS admin_reason, NULL AS cancelled_by,
                  ds.created_at AS event_time
           FROM document_submissions ds
           JOIN departments d ON ds.department_id = d.department_id
           WHERE ds.student_id = ?
         )
         ORDER BY event_time DESC
         LIMIT 5`,
        [studentId, studentId, studentId, studentId],
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
            active: Number(apptRow.active_count || 0),
          },
          documents: (() => {
            const pendingOnly = Number(docRow.pending_only_count || 0) + Number(subRow.pending_only_count || 0);
            const processing = Number(docRow.processing_count || 0) + Number(subRow.processing_count || 0);
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
          title:
            row.type === "queue" ? buildQueueActivityTitle(row) :
            row.type === "appointment" ? buildAppointmentActivityTitle(row) :
            row.type === "submission" ? buildSubmissionActivityTitle(row) :
            buildDocumentActivityTitle(row),
          college: row.college,
          status: row.status,
          time: formatRelativeTime(new Date(row.event_time)),
        })),
      });
    } catch (error) {
      sendServerError(res, error, "Dashboard stats error");
    }
  },
);

// Status-aware Recent Activity titles, mirroring professorRoutes.js's own
// buildActivityTitle/buildDocumentActivityTitle pattern (that file's comment
// notes it was written to match a student-side counterpart -- this is that
// counterpart, from the student's own point of view).
function buildQueueActivityTitle(row) {
  if (row.status === "cancelled") {
    // "Queue Stopped" matches the exact wording the student /transactions
    // endpoint already uses for the same admin_reason-not-null signal.
    return row.admin_reason ? "Queue Stopped" : `You left the queue at ${row.service_name}`;
  }
  const map = {
    waiting: `Joined queue at ${row.service_name}`,
    serving: `Now being served at ${row.service_name}`,
    completed: `Queue completed at ${row.service_name}`,
    no_show: `Missed your turn at ${row.service_name}`,
  };
  return map[row.status] ?? `Queue update at ${row.service_name}`;
}

function buildAppointmentActivityTitle(row) {
  if (row.status === "cancelled") {
    if (row.cancelled_by === "system") return `Appointment with ${row.professor_name} auto-cancelled — schedule changed`;
    if (row.cancelled_by === "faculty") return `Appointment cancelled by ${row.professor_name}`;
    return `You cancelled the appointment with ${row.professor_name}`;
  }
  const map = {
    pending: `Appointment request sent to ${row.professor_name}`,
    approved: `Appointment confirmed with ${row.professor_name}`,
    completed: `Appointment completed with ${row.professor_name}`,
    rejected: `Appointment rejected by ${row.professor_name}`,
  };
  return map[row.status] ?? `Appointment update with ${row.professor_name}`;
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

// row.request_type carries document_submissions.title here (same UNION
// column position as buildDocumentActivityTitle's request_type).
function buildSubmissionActivityTitle(row) {
  const map = {
    pending: `Document sent: ${row.request_type}`,
    processing: `Sent document being processed: ${row.request_type}`,
    claimed: `Sent document received by the office: ${row.request_type}`,
    rejected: `Sent document rejected: ${row.request_type}`,
    cancelled: `You cancelled the sent document: ${row.request_type}`,
  };
  return map[row.status] ?? `Sent document update: ${row.request_type}`;
}

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS ENDPOINT
// ─────────────────────────────────────────────────────────────

// GET /api/student/announcements
// Returns only the student's own department's announcements.
//
// `category` is optional and toggles between two distinct call shapes:
//  - omitted: full, unpaginated department history (all categories) -- the
//    shape the dashboard's "Pinned Announcements" widget relies on, since it
//    needs the complete pinned set to preview/count correctly, not one page
//    of one category. { announcements }
//  - provided ("pinned" | "all" | important/event/reminder/general): paged,
//    category-scoped result for the dedicated Announcements screen's
//    tabs + Load More. { announcements, page, totalPages }
const ANNOUNCEMENT_CATEGORIES = ["important", "event", "reminder", "general"];
const ANNOUNCEMENTS_PAGE_SIZE = 10;

router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { category } = req.query;
    try {
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      const studentDeptId = stu?.department_id ?? null;

      const filterClauses = ["a.department_id = ?", "a.status = 'active'", "a.audience = 'students'"];
      const filterParams = [studentDeptId];
      if (category === "pinned") {
        filterClauses.push("a.is_pinned = 1");
      } else if (ANNOUNCEMENT_CATEGORIES.includes(category)) {
        filterClauses.push("a.type = ?");
        filterParams.push(category);
      }
      const whereClause = `WHERE ${filterClauses.join(" AND ")}`;

      const baseSelect = `
        SELECT
           a.announcement_id,
           a.title,
           a.content,
           a.type,
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
      if (category) {
        page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const offset = (page - 1) * ANNOUNCEMENTS_PAGE_SIZE;
        const [[{ total }]] = await pool.query(
          `SELECT COUNT(*) AS total FROM announcements a ${whereClause}`,
          filterParams,
        );
        totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE));
        [rows] = await pool.query(`${baseSelect} LIMIT ? OFFSET ?`, [
          ...filterParams,
          ANNOUNCEMENTS_PAGE_SIZE,
          offset,
        ]);
      } else {
        [rows] = await pool.query(baseSelect, filterParams);
      }

      const attachmentsMap = await getAttachmentsMap(rows.map((row) => row.announcement_id));

      const announcements = rows.map((row) => ({
        id: String(row.announcement_id),
        title: row.title,
        description: row.content,
        category: row.type,
        isPinned: !!row.is_pinned,
        date: row.updated_at,
        isReposted: new Date(row.updated_at).getTime() !== new Date(row.created_at).getTime(),
        departmentId: row.department_id,
        departmentName: row.department_name,
        departmentAbbrev: row.department_abbreviation,
        college: `${row.department_name} (${row.department_abbreviation})`,
        attachments: attachmentsMap[row.announcement_id] || [],
      }));

      res.json(category ? { announcements, page, totalPages } : { announcements });
    } catch (error) {
      sendServerError(res, error, "Fetch announcements error");
    }
  },
);

// GET /api/student/announcements/:id/attachments/:attachmentId
// Serves one specific attachment inline (image/PDF/etc.), visibility-scoped
// exactly like the list route above (own department only).
router.get(
  "/announcements/:id/attachments/:attachmentId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const announcementId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    if (isNaN(announcementId) || isNaN(attachmentId)) {
      return res.status(400).json({ error: "Invalid announcement or attachment id" });
    }
    try {
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      await serveAnnouncementAttachment(res, {
        announcementId,
        attachmentId,
        callerDeptId: stu?.department_id ?? null,
        expectedAudience: "students",
        forbiddenMessage: "Cannot view this attachment",
      });
    } catch (error) {
      sendServerError(res, error, "Announcement attachment fetch error");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// FAQS ENDPOINT
// ─────────────────────────────────────────────────────────────

// GET /api/student/faqs
// Returns only the student's own department's FAQs, in stable insertion order.
router.get(
  "/faqs",
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
        `SELECT faq_id, question, answer, created_at, updated_at
         FROM faqs
         WHERE department_id = ?
         ORDER BY created_at ASC, faq_id ASC`,
        [studentDeptId],
      );

      res.json({
        faqs: rows.map((r) => ({
          id: r.faq_id,
          question: r.question,
          answer: r.answer,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
      });
    } catch (error) {
      sendServerError(res, error, "Fetch FAQs error");
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DOCUMENT REQUEST ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/student/documents
// Merges document_requests ("Request a Document") and document_submissions
// ("Send a Document") into one list, since both screens' claimed/rejected/
// cancelled tabs render them identically. `id` is prefixed ("req-12"/
// "sub-7") because the two tables' auto-increment ids would otherwise
// collide once merged -- same trick GET /transactions already uses.
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      const [rows] = await pool.query(
        `SELECT * FROM (
           (
             SELECT
               'request' AS kind,
               dr.request_id AS id,
               dr.tracking_number,
               dr.request_type AS title,
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
           )
           UNION ALL
           (
             SELECT
               'submission' AS kind,
               ds.submission_id AS id,
               ds.tracking_number,
               ds.title AS title,
               ds.purpose,
               NULL AS copies,
               ds.status,
               NULL AS estimated_completion,
               ds.needed_by,
               NULL AS released_at,
               ds.claimed_at,
               ds.notes,
               ds.created_at,
               d.department_name AS college
             FROM document_submissions ds
             JOIN departments d ON ds.department_id = d.department_id
             WHERE ds.student_id = ?
           )
         ) AS combined
         ORDER BY created_at DESC`,
        [studentId, studentId],
      );

      const submissionIds = rows.filter((d) => d.kind === "submission").map((d) => d.id);
      const [studentFilesMap, adminFilesMap] = await Promise.all([
        getFilesMap(submissionIds, "student_upload"),
        getFilesMap(submissionIds, "admin_return"),
      ]);

      const documents = rows.map((d) => {
        const doc = {
          id: `${d.kind === "submission" ? "sub" : "req"}-${d.id}`,
          kind: d.kind,
          type: d.title,
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
        };
        if (d.kind === "submission") {
          doc.studentFiles = studentFilesMap[d.id] || [];
          doc.adminFiles = adminFilesMap[d.id] || [];
        }
        return doc;
      });

      res.json({ documents });
    } catch (error) {
      sendServerError(res, error, "Get documents error");
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

    const copyCount = copies === undefined ? 1 : Number(copies);
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
           AND status != 'cancelled'
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
      sendServerError(res, error, "Create document request error");
    }
  },
);

// POST /api/student/document-submissions ("Send a Document")
// Body (multipart/form-data): title, purpose, neededBy, attachments[] (max
// MAX_FILES, 10MB each). No document type/college/copies -- the student can
// only send to their own department, resolved server-side from
// students.department_id, never trusted from the client.
router.post(
  "/document-submissions",
  authenticateToken,
  authorizeRoles("student"),
  documentSubmissionUpload.upload.array("attachments", MAX_FILES),
  async (req, res) => {
    const studentId = req.user.userId;
    const { title, purpose, neededBy } = req.body;

    if (!title || !purpose) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "title and purpose are required" });
    }
    if (title.length > 255) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "Title must be 255 characters or fewer" });
    }
    if (purpose.length > 255) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "Purpose must be 255 characters or fewer" });
    }

    const tomorrow = getManilaDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
    if (neededBy && neededBy < tomorrow) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "Needed-by date must be at least tomorrow" });
    }

    const budgetError = validateBudget(req.files || []);
    if (budgetError) {
      deleteFiles(req.files);
      return res.status(400).json({ error: budgetError });
    }

    try {
      const [[stu]] = await pool.query(
        `SELECT department_id FROM students WHERE student_id = ?`,
        [studentId],
      );
      if (!stu) {
        deleteFiles(req.files);
        return res.status(404).json({ error: "Student not found" });
      }
      const departmentId = stu.department_id;

      // Guard against a double-click/double-tap firing this twice before the
      // client's own disabled-button state catches up to the first request.
      const [[recentDup]] = await pool.query(
        `SELECT submission_id FROM document_submissions
         WHERE student_id = ? AND title = ? AND purpose = ?
           AND status != 'cancelled'
           AND created_at >= NOW() - INTERVAL 10 SECOND
         LIMIT 1`,
        [studentId, title, purpose],
      );
      if (recentDup) {
        deleteFiles(req.files);
        return res.status(409).json({ error: "This document was already sent a moment ago" });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [result] = await conn.query(
          `INSERT INTO document_submissions (student_id, department_id, title, purpose, needed_by, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
          [studentId, departmentId, title, purpose, neededBy || null],
        );

        await insertFiles(result.insertId, "student_upload", req.files, studentId, conn);
        await conn.commit();

        const [[newSub]] = await pool.query(
          `SELECT ds.submission_id, ds.tracking_number, ds.title, ds.purpose, ds.status,
                  ds.needed_by, ds.notes, ds.created_at, d.department_name AS college
           FROM document_submissions ds
           JOIN departments d ON ds.department_id = d.department_id
           WHERE ds.submission_id = ?`,
          [result.insertId],
        );
        const studentFiles = await getFiles(newSub.submission_id, "student_upload");

        emitToDept(departmentId, "document:new-request", { requestId: newSub.submission_id });

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
            studentFiles,
            adminFiles: [],
          },
        });
      } catch (error) {
        await conn.rollback();
        deleteFiles(req.files);
        sendServerError(res, error, "Create document submission error");
      } finally {
        conn.release();
      }
    } catch (error) {
      deleteFiles(req.files);
      sendServerError(res, error, "Create document submission error");
    }
  },
);

// GET /api/student/document-submissions/:submissionId/files/:fileId
// Serves one file (either the student's own upload or the office's return
// file) to the student who owns the submission.
router.get(
  "/document-submissions/:submissionId/files/:fileId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const submissionId = parseInt(req.params.submissionId, 10);
    const fileId = parseInt(req.params.fileId, 10);
    if (!submissionId || !fileId) {
      return res.status(400).json({ error: "Invalid submission or file id" });
    }
    try {
      await serveStudentDocumentSubmissionFile(res, { submissionId, fileId, studentId });
    } catch (error) {
      sendServerError(res, error, "Get document submission file error");
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
      sendServerError(res, error, "Document service types error");
    }
  },
);

// DELETE /api/student/documents/:docId
// Cancels a pending or processing document request/submission owned by the
// student. Soft-cancel (status = 'cancelled'), not a real delete, so it
// stays visible in the student's transaction history the same way a
// cancelled queue ticket or appointment does. docId is prefixed ("req-12"/
// "sub-7") since GET /documents merges two tables whose auto-increment ids
// would otherwise collide -- parseInt alone can't handle that prefix.
router.delete(
  "/documents/:docId",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const match = /^(req|sub)-(\d+)$/.exec(req.params.docId);
    if (!match) {
      return res.status(400).json({ error: "Invalid document id" });
    }
    const role = match[1] === "sub" ? "submission" : "student";
    const requestId = parseInt(match[2], 10);

    const conn = await pool.getConnection();
    try {
      const result = await cancelOwnDocumentRequest(conn, {
        role,
        ownerId: studentId,
        requestId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ error: result.message });
      }

      emitToUser(studentId, "document:cancelled", { requestId, studentId });
      emitToDept(result.departmentId, "document:cancelled", { requestId, studentId });

      res.json({
        message: "Document request cancelled successfully",
        requestId: req.params.docId,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Cancel document request error");
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
      sendServerError(res, error, "Available queues error");
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
      sendServerError(res, error, "Active queues error");
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
          date: new Date(row.created_at).toLocaleDateString("en-CA", {
            timeZone: "Asia/Manila",
          }),
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
      sendServerError(res, error, "Queue history error");
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
    if (trimmedNotes.length > 255) {
      return res
        .status(400)
        .json({ error: "Notes must be 255 characters or fewer" });
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
      sendServerError(res, error, "Join queue error");
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
      sendServerError(res, error, "Leave queue error");
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
      sendServerError(res, error, "Queue metrics error");
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

    const trimmedNotes = typeof notes === "string" ? notes.trim() : "";
    if (trimmedNotes.length > 255) {
      return res
        .status(400)
        .json({ error: "Notes must be 255 characters or fewer" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[entry]] = await conn.query(
        `SELECT queue_id, student_id, slot_id, status FROM queues WHERE queue_id = ? FOR UPDATE`,
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
          .json({ error: "You can only edit your own queue entry" });
      }
      if (entry.status !== "waiting" && entry.status !== "serving") {
        await conn.rollback();
        return res.status(409).json({
          error: `Queue is already ${entry.status}`,
        });
      }

      await conn.query(`UPDATE queues SET notes = ? WHERE queue_id = ?`, [
        trimmedNotes || null,
        queueId,
      ]);

      const [[deptRow]] = await conn.query(
        `SELECT s.department_id
         FROM queue_slots qs JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ?`,
        [entry.slot_id],
      );

      await conn.commit();

      emitToDept(deptRow?.department_id, "queue:notes-updated", {
        queueId,
        notes: trimmedNotes || null,
      });

      res.json({ message: "Updated", queueId, notes: trimmedNotes || null });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Update queue notes error");
    } finally {
      conn.release();
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
           COALESCE(a.window_start_snapshot, fda.start_time) AS window_start,
           COALESCE(a.window_end_snapshot,   fda.end_time)   AS window_end,
           COALESCE(a.location_snapshot,     fda.location)   AS location,
           s.service_name
         FROM appointments a
         JOIN faculty      f ON a.faculty_id    = f.faculty_id
         JOIN departments  d ON f.department_id = d.department_id
         LEFT JOIN faculty_availability fda ON a.availability_id = fda.availability_id
         LEFT JOIN appointment_services s ON a.service_id = s.service_id
         WHERE a.student_id = ?
         ORDER BY a.appointment_date DESC, COALESCE(a.window_start_snapshot, fda.start_time) DESC`,
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
      sendServerError(res, error, "Fetch appointments error");
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
      createNotification(appt.faculty_id, "A student cancelled their appointment with you.", "appointment");

      res.json({
        message: "Appointment cancelled successfully",
        appointmentId,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Cancel appointment error");
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
      sendServerError(res, error, "Professor schedules error");
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

    // Maps raw per-table statuses -> the 3 badge states the UI understands.
    // Deliberately a coarser, differently-shaped mapping than admin's
    // equivalent map in adminRoutes.js's GET /transactions (which keeps
    // granular per-status labels for its filter dropdown) -- the two
    // aren't meant to agree, since they serve different audiences/UIs, so
    // don't merge them into one shared map.
    const STATUS_MAP = {
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
    const STATUS_GROUPS = { completed: [], ongoing: [], cancelled: [] };
    for (const [raw, mapped] of Object.entries(STATUS_MAP)) {
      STATUS_GROUPS[mapped].push(raw);
    }

    const { search, type, status } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    // Each branch is only ever filtered by student_id -- type/status/search
    // are applied once, on the unioned result, so they consider the
    // student's whole history rather than one branch at a time.
    const unionSql = `
      (
        SELECT
          'queue' AS type,
          q.queue_id AS id,
          IF(q.admin_reason IS NOT NULL, 'Queue Stopped', CONCAT('Queue for ', s.service_name)) AS title,
          d.department_name AS college,
          q.status AS raw_status,
          COALESCE(q.admin_reason, q.notes) AS details,
          q.updated_at AS event_time
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
          a.updated_at AS event_time
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
          dr.updated_at AS event_time
        FROM document_requests dr
        JOIN document_services s ON dr.service_id = s.service_id
        JOIN departments d ON s.department_id = d.department_id
        WHERE dr.student_id = ?
      )
      UNION ALL
      (
        SELECT
          'submission' AS type,
          ds.submission_id AS id,
          CONCAT('Sent: ', ds.title) AS title,
          d.department_name AS college,
          ds.status AS raw_status,
          ds.purpose AS details,
          ds.updated_at AS event_time
        FROM document_submissions ds
        JOIN departments d ON ds.department_id = d.department_id
        WHERE ds.student_id = ?
      )
    `;

    try {
      const filterClauses = [];
      const filterParams = [];
      if (type && ["queue", "appointment", "document", "submission"].includes(type)) {
        filterClauses.push("type = ?");
        filterParams.push(type);
      }
      if (status && STATUS_GROUPS[status]?.length) {
        filterClauses.push("raw_status IN (?)");
        filterParams.push(STATUS_GROUPS[status]);
      }
      const trimmedSearch = typeof search === "string" ? search.trim() : "";
      if (trimmedSearch) {
        filterClauses.push("(title LIKE ? OR details LIKE ?)");
        const likeTerm = `%${trimmedSearch}%`;
        filterParams.push(likeTerm, likeTerm);
      }
      const whereClause = filterClauses.length
        ? `WHERE ${filterClauses.join(" AND ")}`
        : "";

      // Total count over the FILTERED (search/type/status) result set, used
      // to compute totalPages -- distinct from the stats query below, which
      // is always scoped to the student's unfiltered full history.
      const [[{ total: filteredTotal }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM (${unionSql}) AS combined ${whereClause}`,
        [studentId, studentId, studentId, studentId, ...filterParams],
      );
      const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));

      const [rows] = await pool.query(
        `SELECT * FROM (${unionSql}) AS combined
         ${whereClause}
         ORDER BY event_time DESC
         LIMIT ? OFFSET ?`,
        [studentId, studentId, studentId, studentId, ...filterParams, limit, offset],
      );

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
          status: STATUS_MAP[row.raw_status] ?? "ongoing",
          details: row.details || "No additional details provided.",
        };
      });

      // Stats are always computed over the student's FULL history,
      // ignoring search/type/status/pagination, so the stat tiles never
      // show a partial count for whatever page happens to be loaded.
      const [manilaYear, manilaMonth] = getManilaDateString()
        .split("-")
        .map(Number);
      const monthStartUTC = new Date(
        `${manilaYear}-${String(manilaMonth).padStart(2, "0")}-01T00:00:00+08:00`,
      );

      // Placeholder order must match how they appear in the final SQL
      // string: the SELECT-clause `?`s come before the FROM-clause's
      // (unionSql's per-branch student_id `?`s), since unionSql is
      // interpolated after this SELECT list.
      const [[statsRow]] = await pool.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(raw_status IN (?)), 0) AS completed,
           COALESCE(SUM(raw_status IN (?)), 0) AS ongoing,
           COALESCE(SUM(event_time >= ?), 0) AS thisMonth
         FROM (${unionSql}) AS combined`,
        [
          STATUS_GROUPS.completed,
          STATUS_GROUPS.ongoing,
          monthStartUTC,
          studentId,
          studentId,
          studentId,
          studentId,
        ],
      );

      res.json({
        transactions,
        page,
        totalPages,
        stats: {
          total: statsRow.total,
          completed: statsRow.completed,
          ongoing: statsRow.ongoing,
          thisMonth: statsRow.thisMonth,
        },
      });
    } catch (error) {
      sendServerError(res, error, "Fetch transactions error");
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
    const { date } = req.query;
    const facultyId = Array.isArray(req.query.facultyId)
      ? req.query.facultyId[0]
      : req.query.facultyId;

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
          const spotsLeft = t.max_students != null ? Math.max(0, t.max_students - totalBooked) : null;
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
      sendServerError(res, error, "Available slots error");
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
    if (typeof purpose === "string" && purpose.length > 255) {
      return res
        .status(400)
        .json({ error: "Purpose must be 255 characters or fewer" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the recurring template row to prevent race conditions
      const [[slot]] = await conn.query(
        `SELECT availability_id, faculty_id, day_of_week, start_time, end_time, location, max_students
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

      // Snapshot the template's current location/window onto the appointment
      // itself, so this row's display data survives the professor later
      // editing or deleting the template it was booked against.
      //
      // Always insert a fresh row, even if a cancelled/rejected row already
      // exists for this exact (student, faculty, date, time) -- that prior
      // row is left untouched, permanently, as an honest history entry.
      // Nothing here dodges the DB's uniqueness rule: uq_active_booking (see
      // oams_db.sql) is scoped to non-cancelled/non-rejected rows only, so it
      // never collides with that history -- only with a second genuinely
      // active booking for the same slot, which the dup-guard above should
      // already have caught (see the catch block below for the backstop).
      const [result] = await conn.query(
        `INSERT INTO appointments
           (student_id, faculty_id, department_id, service_id, availability_id,
            location_snapshot, window_start_snapshot, window_end_snapshot,
            appointment_date, appointment_time, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [
          studentId,
          slot.faculty_id,
          facultyRow.department_id,
          chosenServiceId,
          availabilityId,
          slot.location,
          slot.start_time,
          slot.end_time,
          appointmentDate,
          appointmentTime,
          purpose?.trim() || null,
        ],
      );
      const appointmentId = result.insertId;

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
      createNotification(slot.faculty_id, "A student booked an appointment with you.", "appointment");

      // Read the just-written snapshot directly off the appointment row --
      // no join needed, since we populated it ourselves a moment ago.
      const [[newRow]] = await pool.query(
        `SELECT
           a.appointment_id, a.appointment_date, a.status, a.notes,
           a.window_start_snapshot AS window_start, a.window_end_snapshot AS window_end,
           a.location_snapshot AS location,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.specialization AS faculty_role,
           d.department_name AS college
         FROM appointments a
         JOIN faculty f ON a.faculty_id = f.faculty_id
         JOIN departments d ON f.department_id = d.department_id
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
      // Backstop for uq_active_booking (see oams_db.sql): the dup-guard above
      // should already prevent this in every normal case, but if a genuine
      // race slips past it, surface a clean 409 instead of a 500.
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: "You already have an active booking for this date and time.",
        });
      }
      sendServerError(res, error, "Book slot error");
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
      sendServerError(res, error, "Services by-department error");
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
      sendServerError(res, error, "Office hours error");
    }
  },
);

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
      const result = await notificationsController.getNotifications(req.user.userId, {
        type: req.query.type,
        page: req.query.page,
      });
      res.json(result);
    } catch (error) {
      sendServerError(res, error, "Get notifications error");
    }
  },
);

// PATCH /api/student/notifications/:id/read
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  authorizeRoles("student"),
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
      sendServerError(res, error, "Mark notification read error");
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
      await notificationsController.markAllNotificationsRead(req.user.userId);
      res.json({ message: "All marked as read" });
    } catch (error) {
      sendServerError(res, error, "Mark all notifications read error");
    }
  },
);

module.exports = router;
