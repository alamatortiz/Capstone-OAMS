const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { upload, UPLOAD_DIR, MAX_FILES } = require("../middleware/upload");
const {
  getAttachmentsMap,
  getAttachments,
  insertAttachments,
  validateBudget,
  deleteFiles,
  isPathInsideUploadDir,
} = require("../utils/announcementAttachments");
const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const { getManilaDateString, getManilaTimeString } = require("../utils/dateTime");
const { voidQueueEntry, emitVoidEvents } = require("../jobs/queueNoShowSweeper");
const notificationsController = require("../controllers/notificationsController");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");
const {
  DB_STATUS_MAP,
  STATUS_LABEL_MAP,
  VALID_SCAN_STATUSES,
  REQUIRED_PRIOR_STATUS,
} = require("../utils/documentStatus");
const { createNotification, createNotificationsBatch } = require("../utils/notifications");
const { sendPushNotification } = require("../utils/pushNotifications");
const { getFacultyAvailabilityToday, formatTime } = require("../utils/facultyAvailability");

// GET /api/admin/dashboard-stats
// Scoped to the admin's own department_id
router.get(
  "/dashboard-stats",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;
    const manilaToday = getManilaDateString();
    const manilaNow = getManilaTimeString();

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
         WHERE qs.slot_date = ?
           AND qs.status = 'open'
           AND (? IS NULL OR s.department_id = ?)`,
        [manilaToday, deptId, deptId],
      );

      // 2. Pending documents (student + faculty requests, in this department's services)
      const [[docRow]] = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM document_requests dr
              JOIN document_services s ON dr.service_id = s.service_id
              WHERE dr.status IN ('pending', 'processing')
                AND (? IS NULL OR s.department_id = ?))
           +
           (SELECT COUNT(*) FROM faculty_document_requests fdr
              JOIN document_services s ON fdr.service_id = s.service_id
              WHERE fdr.status IN ('pending', 'processing')
                AND (? IS NULL OR s.department_id = ?))
           AS pending_doc_count`,
        [deptId, deptId, deptId, deptId],
      );

      // 3. Faculty available today -- shares the exact same schedule/toggle
      // computation as GET /faculty-availability so the two pages can never
      // disagree about who's actually available.
      const facultyAvailabilityToday = await getFacultyAvailabilityToday(deptId);
      const facultyAvailableCount = facultyAvailabilityToday.filter(
        (f) => f.status !== "unavailable",
      ).length;

      // 4. Announcements (scoped to department)
      const [[annRow]] = await pool.query(
        `SELECT COUNT(*) AS announcement_count
         FROM announcements
         WHERE department_id = ? AND status = 'active'`,
        [deptId],
      );

      // 5. Pending documents list (latest 5 for the card, student + faculty combined)
      const [pendingDocuments] = await pool.query(
        `SELECT * FROM (
           (SELECT
              dr.request_id,
              dr.request_type,
              dr.status,
              dr.created_at,
              CONCAT(st.first_name, ' ', st.last_name) AS requester_name,
              d.department_abbreviation AS college,
              'student' AS requester_type
            FROM document_requests dr
            JOIN students st ON dr.student_id = st.student_id
            JOIN document_services s ON dr.service_id = s.service_id
            JOIN departments d ON s.department_id = d.department_id
            WHERE dr.status IN ('pending', 'processing')
              AND (? IS NULL OR s.department_id = ?))
           UNION ALL
           (SELECT
              fdr.request_id,
              fdr.request_type,
              fdr.status,
              fdr.created_at,
              CONCAT(f.first_name, ' ', f.last_name) AS requester_name,
              d.department_abbreviation AS college,
              'faculty' AS requester_type
            FROM faculty_document_requests fdr
            JOIN faculty f ON fdr.faculty_id = f.faculty_id
            JOIN document_services s ON fdr.service_id = s.service_id
            JOIN departments d ON s.department_id = d.department_id
            WHERE fdr.status IN ('pending', 'processing')
              AND (? IS NULL OR s.department_id = ?))
         ) AS combined
         ORDER BY created_at DESC
         LIMIT 5`,
        [deptId, deptId, deptId, deptId],
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
         WHERE qs.slot_date = ?
           AND qs.status IN ('open', 'paused')
           AND s.department_id = ?
         ORDER BY waiting_count DESC
         LIMIT 5`,
        [manilaToday, deptId],
      );

      // 8. Announcements list
      const [announcements] = await pool.query(
        `SELECT announcement_id, title, content AS description, type, is_pinned, created_at, updated_at
         FROM announcements
         WHERE department_id = ? AND status = 'active'
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT 5`,
        [deptId],
      );

      res.json({
        stats: {
          activeQueues: queueRow.active_queue_count || 0,
          pendingDocuments: docRow.pending_doc_count || 0,
          facultyAvailable: facultyAvailableCount,
          announcements: annRow.announcement_count || 0,
        },
        pendingDocuments: pendingDocuments.map((d) => ({
          id: d.request_id,
          name: d.requester_name,
          document: d.request_type,
          college: d.college,
          requesterType: d.requester_type,
          date: new Date(d.created_at).toLocaleDateString("en-US", {
            timeZone: "Asia/Manila",
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
        facultyAvailability: facultyAvailabilityToday.slice(0, 8).map((f) => ({
          id: f.id,
          name: f.name,
          college: f.college,
          status: f.status,
          time: f.currentActivity ?? f.nextAvailableSlot,
        })),
        announcements: announcements.map((a) => ({
          id: a.announcement_id,
          title: a.title,
          description: a.description,
          tag: a.type || "general",
          isPinned: a.is_pinned === 1,
          isReposted: new Date(a.updated_at).getTime() !== new Date(a.created_at).getTime(),
          date: new Date(a.updated_at).toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
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

const { getAdminDepartmentId } = require("../utils/adminDept");

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
           qs.no_show_timeout_minutes,
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
             SELECT COUNT(*) FROM queues q6
             WHERE q6.slot_id = qs.slot_id AND q6.status IN ('waiting', 'serving', 'completed')
           ) AS total_in_queue,
           (
             SELECT st.student_number
             FROM queues q3
             JOIN students st ON q3.student_id = st.student_id
             WHERE q3.slot_id = qs.slot_id AND q3.status = 'serving'
             ORDER BY q3.called_at DESC
             LIMIT 1
           ) AS currently_serving_student_number,
           (
             SELECT q3b.arrived_at
             FROM queues q3b
             WHERE q3b.slot_id = qs.slot_id AND q3b.status = 'serving'
             ORDER BY q3b.called_at DESC
             LIMIT 1
           ) AS currently_serving_arrived_at,
           qs.service_time_minutes AS avg_service_minutes
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.department_id = ?
           AND qs.slot_date = ?
         ORDER BY qs.created_at DESC`,
        [deptId, getManilaDateString()],
      );

      const formatted = slots.map((q) => {
        const maxCapacity = q.max_capacity || 0;
        const totalInQueue = q.total_in_queue || 0;
        const servedCount = q.served_count || 0;
        const queueOccupancyPercent =
          maxCapacity > 0
            ? Math.min(100, Math.round((totalInQueue / maxCapacity) * 100))
            : 0;
        const servicedPercent =
          totalInQueue > 0
            ? Math.min(100, Math.round((servedCount / totalInQueue) * 100))
            : 0;

        return {
          id: q.slot_id,
          queueType: q.service_name,
          department: q.department_name
            ? `${q.department_name} (${q.department_abbreviation})`
            : "All Departments",
          college: q.department_abbreviation || "ALL",
          maxCapacity,
          noShowTimeoutMinutes: q.no_show_timeout_minutes,
          currentCount: q.waiting_count || 0,
          servedCount,
          totalInQueue,
          queueOccupancyPercent,
          servicedPercent,
          status: q.status, // 'open' | 'paused' | 'full' | 'expired' | 'completed' | 'closed' | 'cancelled'
          createdAt: q.created_at,
          location: q.office_location || null,
          currentlyServingStudentNumber:
            q.currently_serving_student_number || null,
          currentlyServingArrivedAt: q.currently_serving_arrived_at || null,
          avgServiceMinutes:
            q.avg_service_minutes != null ? Number(q.avg_service_minutes) : null,
          serviceHours: {
            start: String(q.start_time).slice(0, 5),
            end: String(q.end_time).slice(0, 5),
          },
        };
      });

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
// Body: { serviceId, maxCapacity, startTime, endTime, serviceTimeMinutes }
// Opens a new queue_slot for TODAY. serviceId is verified to belong
// to the admin's own department — this is the actual enforcement
// point that stops an admin from hosting another college's queue.
router.post(
  "/queue-hosting",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;
    const { serviceId, maxCapacity, startTime, endTime, noShowTimeoutMinutes, serviceTimeMinutes } = req.body;

    if (!serviceId || !maxCapacity || !startTime || !endTime || !serviceTimeMinutes) {
      return res.status(400).json({
        error: "serviceId, maxCapacity, startTime, endTime, and serviceTimeMinutes are required",
      });
    }
    const capacityNum = parseInt(maxCapacity, 10);
    if (!capacityNum || capacityNum <= 0) {
      return res
        .status(400)
        .json({ error: "maxCapacity must be a positive number" });
    }
    const serviceTimeNum = parseInt(serviceTimeMinutes, 10);
    if (!serviceTimeNum || serviceTimeNum <= 0) {
      return res
        .status(400)
        .json({ error: "serviceTimeMinutes must be a positive number" });
    }
    if (startTime >= endTime) {
      return res
        .status(400)
        .json({ error: "Start time must be before end time" });
    }
    if (endTime <= getManilaTimeString()) {
      return res.status(400).json({
        error:
          "End time has already passed — choose a window that ends later than the current time",
      });
    }
    const noShowTimeoutNum = noShowTimeoutMinutes != null
      ? parseInt(noShowTimeoutMinutes, 10)
      : 15;
    if (!noShowTimeoutNum || noShowTimeoutNum <= 0) {
      return res
        .status(400)
        .json({ error: "noShowTimeoutMinutes must be a positive number" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(adminId);
      if (!deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "Admin has no department assigned" });
      }

      // Hosting is restricted to the service's own owning department, even if
      // it's cross-college (is_cross_college only controls who can JOIN it).
      // Locking this row means two near-simultaneous requests for the same
      // service serialize here, closing the race that previously let both
      // pass the overlap check below before either had committed its insert.
      const [[service]] = await conn.query(
        `SELECT service_id, department_id, service_name
         FROM services WHERE service_id = ? FOR UPDATE`,
        [serviceId],
      );
      if (!service) {
        await conn.rollback();
        return res.status(404).json({ error: "Service not found" });
      }
      if (service.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only host queues for your own department" });
      }

      const [[overlap]] = await conn.query(
        `SELECT slot_id FROM queue_slots
         WHERE service_id = ? AND slot_date = ? AND status IN ('open', 'paused', 'full', 'expired')
           AND start_time < ? AND end_time > ?
         LIMIT 1`,
        [serviceId, getManilaDateString(), endTime, startTime],
      );
      if (overlap) {
        await conn.rollback();
        return res.status(409).json({
          error: "This time window overlaps with an existing queue for this service",
        });
      }

      const [result] = await conn.query(
        `INSERT INTO queue_slots
           (service_id, admin_id, slot_date, start_time, end_time, max_capacity, no_show_timeout_minutes, service_time_minutes, current_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'open')`,
        [serviceId, adminId, getManilaDateString(), startTime, endTime, capacityNum, noShowTimeoutNum, serviceTimeNum],
      );

      await conn.commit();

      emitToDept(deptId, "queue:slot-opened", {
        slotId: result.insertId,
        serviceId,
        queueType: service.service_name,
        maxCapacity: capacityNum,
        status: "open",
        serviceHours: { start: startTime, end: endTime },
      });

      res.status(201).json({
        message: "Queue line opened successfully",
        queue: {
          id: result.insertId,
          queueType: service.service_name,
          maxCapacity: capacityNum,
          noShowTimeoutMinutes: noShowTimeoutNum,
          serviceTimeMinutes: serviceTimeNum,
          currentCount: 0,
          servedCount: 0,
          status: "open",
          serviceHours: { start: startTime, end: endTime },
        },
      });
    } catch (error) {
      await conn.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: "A queue for this service and start time already exists today",
        });
      }
      console.error("Open queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/pause
// If a student is currently 'serving' when the queue pauses, their call is
// reverted (back to 'waiting', called_at cleared) rather than left dangling
// -- since queue_number never changes, they naturally land back at position
// 1 (the position subquery counts 'waiting' rows with queue_number <= own).
router.patch(
  "/queue-hosting/:slotId/pause",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to pause a queue" });
    }
    const adminId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(adminId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.status, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }
      if (slot.status !== "open") {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "Only an open queue can be paused" });
      }

      const [[serving]] = await conn.query(
        `SELECT queue_id, student_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1 FOR UPDATE`,
        [slotId],
      );
      if (serving) {
        await conn.query(
          `UPDATE queues SET status = 'waiting', called_at = NULL, arrived_at = NULL WHERE queue_id = ?`,
          [serving.queue_id],
        );
        await conn.query(
          `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
           VALUES (?, 'serving', 'waiting', ?, 'Call reverted: queue paused before student was served', NOW())`,
          [serving.queue_id, adminId],
        );
      }

      await conn.query(
        `UPDATE queue_slots SET status = 'paused', pause_reason = ? WHERE slot_id = ?`,
        [reason, slotId],
      );

      await conn.commit();

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "paused", reason });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "paused", reason });
      if (serving) {
        const uncalledPayload = { slotId, queueId: serving.queue_id, studentId: serving.student_id };
        emitToSlot(slotId, "queue:uncalled", uncalledPayload);
        emitToUser(serving.student_id, "queue:uncalled", uncalledPayload);
        createNotification(serving.student_id, "The queue was paused while you were being served. You've been moved back to waiting.", "queue");
      }
      res.json({
        message: "Queue paused",
        slotId,
        status: "paused",
        reason,
        revertedServingStudent: !!serving,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Pause queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.status, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }
      if (slot.status !== "paused") {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "Only a paused queue can be resumed" });
      }

      await conn.query(
        `UPDATE queue_slots SET status = 'open', pause_reason = NULL WHERE slot_id = ?`,
        [slotId],
      );

      await conn.commit();

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "open" });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "open" });
      res.json({ message: "Queue resumed", slotId, status: "open" });
    } catch (error) {
      await conn.rollback();
      console.error("Resume queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
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
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to stop a queue" });
    }
    const adminId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(adminId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.status, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }
      if (slot.status === "cancelled") {
        await conn.rollback();
        return res.status(409).json({ error: `Queue is already ${slot.status}` });
      }

      // Every student still waiting or being served has their entry force-
      // cancelled with the admin's reason — otherwise these rows would be
      // orphaned in the DB forever (see queueNoShowSweeper.js for the
      // analogous no-show cleanup path).
      const [affected] = await conn.query(
        `SELECT queue_id, student_id, status FROM queues
         WHERE slot_id = ? AND status IN ('waiting', 'serving')`,
        [slotId],
      );

      for (const entry of affected) {
        await conn.query(
          `UPDATE queues SET status = 'cancelled', cancelled_at = NOW(), admin_reason = ? WHERE queue_id = ?`,
          [reason, entry.queue_id],
        );
        await conn.query(
          `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
           VALUES (?, ?, 'cancelled', ?, ?, NOW())`,
          [entry.queue_id, entry.status, adminId, `Queue stopped by admin: ${reason}`],
        );
      }

      await conn.query(
        `UPDATE queue_slots SET status = 'closed', close_reason = ? WHERE slot_id = ?`,
        [reason, slotId],
      );

      await conn.commit();

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "closed", reason });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "closed", reason });
      for (const entry of affected) {
        const stoppedPayload = { slotId, queueId: entry.queue_id, studentId: entry.student_id, reason };
        emitToUser(entry.student_id, "queue:queue-stopped", stoppedPayload);
        createNotification(entry.student_id, `The queue you were in was stopped: ${reason}`, "queue");
      }

      res.json({
        message: "Queue closed",
        slotId,
        status: "closed",
        reason,
        cancelledCount: affected.length,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Close queue error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/call-next
// Calls the next waiting student into 'serving'. Refuses if someone
// is already being served — that student must be marked served first.
// Lock order: queue_slots row first, then the queues row(s) — matches
// pause/close/join, so this can never deadlock against them.
router.patch(
  "/queue-hosting/:slotId/call-next",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, qs.status, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }
      if (slot.status === "paused") {
        await conn.rollback();
        return res.status(409).json({
          error: "Queue is paused — resume it before calling students.",
        });
      }

      const [[alreadyServing]] = await conn.query(
        `SELECT queue_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1 FOR UPDATE`,
        [slotId],
      );
      if (alreadyServing) {
        await conn.rollback();
        return res.status(409).json({
          error:
            "A student is already being served. Mark them as served first.",
        });
      }

      const [[next]] = await conn.query(
        `SELECT queue_id, student_id FROM queues
         WHERE slot_id = ? AND status = 'waiting'
         ORDER BY queue_number ASC
         LIMIT 1
         FOR UPDATE`,
        [slotId],
      );
      if (!next) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "No students waiting in this queue" });
      }

      const [updateResult] = await conn.query(
        `UPDATE queues SET status = 'serving', called_at = NOW() WHERE queue_id = ? AND status = 'waiting'`,
        [next.queue_id],
      );
      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(409).json({ error: "That student's status just changed — try again." });
      }

      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'waiting', 'serving', ?, 'Called by admin', NOW())`,
        [next.queue_id, req.user.userId],
      );

      await conn.commit();

      const calledPayload = {
        slotId,
        queueId: next.queue_id,
        studentId: next.student_id,
        calledAt: new Date().toISOString(),
      };
      emitToSlot(slotId, "queue:called", calledPayload);
      emitToUser(next.student_id, "queue:called", calledPayload);
      emitToDept(deptId, "queue:called", calledPayload);
      createNotification(next.student_id, "You've been called! Please proceed to the counter.", "queue");
      sendPushNotification(
        next.student_id,
        "You've been called!",
        "Please proceed to the counter.",
        { type: "queue:called", slotId, queueId: next.queue_id },
      );

      res.json({ message: "Next student called", queueId: next.queue_id });
    } catch (error) {
      await conn.rollback();
      console.error("Call next error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/mark-arrived
// Confirms the currently-serving (called) student has physically shown up.
// Doesn't change `status` — only stamps `arrived_at`, which stops the
// no-show sweeper's timeout clock (queueNoShowSweeper.js) for this entry
// regardless of how long service actually takes.
router.patch(
  "/queue-hosting/:slotId/mark-arrived",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }

      const [[serving]] = await conn.query(
        `SELECT queue_id, student_id FROM queues
         WHERE slot_id = ? AND status = 'serving' AND arrived_at IS NULL
         LIMIT 1 FOR UPDATE`,
        [slotId],
      );
      if (!serving) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "No called student is awaiting arrival" });
      }

      const [updateResult] = await conn.query(
        `UPDATE queues SET arrived_at = NOW()
         WHERE queue_id = ? AND status = 'serving' AND arrived_at IS NULL`,
        [serving.queue_id],
      );
      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(409).json({ error: "That student's status just changed — try again." });
      }

      // Not a status transition (status stays 'serving') -- logged anyway so
      // the arrival milestone shows up in the queue's audit trail.
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'serving', 'serving', ?, 'Marked as arrived by admin', NOW())`,
        [serving.queue_id, req.user.userId],
      );

      await conn.commit();

      const arrivedPayload = { slotId, queueId: serving.queue_id, studentId: serving.student_id };
      emitToSlot(slotId, "queue:arrived", arrivedPayload);
      emitToUser(serving.student_id, "queue:arrived", arrivedPayload);
      emitToDept(deptId, "queue:arrived", arrivedPayload);

      res.json({ message: "Student marked as arrived", queueId: serving.queue_id });
    } catch (error) {
      await conn.rollback();
      console.error("Mark arrived error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }

      const [[serving]] = await conn.query(
        `SELECT queue_id, student_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1 FOR UPDATE`,
        [slotId],
      );
      if (!serving) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "No student is currently being served" });
      }

      const [updateResult] = await conn.query(
        `UPDATE queues SET status = 'completed', completed_at = NOW() WHERE queue_id = ? AND status = 'serving'`,
        [serving.queue_id],
      );
      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(409).json({ error: "That student's status just changed — try again." });
      }

      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'serving', 'completed', ?, 'Marked as served by admin', NOW())`,
        [serving.queue_id, req.user.userId],
      );

      // Marking someone served never frees a capacity seat, but it can be
      // the last unserved entry in a 'full'/'expired' slot -- settle it,
      // inside the same transaction/lock as the rest of this request.
      const settleResult = await settleSlotAfterEntryChange(conn, slotId);

      await conn.commit();

      const servedPayload = {
        slotId,
        queueId: serving.queue_id,
        studentId: serving.student_id,
        completedAt: new Date().toISOString(),
      };
      emitToSlot(slotId, "queue:served", servedPayload);
      emitToUser(serving.student_id, "queue:served", servedPayload);
      emitToDept(deptId, "queue:served", servedPayload);
      createNotification(serving.student_id, "Your queue service has been completed.", "queue");

      if (settleResult) {
        const settledPayload = { slotId, status: settleResult.newStatus };
        emitToSlot(slotId, "queue:slot-status", settledPayload);
        emitToDept(deptId, "queue:slot-status", settledPayload);
      }

      res.json({
        message: "Student marked as served",
        queueId: serving.queue_id,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Mark as served error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/skip
// Manually voids the currently-serving student as a no-show, instead of
// waiting for the automatic no-show timeout (queueNoShowSweeper.js). Stays
// available whether or not the student was marked arrived — an admin may
// need to void someone who showed up but then had to leave mid-service —
// but always requires a reason.
router.patch(
  "/queue-hosting/:slotId/skip",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const adminId = req.user.userId;
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to skip a student" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(adminId);
      const [[slot]] = await conn.query(
        `SELECT qs.slot_id, s.department_id
         FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? FOR UPDATE`,
        [slotId],
      );
      if (!slot) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }
      if (slot.department_id !== deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "You can only manage queues for your own department" });
      }

      const [[serving]] = await conn.query(
        `SELECT queue_id, student_id FROM queues WHERE slot_id = ? AND status = 'serving' LIMIT 1 FOR UPDATE`,
        [slotId],
      );
      if (!serving) {
        await conn.rollback();
        return res
          .status(404)
          .json({ error: "No student is currently being served" });
      }

      const result = await voidQueueEntry(conn, {
        queueId: serving.queue_id,
        slotId,
        changedBy: adminId,
        note: `Manually voided by admin (skipped): ${reason}`,
      });

      await conn.commit();

      if (result.voided) {
        emitVoidEvents({
          slotId,
          queueId: serving.queue_id,
          studentId: serving.student_id,
          deptId,
          settleResult: result.settleResult,
        });
      }

      res.json({
        message: result.voided
          ? "Student skipped and marked as no-show"
          : "That student's status had already changed",
        queueId: serving.queue_id,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Skip student error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// GET /api/admin/appointments
// Scoped strictly to the admin's own department (enforced server-side)
router.get(
  "/appointments",
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

      const [rows] = await pool.query(
        `SELECT
          a.appointment_id,
          a.appointment_date,
          a.appointment_time,
          a.status,
          a.notes,
          a.created_at,
          CONCAT(s.first_name, ' ', s.last_name) AS student_name,
          s.student_number,
          s.course AS student_course,
          CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
          f.position AS faculty_position,
          f.email AS faculty_email,
          d.department_name,
          d.department_abbreviation,
          d.office_location,
          svc.service_name
        FROM appointments a
        JOIN students     s   ON a.student_id   = s.student_id
        JOIN faculty       f   ON a.faculty_id    = f.faculty_id
        JOIN departments   d   ON a.department_id = d.department_id
        LEFT JOIN appointment_services svc ON a.service_id = svc.service_id
        WHERE a.department_id = ?
        ORDER BY a.created_at DESC`,
        [deptId],
      );

      const todayStr = getManilaDateString();

      const appointments = rows.map((r) => {
        const dateStr =
          r.appointment_date instanceof Date
            ? getManilaDateString(r.appointment_date)
            : String(r.appointment_date).split("T")[0];

        return {
          id: String(r.appointment_id),
          college: `${r.department_name} (${r.department_abbreviation})`,
          location: r.office_location ?? "TBA",
          studentName: r.student_name,
          studentId: r.student_number,
          studentCourse: r.student_course,
          professor: `${r.faculty_position ?? "Prof."} ${r.faculty_name}`,
          facultyEmail: r.faculty_email,
          serviceName: r.service_name ?? null,
          purpose: r.notes || "No purpose specified",
          date: dateStr,
          time: formatTime(r.appointment_time),
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
          isToday: dateStr === todayStr,
        };
      });

      res.json({ appointments });
    } catch (error) {
      console.error("Admin appointments fetch error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// TRANSACTIONS — unified history of queues, appointments, and
// document requests, scoped strictly to the admin's own department.
// There is no single "transactions" table in the schema, so this
// endpoint UNIONs the three source tables (mirrors the pattern used
// in GET /api/student/transactions) and returns one chronological feed.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/transactions
// Query params (all optional):
//   type   = "all" | "queue" | "appointment" | "document"
//   status = "all" | <status string from the relevant table>
//   range  = "today" | "week" | "month" | "all"   (default "all")
//   search = free text matched against student name/id, processor, details
router.get(
  "/transactions",
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

      const { type = "all", status = "all", range = "all" } = req.query;

      // Date-range boundary applied identically to all three branches below.
      // event_time is a real UTC instant, so "today"/"week"/"month" must be
      // anchored to Manila midnight, not the DB server's (UTC) CURDATE().
      const manilaMidnightUTC = new Date(`${getManilaDateString()}T00:00:00+08:00`);
      let dateClause = "";
      let dateParam = null;
      if (range === "today") {
        dateClause = "AND event_time >= ?";
        dateParam = manilaMidnightUTC;
      } else if (range === "week") {
        dateClause = "AND event_time >= ?";
        dateParam = new Date(manilaMidnightUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === "month") {
        dateClause = "AND event_time >= ?";
        dateParam = new Date(manilaMidnightUTC.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const unionSql = `
        SELECT * FROM (
          (
            SELECT
              'queue' AS type,
              q.queue_id AS id,
              CASE
                WHEN q.status = 'cancelled' AND q.admin_reason IS NOT NULL THEN 'Queue Stopped'
                WHEN q.status = 'completed' THEN 'Completed Queue Service'
                WHEN q.status = 'cancelled' THEN 'Cancelled Queue Request'
                WHEN q.status = 'serving'   THEN 'Currently Serving'
                ELSE 'Queue Joined'
              END AS action,
              COALESCE(d.department_name, 'All Colleges') AS college,
              COALESCE(d.department_abbreviation, 'ALL') AS college_abbrev,
              CONCAT(st.first_name, ' ', st.last_name) AS student_name,
              st.student_number AS student_id,
              COALESCE(CONCAT(adm.first_name, ' ', adm.last_name), s.service_name) AS processor,
              COALESCE(q.admin_reason, s.service_name) AS details,
              q.status AS raw_status,
              q.updated_at AS event_time,
              'student' AS requester_type
            FROM queues q
            JOIN services s ON q.service_id = s.service_id
            LEFT JOIN queue_slots qs ON q.slot_id = qs.slot_id
            LEFT JOIN administrators adm ON qs.admin_id = adm.admin_id
            LEFT JOIN departments d ON adm.department_id = d.department_id
            JOIN students st ON q.student_id = st.student_id
            WHERE (d.department_id = ? OR d.department_id IS NULL)
          )
          UNION ALL
          (
            SELECT
              'appointment' AS type,
              a.appointment_id AS id,
              CASE a.status
                WHEN 'approved'  THEN 'Approved Appointment'
                WHEN 'completed' THEN 'Completed Appointment'
                WHEN 'rejected'  THEN 'Rejected Appointment'
                WHEN 'cancelled' THEN 'Cancelled Appointment'
                ELSE 'Pending Appointment'
              END AS action,
              d.department_name AS college,
              d.department_abbreviation AS college_abbrev,
              CONCAT(st.first_name, ' ', st.last_name) AS student_name,
              st.student_number AS student_id,
              CONCAT(f.position, ' ', f.first_name, ' ', f.last_name) AS processor,
              COALESCE(a.notes, 'No purpose specified') AS details,
              a.status AS raw_status,
              a.updated_at AS event_time,
              'student' AS requester_type
            FROM appointments a
            JOIN departments d ON a.department_id = d.department_id
            JOIN students st ON a.student_id = st.student_id
            JOIN faculty f ON a.faculty_id = f.faculty_id
            WHERE a.department_id = ?
          )
          UNION ALL
          (
            SELECT
              'document' AS type,
              dr.request_id AS id,
              CASE dr.status
                WHEN 'claimed'    THEN 'Claimed Document Request'
                WHEN 'released'   THEN 'Released Document Request'
                WHEN 'generated'  THEN 'Generated Document'
                WHEN 'processing' THEN 'Processing Document Request'
                WHEN 'cancelled'  THEN 'Cancelled Document Request'
                ELSE 'Pending Document Request'
              END AS action,
              d.department_name AS college,
              d.department_abbreviation AS college_abbrev,
              CONCAT(st.first_name, ' ', st.last_name) AS student_name,
              st.student_number AS student_id,
              COALESCE(
                (SELECT CONCAT(adm2.first_name, ' ', adm2.last_name)
                 FROM audit_logs al
                 JOIN administrators adm2 ON al.admin_id = adm2.admin_id
                 WHERE al.target_table = 'document_requests' AND al.target_record_id = dr.request_id
                 ORDER BY al.created_at DESC LIMIT 1),
                dr.request_type
              ) AS processor,
              dr.purpose AS details,
              dr.status AS raw_status,
              dr.updated_at AS event_time,
              'student' AS requester_type
            FROM document_requests dr
            JOIN document_services s ON dr.service_id = s.service_id
            JOIN departments d ON s.department_id = d.department_id
            JOIN students st ON dr.student_id = st.student_id
            WHERE s.department_id = ?
          )
          UNION ALL
          (
            SELECT
              'document' AS type,
              fdr.request_id AS id,
              CASE fdr.status
                WHEN 'claimed'    THEN 'Claimed Document Request'
                WHEN 'released'   THEN 'Released Document Request'
                WHEN 'generated'  THEN 'Generated Document'
                WHEN 'processing' THEN 'Processing Document Request'
                WHEN 'cancelled'  THEN 'Cancelled Document Request'
                ELSE 'Pending Document Request'
              END AS action,
              d.department_name AS college,
              d.department_abbreviation AS college_abbrev,
              CONCAT(f.first_name, ' ', f.last_name) AS student_name,
              f.employee_id AS student_id,
              COALESCE(
                (SELECT CONCAT(adm2.first_name, ' ', adm2.last_name)
                 FROM audit_logs al
                 JOIN administrators adm2 ON al.admin_id = adm2.admin_id
                 WHERE al.target_table = 'faculty_document_requests' AND al.target_record_id = fdr.request_id
                 ORDER BY al.created_at DESC LIMIT 1),
                fdr.request_type
              ) AS processor,
              fdr.purpose AS details,
              fdr.status AS raw_status,
              fdr.updated_at AS event_time,
              'faculty' AS requester_type
            FROM faculty_document_requests fdr
            JOIN document_services s ON fdr.service_id = s.service_id
            JOIN departments d ON s.department_id = d.department_id
            JOIN faculty f ON fdr.faculty_id = f.faculty_id
            WHERE s.department_id = ?
          )
        ) AS combined
        WHERE 1=1 ${dateClause}
        ORDER BY event_time DESC
        LIMIT 200
      `;

      const unionParams = [deptId, deptId, deptId, deptId];
      if (dateParam) unionParams.push(dateParam);
      const [rows] = await pool.query(unionSql, unionParams);

      // Map raw per-table statuses -> the badge vocabulary the UI uses.
      // Document statuses stay granular (matching /faculty/transactions'
      // vocabulary) instead of collapsing pending/processing/generated/
      // released into "approved" — that used to render an untouched
      // "pending" request with a green "Approved" badge.
      // Deliberately NOT the same shape as student's statusMap in
      // studentRoutes.js's GET /transactions (which collapses everything
      // into 3 generic badge states) -- this one needs the granular labels
      // for admin's filter dropdown, so the two are intentionally different.
      const statusMap = {
        completed: "completed",
        cancelled: "cancelled",
        no_show: "no_show",
        waiting: "completed", // not surfaced as a transaction row by default, kept for safety
        serving: "completed",
        approved: "approved",
        pending: "pending",
        rejected: "rejected",
        processing: "processing",
        generated: "generated",
        released: "released",
        claimed: "completed",
      };

      let transactions = rows.map((r) => ({
        id: `${r.type}-${r.id}`,
        type: r.type,
        action: r.action,
        college: `${r.college} (${r.college_abbrev})`,
        collegeAbbrev: r.college_abbrev,
        studentName: r.student_name,
        studentId: r.student_id,
        requesterType: r.requester_type,
        processor: r.processor,
        details: r.details || "No additional details provided.",
        status: statusMap[r.raw_status] ?? r.raw_status,
        timestamp: new Date(r.event_time).toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      }));

      // Server-side filtering for type/status (search stays client-side,
      // matching how the rest of the admin UI already filters in-memory)
      if (type !== "all") {
        transactions = transactions.filter((t) => t.type === type);
      }
      if (status !== "all") {
        transactions = transactions.filter((t) => t.status === status);
      }

      // Aggregate stats over the full (unfiltered-by-type/status) dataset
      // so the summary cards always reflect the department total.
      const allForStats = rows.map((r) => ({
        type: r.type,
        status: statusMap[r.raw_status] ?? r.raw_status,
      }));

      res.json({
        transactions,
        stats: {
          total: allForStats.length,
          queue: allForStats.filter((t) => t.type === "queue").length,
          appointments: allForStats.filter((t) => t.type === "appointment")
            .length,
          documents: allForStats.filter((t) => t.type === "document").length,
        },
      });
    } catch (error) {
      console.error("Admin transactions fetch error:", error);
      res
        .status(500)
        .json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/queue-hosting/:slotId/entries
// Returns all queue entries (students) for a specific slot, scoped to admin's department.
router.get(
  "/queue-hosting/:slotId/entries",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [[slot]] = await pool.query(
        `SELECT qs.slot_id FROM queue_slots qs
         JOIN services s ON qs.service_id = s.service_id
         WHERE qs.slot_id = ? AND s.department_id = ?`,
        [slotId, deptId],
      );
      if (!slot) {
        return res.status(404).json({ error: "Queue slot not found or not in your department" });
      }

      const [rows] = await pool.query(
        `SELECT
           q.queue_number,
           q.status,
           q.notes,
           q.created_at,
           q.arrived_at,
           CONCAT(st.first_name, ' ', st.last_name) AS student_name,
           st.student_number,
           d.department_abbreviation
         FROM queues q
         JOIN students st ON q.student_id = st.student_id
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.slot_id = ?
         ORDER BY q.queue_number ASC`,
        [slotId],
      );

      const entries = rows.map((r) => ({
        queueNumber: `${r.department_abbreviation}-${String(r.queue_number).padStart(3, "0")}`,
        studentName: r.student_name,
        studentId: r.student_number,
        concern: r.notes || "No concern specified",
        joinedAt: formatTime(getManilaTimeString(r.created_at)),
        status: r.status,
        arrivedAt: r.arrived_at,
      }));

      res.json({ entries });
    } catch (error) {
      console.error("Queue entries fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/document-processing
// Returns all document requests scoped to the admin's own department.
router.get(
  "/document-processing",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [rows] = await pool.query(
        `SELECT
           dr.request_id,
           dr.tracking_number,
           dr.request_type,
           dr.purpose,
           dr.copies,
           dr.status,
           dr.notes,
           dr.created_at,
           dr.needed_by,
           dr.released_at,
           dr.claimed_at,
           dr.official_code,
           s.requires_coding,
           CONCAT(st.first_name, ' ', st.last_name) AS student_name,
           st.student_number AS student_id,
           d.department_abbreviation AS college
         FROM document_requests dr
         JOIN students st ON dr.student_id = st.student_id
         JOIN document_services s ON dr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.department_id = ?
         ORDER BY dr.created_at DESC`,
        [deptId],
      );

      const documents = rows.map((r) => ({
        id: String(r.request_id),
        trackingNumber: r.tracking_number,
        studentName: r.student_name,
        studentId: r.student_id,
        requesterName: r.student_name,
        requesterIdLabel: "Student ID",
        requesterIdValue: r.student_id,
        college: r.college,
        documentType: r.request_type,
        purpose: r.purpose,
        copies: r.copies,
        requestDate: r.created_at instanceof Date
          ? getManilaDateString(r.created_at)
          : String(r.created_at).split("T")[0],
        status: STATUS_LABEL_MAP[r.status] ?? r.status,
        notes: r.notes || "",
        neededBy: r.needed_by || null,
        releasedDate: r.released_at || null,
        claimedDate: r.claimed_at || null,
        requiresCoding: !!r.requires_coding,
        officialCode: r.official_code || null,
      }));

      res.json({ documents });
    } catch (error) {
      console.error("Document processing fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/faculty-document-processing
// Returns all faculty document requests scoped to the admin's own department.
router.get(
  "/faculty-document-processing",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [rows] = await pool.query(
        `SELECT
           fdr.request_id,
           fdr.tracking_number,
           fdr.request_type,
           fdr.purpose,
           fdr.copies,
           fdr.status,
           fdr.notes,
           fdr.created_at,
           fdr.needed_by,
           fdr.released_at,
           fdr.claimed_at,
           fdr.official_code,
           s.requires_coding,
           CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
           f.employee_id AS faculty_employee_id,
           d.department_abbreviation AS college
         FROM faculty_document_requests fdr
         JOIN faculty f ON fdr.faculty_id = f.faculty_id
         JOIN document_services s ON fdr.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE s.department_id = ?
         ORDER BY fdr.created_at DESC`,
        [deptId],
      );

      const documents = rows.map((r) => ({
        id: String(r.request_id),
        trackingNumber: r.tracking_number,
        requesterName: r.faculty_name,
        requesterIdLabel: "Employee ID",
        requesterIdValue: r.faculty_employee_id,
        college: r.college,
        documentType: r.request_type,
        purpose: r.purpose,
        copies: r.copies,
        requestDate: r.created_at instanceof Date
          ? getManilaDateString(r.created_at)
          : String(r.created_at).split("T")[0],
        status: STATUS_LABEL_MAP[r.status] ?? r.status,
        notes: r.notes || "",
        neededBy: r.needed_by || null,
        releasedDate: r.released_at || null,
        claimedDate: r.claimed_at || null,
        requiresCoding: !!r.requires_coding,
        officialCode: r.official_code || null,
      }));

      res.json({ documents });
    } catch (error) {
      console.error("Faculty document processing fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// Links an admin-assigned official_code to a request's generated_files row
// so it becomes scannable/claimable through the existing scan-document flow.
// Only called when the service actually requires_coding. Idempotent --
// skips silently if a code is already linked for this request. Never
// throws: a linking failure must not undo a status change that already
// committed, so errors are only logged.
async function linkOfficialCode(isFaculty, requestId, officialCode) {
  try {
    const linkColumn = isFaculty ? "faculty_request_id" : "request_id";
    const [[existing]] = await pool.query(
      `SELECT file_id FROM generated_files WHERE ${linkColumn} = ?`,
      [requestId],
    );
    if (existing) return;

    await pool.query(
      `INSERT INTO generated_files (${linkColumn}, qr_code) VALUES (?, ?)`,
      [requestId, officialCode],
    );
  } catch (err) {
    console.error("Official code linking error (status change still applied):", err);
  }
}

// PATCH /api/admin/faculty-document-processing/:requestId/status
// Body: { status, notes }
// Validates the request belongs to the admin's department before updating.
router.patch(
  "/faculty-document-processing/:requestId/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const requestId = parseInt(req.params.requestId, 10);
    const { status, notes, officialCode } = req.body;
    const adminId = req.user.userId;

    if (!DB_STATUS_MAP[status]) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const dbStatus = DB_STATUS_MAP[status];

    try {
      const deptId = await getAdminDepartmentId(adminId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [[request]] = await pool.query(
        `SELECT fdr.request_id, fdr.status, fdr.faculty_id, s.department_id, s.requires_coding
         FROM faculty_document_requests fdr
         JOIN document_services s ON fdr.service_id = s.service_id
         WHERE fdr.request_id = ?`,
        [requestId],
      );

      if (!request) {
        return res.status(404).json({ error: "Document request not found" });
      }
      if (request.department_id !== deptId) {
        return res.status(403).json({ error: "You can only update documents for your own department" });
      }

      // Once a request reaches a terminal state, nothing should move it
      // again -- most importantly 'cancelled', since that's set by the
      // faculty member themselves and an admin resuming it behind their
      // back would be surprising. (claimed/rejected are also final.)
      if (["claimed", "rejected", "cancelled"].includes(request.status)) {
        return res.status(409).json({
          error: "This request is already finalized and can no longer be updated",
        });
      }

      const requiredPrior = REQUIRED_PRIOR_STATUS[dbStatus];
      if (requiredPrior && request.status !== requiredPrior) {
        return res.status(409).json({
          error: `Document must be ${requiredPrior} before it can be marked ${dbStatus}`,
        });
      }

      const needsCode = dbStatus === "generated" && request.requires_coding;
      const trimmedCode = typeof officialCode === "string" ? officialCode.trim() : "";
      if (needsCode && !trimmedCode) {
        return res.status(400).json({ error: "This document type requires an official code before it can be marked ready" });
      }

      const timestampClause =
        dbStatus === "released" ? ", released_at = NOW()" :
        dbStatus === "claimed" ? ", claimed_at = NOW()" : "";
      const notesClause = notes !== undefined ? ", notes = ?" : "";
      const codeClause = needsCode ? ", official_code = ?" : "";

      const values = [dbStatus];
      if (notes !== undefined) values.push(notes);
      if (needsCode) values.push(trimmedCode);
      values.push(requestId);

      await pool.query(
        `UPDATE faculty_document_requests SET status = ?${notesClause}${codeClause}${timestampClause} WHERE request_id = ?`,
        values,
      );

      await logAudit(adminId, "UPDATE", "faculty_document_requests", requestId, { status: request.status }, { status: dbStatus });

      if (needsCode) {
        await linkOfficialCode(true, requestId, trimmedCode);
      }

      emitToUser(request.faculty_id, "document:status-updated", { requestId, status });
      createNotification(request.faculty_id, `Your document request is now ${status}.`, "document");

      res.json({ message: "Document status updated", requestId, status });
    } catch (error) {
      console.error("Faculty document status update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/document-processing/:requestId/status
// Body: { status, notes }
// Validates the request belongs to the admin's department before updating.
router.patch(
  "/document-processing/:requestId/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const requestId = parseInt(req.params.requestId, 10);
    const { status, notes, officialCode } = req.body;
    const adminId = req.user.userId;

    if (!DB_STATUS_MAP[status]) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const dbStatus = DB_STATUS_MAP[status];

    try {
      const deptId = await getAdminDepartmentId(adminId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [[request]] = await pool.query(
        `SELECT dr.request_id, dr.student_id, dr.status, s.department_id, s.requires_coding
         FROM document_requests dr
         JOIN document_services s ON dr.service_id = s.service_id
         WHERE dr.request_id = ?`,
        [requestId],
      );

      if (!request) {
        return res.status(404).json({ error: "Document request not found" });
      }
      if (request.department_id !== deptId) {
        return res.status(403).json({ error: "You can only update documents for your own department" });
      }

      // Once a request reaches a terminal state, nothing should move it
      // again -- most importantly 'cancelled', since that's set by the
      // student themselves and an admin resuming it behind their back would
      // be surprising. (claimed/rejected are also final.)
      if (["claimed", "rejected", "cancelled"].includes(request.status)) {
        return res.status(409).json({
          error: "This request is already finalized and can no longer be updated",
        });
      }

      const requiredPrior = REQUIRED_PRIOR_STATUS[dbStatus];
      if (requiredPrior && request.status !== requiredPrior) {
        return res.status(409).json({
          error: `Document must be ${requiredPrior} before it can be marked ${dbStatus}`,
        });
      }

      const needsCode = dbStatus === "generated" && request.requires_coding;
      const trimmedCode = typeof officialCode === "string" ? officialCode.trim() : "";
      if (needsCode && !trimmedCode) {
        return res.status(400).json({ error: "This document type requires an official code before it can be marked ready" });
      }

      const timestampClause =
        dbStatus === "released" ? ", released_at = NOW()" :
        dbStatus === "claimed" ? ", claimed_at = NOW()" : "";
      const notesClause = notes !== undefined ? ", notes = ?" : "";
      const codeClause = needsCode ? ", official_code = ?" : "";

      const values = [dbStatus];
      if (notes !== undefined) values.push(notes);
      if (needsCode) values.push(trimmedCode);
      values.push(requestId);

      await pool.query(
        `UPDATE document_requests SET status = ?${notesClause}${codeClause}${timestampClause} WHERE request_id = ?`,
        values,
      );

      await logAudit(adminId, "UPDATE", "document_requests", requestId, { status: request.status }, { status: dbStatus });

      if (needsCode) {
        await linkOfficialCode(false, requestId, trimmedCode);
      }

      emitToUser(request.student_id, "document:status-updated", { requestId, status });
      createNotification(request.student_id, `Your document request is now ${status}.`, "document");

      res.json({ message: "Document status updated", requestId, status });
    } catch (error) {
      console.error("Document status update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/faculty-availability
// Returns all faculty in the admin's department with today's schedule and live status.
router.get(
  "/faculty-availability",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const faculty = await getFacultyAvailabilityToday(deptId);
      res.json({ faculty });
    } catch (error) {
      console.error("Faculty availability fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// AUDIT LOG HELPER
// ─────────────────────────────────────────────────────────────
async function logAudit(adminId, action, targetTable, targetRecordId, oldValues, newValues) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, target_table, target_record_id, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        targetTable,
        targetRecordId ?? null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      ],
    );
  } catch (e) {
    console.error("Audit log write error:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// DATA MANAGEMENT — Document Types
// All routes scoped strictly to the admin's own department.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/data-management/document-types?status=active|inactive
router.get(
  "/data-management/document-types",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const { status } = req.query;
      let sql = `
        SELECT ds.service_id AS id, ds.service_name AS name, ds.description,
               ds.status, ds.processing_time, ds.department_id, ds.is_cross_college,
               ds.recipient_type, ds.requires_coding,
               d.department_abbreviation AS dept_abbrev,
               (SELECT COUNT(*) FROM document_requirements dr WHERE dr.service_id = ds.service_id) AS req_count
        FROM document_services ds
        JOIN departments d ON ds.department_id = d.department_id
        WHERE ds.department_id = ?`;
      const params = [deptId];

      if (status && status !== "all") {
        sql += " AND ds.status = ?";
        params.push(status);
      }
      sql += " ORDER BY ds.service_name ASC";

      const [rows] = await pool.query(sql, params);
      res.json({ documentTypes: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        processingTime: r.processing_time || "",
        deptAbbrev: r.dept_abbrev,
        requirementCount: r.req_count,
        isCrossCollege: !!r.is_cross_college,
        recipientType: r.recipient_type || "students",
        requiresCoding: !!r.requires_coding,
      })) });
    } catch (error) {
      console.error("Document types fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/data-management/document-types/:id/requirements
router.get(
  "/data-management/document-types/:id/requirements",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_id FROM document_services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Document type not found in your department" });

      const [rows] = await pool.query(
        `SELECT requirement_id AS id, requirement_name AS name, description, is_mandatory AS isMandatory
         FROM document_requirements WHERE service_id = ? ORDER BY requirement_id ASC`,
        [serviceId],
      );
      // mysql2 returns TINYINT(1)/BOOLEAN columns as a raw 0/1 Number, not a
      // JS boolean -- the client compares this with `=== false` / `!== false`,
      // which never matches a Number, so this cast is required or every
      // optional requirement silently becomes "mandatory" on the next save.
      res.json({ requirements: rows.map((r) => ({ ...r, isMandatory: !!r.isMandatory })) });
    } catch (error) {
      console.error("Requirements fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/data-management/document-types
// Body: { name, description, processingTime, status, isCrossCollege, recipientType, requirements[] }
router.post(
  "/data-management/document-types",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { name, description, processingTime, status, isCrossCollege, recipientType, requiresCoding, requirements = [] } = req.body;
    if (!name || !description || !processingTime) {
      return res.status(400).json({ error: "name, description, and processingTime are required" });
    }
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const effectiveRecipient = recipientType || "students";

      const [result] = await pool.query(
        `INSERT INTO document_services (service_name, description, department_id, is_cross_college, status, processing_time, recipient_type, requires_coding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description, deptId, !!isCrossCollege, status || "active", processingTime, effectiveRecipient, !!requiresCoding],
      );
      const newId = result.insertId;

      if (requirements.length > 0) {
        const reqValues = requirements.map((r) => [newId, r.name, r.description || null, r.isMandatory !== false]);
        await pool.query(
          `INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES ?`,
          [reqValues],
        );
      }

      await logAudit(req.user.userId, "CREATE", "document_services", newId, null, { name, status: status || "active", processingTime });
      res.status(201).json({ message: "Document type created", id: newId });
    } catch (error) {
      console.error("Document type create error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PUT /api/admin/data-management/document-types/:id
// Body: { name, description, processingTime, status, scope, recipientType, requirements[] }
router.put(
  "/data-management/document-types/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    const { name, description, processingTime, status, isCrossCollege, recipientType, requiresCoding, requirements = [] } = req.body;
    if (!name || !description || !processingTime) {
      return res.status(400).json({ error: "name, description, and processingTime are required" });
    }
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[old]] = await pool.query(
        `SELECT service_name, status, processing_time FROM document_services
         WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!old) return res.status(404).json({ error: "Document type not found" });

      const effectiveRecipient = recipientType || "students";

      await pool.query(
        `UPDATE document_services SET service_name = ?, description = ?, status = ?, processing_time = ?,
         is_cross_college = ?, recipient_type = ?, requires_coding = ? WHERE service_id = ?`,
        [name, description, status || "active", processingTime, !!isCrossCollege, effectiveRecipient, !!requiresCoding, serviceId],
      );

      // Replace requirements: delete all then re-insert
      await pool.query(`DELETE FROM document_requirements WHERE service_id = ?`, [serviceId]);
      if (requirements.length > 0) {
        const reqValues = requirements.map((r) => [serviceId, r.name, r.description || null, r.isMandatory !== false]);
        await pool.query(
          `INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES ?`,
          [reqValues],
        );
      }

      await logAudit(req.user.userId, "UPDATE", "document_services", serviceId,
        { name: old.service_name, status: old.status, processingTime: old.processing_time },
        { name, status, processingTime },
      );
      res.json({ message: "Document type updated" });
    } catch (error) {
      console.error("Document type update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/admin/data-management/document-types/:id
router.delete(
  "/data-management/document-types/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_name FROM document_services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Document type not found" });

      await pool.query(`DELETE FROM document_services WHERE service_id = ?`, [serviceId]);
      await logAudit(req.user.userId, "DELETE", "document_services", serviceId, { name: svc.service_name }, null);
      res.json({ message: "Document type deleted" });
    } catch (error) {
      console.error("Document type delete error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// LOCATIONS — fixed premises admins pick from via dropdown
// ─────────────────────────────────────────────────────────────

// GET /api/admin/locations
// Returns locations scoped to the admin's own department plus shared/global ones.
router.get(
  "/locations",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [rows] = await pool.query(
        `SELECT location_id, department_id, location_name
         FROM locations
         WHERE department_id = ? OR department_id IS NULL
         ORDER BY department_id IS NULL, location_name ASC`,
        [deptId],
      );
      res.json({ locations: rows.map((r) => ({
        id: r.location_id,
        name: r.location_name,
        isGlobal: r.department_id === null,
      })) });
    } catch (error) {
      console.error("Locations fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/locations
// Body: { name }
// Lets an admin add a one-off premise not yet in the fixed list, scoped to
// their own department. Idempotent: re-adding the same name returns the
// existing row instead of erroring (uq_location_dept_name).
router.post(
  "/locations",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      await pool.query(
        `INSERT INTO locations (department_id, location_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE location_name = location_name`,
        [deptId, name],
      );
      const [[loc]] = await pool.query(
        `SELECT location_id, location_name FROM locations WHERE department_id = ? AND location_name = ?`,
        [deptId, name],
      );
      res.status(201).json({ id: loc.location_id, name: loc.location_name, isGlobal: false });
    } catch (error) {
      console.error("Location create error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DATA MANAGEMENT — Service Types (queue services)
// ─────────────────────────────────────────────────────────────

// GET /api/admin/data-management/service-types
router.get(
  "/data-management/service-types",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [rows] = await pool.query(
        `SELECT s.service_id AS id, s.service_name AS name, s.description,
                s.department_id, s.is_cross_college, s.location_id,
                d.department_abbreviation AS deptAbbrev,
                l.location_name AS locationName
         FROM services s
         JOIN departments d ON s.department_id = d.department_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         WHERE s.department_id = ?
         ORDER BY s.service_name ASC`,
        [deptId],
      );
      res.json({ serviceTypes: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        deptAbbrev: r.deptAbbrev,
        isCrossCollege: !!r.is_cross_college,
        locationId: r.location_id,
        locationName: r.locationName || null,
      })) });
    } catch (error) {
      console.error("Service types fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/data-management/service-types
// Body: { name, description, isCrossCollege }
router.post(
  "/data-management/service-types",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { name, description, isCrossCollege, locationId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [result] = await pool.query(
        `INSERT INTO services (service_name, description, department_id, is_cross_college, location_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, description || null, deptId, !!isCrossCollege, locationId || null],
      );
      const newId = result.insertId;
      await logAudit(req.user.userId, "CREATE", "services", newId, null, { name });
      res.status(201).json({ message: "Service type created", id: newId });
    } catch (error) {
      console.error("Service type create error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PUT /api/admin/data-management/service-types/:id
router.put(
  "/data-management/service-types/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    const { name, description, isCrossCollege, locationId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[old]] = await pool.query(
        `SELECT service_name FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!old) return res.status(404).json({ error: "Service type not found" });

      await pool.query(
        `UPDATE services SET service_name = ?, description = ?,
         is_cross_college = ?, location_id = ? WHERE service_id = ?`,
        [name, description || null, !!isCrossCollege, locationId || null, serviceId],
      );

      await logAudit(req.user.userId, "UPDATE", "services", serviceId,
        { name: old.service_name },
        { name },
      );
      res.json({ message: "Service type updated" });
    } catch (error) {
      console.error("Service type update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/admin/data-management/service-types/:id
router.delete(
  "/data-management/service-types/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_name FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Service type not found" });

      await pool.query(`DELETE FROM services WHERE service_id = ?`, [serviceId]);
      await logAudit(req.user.userId, "DELETE", "services", serviceId, { name: svc.service_name }, null);
      res.json({ message: "Service type deleted" });
    } catch (error) {
      console.error("Service type delete error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DATA MANAGEMENT — Service Type Requirements
// Mirrors the document-types/:id/requirements pattern.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/data-management/service-types/:id/requirements
router.get(
  "/data-management/service-types/:id/requirements",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_id FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Service type not found in your department" });

      const [rows] = await pool.query(
        `SELECT requirement_id AS id, requirement_name AS name, description, is_mandatory AS isMandatory
         FROM service_requirements WHERE service_id = ? ORDER BY requirement_id ASC`,
        [serviceId],
      );
      res.json({ requirements: rows.map((r) => ({ ...r, isMandatory: !!r.isMandatory })) });
    } catch (error) {
      console.error("Service requirements fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PUT /api/admin/data-management/service-types/:id/requirements
// Body: { requirements: [{ name, description, isMandatory }] }
// Replaces all requirements for the service (delete + re-insert).
router.put(
  "/data-management/service-types/:id/requirements",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    const { requirements = [] } = req.body;
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_name FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Service type not found in your department" });

      await pool.query(`DELETE FROM service_requirements WHERE service_id = ?`, [serviceId]);
      if (requirements.length > 0) {
        const reqValues = requirements.map((r) => [serviceId, r.name, r.description || null, r.isMandatory !== false]);
        await pool.query(
          `INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES ?`,
          [reqValues],
        );
      }

      await logAudit(req.user.userId, "UPDATE", "service_requirements", serviceId,
        null, { requirementCount: requirements.length },
      );
      res.json({ message: "Service requirements updated" });
    } catch (error) {
      console.error("Service requirements update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DATA MANAGEMENT — Service Procedure Steps
// ─────────────────────────────────────────────────────────────

// GET /api/admin/data-management/service-types/:id/steps
router.get(
  "/data-management/service-types/:id/steps",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_id FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Service type not found in your department" });

      const [rows] = await pool.query(
        `SELECT step_id AS id, step_number AS stepNumber, step_title AS title, description
         FROM service_procedure_steps WHERE service_id = ? ORDER BY step_number ASC`,
        [serviceId],
      );
      res.json({ steps: rows });
    } catch (error) {
      console.error("Service steps fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PUT /api/admin/data-management/service-types/:id/steps
// Body: { steps: [{ stepNumber, title, description }] }
// Replaces all procedure steps for the service (delete + re-insert in order).
router.put(
  "/data-management/service-types/:id/steps",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const serviceId = parseInt(req.params.id, 10);
    const { steps = [] } = req.body;
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [[svc]] = await pool.query(
        `SELECT service_name FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, deptId],
      );
      if (!svc) return res.status(404).json({ error: "Service type not found in your department" });

      await pool.query(`DELETE FROM service_procedure_steps WHERE service_id = ?`, [serviceId]);
      if (steps.length > 0) {
        const stepValues = steps.map((s, i) => [serviceId, s.stepNumber ?? i + 1, s.title, s.description || null]);
        await pool.query(
          `INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES ?`,
          [stepValues],
        );
      }

      await logAudit(req.user.userId, "UPDATE", "service_procedure_steps", serviceId,
        null, { stepCount: steps.length },
      );
      res.json({ message: "Service procedure steps updated" });
    } catch (error) {
      console.error("Service steps update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// DATA MANAGEMENT — Audit Logs
// Scoped to the admin's own department via the administrators table.
// ─────────────────────────────────────────────────────────────

// GET /api/admin/data-management/audit-logs?action=CREATE|UPDATE|DELETE|...
router.get(
  "/data-management/audit-logs",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const { action } = req.query;
      const validActions = ["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT"];

      let sql = `
        SELECT al.log_id AS id, al.action, al.target_table, al.target_record_id,
               al.old_values, al.new_values, al.created_at,
               CONCAT(a.first_name, ' ', a.last_name) AS admin_name, a.email AS admin_email
        FROM audit_logs al
        JOIN administrators a ON al.admin_id = a.admin_id
        WHERE a.department_id = ?`;
      const params = [deptId];

      if (action && action !== "all" && validActions.includes(action.toUpperCase())) {
        sql += " AND al.action = ?";
        params.push(action.toUpperCase());
      }
      sql += " ORDER BY al.created_at DESC LIMIT 200";

      const [rows] = await pool.query(sql, params);
      res.json({ auditLogs: rows.map((r) => ({
        id: r.id,
        action: r.action,
        targetTable: r.target_table || "",
        targetRecordId: r.target_record_id,
        oldValues: r.old_values,
        newValues: r.new_values,
        adminName: r.admin_name,
        adminEmail: r.admin_email,
        timestamp: new Date(r.created_at).toLocaleString("en-US", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      })) });
    } catch (error) {
      console.error("Audit logs fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// ANNOUNCEMENTS — full CRUD, scoped to the admin's own department
// ─────────────────────────────────────────────────────────────

// GET /api/admin/announcements
router.get(
  "/announcements",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });

      const [rows] = await pool.query(
        `SELECT a.announcement_id, a.title, a.content,
                a.is_pinned AS isPinned, a.type, a.status, a.created_by AS createdBy,
                a.department_id, a.created_at, a.updated_at,
                d.department_abbreviation
         FROM announcements a
         JOIN departments d ON a.department_id = d.department_id
         WHERE a.department_id = ?
         ORDER BY a.is_pinned DESC, a.updated_at DESC`,
        [deptId],
      );

      const attachmentsMap = await getAttachmentsMap(rows.map((r) => r.announcement_id));

      res.json({
        announcements: rows.map((r) => ({
          id: String(r.announcement_id),
          title: r.title,
          content: r.content,
          isPinned: !!r.isPinned,
          type: r.type || "general",
          status: r.status || "active",
          createdBy: r.createdBy || "Admin Office",
          date: r.updated_at,
          isReposted: new Date(r.updated_at).getTime() !== new Date(r.created_at).getTime(),
          college: r.department_abbreviation,
          attachments: attachmentsMap[r.announcement_id] || [],
        })),
      });
    } catch (error) {
      console.error("Announcements fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/announcements
// multipart/form-data ("attachments" field, up to MAX_FILES, optional) --
// text fields arrive as strings on req.body the same way multer parses
// non-file fields, so isPinned needs explicit boolean coercion here (it's no
// longer guaranteed a JS boolean the way a JSON body would send it).
router.post(
  "/announcements",
  authenticateToken,
  authorizeRoles("admin"),
  upload.array("attachments", MAX_FILES),
  async (req, res) => {
    const { title, content, type = "general" } = req.body;
    const isPinned = req.body.isPinned === true || req.body.isPinned === "true";
    if (!title?.trim() || !content?.trim()) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "title and content are required" });
    }
    const budgetError = validateBudget(req.files || []);
    if (budgetError) {
      deleteFiles(req.files);
      return res.status(400).json({ error: budgetError });
    }

    // Title/content/type INSERT and the attachment rows must succeed or fail
    // together -- otherwise a failure partway through leaves either a
    // permanent announcement with no attachments, or (on retry) a duplicate.
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        await conn.rollback();
        deleteFiles(req.files);
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [[adminRow]] = await conn.query(
        `SELECT CONCAT(first_name, ' ', last_name) AS full_name
         FROM administrators
         WHERE admin_id = ?`,
        [req.user.userId],
      );
      const createdBy = adminRow?.full_name || "Admin Office";

      const [result] = await conn.query(
        `INSERT INTO announcements (title, content, type, status, created_by, is_pinned, department_id)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        [title.trim(), content.trim(), type, createdBy, isPinned ? 1 : 0, deptId],
      );
      await insertAttachments(result.insertId, req.files, conn);

      await conn.commit();

      const attachments = await getAttachments(result.insertId);
      emitToDept(deptId, "announcement:changed", { announcementId: result.insertId });

      // Automatically notify every student and faculty member in the
      // department -- announcements previously reached nobody through the
      // notifications system despite `type='announcement'` existing in the
      // ENUM since it was built. One batch insert (not one query per user)
      // so a large department doesn't fire dozens/hundreds of concurrent
      // queries against the connection pool. Fire-and-forget like every
      // other notification call site in this file; a failure here must
      // never affect the already-committed announcement.
      (async () => {
        try {
          const [[students], [faculty]] = await Promise.all([
            pool.query(`SELECT student_id AS user_id FROM students WHERE department_id = ?`, [deptId]),
            pool.query(`SELECT faculty_id AS user_id FROM faculty WHERE department_id = ?`, [deptId]),
          ]);
          const message = `A new announcement has been posted: "${title.trim()}"`;
          const userIds = [...students, ...faculty].map((row) => row.user_id);
          await createNotificationsBatch(userIds, message, "announcement");
        } catch (err) {
          console.error("Announcement broadcast notification error:", err.message);
        }
      })();

      res.status(201).json({
        announcement: {
          id: String(result.insertId),
          title: title.trim(),
          content: content.trim(),
          type,
          status: "active",
          isPinned: !!isPinned,
          isReposted: false,
          createdBy,
          date: new Date().toISOString(),
          attachments,
        },
      });
    } catch (error) {
      await conn.rollback();
      deleteFiles(req.files);
      console.error("Announcement create error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// PUT /api/admin/announcements/:id
// multipart/form-data ("attachments" field, optional) -- new files are added
// alongside whatever attachments already exist (removal is a separate call,
// DELETE .../attachments/:attachmentId), so long as the combined result
// still fits the shared MAX_FILES / MAX_TOTAL_BYTES budget.
router.put(
  "/announcements/:id",
  authenticateToken,
  authorizeRoles("admin"),
  upload.array("attachments", MAX_FILES),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    const { title, content, type } = req.body;
    if (!title?.trim() || !content?.trim()) {
      deleteFiles(req.files);
      return res.status(400).json({ error: "title and content are required" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) {
        await conn.rollback();
        deleteFiles(req.files);
        return res.status(403).json({ error: "Admin has no department assigned" });
      }

      const [[row]] = await conn.query(
        `SELECT department_id FROM announcements WHERE announcement_id = ?`, [announcementId],
      );
      if (!row) {
        await conn.rollback();
        deleteFiles(req.files);
        return res.status(404).json({ error: "Announcement not found" });
      }
      if (row.department_id !== deptId) {
        await conn.rollback();
        deleteFiles(req.files);
        return res.status(403).json({ error: "Cannot edit announcements from another department" });
      }

      if (req.files && req.files.length > 0) {
        const [[existing]] = await conn.query(
          `SELECT COUNT(*) AS count, COALESCE(SUM(file_size), 0) AS bytes
           FROM announcement_attachments WHERE announcement_id = ?`,
          [announcementId],
        );
        const budgetError = validateBudget(req.files, existing.count, existing.bytes);
        if (budgetError) {
          await conn.rollback();
          deleteFiles(req.files);
          return res.status(400).json({ error: budgetError });
        }
      }

      // An actual content edit counts as a repost -- explicitly bumping
      // updated_at (rather than an ON UPDATE CURRENT_TIMESTAMP column
      // default) keeps pin/archive/restore's own UPDATEs from accidentally
      // triggering the same effect when they touch this row for unrelated
      // reasons.
      await conn.query(
        `UPDATE announcements SET title = ?, content = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE announcement_id = ?`,
        [title.trim(), content.trim(), type || "general", announcementId],
      );

      if (req.files && req.files.length > 0) {
        await insertAttachments(announcementId, req.files, conn);
      }

      await conn.commit();

      emitToDept(deptId, "announcement:changed", { announcementId });
      const attachments = await getAttachments(announcementId);
      res.json({ message: "Announcement updated", date: new Date().toISOString(), isReposted: true, attachments });
    } catch (error) {
      await conn.rollback();
      deleteFiles(req.files);
      console.error("Announcement update error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    } finally {
      conn.release();
    }
  },
);

// DELETE /api/admin/announcements/:id/attachments/:attachmentId
// Removes a single attachment without touching the rest of the announcement.
router.delete(
  "/announcements/:id/attachments/:attachmentId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });
      const [[row]] = await pool.query(
        `SELECT a.department_id, aa.file_path
         FROM announcement_attachments aa
         JOIN announcements a ON a.announcement_id = aa.announcement_id
         WHERE aa.attachment_id = ? AND aa.announcement_id = ?`,
        [attachmentId, announcementId],
      );
      if (!row) return res.status(404).json({ error: "Attachment not found" });
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot modify announcements from another department" });
      }

      await pool.query(`DELETE FROM announcement_attachments WHERE attachment_id = ?`, [attachmentId]);
      fs.unlink(path.join(UPLOAD_DIR, row.file_path), (err) => {
        if (err && err.code !== "ENOENT") console.error("Attachment cleanup error:", err);
      });

      emitToDept(deptId, "announcement:changed", { announcementId });
      res.json({ message: "Attachment removed" });
    } catch (error) {
      console.error("Announcement attachment delete error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/announcements/:id/pin
router.patch(
  "/announcements/:id/pin",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });
      const [[row]] = await pool.query(
        `SELECT is_pinned, department_id FROM announcements WHERE announcement_id = ?`,
        [announcementId],
      );
      if (!row) return res.status(404).json({ error: "Announcement not found" });
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot modify announcements from another department" });
      }
      const newPinned = row.is_pinned ? 0 : 1;
      await pool.query(`UPDATE announcements SET is_pinned = ? WHERE announcement_id = ?`, [newPinned, announcementId]);
      emitToDept(deptId, "announcement:changed", { announcementId });
      res.json({ isPinned: !!newPinned });
    } catch (error) {
      console.error("Announcement pin toggle error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/announcements/:id/archive
router.patch(
  "/announcements/:id/archive",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });
      const [[row]] = await pool.query(
        `SELECT department_id FROM announcements WHERE announcement_id = ?`,
        [announcementId],
      );
      if (!row) return res.status(404).json({ error: "Announcement not found" });
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot modify announcements from another department" });
      }
      // Archiving intentionally does NOT bump updated_at -- it's about to
      // disappear from students' feeds, not resurface as a repost.
      await pool.query(`UPDATE announcements SET status = 'archived' WHERE announcement_id = ?`, [announcementId]);
      emitToDept(deptId, "announcement:changed", { announcementId });
      res.json({ message: "Announcement archived" });
    } catch (error) {
      console.error("Announcement archive error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/announcements/:id/restore
router.patch(
  "/announcements/:id/restore",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });
      const [[row]] = await pool.query(
        `SELECT department_id FROM announcements WHERE announcement_id = ?`,
        [announcementId],
      );
      if (!row) return res.status(404).json({ error: "Announcement not found" });
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot modify announcements from another department" });
      }
      // Restoring bumps updated_at -- bringing an archived announcement back
      // into view counts as a repost, same as an actual content edit.
      await pool.query(`UPDATE announcements SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE announcement_id = ?`, [announcementId]);
      emitToDept(deptId, "announcement:changed", { announcementId });
      res.json({ message: "Announcement restored", date: new Date().toISOString(), isReposted: true });
    } catch (error) {
      console.error("Announcement restore error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/admin/announcements/:id
router.delete(
  "/announcements/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      if (!deptId) return res.status(403).json({ error: "Admin has no department assigned" });
      const [[row]] = await pool.query(
        `SELECT department_id FROM announcements WHERE announcement_id = ?`,
        [announcementId],
      );
      if (!row) return res.status(404).json({ error: "Announcement not found" });
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot delete announcements from another department" });
      }
      const [attachments] = await pool.query(
        `SELECT file_path FROM announcement_attachments WHERE announcement_id = ?`,
        [announcementId],
      );
      // ON DELETE CASCADE removes the announcement_attachments rows; the
      // physical files still need explicit cleanup below.
      await pool.query(`DELETE FROM announcements WHERE announcement_id = ?`, [announcementId]);
      attachments.forEach((a) => {
        fs.unlink(path.join(UPLOAD_DIR, a.file_path), (err) => {
          if (err && err.code !== "ENOENT") console.error("Attachment cleanup error:", err);
        });
      });
      emitToDept(deptId, "announcement:changed", { announcementId });
      res.json({ message: "Announcement deleted" });
    } catch (error) {
      console.error("Announcement delete error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/announcements/:id/attachments/:attachmentId
// Serves one specific attachment inline (image/PDF/etc.), scoped to the
// admin's own department the same way edit/delete are. Resolves the stored
// path against the fixed UPLOAD_DIR and rejects anything that would escape
// it (defense in depth -- file_path is always a UUID we generated, never
// client-controlled).
router.get(
  "/announcements/:id/attachments/:attachmentId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const announcementId = parseInt(req.params.id, 10);
    const attachmentId = parseInt(req.params.attachmentId, 10);
    try {
      const deptId = await getAdminDepartmentId(req.user.userId);
      const [[row]] = await pool.query(
        `SELECT a.department_id, aa.file_path, aa.mime_type
         FROM announcement_attachments aa
         JOIN announcements a ON a.announcement_id = aa.announcement_id
         WHERE aa.attachment_id = ? AND aa.announcement_id = ?`,
        [attachmentId, announcementId],
      );
      if (!row) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      if (row.department_id !== deptId) {
        return res.status(403).json({ error: "Cannot view attachments from another department" });
      }

      const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
      if (!isPathInsideUploadDir(resolvedPath)) {
        return res.status(400).json({ error: "Invalid attachment path" });
      }

      res.type(row.mime_type || "application/octet-stream");
      res.sendFile(resolvedPath);
    } catch (error) {
      console.error("Announcement attachment fetch error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// QUEUE ANALYTICS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/queue-analytics?period=Today|This Week|This Month|This Semester&service=All+Services|<name>
router.get(
  "/queue-analytics",
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
      const { period = "Today", service = "All Services" } = req.query;

      // Compute date threshold, anchored to Manila midnight (a real UTC
      // instant) rather than the server process's own local time -- mirrors
      // the /transactions endpoint above (~line 865). Do not use raw local
      // `Date` getters (getFullYear/getMonth/getDate) here; they depend on
      // the server process's own timezone, not Manila's.
      const manilaMidnightUTC = new Date(`${getManilaDateString()}T00:00:00+08:00`);
      const [manilaYear, manilaMonth, manilaDay] = getManilaDateString()
        .split("-")
        .map(Number);
      let dateThreshold;
      if (period === "Today") {
        dateThreshold = manilaMidnightUTC;
      } else if (period === "This Week") {
        // Weekday of Manila's "today", derived from a local-Date seed built
        // from the Manila Y/M/D so it never depends on server process TZ.
        const dayOfWeek = new Date(manilaYear, manilaMonth - 1, manilaDay).getDay();
        dateThreshold = new Date(
          manilaMidnightUTC.getTime() - dayOfWeek * 24 * 60 * 60 * 1000,
        );
      } else if (period === "This Month") {
        dateThreshold = new Date(
          `${manilaYear}-${String(manilaMonth).padStart(2, "0")}-01T00:00:00+08:00`,
        );
      } else {
        // This Semester: 6 months back from the 1st of the current Manila month
        let semYear = manilaYear;
        let semMonth = manilaMonth - 6;
        if (semMonth <= 0) {
          semMonth += 12;
          semYear -= 1;
        }
        dateThreshold = new Date(
          `${semYear}-${String(semMonth).padStart(2, "0")}-01T00:00:00+08:00`,
        );
      }

      // Service type filter
      const serviceFilter = service !== "All Services" ? service : null;

      // Main performance query: per-service stats for completed queues
      const [rows] = await pool.query(
        `SELECT s.service_id, s.service_name, d.department_abbreviation AS college,
           COUNT(q.queue_id) AS students_served,
           AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at)) AS avg_wait_minutes
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         JOIN departments d ON s.department_id = d.department_id
         WHERE q.status = 'completed'
           AND s.department_id = ?
           AND q.created_at >= ?
           ${serviceFilter ? "AND s.service_name = ?" : ""}
         GROUP BY s.service_id, s.service_name, d.department_abbreviation`,
        serviceFilter ? [deptId, dateThreshold, serviceFilter] : [deptId, dateThreshold],
      );

      // q.created_at is stored/returned as a UTC instant; HOUR() alone would
      // bucket by UTC hour, not Manila hour, so shift it first. Shared by the
      // per-service peak-hour loop below and the department-wide trends
      // queries further down.
      const fmtHour = (h) => {
        const suffix = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:00 ${suffix}`;
      };

      // Peak hour per service
      const peakMap = {};
      for (const row of rows) {
        const [peakRows] = await pool.query(
          `SELECT HOUR(CONVERT_TZ(q.created_at, '+00:00', '+08:00')) AS hr, COUNT(*) AS cnt
           FROM queues q
           WHERE q.service_id = ? AND q.created_at >= ?
           GROUP BY hr
           ORDER BY cnt DESC
           LIMIT 1`,
          [row.service_id, dateThreshold],
        );
        if (peakRows.length > 0) {
          const hr = peakRows[0].hr;
          peakMap[row.service_id] = `${fmtHour(hr)} - ${fmtHour(hr + 1)}`;
        } else {
          peakMap[row.service_id] = "N/A";
        }
      }

      // Build performance array
      const performance = rows.map((r) => {
        const avgWait = r.avg_wait_minutes != null ? parseFloat(r.avg_wait_minutes) : 0;
        const satisfaction = Math.min(100, Math.max(60, Math.round(100 - avgWait * 1.5)));
        let status;
        if (avgWait < 15) status = "excellent";
        else if (avgWait < 20) status = "good";
        else status = "needs improvement";
        return {
          service: r.service_name,
          college: r.college,
          status,
          studentsServed: r.students_served,
          avgWait: avgWait > 0 ? `${Math.round(avgWait)} min` : "N/A",
          peakHours: peakMap[r.service_id] || "N/A",
          satisfaction,
        };
      });

      // Derive insights from performance data
      const sorted = [...performance].sort((a, b) => b.satisfaction - a.satisfaction);
      const positiveInsights = sorted
        .filter((p) => p.satisfaction >= 80)
        .slice(0, 3)
        .map((p) => ({
          title: `${p.status === "excellent" ? "Excellent" : "Good"} Performance: ${p.service}`,
          desc: `${p.college} ${p.service} has a ${p.satisfaction}% satisfaction rate with an average wait of ${p.avgWait}.`,
        }));
      const improvementAreas = sorted
        .filter((p) => p.status === "needs improvement" || parseFloat(p.avgWait) > 18)
        .slice(0, 3)
        .map((p) => ({
          title: `Long Wait Times: ${p.service}`,
          desc: `${p.college} ${p.service} averages ${p.avgWait} wait time. Consider adding more service windows during peak hours (${p.peakHours}).`,
        }));

      // Service type list for dropdown
      const [serviceRows] = await pool.query(
        `SELECT service_name FROM services WHERE department_id = ? ORDER BY service_name`,
        [deptId],
      );
      const serviceTypes = ["All Services", ...serviceRows.map((s) => s.service_name)];

      // ── Trends tab: department-wide (not per-service) stats, plus a
      // period-over-period comparison against the immediately-preceding
      // window of equal length (e.g. "This Week" compares to last week). ──
      const now = new Date();
      const periodLengthMs = now.getTime() - dateThreshold.getTime();
      const previousPeriodEnd = dateThreshold;
      const previousPeriodStart = new Date(dateThreshold.getTime() - periodLengthMs);

      const serviceFilterClause = serviceFilter ? "AND s.service_name = ?" : "";

      // Peak Activity Time: busiest hour department-wide, any queue-join
      // regardless of status (mirrors the per-service peak-hour query above,
      // just without the per-service GROUP BY/loop).
      const [peakActivityRows] = await pool.query(
        `SELECT HOUR(CONVERT_TZ(q.created_at, '+00:00', '+08:00')) AS hr, COUNT(*) AS cnt
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         WHERE s.department_id = ? AND q.created_at >= ? ${serviceFilterClause}
         GROUP BY hr
         ORDER BY cnt DESC
         LIMIT 1`,
        serviceFilter ? [deptId, dateThreshold, serviceFilter] : [deptId, dateThreshold],
      );
      const peakActivityTime = peakActivityRows.length > 0
        ? `${fmtHour(peakActivityRows[0].hr)} - ${fmtHour(peakActivityRows[0].hr + 1)}`
        : "N/A";

      // Best Service Time: hour with the lowest avg wait among completed
      // tickets (the "shortest average wait times" hour of the day).
      const [bestServiceRows] = await pool.query(
        `SELECT HOUR(CONVERT_TZ(q.created_at, '+00:00', '+08:00')) AS hr,
                AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at)) AS avg_wait_minutes
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         WHERE q.status = 'completed' AND s.department_id = ? AND q.created_at >= ? ${serviceFilterClause}
         GROUP BY hr
         ORDER BY avg_wait_minutes ASC
         LIMIT 1`,
        serviceFilter ? [deptId, dateThreshold, serviceFilter] : [deptId, dateThreshold],
      );
      const bestServiceTime = bestServiceRows.length > 0
        ? `${fmtHour(bestServiceRows[0].hr)} - ${fmtHour(bestServiceRows[0].hr + 1)}`
        : "N/A";

      // Department-wide current vs. previous period aggregates, for the
      // "Weekly Comparison" style cards.
      const fetchPeriodAgg = async (start, end) => {
        const [[agg]] = await pool.query(
          `SELECT COUNT(q.queue_id) AS students_served,
                  AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at)) AS avg_wait_minutes
           FROM queues q
           JOIN services s ON q.service_id = s.service_id
           WHERE q.status = 'completed' AND s.department_id = ?
             AND q.created_at >= ? AND q.created_at < ?
             ${serviceFilterClause}`,
          serviceFilter ? [deptId, start, end, serviceFilter] : [deptId, start, end],
        );
        const avgWait = agg.avg_wait_minutes != null ? parseFloat(agg.avg_wait_minutes) : 0;
        return {
          studentsServed: agg.students_served || 0,
          avgWaitMinutes: avgWait,
          satisfaction: Math.min(100, Math.max(60, Math.round(100 - avgWait * 1.5))),
        };
      };
      const [currentAgg, previousAgg] = await Promise.all([
        fetchPeriodAgg(dateThreshold, now),
        fetchPeriodAgg(previousPeriodStart, previousPeriodEnd),
      ]);

      // No prior-period data to compare against -- show "New" (a real
      // current value with nothing to size it against) or "N/A" (nothing to
      // show either way), rather than a division-by-zero/Infinity percentage,
      // or (for satisfaction specifically) a misleading comparison against
      // the synthetic formula's zero-wait/100%-satisfaction default.
      const pctChange = (curr, prev, hasBaseline = prev !== 0) => {
        if (!hasBaseline) return curr ? "New" : "N/A";
        const pct = Math.round(((curr - prev) / prev) * 100);
        return `${pct >= 0 ? "+" : ""}${pct}%`;
      };

      const trends = {
        peakActivityTime,
        bestServiceTime,
        weeklyComparison: [
          {
            label: "Students Served",
            value: String(currentAgg.studentsServed),
            change: pctChange(currentAgg.studentsServed, previousAgg.studentsServed),
            color: "#22c55e",
          },
          {
            label: "Avg Wait Time",
            value: currentAgg.avgWaitMinutes > 0 ? `${Math.round(currentAgg.avgWaitMinutes)} min` : "N/A",
            change: pctChange(currentAgg.avgWaitMinutes, previousAgg.avgWaitMinutes, previousAgg.studentsServed > 0),
            color: "#3b82f6",
          },
          {
            label: "Satisfaction Rate",
            value: `${currentAgg.satisfaction}%`,
            change: pctChange(currentAgg.satisfaction, previousAgg.satisfaction, previousAgg.studentsServed > 0),
            color: "#22c55e",
          },
        ],
      };

      res.json({ performance, positiveInsights, improvementAreas, serviceTypes, trends });
    } catch (error) {
      console.error("Queue analytics error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// PINNACLE SYNC
// ─────────────────────────────────────────────────────────────

// GET /api/admin/pinnacle-sync/config
router.get(
  "/pinnacle-sync/config",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT setting_key, setting_value FROM system_settings
         WHERE setting_key IN ('pinnacle_api_url','pinnacle_api_key','pinnacle_sync_interval','pinnacle_sync_enabled')`,
      );
      const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
      res.json({
        apiUrl: map.pinnacle_api_url || "https://pinnacle-api.pnc.edu.ph/v1",
        apiKey: map.pinnacle_api_key || "",
        syncInterval: parseInt(map.pinnacle_sync_interval || "60", 10),
        syncEnabled: map.pinnacle_sync_enabled === "true",
      });
    } catch (error) {
      console.error("Pinnacle config get error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/pinnacle-sync/config
router.post(
  "/pinnacle-sync/config",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { apiUrl, apiKey, syncInterval, syncEnabled } = req.body;
    const adminId = req.user.userId;
    try {
      const updates = [
        ["pinnacle_api_url", apiUrl ?? ""],
        ["pinnacle_api_key", apiKey ?? ""],
        ["pinnacle_sync_interval", String(syncInterval ?? 60)],
        ["pinnacle_sync_enabled", syncEnabled ? "true" : "false"],
      ];
      for (const [key, value] of updates) {
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, value],
        );
      }
      await logAudit(adminId, "UPDATE", "system_settings", null, null, { apiUrl, syncInterval, syncEnabled });
      res.json({ message: "Configuration saved successfully." });
    } catch (error) {
      console.error("Pinnacle config save error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/pinnacle-sync/stats
router.get(
  "/pinnacle-sync/stats",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [roleRows] = await pool.query(
        `SELECT role, COUNT(*) AS cnt FROM users GROUP BY role`,
      );
      const counts = { student: 0, faculty: 0, admin: 0 };
      let total = 0;
      for (const r of roleRows) {
        counts[r.role] = parseInt(r.cnt, 10);
        total += counts[r.role];
      }

      const [logRows] = await pool.query(
        `SELECT sync_id, external_system, sync_type, sync_status, synced_at
         FROM external_sync_logs
         ORDER BY synced_at DESC
         LIMIT 10`,
      );

      res.json({
        total,
        students: counts.student,
        professors: counts.faculty,
        admins: counts.admin,
        recentLogs: logRows.map((l) => ({
          id: l.sync_id,
          system: l.external_system,
          type: l.sync_type,
          status: l.sync_status,
          syncedAt: l.synced_at,
        })),
      });
    } catch (error) {
      console.error("Pinnacle stats error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/pinnacle-sync/trigger
router.post(
  "/pinnacle-sync/trigger",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [result] = await pool.query(
        `INSERT INTO external_sync_logs (external_system, sync_type, sync_status)
         VALUES ('Pinnacle', 'profile', 'success')`,
      );
      const [[inserted]] = await pool.query(
        `SELECT synced_at FROM external_sync_logs WHERE sync_id = ?`,
        [result.insertId],
      );
      res.json({ message: "Sync completed successfully.", syncedAt: inserted.synced_at });
    } catch (error) {
      console.error("Pinnacle trigger error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// SCAN DOCUMENT
// ─────────────────────────────────────────────────────────────

// GET /api/admin/scan-document/verify/:qrCode
router.get(
  "/scan-document/verify/:qrCode",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const qrCode = req.params.qrCode;
    const adminUserId = req.user.userId;
    try {
      const deptId = await getAdminDepartmentId(adminUserId);
      const [[deptRow]] = await pool.query(
        `SELECT department_abbreviation FROM departments WHERE department_id = ?`,
        [deptId],
      );
      const scanLocation = deptRow?.department_abbreviation || "Admin Office";

      // LEFT JOINs through both the student and faculty document tables --
      // generated_files.request_id/faculty_request_id are mutually exclusive
      // (enforced by a CHECK constraint), so exactly one side ever matches and
      // COALESCE picks it. Response field names are kept as studentName/studentId
      // for backward compatibility with the existing scan-document UI; requesterType
      // is added alongside so a faculty-aware UI can be built later without another
      // response-shape change.
      const [[docRow]] = await pool.query(
        `SELECT gf.file_id, gf.qr_code,
           COALESCE(dr.request_id, fdr.request_id) AS request_id,
           COALESCE(dr.tracking_number, fdr.tracking_number) AS tracking_number,
           COALESCE(ds.service_name, fds.service_name) AS document_type,
           COALESCE(CONCAT(st.first_name, ' ', st.last_name), CONCAT(f.first_name, ' ', f.last_name)) AS student_name,
           COALESCE(st.student_number, f.employee_id) AS student_id,
           COALESCE(d.department_name, fd.department_name) AS college,
           COALESCE(d.department_abbreviation, fd.department_abbreviation) AS dept_abbrev,
           COALESCE(dr.status, fdr.status) AS status,
           COALESCE(dr.created_at, fdr.created_at) AS issue_date,
           COALESCE(dr.estimated_completion, fdr.estimated_completion) AS valid_until,
           CASE WHEN dr.request_id IS NOT NULL THEN 'student' ELSE 'faculty' END AS requester_type
         FROM generated_files gf
         LEFT JOIN document_requests dr   ON gf.request_id = dr.request_id
         LEFT JOIN students st            ON dr.student_id = st.student_id
         LEFT JOIN document_services ds   ON dr.service_id = ds.service_id
         LEFT JOIN departments d          ON ds.department_id = d.department_id
         LEFT JOIN faculty_document_requests fdr ON gf.faculty_request_id = fdr.request_id
         LEFT JOIN faculty f              ON fdr.faculty_id = f.faculty_id
         LEFT JOIN document_services fds  ON fdr.service_id = fds.service_id
         LEFT JOIN departments fd         ON fds.department_id = fd.department_id
         WHERE UPPER(gf.qr_code) = UPPER(?)`,
        [qrCode],
      );

      if (!docRow) {
        return res.json({ found: false });
      }

      // Log scan to qr_tracking_logs
      await pool.query(
        `INSERT INTO qr_tracking_logs (file_id, scanned_by, scan_location) VALUES (?, ?, ?)`,
        [docRow.file_id, adminUserId, scanLocation],
      );

      // Also log to audit_logs for visibility in Data Management
      const [[adminRow]] = await pool.query(
        `SELECT admin_id FROM administrators WHERE admin_id = ?`,
        [adminUserId],
      );
      if (adminRow) {
        await logAudit(adminUserId, "READ", "generated_files", docRow.file_id, null, { qrCode, trackingNumber: docRow.tracking_number });
      }

      const docStatus = VALID_SCAN_STATUSES.includes(docRow.status) ? "VALID" : "EXPIRED";

      const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "numeric", day: "numeric", year: "numeric" }) : "N/A";

      res.json({
        found: true,
        doc: {
          requestId: docRow.request_id,
          qrCode: docRow.qr_code,
          trackingNumber: docRow.tracking_number,
          documentType: docRow.document_type,
          studentName: docRow.student_name,
          studentId: docRow.student_id,
          requesterType: docRow.requester_type,
          college: docRow.college,
          status: docStatus,
          documentStatus: docRow.status,
          issueDate: fmtDate(docRow.issue_date),
          validUntil: fmtDate(docRow.valid_until),
          issuedBy: `${docRow.college} — ${docRow.dept_abbrev} Office`,
          authorizedSignatory: null,
          content: null,
        },
      });
    } catch (error) {
      console.error("Scan verify error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// GET /api/admin/scan-document/recent
router.get(
  "/scan-document/recent",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminUserId = req.user.userId;
    try {
      // Same LEFT JOIN + COALESCE pattern as /scan-document/verify above, so a
      // faculty-linked scan doesn't silently vanish from this list.
      const [rows] = await pool.query(
        `SELECT qtl.log_id, qtl.scan_time,
           COALESCE(CONCAT(st.first_name, ' ', st.last_name), CONCAT(f.first_name, ' ', f.last_name)) AS student_name,
           COALESCE(ds.service_name, fds.service_name) AS doc_type,
           COALESCE(dr.tracking_number, fdr.tracking_number) AS tracking_number,
           COALESCE(dr.status, fdr.status) AS status,
           CASE WHEN dr.request_id IS NOT NULL THEN 'student' ELSE 'faculty' END AS requester_type
         FROM qr_tracking_logs qtl
         JOIN generated_files gf ON qtl.file_id = gf.file_id
         LEFT JOIN document_requests dr   ON gf.request_id = dr.request_id
         LEFT JOIN students st            ON dr.student_id = st.student_id
         LEFT JOIN document_services ds   ON dr.service_id = ds.service_id
         LEFT JOIN faculty_document_requests fdr ON gf.faculty_request_id = fdr.request_id
         LEFT JOIN faculty f              ON fdr.faculty_id = f.faculty_id
         LEFT JOIN document_services fds  ON fdr.service_id = fds.service_id
         WHERE qtl.scanned_by = ?
         ORDER BY qtl.scan_time DESC
         LIMIT 10`,
        [adminUserId],
      );

      const now = Date.now();
      const formatRelative = (ts) => {
        const diffMs = now - new Date(ts).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins} minute${mins > 1 ? "s" : ""} ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
        const days = Math.floor(hrs / 24);
        return `${days} day${days > 1 ? "s" : ""} ago`;
      };

      res.json({
        scans: rows.map((r) => ({
          id: r.log_id,
          name: r.student_name,
          docType: r.doc_type,
          tracking: r.tracking_number,
          time: formatRelative(r.scan_time),
          status: VALID_SCAN_STATUSES.includes(r.status) ? "valid" : "expired",
          requesterType: r.requester_type,
        })),
      });
    } catch (error) {
      console.error("Recent scans error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// USER ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────

// GET /api/admin/users?role=&status=&search=
router.get(
  "/users",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const [studentRows] = await pool.query(
        `SELECT u.user_id AS id, 'student' AS role, u.status, u.last_login_at, u.created_at,
                s.first_name, s.last_name, s.email, s.student_number AS studentId, NULL AS employeeId,
                d.department_abbreviation AS college
         FROM students s
         JOIN users u ON u.user_id = s.student_id
         LEFT JOIN departments d ON s.department_id = d.department_id`,
      );
      const [facultyRows] = await pool.query(
        `SELECT u.user_id AS id, 'professor' AS role, u.status, u.last_login_at, u.created_at,
                f.first_name, f.last_name, f.email, NULL AS studentId, f.employee_id AS employeeId,
                d.department_abbreviation AS college
         FROM faculty f
         JOIN users u ON u.user_id = f.faculty_id
         LEFT JOIN departments d ON f.department_id = d.department_id`,
      );
      const [adminRows] = await pool.query(
        `SELECT u.user_id AS id, 'admin' AS role, u.status, u.last_login_at, u.created_at,
                a.first_name, a.last_name, a.email, NULL AS studentId, a.employee_id AS employeeId,
                d.department_abbreviation AS college
         FROM administrators a
         JOIN users u ON u.user_id = a.admin_id
         LEFT JOIN departments d ON a.department_id = d.department_id`,
      );

      let users = [...studentRows, ...facultyRows, ...adminRows].map((u) => ({
        id: String(u.id),
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        college: u.college,
        studentId: u.studentId,
        employeeId: u.employeeId,
        status: u.status,
        lastLogin: u.last_login_at,
        createdDate: u.created_at,
      }));

      const { role, status, search } = req.query;
      if (role && role !== "all") users = users.filter((u) => u.role === role);
      if (status && status !== "all") users = users.filter((u) => u.status === status);
      if (search) {
        const q = search.toLowerCase();
        users = users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.studentId || "").toLowerCase().includes(q) ||
            (u.employeeId || "").toLowerCase().includes(q),
        );
      }

      res.json({ users });
    } catch (error) {
      console.error("GET /users error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PUT /api/admin/users/:id
// Body: { name, email, college, studentId, employeeId, status } -- role is read-only.
router.put(
  "/users/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, email, college, studentId, employeeId, status } = req.body;
    const adminId = req.user.userId;

    try {
      const [[userRow]] = await pool.query(`SELECT role, status FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      let deptId = null;
      if (college) {
        const [[deptRow]] = await pool.query(
          `SELECT department_id FROM departments WHERE department_abbreviation = ?`,
          [college],
        );
        deptId = deptRow?.department_id ?? null;
      }

      const [firstName, ...rest] = (name || "").trim().split(" ");
      const lastName = rest.join(" ") || firstName;

      if (userRow.role === "student") {
        await pool.query(
          `UPDATE students SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), student_number = COALESCE(?, student_number) WHERE student_id = ?`,
          [firstName, lastName, email, deptId, studentId, userId],
        );
      } else if (userRow.role === "faculty") {
        await pool.query(
          `UPDATE faculty SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), employee_id = COALESCE(?, employee_id) WHERE faculty_id = ?`,
          [firstName, lastName, email, deptId, employeeId, userId],
        );
      } else if (userRow.role === "admin") {
        await pool.query(
          `UPDATE administrators SET first_name = ?, last_name = ?, email = ?, department_id = COALESCE(?, department_id), employee_id = COALESCE(?, employee_id) WHERE admin_id = ?`,
          [firstName, lastName, email, deptId, employeeId, userId],
        );
      }

      if (status) {
        await pool.query(`UPDATE users SET status = ? WHERE user_id = ?`, [status, userId]);
      }

      await logAudit(adminId, "UPDATE", "users", userId, { status: userRow.status }, { status });

      res.json({ message: "User updated" });
    } catch (error) {
      console.error("PUT /users/:id error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/users/:id/status
// Body: { status: 'active' | 'suspended' }
router.patch(
  "/users/:id/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const adminId = req.user.userId;

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const [[userRow]] = await pool.query(`SELECT status FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      await pool.query(`UPDATE users SET status = ? WHERE user_id = ?`, [status, userId]);
      await logAudit(adminId, "UPDATE", "users", userId, { status: userRow.status }, { status });

      res.json({ message: "Status updated", status });
    } catch (error) {
      console.error("PATCH /users/:id/status error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// DELETE /api/admin/users/:id
router.delete(
  "/users/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.userId;

    try {
      const [[userRow]] = await pool.query(`SELECT role FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      await pool.query(`DELETE FROM users WHERE user_id = ?`, [userId]);
      await logAudit(adminId, "DELETE", "users", userId, { role: userRow.role }, null);

      res.json({ message: "User deleted" });
    } catch (error) {
      console.error("DELETE /users/:id error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// POST /api/admin/users/:id/reset-password
// No email infrastructure exists in this codebase -- returns the generated
// temp password in the response for the admin to relay manually.
router.post(
  "/users/:id/reset-password",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const adminId = req.user.userId;

    try {
      const [[userRow]] = await pool.query(`SELECT user_id FROM users WHERE user_id = ?`, [userId]);
      if (!userRow) return res.status(404).json({ error: "User not found" });

      const tempPassword = crypto.randomBytes(9).toString("base64url");
      const hashed = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        `UPDATE users SET password = ?, failed_login_attempts = 0, locked_until = NULL WHERE user_id = ?`,
        [hashed, userId],
      );
      await logAudit(adminId, "UPDATE", "users", userId, null, { action: "password_reset" });

      res.json({ message: "Temporary password generated", tempPassword });
    } catch (error) {
      console.error("POST /users/:id/reset-password error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/notifications
router.get(
  "/notifications",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await notificationsController.getNotifications(req.user.userId, {
        type: req.query.type,
        page: req.query.page,
      });
      res.json(result);
    } catch (error) {
      console.error("GET /notifications error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/notifications/:id/read
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  authorizeRoles("admin"),
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
      console.error("PATCH /notifications/:id/read error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

// PATCH /api/admin/notifications/read-all
router.patch(
  "/notifications/read-all",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      await notificationsController.markAllNotificationsRead(req.user.userId);
      res.json({ message: "All marked as read" });
    } catch (error) {
      console.error("PATCH /notifications/read-all error:", error);
      res.status(500).json({ message: "Internal server error", dev_error: error.message });
    }
  },
);

module.exports = router;
