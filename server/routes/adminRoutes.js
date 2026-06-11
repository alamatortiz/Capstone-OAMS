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

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

module.exports = router;
