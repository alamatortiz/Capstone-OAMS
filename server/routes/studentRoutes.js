const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// GET /api/student/dashboard-stats
// Returns live counts + recent activity for the logged-in student's dashboard
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const studentId = req.user.userId;

    try {
      // ── 1. Queue Position (most recent active queue) ──────────────────────
      const [activeQueues] = await pool.query(
        `SELECT 
           q.queue_id,
           q.queue_number,
           q.status,
           q.created_at,
           s.service_name,
           d.department_name,
           d.department_abbreviation,
           -- Position = number of 'waiting' entries with a smaller/equal queue_number in same slot
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
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.student_id = ? AND q.status = 'waiting'
         ORDER BY q.created_at DESC`,
        [studentId],
      );

      // ── 2. Appointments count (upcoming = pending or approved) ─────────────
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

      // ── 3. Document requests count ─────────────────────────────────────────
      const [[docRow]] = await pool.query(
        `SELECT
           COUNT(*) AS total_count,
           SUM(CASE WHEN status IN ('pending','processing') THEN 1 ELSE 0 END) AS pending_count
         FROM document_requests
         WHERE student_id = ?`,
        [studentId],
      );

      // ── 4. Completed transactions (queues + appointments + documents) ───────
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

      // ── 5. Recent Activity (last 5 events across all 3 tables) ─────────────
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

      // ── Build response ──────────────────────────────────────────────────────
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
              // Estimate: ~5 mins per person ahead
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

// Helper: convert a Date to "X minutes/hours/days ago" string
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
