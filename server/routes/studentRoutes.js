const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

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
           q.status,
           q.created_at,
           s.service_name,
           d.department_name,
           d.department_abbreviation,
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
           ) AS total_waiting
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.student_id = ? AND q.status = 'waiting'
         ORDER BY q.created_at DESC`,
        [studentId],
      );

      const [[apptRow]] = await pool.query(
        `SELECT 
           COUNT(*) AS upcoming_count,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count
         FROM appointments
         WHERE student_id = ? 
           AND status IN ('pending', 'approved')
           AND appointment_date >= CURDATE()`,
        [studentId],
      );

      const [[docRow]] = await pool.query(
        `SELECT
           COUNT(*) AS total_count,
           SUM(CASE WHEN status IN ('pending','processing') THEN 1 ELSE 0 END) AS pending_count
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
             WHERE student_id = ? AND status = 'released'
           ) AS total_completed`,
        [studentId, studentId, studentId],
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
           JOIN services s ON dr.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE dr.student_id = ?
         )
         ORDER BY event_time DESC
         LIMIT 5`,
        [studentId, studentId, studentId],
      );

      const mostRecentQueue = activeQueues[0] || null;

      res.json({
        stats: {
          queuePosition: mostRecentQueue ? mostRecentQueue.position : 0,
          activeQueueCount: activeQueues.length,
          appointments: {
            upcoming: apptRow.upcoming_count || 0,
            pending: apptRow.pending_count || 0,
          },
          documents: {
            total: docRow.total_count || 0,
            pending: docRow.pending_count || 0,
          },
          completed: completedRow.total_completed || 0,
        },
        activeQueue: mostRecentQueue
          ? {
              queueId: mostRecentQueue.queue_id,
              queueNumber: mostRecentQueue.queue_number,
              service: mostRecentQueue.service_name,
              college: mostRecentQueue.department_name,
              collegeAbbrev: mostRecentQueue.department_abbreviation,
              position: mostRecentQueue.position,
              totalInQueue: mostRecentQueue.total_waiting,
              estimatedWaitTime:
                mostRecentQueue.position > 1
                  ? `~${(mostRecentQueue.position - 1) * 5} min`
                  : "You're next!",
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
           dr.status,
           dr.estimated_completion,
           dr.notes,
           dr.created_at,
           d.department_name AS college
         FROM document_requests dr
         JOIN services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE dr.student_id = ?
         ORDER BY dr.created_at DESC`,
        [studentId],
      );

      // Map DB status enum -> frontend status vocabulary
      const statusMap = {
        pending: "pending",
        processing: "processing",
        generated: "ready",
        released: "claimed",
      };

      const documents = rows.map((d) => ({
        id: String(d.request_id),
        type: d.request_type,
        college: d.college,
        requestDate: d.created_at,
        purpose: d.purpose,
        status: statusMap[d.status] ?? d.status,
        trackingNumber: d.tracking_number,
        notes: d.notes || undefined,
        estimatedCompletion: d.estimated_completion || undefined,
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
    const { type, college, purpose, copies } = req.body;

    if (!type || !college || !purpose) {
      return res
        .status(400)
        .json({ error: "type, college, and purpose are required" });
    }

    // Strip an "(ABBR)" suffix, e.g. "College of Computing Studies (CCS)"
    const collegeName = college.replace(/\s*\([^)]*\)\s*$/, "").trim();

    try {
      // 1. Try to find a service matching both the document type and college
      let serviceId = null;

      const [exactMatch] = await pool.query(
        `SELECT s.service_id
         FROM services s
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.service_name = ? AND d.department_name = ?
         LIMIT 1`,
        [type, collegeName],
      );
      if (exactMatch.length) serviceId = exactMatch[0].service_id;

      // 2. Fall back to any service under that college
      if (!serviceId) {
        const [deptMatch] = await pool.query(
          `SELECT s.service_id
           FROM services s
           JOIN departments d ON s.department_id = d.department_id
           WHERE d.department_name = ?
           LIMIT 1`,
          [collegeName],
        );
        if (deptMatch.length) serviceId = deptMatch[0].service_id;
      }

      // 3. Fall back to any service under the student's own department
      if (!serviceId) {
        const [[stu]] = await pool.query(
          `SELECT department_id FROM students WHERE student_id = ?`,
          [studentId],
        );
        if (stu) {
          const [deptDefault] = await pool.query(
            `SELECT service_id FROM services WHERE department_id = ? LIMIT 1`,
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

      const estimatedCompletion = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const copyCount = parseInt(copies, 10) || 1;
      const notes = copyCount > 1 ? `Copies requested: ${copyCount}` : null;

      const [result] = await pool.query(
        `INSERT INTO document_requests
           (student_id, service_id, request_type, purpose, status, estimated_completion, notes, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, NOW())`,
        [studentId, serviceId, type, purpose, estimatedCompletion, notes],
      );

      const [[newDoc]] = await pool.query(
        `SELECT
           dr.request_id, dr.tracking_number, dr.request_type, dr.purpose,
           dr.status, dr.estimated_completion, dr.notes, dr.created_at,
           d.department_name AS college
         FROM document_requests dr
         JOIN services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE dr.request_id = ?`,
        [result.insertId],
      );

      res.status(201).json({
        message: "Document request submitted successfully",
        document: {
          id: String(newDoc.request_id),
          type: newDoc.request_type,
          college: newDoc.college,
          requestDate: newDoc.created_at,
          purpose: newDoc.purpose,
          status: newDoc.status,
          trackingNumber: newDoc.tracking_number,
          notes: newDoc.notes || undefined,
          estimatedCompletion: newDoc.estimated_completion || undefined,
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

// ─────────────────────────────────────────────────────────────
// QUEUE ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/student/queues/available
// Returns all open queue slots for today across all departments.
router.get(
  "/queues/available",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
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
           s.service_name,
           d.department_id,
           d.department_name,
           d.department_abbreviation,
           -- Currently serving: latest queue entry with status='serving' in this slot
           (
             SELECT q.queue_number
             FROM queues q
             WHERE q.slot_id = qs.slot_id AND q.status = 'serving'
             ORDER BY q.called_at DESC
             LIMIT 1
           ) AS currently_serving_number,
           -- Simple wait estimate: current waiting count * 5 minutes
           (
             SELECT COUNT(*)
             FROM queues q2
             WHERE q2.slot_id = qs.slot_id AND q2.status = 'waiting'
           ) AS waiting_count
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE qs.slot_date = CURDATE()
           AND qs.status = 'open'
         ORDER BY d.department_abbreviation, s.service_name`,
      );

      const formatted = slots.map((slot) => {
        const waitingCount = slot.waiting_count || 0;
        const avgWaitMin = waitingCount * 5;
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
          slotDate: slot.slot_date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          maxCapacity: slot.max_capacity,
          currentCount: slot.current_count,
          hasCapacity: waitingCount < slot.max_capacity,
          status: slot.status,
          waitingCount,
          currentlyServing,
          avgWaitTime:
            waitingCount === 0
              ? "No wait"
              : `${avgWaitMin}-${avgWaitMin + 5} mins`,
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
           q.created_at AS joined_at,
           qs.start_time,
           qs.end_time,
           s.service_name,
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
           ) AS total_waiting
         FROM queues q
         JOIN queue_slots qs ON q.slot_id = qs.slot_id
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.student_id = ?
           AND q.status IN ('waiting', 'serving')
         ORDER BY q.created_at ASC`,
        [studentId],
      );

      const formatted = rows.map((row) => {
        const position = row.position || 1;
        const deptAbbrev = row.department_abbreviation;
        const serviceCode = row.service_name
          .split(" ")[0]
          .substring(0, 3)
          .toUpperCase();
        const queueNumberBadge = `${deptAbbrev}-${serviceCode}-${String(row.queue_number).padStart(3, "0")}`;

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
          position,
          totalWaiting: row.total_waiting || 0,
          estimatedWait:
            position > 1 ? `~${(position - 1) * 5} min` : "You're next!",
          joinedAt: new Date(row.joined_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }),
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
           AND q.status IN ('completed', 'cancelled')
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
// Body: { slotId }
router.post(
  "/queues/join",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({ error: "slotId is required" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lock and fetch the slot
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.service_id, qs.status, qs.current_count, qs.max_capacity
         FROM queue_slots qs
         WHERE qs.slot_id = ? AND qs.slot_date = CURDATE()
         FOR UPDATE`,
        [slotId],
      );

      if (!slot) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "Queue slot not found or not available today" });
      }
      if (slot.status !== "open") {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "This queue is not currently open" });
      }

      // 1b. Live capacity check — avoids relying on drifted current_count
      const [[countRow]] = await conn.query(
        `SELECT COUNT(*) AS actual_waiting
         FROM queues
         WHERE slot_id = ? AND status = 'waiting'`,
        [slotId],
      );
      if (countRow.actual_waiting >= slot.max_capacity) {
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
        `INSERT INTO queues (student_id, service_id, slot_id, queue_number, status, created_at)
         VALUES (?, ?, ?, ?, 'waiting', NOW())`,
        [studentId, slot.service_id, slotId, queueNumber],
      );
      const queueId = insertResult.insertId;

      // 5. Increment slot current_count
      await conn.query(
        `UPDATE queue_slots SET current_count = current_count + 1 WHERE slot_id = ?`,
        [slotId],
      );

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
           q.queue_id, q.queue_number, q.slot_id, q.service_id, q.status, q.created_at AS joined_at,
           s.service_name,
           d.department_name, d.department_abbreviation,
           (
             SELECT COUNT(*) FROM queues q2
             WHERE q2.slot_id = q.slot_id AND q2.status = 'waiting' AND q2.queue_number <= q.queue_number
           ) AS position,
           (
             SELECT COUNT(*) FROM queues q3
             WHERE q3.slot_id = q.slot_id AND q3.status = 'waiting'
           ) AS total_waiting
         FROM queues q
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
      const position = newEntry.position || 1;

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
          position,
          totalWaiting: newEntry.total_waiting || 0,
          estimatedWait:
            position > 1 ? `~${(position - 1) * 5} min` : "You're next!",
          joinedAt: new Date(newEntry.joined_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          }),
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

      // 1. Fetch and lock the queue entry
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
      if (entry.status !== "waiting") {
        await conn.rollback();
        return res.status(409).json({
          error:
            entry.status === "serving"
              ? "You cannot leave a queue while being served"
              : `Queue is already ${entry.status}`,
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

      // 4. Write audit log
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'waiting', 'cancelled', ?, 'Student left queue', NOW())`,
        [queueId, studentId],
      );

      await conn.commit();
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
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS total_cancelled,
           SUM(
             CASE WHEN status = 'completed'
               THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at)
               ELSE 0
             END
           ) AS total_minutes
         FROM queues
         WHERE student_id = ?`,
        [studentId],
      );

      const [[mostUsed]] = await pool.query(
        `SELECT s.service_name, COUNT(*) AS cnt
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         WHERE q.student_id = ?
         GROUP BY s.service_name
         ORDER BY cnt DESC
         LIMIT 1`,
        [studentId],
      );

      const totalCompleted = counts.total_completed || 0;
      const totalMinutes = counts.total_minutes || 0;
      const avgMinutes =
        totalCompleted > 0 ? Math.round(totalMinutes / totalCompleted) : 0;

      res.json({
        totalQueuesJoined: counts.total_joined || 0,
        totalQueuesCompleted: totalCompleted,
        totalQueuesCancelled: counts.total_cancelled || 0,
        averageWaitTime: totalCompleted > 0 ? `${avgMinutes} min` : "—",
        totalTimeInQueues: `${totalMinutes} min`,
        mostUsedService: mostUsed?.service_name ?? "—",
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
        `SELECT queue_id, student_id, status FROM queues WHERE queue_id = ?`,
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
           a.appointment_date,
           a.appointment_time,
           a.status,
           a.notes,
           a.created_at,
           f.faculty_id,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.specialization                        AS faculty_role,
           d.department_name                       AS college,
           d.department_abbreviation               AS college_abbrev,
           d.office_location                       AS location,
           s.service_name
         FROM appointments a
         JOIN faculty      f ON a.faculty_id    = f.faculty_id
         JOIN departments  d ON f.department_id = d.department_id
         LEFT JOIN services s ON a.service_id   = s.service_id
         WHERE a.student_id = ?
         ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
        [studentId],
      );

      const formatted = rows.map((row) => ({
        id: row.appointment_id,
        title: row.service_name ?? row.faculty_role ?? "Faculty Consultation",
        college: row.college,
        person: row.faculty_name,
        personRole: row.faculty_role ?? "Faculty",
        date:
          row.appointment_date instanceof Date
            ? row.appointment_date.toISOString().split("T")[0]
            : String(row.appointment_date).split("T")[0],
        time: formatTime12h(row.appointment_time),
        location: row.location ?? "TBA",
        purpose: row.notes ?? "",
        status: row.status,
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

// GET /api/student/appointments/departments
// Returns all departments (colleges) for the College dropdown.
router.get(
  "/appointments/departments",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT department_id, department_name, department_abbreviation
         FROM departments
         ORDER BY department_name ASC`,
      );
      res.json({ departments: rows });
    } catch (error) {
      console.error("Fetch departments error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/appointments/services?departmentId=1001
// Returns all services belonging to the given department.
// Used to populate the Service dropdown after College is chosen.
router.get(
  "/appointments/services",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const departmentId = parseInt(req.query.departmentId, 10);

    if (!departmentId || isNaN(departmentId)) {
      return res
        .status(400)
        .json({ error: "departmentId query parameter is required" });
    }

    try {
      const [rows] = await pool.query(
        `SELECT service_id, service_name, description
         FROM services
         WHERE department_id = ?
         ORDER BY service_name ASC`,
        [departmentId],
      );

      res.json({ services: rows });
    } catch (error) {
      console.error("Fetch services error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/student/appointments/faculty?serviceId=1
// Returns faculty members whose department owns the given service.
// Faculty dropdown is always scoped to the selected College → Service.
router.get(
  "/appointments/faculty",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const serviceId = parseInt(req.query.serviceId, 10);

    if (!serviceId || isNaN(serviceId)) {
      return res
        .status(400)
        .json({ error: "serviceId query parameter is required" });
    }

    try {
      // Resolve the department that owns this service
      const [[serviceRow]] = await pool.query(
        `SELECT department_id FROM services WHERE service_id = ?`,
        [serviceId],
      );

      if (!serviceRow) {
        return res.status(404).json({ error: "Service not found" });
      }

      const [rows] = await pool.query(
        `SELECT
           f.faculty_id,
           CONCAT(f.first_name, ' ', f.last_name) AS name,
           f.specialization,
           d.department_name AS college
         FROM faculty f
         JOIN departments d ON f.department_id = d.department_id
         WHERE f.department_id = ?
         ORDER BY f.last_name ASC`,
        [serviceRow.department_id],
      );

      res.json({ faculty: rows });
    } catch (error) {
      console.error("Fetch faculty error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/student/appointments
// Body: { facultyId, serviceId, appointmentDate, appointmentTime, notes }
router.post(
  "/appointments",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;
    const { facultyId, serviceId, appointmentDate, appointmentTime, notes } =
      req.body;

    // ── Validation ────────────────────────────────────────────
    if (!facultyId || !serviceId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        error:
          "facultyId, serviceId, appointmentDate, and appointmentTime are required",
      });
    }

    // Reject past dates
    const today = new Date().toISOString().split("T")[0];
    if (appointmentDate < today) {
      return res
        .status(400)
        .json({ error: "Appointment date cannot be in the past" });
    }

    try {
      // Resolve department_id from the selected service
      const [[serviceRow]] = await pool.query(
        `SELECT department_id FROM services WHERE service_id = ?`,
        [serviceId],
      );

      if (!serviceRow) {
        return res.status(404).json({ error: "Selected service not found" });
      }

      // Prevent duplicate booking for the same student + faculty + date + time
      const [[existing]] = await pool.query(
        `SELECT appointment_id FROM appointments
         WHERE student_id = ? AND faculty_id = ?
           AND appointment_date = ? AND appointment_time = ?
         LIMIT 1`,
        [studentId, facultyId, appointmentDate, appointmentTime],
      );

      if (existing) {
        return res.status(409).json({
          error:
            "You already have an appointment with this faculty member at that date and time",
        });
      }

      const [result] = await pool.query(
        `INSERT INTO appointments
           (student_id, faculty_id, department_id, service_id, appointment_date, appointment_time, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [
          studentId,
          facultyId,
          serviceRow.department_id,
          serviceId,
          appointmentDate,
          appointmentTime,
          notes ?? null,
        ],
      );

      // Return the newly created appointment with joined details
      const [[newRow]] = await pool.query(
        `SELECT
           a.appointment_id,
           a.appointment_date,
           a.appointment_time,
           a.status,
           a.notes,
           s.service_name,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.specialization                        AS faculty_role,
           d.department_name                       AS college,
           d.office_location                       AS location
         FROM appointments a
         JOIN services    s ON a.service_id    = s.service_id
         JOIN faculty     f ON a.faculty_id    = f.faculty_id
         JOIN departments d ON f.department_id = d.department_id
         WHERE a.appointment_id = ?`,
        [result.insertId],
      );

      res.status(201).json({
        message: "Appointment request submitted successfully",
        appointment: {
          id: newRow.appointment_id,
          title: newRow.service_name ?? "Faculty Consultation",
          college: newRow.college,
          person: newRow.faculty_name,
          personRole: newRow.faculty_role ?? "Faculty",
          date: String(newRow.appointment_date).split("T")[0],
          time: formatTime12h(newRow.appointment_time),
          location: newRow.location ?? "TBA",
          purpose: newRow.notes ?? "",
          status: newRow.status,
        },
      });
    } catch (error) {
      console.error("Create appointment error:", error);
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

    try {
      const [[appt]] = await pool.query(
        `SELECT appointment_id, student_id, status
         FROM appointments WHERE appointment_id = ?`,
        [appointmentId],
      );

      if (!appt) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      if (appt.student_id !== studentId) {
        return res
          .status(403)
          .json({ error: "You can only cancel your own appointments" });
      }
      if (!["pending", "approved"].includes(appt.status)) {
        return res.status(409).json({
          error: `Cannot cancel an appointment that is already ${appt.status}`,
        });
      }

      await pool.query(
        `UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?`,
        [appointmentId],
      );

      res.json({
        message: "Appointment cancelled successfully",
        appointmentId,
      });
    } catch (error) {
      console.error("Cancel appointment error:", error);
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
             CONCAT('Queue for ', s.service_name) AS title,
             d.department_name AS college,
             q.status AS raw_status,
             q.notes AS details,
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
           JOIN services s ON dr.service_id = s.service_id
           JOIN departments d ON s.department_id = d.department_id
           WHERE dr.student_id = ?
         )
         ORDER BY event_time DESC`,
        [studentId, studentId, studentId],
      );

      // Map raw DB statuses -> the 3 badge states the UI understands
      const statusMap = {
        waiting: "ongoing",
        serving: "ongoing",
        completed: "completed",
        cancelled: "cancelled",
        pending: "ongoing",
        approved: "ongoing",
        rejected: "cancelled",
        processing: "ongoing",
        generated: "completed",
        released: "completed",
      };

      const transactions = rows.map((row) => {
        const eventDate = new Date(row.event_time);
        return {
          id: `${row.type}-${row.id}`,
          type: row.type,
          title: row.title,
          college: row.college,
          date: eventDate.toISOString().split("T")[0],
          time: eventDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
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
           sr.requirement_id,
           sr.requirement_name,
           sr.description  AS req_description,
           sr.is_mandatory
         FROM services s
         LEFT JOIN service_requirements sr ON sr.service_id = s.service_id
         ORDER BY s.department_id, s.service_name, sr.requirement_id`,
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
           ) AS currently_serving_number
         FROM queue_slots qs
         WHERE qs.slot_date = CURDATE()
           AND qs.status = 'open'
         ORDER BY qs.start_time ASC`,
      );

      // ── Assemble: group requirements per service ──────────────────────────
      // serviceMap: service_id → { ...service fields, requirements: [] }
      const serviceMap = new Map();
      for (const row of services) {
        if (!serviceMap.has(row.service_id)) {
          serviceMap.set(row.service_id, {
            serviceId: row.service_id,
            serviceName: row.service_name,
            description: row.description ?? "",
            departmentId: row.department_id,
            requirements: [],
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

      // ── Assemble: index slots by service_id (first open slot wins) ────────
      const slotByService = new Map();
      for (const slot of slots) {
        if (!slotByService.has(slot.service_id)) {
          const waitingCount = Number(slot.waiting_count) || 0;
          const avgWaitMin = waitingCount * 5;
          slotByService.set(slot.service_id, {
            slotId: slot.slot_id,
            startTime: formatTime12h(slot.start_time),
            endTime: formatTime12h(slot.end_time),
            maxCapacity: slot.max_capacity,
            currentCount: slot.current_count,
            waitingCount,
            hasCapacity: waitingCount < slot.max_capacity,
            status: slot.status,
            avgWaitTime:
              waitingCount === 0
                ? "No wait"
                : `${avgWaitMin}–${avgWaitMin + 5} mins`,
            currentlyServingNumber: slot.currently_serving_number ?? null,
          });
        }
      }

      // ── Assemble: group services per department ───────────────────────────
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
          requirements: svc.requirements,
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

module.exports = router;
