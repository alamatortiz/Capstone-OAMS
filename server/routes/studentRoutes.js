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
        return res.status(409).json({ error: "This queue is at full capacity" });
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
        return res
          .status(409)
          .json({ error: "You are already in this queue" });
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

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
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

module.exports = router;
