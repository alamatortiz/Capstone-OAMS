const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const {
  getManilaDateString,
  getManilaTimeString,
  formatTime12h: formatTime,
} = require("../utils/dateTime");
const { voidQueueEntry, emitVoidEvents } = require("../jobs/queueNoShowSweeper");
const { settleSlotAfterEntryChange, isValidSlotId } = require("../utils/queueSlotSettlement");
const { createNotification } = require("../utils/notifications");
const { notifyAlmostUp } = require("../utils/queuePositionNudge");
const { queueOrderBy } = require("../utils/queueDisplay");
const { sendServerError } = require("../utils/errorResponse");
const { logAudit } = require("../utils/auditLog");
const {
  resolveHostContext,
  getHostableSlotOrRespond,
  getHostableServices,
  canFacultyHostService,
} = require("../utils/queueHosting");
const { issueSlotToken, revokeSlotTokens } = require("../utils/queueJoinToken");
const { STRIKE_LIMIT } = require("../utils/queueStrikes");
const { PRIORITY_CREDIT_DAYS } = require("../utils/queuePriorityCredits");

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE HOSTING
//
// Extracted verbatim from adminRoutes.js so the identical handlers can be
// mounted under more than one prefix: today `/api/admin/queue-hosting/*` (via
// router.use() in adminRoutes.js), and `/api/faculty/queue-hosting/*` once a
// secretary can delegate a service to a faculty member. Forking ~1100 lines
// per role would guarantee the two drift apart.
//
// Every route still declares authorizeRoles("admin", "faculty") -- the faculty mount and
// the host-aware ownership checks land in a later stage, deliberately keeping
// this step behaviour-neutral.
// ─────────────────────────────────────────────────────────────────────────────

// GET /queue-hosting/services
// Services this host may open a queue for: an admin's whole department, or
// for a faculty member only the services delegated to them.
router.get(
  "/queue-hosting/services",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    try {
      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        return res
          .status(403)
          .json({ error: "Your account has no department assigned" });
      }

      const services = await getHostableServices(host);
      res.json({ services });
    } catch (error) {
      sendServerError(res, error, "Queue hosting services error:");
    }
  },
);

// GET /api/admin/queue-hosting
// Today's queue_slots for the admin's department, plus yesterday's so a
// closed/expired line from the previous day is still there to "Host Again"
// or "Reopen" right after the calendar rolls over -- see slot_date's own
// comment for why status alone can't scope this. Frontend buckets these
// into active/paused/closed, and only counts isToday rows in its summary
// stats so yesterday's carryover doesn't inflate "today's" numbers.
router.get(
  "/queue-hosting",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    try {
      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      if (!deptId) {
        return res
          .status(403)
          .json({ error: "Admin has no department assigned" });
      }

      const today = getManilaDateString();
      const yesterday = getManilaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      // 3-day window (today + 2 back) so a Friday-hosted queue stays visible
      // through the weekend and into Monday, rather than vanishing Saturday.
      const twoDaysAgo = getManilaDateString(new Date(Date.now() - 48 * 60 * 60 * 1000));

      const [slots] = await pool.query(
        `SELECT
           qs.slot_id,
           qs.slot_date,
           qs.service_id,
           qs.is_universal,
           qs.max_capacity,
           qs.no_show_timeout_minutes,
           qs.start_time,
           qs.end_time,
           qs.status,
           qs.created_at,
           CASE WHEN qs.is_universal THEN 'Universal Service Queue' ELSE s.service_name END AS service_name,
           d.department_name,
           d.department_abbreviation,
           d.office_location,
           l.location_name,
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
             SELECT CONCAT(st3c.first_name, ' ', st3c.last_name)
             FROM queues q3c
             JOIN students st3c ON q3c.student_id = st3c.student_id
             WHERE q3c.slot_id = qs.slot_id AND q3c.status = 'serving'
             ORDER BY q3c.called_at DESC
             LIMIT 1
           ) AS currently_serving_student_name,
           (
             SELECT q3b.arrived_at
             FROM queues q3b
             WHERE q3b.slot_id = qs.slot_id AND q3b.status = 'serving'
             ORDER BY q3b.called_at DESC
             LIMIT 1
           ) AS currently_serving_arrived_at,
           qs.service_time_minutes AS avg_service_minutes
         FROM queue_slots qs
         LEFT JOIN services s ON qs.service_id = s.service_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         JOIN departments d ON qs.department_id = d.department_id
         WHERE qs.department_id = ?
           ${host.role === "faculty" ? "AND qs.host_user_id = ?" : ""}
           AND qs.slot_date IN (?, ?, ?)
         ORDER BY qs.created_at DESC`,
        // A faculty member sees only the lines they are running; an admin
        // sees the whole department's, including faculty-hosted ones.
        host.role === "faculty"
          ? [deptId, host.userId, today, yesterday, twoDaysAgo]
          : [deptId, today, yesterday, twoDaysAgo],
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
          serviceId: q.service_id,
          isUniversal: !!q.is_universal,
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
          status: q.status, // 'open' | 'paused' | 'full' | 'expired' | 'completed' | 'closed'
          createdAt: q.created_at,
          slotDate: q.slot_date,
          isToday: getManilaDateString(q.slot_date) === today,
          // The slot's actual service location, not the department's generic
          // office address -- falls back to the department address only for
          // universal-queue slots, which have no single service_id to
          // resolve a specific location from (matches studentRoutes.js).
          location: q.location_name || q.office_location || null,
          currentlyServingStudentNumber:
            q.currently_serving_student_number || null,
          currentlyServingStudentName: q.currently_serving_student_name || null,
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
      sendServerError(res, error, "Queue hosting fetch error:");
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
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const hostId = req.user.userId;
    const { serviceId, maxCapacity, noShowTimeoutMinutes, serviceTimeMinutes } = req.body;
    let { startTime, endTime } = req.body;
    const hostAllServices = req.body.hostAllServices === true;

    if ((!hostAllServices && !serviceId) || !maxCapacity || !startTime || !endTime || !serviceTimeMinutes) {
      return res.status(400).json({
        error: "serviceId (unless hostAllServices), maxCapacity, startTime, endTime, and serviceTimeMinutes are required",
      });
    }
    // Times must be HH:MM or HH:MM:SS (24h); normalize to HH:MM:SS so string
    // comparison against getManilaTimeString() is valid.
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    if (typeof startTime !== "string" || typeof endTime !== "string" || !TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return res.status(400).json({ error: "startTime and endTime must be valid HH:MM times" });
    }
    if (startTime.length === 5) startTime += ":00";
    if (endTime.length === 5) endTime += ":00";
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
    // A start time already in the past is rejected, with a 30-minute grace so
    // the form's default ("now" at modal-open) still works after the admin
    // fills in the other fields.
    {
      const [nh, nm] = getManilaTimeString().split(":").map(Number);
      const [sh, sm] = startTime.split(":").map(Number);
      if (sh * 60 + sm < nh * 60 + nm - 30) {
        return res.status(400).json({
          error: "Start time has already passed — choose a start time that is now or later",
        });
      }
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

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      if (!deptId) {
        await conn.rollback();
        return res
          .status(403)
          .json({ error: "Your account has no department assigned" });
      }

      // A Universal Service Queue spans every service in the department, so
      // it is the secretary's to run -- a faculty member's authority comes
      // from a delegation on one specific service.
      if (hostAllServices && host.role === "faculty") {
        await conn.rollback();
        return res.status(403).json({
          error: "Only the college office can host a Universal Service Queue.",
        });
      }
      if (!hostAllServices && host.role === "faculty") {
        const allowed = await canFacultyHostService(conn, {
          facultyId: host.userId,
          serviceId: parseInt(serviceId, 10),
        });
        if (!allowed) {
          await conn.rollback();
          return res.status(403).json({
            error: "This service hasn't been assigned to you by the college office.",
          });
        }
      }

      const today = getManilaDateString();
      let service = null;

      if (hostAllServices) {
        // The dept must own at least one service to have anything to cover.
        const [[hasSvc]] = await conn.query(
          `SELECT 1 AS ok FROM services WHERE department_id = ? LIMIT 1`,
          [deptId],
        );
        if (!hasSvc) {
          await conn.rollback();
          return res.status(400).json({ error: "Your department has no services to host a universal queue for." });
        }
        // Only one live universal queue per department at a time. An expired /
        // completed / closed universal counts as done.
        const [[liveUni]] = await conn.query(
          `SELECT 1 FROM queue_slots
           WHERE is_universal = TRUE AND department_id = ? AND slot_date = ?
             AND status IN ('open', 'paused', 'full')
           LIMIT 1`,
          [deptId, today],
        );
        if (liveUni) {
          await conn.rollback();
          return res.status(409).json({
            error: "A Universal Service Queue is already running for your department.",
          });
        }
        // Symmetric to the single-service check below, and scoped to this
        // HOST: they can't run a universal queue on top of their own
        // single-service one. Someone else's concurrent queue is fine.
        const [[svcOverlap]] = await conn.query(
          `SELECT slot_id FROM queue_slots
           WHERE host_user_id = ? AND is_universal = FALSE AND slot_date = ?
             AND status IN ('open', 'paused', 'full')
             AND start_time < ? AND end_time > ?
           LIMIT 1`,
          [hostId, today, endTime, startTime],
        );
        if (svcOverlap) {
          await conn.rollback();
          return res.status(409).json({
            error: "You're already hosting a queue in this window — close it first, or pick a different time.",
          });
        }
      } else {
        // Hosting is restricted to the service's own owning department, even if
        // it's cross-college (is_cross_college only controls who can JOIN it).
        // Locking this row serializes near-simultaneous requests for it.
        [[service]] = await conn.query(
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

        // The overlap constraint is on the PERSON, not the service.
        //
        // One host can't staff two counters at the same time, so a second
        // overlapping window for the same host is rejected. But two
        // different hosts running at once is normal and now allowed --
        // e.g. the secretary runs Enrollment at the counter while a
        // delegated faculty member runs their own line from their room,
        // or two staff open parallel windows for the SAME busy service.
        //
        // (Previously this keyed on service_id, which blocked that second
        // case even though two separate people were available to serve it.)
        const [[overlap]] = await conn.query(
          `SELECT slot_id FROM queue_slots
           WHERE host_user_id = ? AND slot_date = ?
             AND status IN ('open', 'paused', 'full', 'expired')
             AND start_time < ? AND end_time > ?
           LIMIT 1`,
          [hostId, today, endTime, startTime],
        );
        if (overlap) {
          await conn.rollback();
          return res.status(409).json({
            error:
              "You're already hosting a queue in this time window. Close it first, or pick a different time.",
          });
        }

        // Same person-based rule against their OWN universal queue: a host
        // running the catch-all can't simultaneously run a single-service
        // line. Another host may, though -- a faculty member's delegated
        // queue running alongside the office's universal one is a normal
        // arrangement, not a conflict.
        const [[uniOverlap]] = await conn.query(
          `SELECT slot_id FROM queue_slots
           WHERE is_universal = TRUE AND host_user_id = ? AND slot_date = ?
             AND status IN ('open', 'paused', 'full')
             AND start_time < ? AND end_time > ?
           LIMIT 1`,
          [hostId, today, endTime, startTime],
        );
        if (uniOverlap) {
          await conn.rollback();
          return res.status(409).json({
            error: "You're running a Universal Service Queue in this window — close it first, or pick a different time.",
          });
        }
      }

      const queueTypeLabel = hostAllServices ? "Universal Service Queue" : service.service_name;

      const [result] = await conn.query(
        // admin_id = who configured the window, host_user_id = who is running
        // it. For an admin they're the same person. For a faculty member
        // opening their own delegated queue there is no configuring admin,
        // so admin_id is NULL and host_role records which table to read the
        // host's name from.
        `INSERT INTO queue_slots
           (service_id, department_id, is_universal, admin_id, host_user_id, host_role,
            slot_date, start_time, end_time,
            max_capacity, no_show_timeout_minutes, service_time_minutes, current_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'open')`,
        [
          hostAllServices ? null : serviceId,
          deptId,
          hostAllServices,
          host.role === "admin" ? hostId : null,
          hostId,
          host.role,
          today,
          startTime,
          endTime,
          capacityNum,
          noShowTimeoutNum,
          serviceTimeNum,
        ],
      );

      await conn.commit();

      emitToDept(deptId, "queue:slot-opened", {
        slotId: result.insertId,
        serviceId: hostAllServices ? null : serviceId,
        queueType: queueTypeLabel,
        maxCapacity: capacityNum,
        status: "open",
        serviceHours: { start: startTime, end: endTime },
      });

      res.status(201).json({
        message: "Queue line opened successfully",
        queue: {
          id: result.insertId,
          queueType: queueTypeLabel,
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
      sendServerError(res, error, "Open queue error:");
    } finally {
      conn.release();
    }
  },
);

// POST /api/admin/queue-hosting/:slotId/qr-token
// Issues the rotating on-site join code for this queue. The host's screen
// calls this on an interval (see rotateAfterMs in the response) and renders
// the returned token as a QR; students scan it to join.
//
// Deliberately a POST, not a GET: each call mints a credential and revokes
// the previous one, so it must never be cached, prefetched or replayed by a
// browser. The raw token is returned exactly once, here -- only its hash is
// stored, so it cannot be read back out of the database later.
router.post(
  "/queue-hosting/:slotId/qr-token",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const hostId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;

      // Only a live queue may mint codes. A paused or closed queue handing
      // out working codes would let students join something that isn't
      // accepting them, and the join would then fail confusingly at the
      // counter rather than on screen.
      if (slot.status !== "open") {
        await conn.rollback();
        return res.status(409).json({
          error: "Only an open queue can show a join code",
          slotStatus: slot.status,
        });
      }

      const issued = await issueSlotToken(conn, { slotId, issuedBy: hostId });
      await conn.commit();

      res.json({
        token: issued.token,
        expiresAt: issued.expiresAt,
        rotateAfterMs: issued.rotateAfterMs,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Issue queue join token error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/pause
// If a student is currently 'serving' when the queue pauses, their call is
// reverted (back to 'waiting', called_at cleared) rather than left dangling
// -- since neither created_at nor priority_rank changes, they naturally land
// back at the front (the position subquery counts 'waiting' rows at or before
// them in the canonical order -- see queueDisplay.js).
router.patch(
  "/queue-hosting/:slotId/pause",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to pause a queue" });
    }
    const hostId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;
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
          [serving.queue_id, hostId],
        );
      }

      await conn.query(
        `UPDATE queue_slots SET status = 'paused', pause_reason = ? WHERE slot_id = ?`,
        [reason, slotId],
      );

      // Kill any code still displayed on the host's screen -- a paused queue
      // must stop accepting scans the moment it pauses, not when the current
      // token happens to age out.
      await revokeSlotTokens(conn, slotId);

      await conn.commit();

      await logAudit(hostId, "UPDATE", "queue_slots", slotId, { status: "open" }, { status: "paused", reason });

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "paused", reason });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "paused", reason });
      if (serving) {
        const uncalledPayload = { slotId, queueId: serving.queue_id, studentId: serving.student_id };
        emitToSlot(slotId, "queue:uncalled", uncalledPayload);
        emitToUser(serving.student_id, "queue:uncalled", uncalledPayload);
        createNotification(
          serving.student_id,
          `The ${slot.service_name} queue was paused while you were being served. You've been moved back to waiting.`,
          "queue",
        );
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
      sendServerError(res, error, "Pause queue error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/resume
router.patch(
  "/queue-hosting/:slotId/resume",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const hostId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;
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

      await logAudit(hostId, "UPDATE", "queue_slots", slotId, { status: "paused" }, { status: "open" });

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "open" });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "open" });
      res.json({ message: "Queue resumed", slotId, status: "open" });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Resume queue error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/reopen
// Genuine same-slot reopen for a queue whose hours ran out (queueExpirySweeper.js
// flips it to 'expired') -- unlike "Host Again" (which just clones the slot's
// config into a brand-new slot_id, abandoning any students still attached),
// this resumes the EXACT same slot_id so its existing waiting/serving `queues`
// rows stay intact, and the slot becomes joinable by new students again.
// Only valid from 'expired' -- a completed/closed slot has already settled
// (its remaining students were force-cancelled or served out) and isn't a
// candidate for this same-slot resume.
router.patch(
  "/queue-hosting/:slotId/reopen",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const hostId = req.user.userId;
    const { endTime, maxCapacity, noShowTimeoutMinutes, serviceTimeMinutes } = req.body ?? {};

    if (!endTime) {
      return res.status(400).json({ error: "A new end time is required to reopen this queue" });
    }
    const normalizedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
    const nowTime = getManilaTimeString();
    if (normalizedEndTime <= nowTime) {
      return res.status(400).json({ error: "The new end time must be later than the current time" });
    }
    if (maxCapacity !== undefined && (isNaN(maxCapacity) || Number(maxCapacity) < 1)) {
      return res.status(400).json({ error: "Max capacity must be a positive number" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;
      if (slot.status !== "expired") {
        await conn.rollback();
        return res
          .status(409)
          .json({ error: "Only an expired queue can be reopened this way" });
      }
      // Reopening a universal slot mustn't create a second live universal queue.
      if (slot.is_universal) {
        const [[otherUni]] = await conn.query(
          `SELECT 1 FROM queue_slots
           WHERE is_universal = TRUE AND department_id = ? AND slot_id != ?
             AND slot_date = ? AND status IN ('open', 'paused', 'full')
           LIMIT 1`,
          [deptId, slotId, getManilaDateString()],
        );
        if (otherUni) {
          await conn.rollback();
          return res.status(409).json({
            error: "Another Universal Service Queue is already running for your department.",
          });
        }
      }

      // Bump slot_date to today when reopening a slot carried over from a
      // previous day -- every student-facing query (join, available slots,
      // etc.) scopes strictly on slot_date = today, so without this a
      // reopened stale-dated slot would show as "open" to the admin here
      // but be invisible and unjoinable for students.
      const setClauses = ["status = 'open'", "end_time = ?", "close_reason = NULL", "slot_date = ?"];
      const values = [normalizedEndTime, getManilaDateString()];
      if (maxCapacity !== undefined) {
        setClauses.push("max_capacity = ?");
        values.push(Number(maxCapacity));
      }
      if (noShowTimeoutMinutes !== undefined) {
        setClauses.push("no_show_timeout_minutes = ?");
        values.push(Number(noShowTimeoutMinutes));
      }
      if (serviceTimeMinutes !== undefined) {
        setClauses.push("service_time_minutes = ?");
        values.push(Number(serviceTimeMinutes));
      }
      values.push(slotId);

      await conn.query(
        `UPDATE queue_slots SET ${setClauses.join(", ")} WHERE slot_id = ? AND status = 'expired'`,
        values,
      );

      await conn.commit();

      await logAudit(hostId, "UPDATE", "queue_slots", slotId, { status: "expired" }, { status: "open", endTime: normalizedEndTime });

      emitToSlot(slotId, "queue:slot-status", { slotId, status: "open" });
      emitToDept(deptId, "queue:slot-status", { slotId, status: "open" });
      res.json({ message: "Queue reopened", slotId, status: "open", endTime: normalizedEndTime });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Reopen queue error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/admin/queue-hosting/:slotId/close
router.patch(
  "/queue-hosting/:slotId/close",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to stop a queue" });
    }
    const hostId = req.user.userId;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;
      if (["closed", "completed"].includes(slot.status)) {
        await conn.rollback();
        return res.status(409).json({ error: "This queue is already closed" });
      }

      // Every student still waiting or being served has their entry force-
      // cancelled with the admin's reason — otherwise these rows would be
      // orphaned in the DB forever (see queueNoShowSweeper.js for the
      // analogous no-show cleanup path).
      const [affected] = await conn.query(
        `SELECT queue_id, student_id, status, service_id FROM queues
         WHERE slot_id = ? AND status IN ('waiting', 'serving')`,
        [slotId],
      );

      const [[servedRow]] = await conn.query(
        `SELECT COUNT(*) AS n FROM queues WHERE slot_id = ? AND status = 'completed'`,
        [slotId],
      );

      // Completed only when nobody's currently waiting AND real service
      // already happened -- a queue that never served anyone stays Closed
      // even if closed early, matching the "zero activity isn't an
      // accomplishment" rule already used elsewhere (the Accomplished-Queues
      // analytics count, the sweeper's zero-activity path). Closed covers
      // every other admin-close: someone still waiting (force-cancelled
      // below), or nobody ever served at all.
      const newStatus = affected.length === 0 && servedRow.n > 0 ? "completed" : "closed";

      for (const entry of affected) {
        await conn.query(
          // cancelled_by distinguishes "the office ran out of time before
          // reaching you" from an ordinary cancellation, mirroring what
          // appointments already do via the sweeper's
          // cancelled_by='system_not_entertained'. Answers the panel's
          // "what happens to the students who weren't catered?".
          `UPDATE queues
              SET status = 'cancelled', cancelled_at = NOW(),
                  admin_reason = ?, cancelled_by = 'system_not_entertained'
            WHERE queue_id = ?`,
          [reason, entry.queue_id],
        );
        await conn.query(
          `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
           VALUES (?, ?, 'cancelled', ?, ?, NOW())`,
          [entry.queue_id, entry.status, hostId, `Queue stopped by admin: ${reason}`],
        );

        // Being failed by the office shouldn't cost them their place next
        // time. The credit is inert -- it reserves nothing and does nothing
        // until they physically come back and scan in again, which is what
        // keeps this from reintroducing the online reservation the panel
        // removed. Unclaimed credits simply expire.
        await conn.query(
          `INSERT INTO queue_priority_credits
             (student_id, service_id, source_queue_id, reason, expires_at)
           VALUES (?, ?, ?, ?, NOW() + INTERVAL ? DAY)`,
          [
            entry.student_id,
            entry.service_id,
            entry.queue_id,
            "Queue closed before you were served",
            PRIORITY_CREDIT_DAYS,
          ],
        );
      }

      await conn.query(
        // A closed queue must stop accepting scans immediately (see the
        // matching revokeSlotTokens call on pause).
        `UPDATE queue_slots SET status = ?, close_reason = ? WHERE slot_id = ?`,
        [newStatus, reason, slotId],
      );
      await revokeSlotTokens(conn, slotId);

      await conn.commit();

      await logAudit(hostId, "UPDATE", "queue_slots", slotId, { status: slot.status }, { status: newStatus, reason, cancelledCount: affected.length });

      emitToSlot(slotId, "queue:slot-status", { slotId, status: newStatus, reason });
      emitToDept(deptId, "queue:slot-status", { slotId, status: newStatus, reason });
      for (const entry of affected) {
        const stoppedPayload = { slotId, queueId: entry.queue_id, studentId: entry.student_id, reason };
        emitToUser(entry.student_id, "queue:queue-stopped", stoppedPayload);
        // Tell them about the credit in the same breath as the bad news --
        // "you weren't served" lands very differently alongside "and you go
        // first next time".
        createNotification(
          entry.student_id,
          `The ${slot.service_name} queue closed before you were served (${reason}). ` +
            `Next time you scan in for it within ${PRIORITY_CREDIT_DAYS} days, you'll be placed at the front of the line.`,
          "queue",
        );
      }

      res.json({
        message: newStatus === "completed" ? "Queue marked complete" : "Queue closed",
        slotId,
        status: newStatus,
        reason,
        cancelledCount: affected.length,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Close queue error:");
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
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;
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
        `SELECT q.queue_id, q.student_id, s.service_name, l.location_name
         FROM queues q
         JOIN services s ON q.service_id = s.service_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         WHERE q.slot_id = ? AND q.status = 'waiting'
         ORDER BY ${queueOrderBy("q")}
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
      const calledLocationPart = next.location_name ? ` at ${next.location_name}` : "";
      // createNotification() below also fires the mobile Expo push (with
      // sound) and the browser web push for this event -- no separate
      // sendPushNotification() call needed here anymore, since that would
      // double-send. See notifications.js for the shared push hook.
      createNotification(
        next.student_id,
        `You've been called for ${next.service_name}! Please proceed${calledLocationPart}.`,
        "queue",
      );

      // The line just advanced -- nudge whoever's now #2/#3. Best-effort.
      try {
        await notifyAlmostUp(slotId);
      } catch (nudgeErr) {
        console.error("[call-next] almost-up nudge failed:", nudgeErr.message);
      }

      res.json({ message: "Next student called", queueId: next.queue_id });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Call next error:");
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
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;

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
      sendServerError(res, error, "Mark arrived error:");
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
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;

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
      createNotification(serving.student_id, `Your ${slot.service_name} service has been completed.`, "queue");

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
      sendServerError(res, error, "Mark as served error:");
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
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    const hostId = req.user.userId;
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to skip a student" });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      const slot = await getHostableSlotOrRespond(conn, res, { slotId, host });
      if (!slot) return;

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
        changedBy: hostId,
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
          serviceName: slot.service_name,
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
      sendServerError(res, error, "Skip student error:");
    } finally {
      conn.release();
    }
  },
);

// GET /api/admin/queue-hosting/:slotId/entries
// Returns all queue entries (students) for a specific slot, scoped to admin's department.
router.get(
  "/queue-hosting/:slotId/entries",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const slotId = parseInt(req.params.slotId, 10);
    // A non-numeric path segment parses to NaN, which mysql2 renders as a
    // bare `NaN` token that MySQL reads as a column name -- see isValidSlotId.
    if (!isValidSlotId(slotId)) {
      return res.status(404).json({ error: "Queue slot not found or not in your department" });
    }
    try {
      const host = await resolveHostContext(req.user);
      const deptId = host.deptId;
      if (!deptId) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      // Faculty see entries only for the line they're hosting; admins for
      // anything in their department. Same split as the mutation routes'
      // getHostableSlotOrRespond, applied inline because this read doesn't
      // need the row lock that helper takes.
      const [[slot]] = await pool.query(
        `SELECT qs.slot_id FROM queue_slots qs
         WHERE qs.slot_id = ? AND qs.department_id = ?
           ${host.role === "faculty" ? "AND qs.host_user_id = ?" : ""}`,
        host.role === "faculty" ? [slotId, deptId, host.userId] : [slotId, deptId],
      );
      if (!slot) {
        return res.status(404).json({ error: "Queue slot not found or not in your department" });
      }

      const [[deptRow]] = await pool.query(
        `SELECT department_abbreviation FROM departments WHERE department_id = ?`,
        [deptId],
      );
      const deptAbbrev = deptRow?.department_abbreviation ?? "";

      const [rows] = await pool.query(
        `SELECT
           q.queue_id,
           q.queue_number,
           q.status,
           q.notes,
           q.created_at,
           q.arrived_at,
           q.priority_rank,
           q.transferred_from_slot_id,
           COALESCE(q.service_label_snapshot, s.service_name) AS service_label,
           l.location_name AS service_location,
           CONCAT(st.first_name, ' ', st.last_name) AS student_name,
           st.student_number
         FROM queues q
         JOIN students st ON q.student_id = st.student_id
         LEFT JOIN services s ON q.service_id = s.service_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         WHERE q.slot_id = ?
         ORDER BY ${queueOrderBy("q")}`,
        [slotId],
      );

      // Pre-processing checklist per entry, so the host can see at a glance
      // whether the next student actually has their documents. Fetched as
      // one grouped query rather than per-entry to keep this O(1) round
      // trips regardless of queue length.
      const queueIds = rows.map((r) => r.queue_id);
      const checksByQueue = new Map();
      if (queueIds.length > 0) {
        const [checkRows] = await pool.query(
          `SELECT q.queue_id, r.requirement_id, r.requirement_name, r.is_mandatory,
                  COALESCE(c.is_checked, 0) AS is_checked
             FROM queues q
             JOIN service_requirements r ON r.service_id = q.service_id
             LEFT JOIN queue_requirement_checks c
               ON c.requirement_id = r.requirement_id AND c.queue_id = q.queue_id
            WHERE q.queue_id IN (?)
            ORDER BY r.is_mandatory DESC, r.requirement_name`,
          [queueIds],
        );
        for (const c of checkRows) {
          if (!checksByQueue.has(c.queue_id)) checksByQueue.set(c.queue_id, []);
          checksByQueue.get(c.queue_id).push({
            requirementId: c.requirement_id,
            name: c.requirement_name,
            isMandatory: !!c.is_mandatory,
            isChecked: !!c.is_checked,
          });
        }
      }

      const entries = rows.map((r) => {
        const requirements = checksByQueue.get(r.queue_id) ?? [];
        const mandatory = requirements.filter((x) => x.isMandatory);
        return {
          queueId: r.queue_id,
          queueNumber: `${deptAbbrev}-${String(r.queue_number).padStart(3, "0")}`,
          studentName: r.student_name,
          studentId: r.student_number,
          service: r.service_label || null,
          location: r.service_location || null,
          concern: r.notes || "No concern specified",
          joinedAt: formatTime(getManilaTimeString(r.created_at)),
          status: r.status,
          arrivedAt: r.arrived_at,
          // Badges the host screen uses to explain an out-of-order position.
          isPriority: r.priority_rank > 0,
          wasTransferred: r.transferred_from_slot_id != null,
          requirements,
          // Null (not 0/0) when the service defines no requirements, so the
          // UI can omit the chip entirely rather than imply "nothing ready".
          requirementsReady: mandatory.length
            ? { checked: mandatory.filter((x) => x.isChecked).length, total: mandatory.length }
            : null,
        };
      });

      res.json({ entries });
    } catch (error) {
      sendServerError(res, error, "Queue entries fetch error:");
    }
  },
);

// POST /queue-hosting/:slotId/entries/:queueId/transfer
// Body: { targetSlotId }
//
// The "relay" half of the panel's "queue tracking/relay" note: move someone
// who lined up at the wrong counter into the right queue WITHOUT sending
// them to the back. They keep their original created_at, which under the
// canonical ordering (see utils/queueDisplay.js) lands them in the
// destination at the position their original arrival time earns -- so the
// fix for staff's mistake doesn't cost the student their place.
router.post(
  "/queue-hosting/:slotId/entries/:queueId/transfer",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const hostId = req.user.userId;
    const slotId = parseInt(req.params.slotId, 10);
    const queueId = parseInt(req.params.queueId, 10);
    const targetSlotId = parseInt(req.body?.targetSlotId, 10);

    if (!isValidSlotId(slotId) || !isValidSlotId(targetSlotId) || !Number.isInteger(queueId) || queueId <= 0) {
      return res.status(400).json({ error: "A valid source slot, entry and destination are required" });
    }
    if (slotId === targetSlotId) {
      return res.status(400).json({ error: "That student is already in this queue" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        await conn.rollback();
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      // Lock BOTH slots, always in ascending slot_id order. Two hosts
      // transferring between the same pair in opposite directions would
      // otherwise deadlock; a consistent lock order makes that impossible.
      const [lowId, highId] = slotId < targetSlotId ? [slotId, targetSlotId] : [targetSlotId, slotId];
      const [lockedSlots] = await conn.query(
        `SELECT slot_id, status, department_id, host_user_id, service_id, is_universal,
                max_capacity, end_time
           FROM queue_slots WHERE slot_id IN (?, ?) ORDER BY slot_id FOR UPDATE`,
        [lowId, highId],
      );
      const source = lockedSlots.find((s) => s.slot_id === slotId);
      const target = lockedSlots.find((s) => s.slot_id === targetSlotId);
      if (!source || !target) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue slot not found" });
      }

      // The caller must be able to host the SOURCE (it's their line the
      // student is leaving). The destination only has to be in the same
      // department -- a faculty member must be able to hand a mis-queued
      // student back to the office counter.
      const mayHostSource =
        host.role === "faculty" ? source.host_user_id === host.userId : source.department_id === host.deptId;
      if (!mayHostSource) {
        await conn.rollback();
        return res.status(403).json({ error: "You can only move students out of a queue you are hosting" });
      }
      if (target.department_id !== host.deptId) {
        await conn.rollback();
        return res.status(403).json({ error: "You can only move students within your own department" });
      }
      if (target.status !== "open") {
        await conn.rollback();
        return res.status(409).json({ error: "The destination queue isn't open" });
      }

      // Only a waiting entry. A student already being served is mid-
      // transaction at the counter; moving them would strand that session.
      const [[entry]] = await conn.query(
        `SELECT queue_id, student_id, status, created_at, service_id FROM queues
          WHERE queue_id = ? AND slot_id = ? FOR UPDATE`,
        [queueId, slotId],
      );
      if (!entry) {
        await conn.rollback();
        return res.status(404).json({ error: "Queue entry not found in this queue" });
      }
      if (entry.status !== "waiting") {
        await conn.rollback();
        return res.status(409).json({ error: "Only a student who is still waiting can be moved" });
      }

      // Destination must have room under its own daily cap.
      const [[claimedRow]] = await conn.query(
        `SELECT COUNT(*) AS claimed FROM queues
          WHERE slot_id = ? AND status IN ('waiting', 'serving', 'completed')`,
        [targetSlotId],
      );
      if (claimedRow.claimed >= target.max_capacity) {
        await conn.rollback();
        return res.status(409).json({ error: "The destination queue is already at capacity" });
      }

      // Already in the destination? (They could have scanned into both.)
      const [[dup]] = await conn.query(
        `SELECT queue_id FROM queues
          WHERE student_id = ? AND slot_id = ? AND status IN ('waiting', 'serving') LIMIT 1`,
        [entry.student_id, targetSlotId],
      );
      if (dup) {
        await conn.rollback();
        return res.status(409).json({ error: "That student is already in the destination queue" });
      }

      const [[maxRow]] = await conn.query(
        `SELECT COALESCE(MAX(queue_number), 0) AS n FROM queues WHERE slot_id = ?`,
        [targetSlotId],
      );
      const newNumber = maxRow.n + 1;

      // created_at is deliberately NOT touched -- that's what preserves
      // their place. updated_at is pinned too, so the transactions feed
      // doesn't reorder on what is not a status change.
      await conn.query(
        `UPDATE queues
            SET slot_id = ?, queue_number = ?, service_id = ?,
                transferred_from_slot_id = ?, updated_at = updated_at
          WHERE queue_id = ?`,
        // A Universal Service Queue covers every service, so the student
        // keeps the specific service they were queueing for. A normal
        // destination IS a service, so the entry adopts it.
        // queues.service_id is NOT NULL, and a universal SLOT's service_id
        // is NULL -- so this must never fall back to the slot's own value.
        [targetSlotId, newNumber, target.is_universal ? entry.service_id : target.service_id, slotId, queueId],
      );
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'waiting', 'waiting', ?, ?, NOW())`,
        [queueId, hostId, `Moved from queue #${slotId} to #${targetSlotId} by staff`],
      );

      // The source may now be empty/under capacity.
      const settle = await settleSlotAfterEntryChange(conn, slotId);

      await conn.commit();

      emitToSlot(slotId, "queue:transferred", { queueId, fromSlotId: slotId, toSlotId: targetSlotId });
      emitToSlot(targetSlotId, "queue:transferred", { queueId, fromSlotId: slotId, toSlotId: targetSlotId });
      emitToUser(entry.student_id, "queue:transferred", { queueId, fromSlotId: slotId, toSlotId: targetSlotId });
      emitToDept(host.deptId, "queue:student-joined", { slotId: targetSlotId, queueId });
      if (settle) {
        emitToSlot(slotId, "queue:slot-status", { slotId, status: settle.newStatus });
        emitToDept(host.deptId, "queue:slot-status", { slotId, status: settle.newStatus });
      }
      createNotification(
        entry.student_id,
        "Staff moved you to the correct queue for your concern. You kept your place in line.",
        "queue",
      );

      res.json({ message: "Student moved", queueId, targetSlotId });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Queue transfer error:");
    } finally {
      conn.release();
    }
  },
);

// GET /queue-hosting/:slotId/blocked-students
// Students currently in this queue's department who have hit the no-show
// limit today. Surfaced on the host's screen so they can lift a block for
// someone standing in front of them -- the whole point of an override is
// that a human who can see the student decides.
router.get(
  "/queue-blocked-students",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    try {
      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      // Same derived definition as utils/queueStrikes.js, expressed set-wide:
      // today's no-shows per student, discounting anything already forgiven.
      const [rows] = await pool.query(
        `SELECT st.student_id,
                st.student_number,
                CONCAT(st.first_name, ' ', st.last_name) AS student_name,
                COUNT(*) AS strikes
           FROM queues q
           JOIN students st ON q.student_id = st.student_id
          WHERE q.status = 'no_show'
            AND st.department_id = ?
            AND DATE(CONVERT_TZ(q.completed_at, '+00:00', '+08:00'))
                = DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
            AND q.completed_at > COALESCE((
                  SELECT MAX(o.cleared_at) FROM queue_block_overrides o
                   WHERE o.student_id = st.student_id
                     AND o.block_date = DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00'))
                ), '1970-01-01')
          GROUP BY st.student_id, st.student_number, student_name
         HAVING strikes >= ?
          ORDER BY strikes DESC, student_name`,
        [host.deptId, STRIKE_LIMIT],
      );

      res.json({ students: rows.map((r) => ({ ...r, strikes: Number(r.strikes) })) });
    } catch (error) {
      sendServerError(res, error, "Blocked students fetch error:");
    }
  },
);

// POST /queue-blocked-students/:studentId/clear  Body: { note? }
// Lifts today's no-show block. Recording cleared_at (rather than deleting
// the no-show rows) keeps the history intact AND acts as the watermark that
// stops the forgiven strikes from immediately re-blocking them.
router.post(
  "/queue-blocked-students/:studentId/clear",
  authenticateToken,
  authorizeRoles("admin", "faculty"),
  async (req, res) => {
    const hostId = req.user.userId;
    const studentId = parseInt(req.params.studentId, 10);
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 255) : null;
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    try {
      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      const [[student]] = await pool.query(
        `SELECT student_id FROM students WHERE student_id = ? AND department_id = ?`,
        [studentId, host.deptId],
      );
      if (!student) {
        return res.status(404).json({ error: "Student not found in your department" });
      }

      await pool.query(
        `INSERT INTO queue_block_overrides (student_id, block_date, cleared_by, note)
         VALUES (?, DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00')), ?, ?)`,
        [studentId, hostId, note],
      );

      await logAudit(hostId, "UPDATE", "queue_block_overrides", studentId, { blocked: true }, { blocked: false, note });
      createNotification(
        studentId,
        "A staff member has lifted your queueing restriction. You can join queues again.",
        "queue",
      );
      emitToUser(studentId, "queue:block-cleared", { studentId });

      res.json({ message: "Restriction lifted" });
    } catch (error) {
      sendServerError(res, error, "Clear queue block error:");
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE DELEGATION (admin only)
//
// Who may run which queue. These are mounted on the same router purely for
// cohesion with the hosting routes they govern; the authorizeRoles("admin")
// gate is what keeps them off the faculty mount.
// ─────────────────────────────────────────────────────────────────────────────

// GET /queue-delegations
// Every service in the admin's department with the faculty currently
// delegated to it, so the UI can render the whole matrix in one request.
router.get(
  "/queue-delegations",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      const [rows] = await pool.query(
        `SELECT s.service_id, s.service_name,
                sd.delegation_id, sd.faculty_id, sd.is_active,
                CONCAT(f.first_name, ' ', f.last_name) AS faculty_name
           FROM services s
           LEFT JOIN service_delegations sd
             ON sd.service_id = s.service_id AND sd.is_active = TRUE
           LEFT JOIN faculty f ON f.faculty_id = sd.faculty_id
          WHERE s.department_id = ?
          ORDER BY s.service_name, faculty_name`,
        [host.deptId],
      );

      // Collapse the join into one entry per service.
      const byService = new Map();
      for (const row of rows) {
        if (!byService.has(row.service_id)) {
          byService.set(row.service_id, {
            serviceId: row.service_id,
            serviceName: row.service_name,
            delegates: [],
          });
        }
        if (row.faculty_id) {
          byService.get(row.service_id).delegates.push({
            delegationId: row.delegation_id,
            facultyId: row.faculty_id,
            facultyName: row.faculty_name,
          });
        }
      }

      const [faculty] = await pool.query(
        `SELECT faculty_id, CONCAT(first_name, ' ', last_name) AS faculty_name, position
           FROM faculty WHERE department_id = ? ORDER BY last_name, first_name`,
        [host.deptId],
      );

      res.json({ services: [...byService.values()], faculty });
    } catch (error) {
      sendServerError(res, error, "Fetch queue delegations error:");
    }
  },
);

// POST /queue-delegations  Body: { serviceId, facultyId }
// Hands a service's queue to a faculty member. Re-delegating a previously
// revoked pair flips the existing row active again rather than inserting a
// duplicate, so the record of who first granted it survives.
router.post(
  "/queue-delegations",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;
    const serviceId = parseInt(req.body?.serviceId, 10);
    const facultyId = parseInt(req.body?.facultyId, 10);
    if (!serviceId || !facultyId) {
      return res.status(400).json({ error: "serviceId and facultyId are required" });
    }
    try {
      const host = await resolveHostContext(req.user);
      if (!host.deptId) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }

      // Both sides must belong to this admin's department -- otherwise an
      // admin could hand another college's service to their own faculty.
      const [[svc]] = await pool.query(
        `SELECT 1 AS ok FROM services WHERE service_id = ? AND department_id = ?`,
        [serviceId, host.deptId],
      );
      if (!svc) {
        return res.status(404).json({ error: "Service not found in your department" });
      }
      const [[fac]] = await pool.query(
        `SELECT 1 AS ok FROM faculty WHERE faculty_id = ? AND department_id = ?`,
        [facultyId, host.deptId],
      );
      if (!fac) {
        return res.status(404).json({ error: "Faculty member not found in your department" });
      }

      await pool.query(
        `INSERT INTO service_delegations (service_id, faculty_id, delegated_by, is_active)
         VALUES (?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE is_active = TRUE, revoked_at = NULL, delegated_by = VALUES(delegated_by)`,
        [serviceId, facultyId, adminId],
      );

      await logAudit(adminId, "CREATE", "service_delegations", serviceId, null, { facultyId });
      createNotification(
        facultyId,
        "You can now host the queue for a service assigned by the college office.",
        "queue",
      );

      res.status(201).json({ message: "Service assigned successfully" });
    } catch (error) {
      sendServerError(res, error, "Create queue delegation error:");
    }
  },
);

// DELETE /queue-delegations/:delegationId
// Soft-revoke: the row stays so the history of the assignment is kept, and
// is_active = FALSE immediately removes the service from that faculty
// member's hostable list. Queues they already opened keep running -- pulling
// a live line out from under a host mid-session would strand the students
// standing in it.
router.delete(
  "/queue-delegations/:delegationId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const adminId = req.user.userId;
    const delegationId = parseInt(req.params.delegationId, 10);
    if (!Number.isInteger(delegationId) || delegationId <= 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    try {
      const host = await resolveHostContext(req.user);
      const [[row]] = await pool.query(
        `SELECT sd.delegation_id, sd.faculty_id
           FROM service_delegations sd
           JOIN services s ON sd.service_id = s.service_id
          WHERE sd.delegation_id = ? AND s.department_id = ?`,
        [delegationId, host.deptId],
      );
      if (!row) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      await pool.query(
        `UPDATE service_delegations SET is_active = FALSE, revoked_at = NOW() WHERE delegation_id = ?`,
        [delegationId],
      );
      await logAudit(adminId, "DELETE", "service_delegations", delegationId, { isActive: true }, { isActive: false });

      res.json({ message: "Assignment removed" });
    } catch (error) {
      sendServerError(res, error, "Revoke queue delegation error:");
    }
  },
);

module.exports = router;
