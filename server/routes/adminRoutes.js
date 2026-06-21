const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// GET /api/admin/dashboard-stats
// Scoped to the admin's own department_id
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;

    try {
      // Get admin's department
      const [[adminRow]] = await pool.query(
        `SELECT department_id FROM administrators WHERE admin_id = ?`,
        [adminId],
      );
      const deptId = adminRow?.department_id;

      // 1. Active queues (open slots today in this department)
      const [[queueRow]] = await pool.query(
        `SELECT COUNT(*) AS active_queue_count
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_date = CURDATE()
           AND qs.status = 'open'
           AND (? IS NULL OR s.department_id = ?)`,
        [deptId, deptId],
      );

      // 2. Pending documents (in this department's services)
      const [[docRow]] = await pool.query(
        `SELECT COUNT(*) AS pending_doc_count
         FROM document_requests dr
         JOIN services s ON dr.service_id = s.service_id
         WHERE dr.status IN ('pending', 'processing')
           AND (? IS NULL OR s.department_id = ?)`,
        [deptId, deptId],
      );

      // 3. Faculty available today (with appointments in this department)
      const [[facultyRow]] = await pool.query(
        `SELECT COUNT(DISTINCT f.faculty_id) AS faculty_count
         FROM faculty f
         WHERE (? IS NULL OR f.department_id = ?)`,
        [deptId, deptId],
      );

      // 4. Announcements (faqs table, scoped to department or global)
      const [[annRow]] = await pool.query(
        `SELECT COUNT(*) AS announcement_count
         FROM faqs
         WHERE department_id = ? OR department_id IS NULL`,
        [deptId],
      );

      // 5. Pending documents list (latest 5 for the card)
      const [pendingDocuments] = await pool.query(
        `SELECT
           dr.request_id,
           dr.request_type,
           dr.status,
           dr.created_at,
           CONCAT(st.first_name, ' ', st.last_name) AS student_name,
           d.department_abbreviation AS college
         FROM document_requests dr
         JOIN students st ON dr.student_id = st.student_id
         JOIN services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE dr.status IN ('pending', 'processing')
           AND (? IS NULL OR s.department_id = ?)
         ORDER BY dr.created_at DESC
         LIMIT 5`,
        [deptId, deptId],
      );

      // 6. Hosted queues today (active slots with waiting counts)
      const [hostedQueues] = await pool.query(
        `SELECT
           qs.slot_id,
           s.service_name,
           d.department_abbreviation AS college,
           qs.status,
           qs.current_count,
           qs.max_capacity,
           (SELECT COUNT(*) FROM queues q WHERE q.slot_id = qs.slot_id AND q.status = 'waiting') AS waiting_count
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE qs.slot_date = CURDATE()
           AND qs.status IN ('open', 'paused')
           AND (? IS NULL OR s.department_id = ?)
         ORDER BY waiting_count DESC
         LIMIT 5`,
        [deptId, deptId],
      );

      // 7. Faculty list for the availability card
      const [facultyList] = await pool.query(
        `SELECT
           f.faculty_id,
           CONCAT(f.first_name, ' ', f.last_name) AS name,
           d.department_abbreviation AS college,
           -- "busy" if they have an appointment right now (within 1 hour window)
           CASE
             WHEN EXISTS (
               SELECT 1 FROM appointments a
               WHERE a.faculty_id = f.faculty_id
                 AND a.appointment_date = CURDATE()
                 AND a.status = 'approved'
                 AND a.appointment_time BETWEEN
                   SUBTIME(CURTIME(), '01:00:00') AND ADDTIME(CURTIME(), '00:30:00')
             ) THEN 'Busy'
             ELSE 'Available'
           END AS status,
           (
             SELECT MIN(a2.appointment_time)
             FROM appointments a2
             WHERE a2.faculty_id = f.faculty_id
               AND a2.appointment_date = CURDATE()
               AND a2.appointment_time > CURTIME()
               AND a2.status IN ('pending','approved')
           ) AS next_appointment
         FROM faculty f
         JOIN departments d ON f.department_id = d.department_id
         WHERE (? IS NULL OR f.department_id = ?)
         LIMIT 8`,
        [deptId, deptId],
      );

      // 8. Announcements list (faqs table)
      const [announcements] = await pool.query(
        `SELECT faq_id, question AS title, answer AS description, created_at
         FROM faqs
         WHERE department_id = ? OR department_id IS NULL
         ORDER BY created_at DESC
         LIMIT 5`,
        [deptId],
      );

      res.json({
        stats: {
          activeQueues: queueRow.active_queue_count || 0,
          pendingDocuments: docRow.pending_doc_count || 0,
          facultyAvailable: facultyRow.faculty_count || 0,
          announcements: annRow.announcement_count || 0,
        },
        pendingDocuments: pendingDocuments.map((d) => ({
          id: d.request_id,
          name: d.student_name,
          document: d.request_type,
          college: d.college,
          date: new Date(d.created_at).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }),
          status: d.status,
        })),
        hostedQueues: hostedQueues.map((q) => ({
          id: q.slot_id,
          name: q.service_name,
          college: q.college,
          status: q.status === "open" ? "Active" : "Paused",
          count: `${q.waiting_count} waiting`,
        })),
        facultyAvailability: facultyList.map((f) => ({
          id: f.faculty_id,
          name: f.name,
          college: f.college,
          status: f.status,
          time: f.next_appointment
            ? `Next: ${formatTime(f.next_appointment)}`
            : "No upcoming appointments",
        })),
        announcements: announcements.map((a) => ({
          id: a.faq_id,
          title: a.title,
          description: a.description,
          tag: "notice",
          date: new Date(a.created_at).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          }),
        })),
      });
    } catch (error) {
      console.error("Admin dashboard stats error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// QUEUE HOSTING — scoped strictly to the admin's own department
// ─────────────────────────────────────────────────────────────

// Small helper: resolve admin -> department_id, or null if not found
async function getAdminDepartmentId(adminId) {
  const [[row]] = await pool.query(
    `SELECT department_id FROM administrators WHERE admin_id = ?`,
    [adminId],
  );
  return row?.department_id ?? null;
}

// GET /api/admin/queue-hosting/services
// Services dropdown — only services under the admin's own department.
router.get(
  "/queue-hosting/services",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res
          .status(403)
          .json({ error: "Admin has no department assigned" });
      }

      const [services] = await pool.query(
        `SELECT service_id, service_name, description
         FROM services
         WHERE department_id = ?
         ORDER BY service_name ASC`,
        [deptId],
      );

      res.json({ services });
    } catch (error) {
      console.error("Queue hosting services error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/queue-hosting
// All of today's queue_slots for the admin's department, with live
// waiting counts. Frontend buckets these into active/paused/closed.
router.get(
  "/queue-hosting",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res
          .status(403)
          .json({ error: "Admin has no department assigned" });
      }

      const [slots] = await pool.query(
        `SELECT
           qs.slot_id,
           qs.service_id,
           qs.max_capacity,
           qs.start_time,
           qs.end_time,
           qs.status,
           qs.created_at,
           s.service_name,
           d.department_name,
           d.department_abbreviation,
           d.office_location,
           (
             SELECT COUNT(*) FROM queues q
             WHERE q.slot_id = qs.slot_id AND q.status = 'waiting'
           ) AS waiting_count,
           (
             SELECT COUNT(*) FROM queues q2
             WHERE q2.slot_id = qs.slot_id AND q2.status = 'completed'
           ) AS served_count,
           (
             SELECT st.student_number
             FROM queues q3
             JOIN students st ON q3.student_id = st.student_id
             WHERE q3.slot_id = qs.slot_id AND q3.status = 'serving'
             ORDER BY q3.called_at DESC
             LIMIT 1
           ) AS currently_serving_student_number,
           (
             SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, q4.called_at, q4.completed_at)))
             FROM queues q4
             WHERE q4.slot_id = qs.slot_id
               AND q4.status = 'completed'
               AND q4.called_at IS NOT NULL
               AND q4.completed_at IS NOT NULL
           ) AS avg_service_minutes
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.department_id = ?
           AND qs.slot_date = CURDATE()
         ORDER BY qs.created_at DESC`,
        [deptId],
      );

      const formatted = slots.map((q) => ({
        id: q.slot_id,
        queueType: q.service_name,
        department: `${q.department_name} (${q.department_abbreviation})`,
        college: q.department_abbreviation,
        maxCapacity: q.max_capacity,
        currentCount: q.waiting_count || 0,
        servedCount: q.served_count || 0,
        status: q.status, // 'open' | 'paused' | 'closed' | 'cancelled'
        createdAt: q.created_at,
        location: q.office_location || null,
        currentlyServingStudentNumber:
          q.currently_serving_student_number || null,
        avgServiceMinutes:
          q.avg_service_minutes != null ? Number(q.avg_service_minutes) : null,
        serviceHours: {
          start: String(q.start_time).slice(0, 5),
          end: String(q.end_time).slice(0, 5),
        },
      }));

      res.json({ queues: formatted });
    } catch (error) {
      console.error("Queue hosting fetch error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/queue-hosting
// Body: { serviceId, maxCapacity, startTime, endTime }
// Opens a new queue_slot for TODAY. serviceId is verified to belong
// to the admin's own department — this is the actual enforcement
// point that stops an admin from hosting another college's queue.
router.post(
  "/queue-hosting",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;
    const { serviceId, maxCapacity, startTime, endTime } = req.body;

    if (!serviceId || !maxCapacity || !startTime || !endTime) {
      return res.status(400).json({
        error: "serviceId, maxCapacity, startTime, and endTime are required",
      });
    }
    const capacityNum = parseInt(maxCapacity, 10);
    if (!capacityNum || capacityNum <= 0) {
      return res
        .status(400)
        .json({ error: "maxCapacity must be a positive number" });
    }
    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ error: "Start time must be before end time" });
    }

    try {
      const deptId = await getAdminDepartmentId(adminId);
      if (!deptId) {
        return res
          .status(403)
          .json({ error: "Admin has no department assigned" });
      }

      // Enforcement: the chosen service MUST belong to the admin's department
      const [[service]] = await pool.query(
        `SELECT service_id, department_id, service_name
         FROM services WHERE service_id = ?`,
        [serviceId],
      );
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      if (service.department_id !== deptId) {
        return res
          .status(403)
          .json({ error: "You can only host queues for your own department" });
      }

      const [result] = await pool.query(
        `INSERT INTO queue_slots
           (service_id, admin_id, slot_date, start_time, end_time, max_capacity, current_count, status)
         VALUES (?, ?, CURDATE(), ?, ?, ?, 0, 'open')`,
        [serviceId, adminId, startTime, endTime, capacityNum],
      );

      res.status(201).json({
        message: "Queue line opened successfully",
        queue: {
          id: result.insertId,
          queueType: service.service_name,
          maxCapacity: capacityNum,
          currentCount: 0,
          servedCount: 0,
          status: "open",
          serviceHours: { start: startTime, end: endTime },
        },
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: "A queue for this service and start time already exists today",
        });
      }
      console.error("Open queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// Shared guard used by pause/resume/close below: confirms the slot
// belongs to the admin's own department before any mutation.
async function assertOwnedSlot(deptId, slotId) {
  const [[slot]] = await pool.query(
    `SELECT qs.slot_id, qs.status, s.department_id
     FROM queue_slots qs
     JOIN services s ON qs.service_id = s.service_id
     WHERE qs.slot_id = ?`,
    [slotId],
  );
  if (!slot) return { error: 404, message: "Queue slot not found" };
  if (slot.department_id !== deptId) {
    return {
      error: 403,
      message: "You can only manage queues for your own department",
    };
  }
  return { slot };
}

// PATCH /api/admin/queue-hosting/:slotId/pause
router.patch(
  "/queue-hosting/:slotId/pause",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const check = await assertOwnedSlot(deptId, slotId);
      if (check.error)
        return res.status(check.error).json({ error: check.message });
      if (check.slot.status !== "open") {
        return res
          .status(409)
          .json({ error: "Only an open queue can be paused" });
      }

      await pool.query(
        `UPDATE queue_slots SET status = 'paused' WHERE slot_id = ?`,
        [slotId],
      );
      res.json({ message: "Queue paused", slotId, status: "paused" });
    } catch (error) {
      console.error("Pause queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/resume
router.patch(
  "/queue-hosting/:slotId/resume",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const check = await assertOwnedSlot(deptId, slotId);
      if (check.error)
        return res.status(check.error).json({ error: check.message });
      if (check.slot.status !== "paused") {
        return res
          .status(409)
          .json({ error: "Only a paused queue can be resumed" });
      }

      await pool.query(
        `UPDATE queue_slots SET status = 'open' WHERE slot_id = ?`,
        [slotId],
      );
      res.json({ message: "Queue resumed", slotId, status: "open" });
    } catch (error) {
      console.error("Resume queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/close
router.patch(
  "/queue-hosting/:slotId/close",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const check = await assertOwnedSlot(deptId, slotId);
      if (check.error)
        return res.status(check.error).json({ error: check.message });
      if (!["open", "paused"].includes(check.slot.status)) {
        return res
          .status(409)
          .json({ error: `Queue is already ${check.slot.status}` });
      }

      await pool.query(
        `UPDATE queue_slots SET status = 'closed' WHERE slot_id = ?`,
        [slotId],
      );
      res.json({ message: "Queue closed", slotId, status: "closed" });
    } catch (error) {
      console.error("Close queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/call-next
// Calls the next waiting student into 'serving'. Refuses if someone
// is already being served — that student must be marked served first.
router.patch(
  "/queue-hosting/:slotId/call-next",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const check = await assertOwnedSlot(deptId, slotId);
      if (check.error)
        return res.status(check.error).json({ error: check.message });

      const [[alreadyServing]] = await pool.query(
        `SELECT queue_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1`,
        [slotId],
      );
      if (alreadyServing) {
        return res.status(409).json({
          error:
            "A student is already being served. Mark them as served first.",
        });
      }

      const [[next]] = await pool.query(
        `SELECT queue_id FROM queues
         WHERE slot_id = ? AND status = 'waiting'
         ORDER BY queue_number ASC
         LIMIT 1`,
        [slotId],
      );
      if (!next) {
        return res
          .status(404)
          .json({ error: "No students waiting in this queue" });
      }

      await pool.query(
        `UPDATE queues SET status = 'serving', called_at = NOW() WHERE queue_id = ?`,
        [next.queue_id],
      );

      res.json({ message: "Next student called", queueId: next.queue_id });
    } catch (error) {
      console.error("Call next error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/serve
// Marks the currently-serving student as completed.
router.patch(
  "/queue-hosting/:slotId/serve",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const check = await assertOwnedSlot(deptId, slotId);
      if (check.error)
        return res.status(check.error).json({ error: check.message });

      const [[serving]] = await pool.query(
        `SELECT queue_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1`,
        [slotId],
      );
      if (!serving) {
        return res
          .status(404)
          .json({ error: "No student is currently being served" });
      }

      await pool.query(
        `UPDATE queues SET status = 'completed', completed_at = NOW() WHERE queue_id = ?`,
        [serving.queue_id],
      );

      res.json({
        message: "Student marked as served",
        queueId: serving.queue_id,
      });
    } catch (error) {
      console.error("Mark as served error:", error);
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
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

module.exports = router;
