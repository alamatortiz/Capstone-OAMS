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
         JOIN services s ON dr.service_id = s.service_id
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

module.exports = router;
