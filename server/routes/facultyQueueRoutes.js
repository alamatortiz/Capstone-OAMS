const express = require("express");
const router = express.Router();
const pool = require("../db");
const { getTxConnection } = require("../utils/txConnection");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const {
  getManilaDateString,
  getManilaTimeString,
  formatTime12h: formatTime,
  manilaDayStartUTC,
  manilaDayEndExclusiveUTC,
} = require("../utils/dateTime");
const { voidQueueEntry, emitVoidEvents } = require("../jobs/queueNoShowSweeper");
const { settleSlotAfterEntryChange } = require("../utils/queueSlotSettlement");
const { createNotification } = require("../utils/notifications");
const { notifyAlmostUp } = require("../utils/queuePositionNudge");
const { queueOrderBy, getQueueDisplayInfo } = require("../utils/queueDisplay");
const { sendServerError } = require("../utils/errorResponse");
const { getHostableServices } = require("../utils/queueHosting");
const { returnEntryToOffice, emitUnservedCancelled } = require("../utils/queueHandoff");

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSOR QUEUE (mounted at /api/professor)
//
// A professor never hosts a queue. The college office passes them individual
// students for services the office assigned them (service_delegations); the
// ticket stays on the office's slot with queues.assigned_faculty_id = them.
// Their "line" is every such ticket, across however many office queues it
// came from, in the canonical order (queueDisplay.js). The office's slot rules
// still apply: its no-show timeout drives the grace period (the no-show
// sweeper reads the ticket's slot), its service time drives ETAs, and a
// no-show counts toward the restriction strikes like any other.
//
// The office's pause/stop deliberately don't block this line: pause stops QR
// joins and the office's own calling, and a stop cancels only the office's
// own line -- students already passed here are this professor's to finish.
//
// Lock order: faculty row -> queue_slots row -> queues row (see
// utils/queueHandoff.js). Locking the professor's own faculty row first also
// serialises their own double-clicks, so they can never be serving two
// students at once. The pick of WHICH ticket is a plain read; the ticket is
// then re-read with a locking read after its slot is locked, because it may
// have been reassigned, pulled back or have left in between.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PICK_ATTEMPTS = 3;

async function lockFaculty(conn, facultyId) {
  const [[faculty]] = await conn.query(
    `SELECT faculty_id, department_id, CONCAT(first_name, ' ', last_name) AS name
       FROM faculty WHERE faculty_id = ? FOR UPDATE`,
    [facultyId],
  );
  return faculty ?? null;
}

async function lockSlot(conn, slotId) {
  const [[slot]] = await conn.query(
    `SELECT slot_id, status, department_id FROM queue_slots WHERE slot_id = ? FOR UPDATE`,
    [slotId],
  );
  return slot ?? null;
}

// Finds this professor's current 'serving' ticket and takes the slot -> ticket
// locks on it. Returns { entry, slot } or null when they aren't serving anyone
// (or it changed underneath us -- the caller answers 404 either way).
async function lockCurrentServing(conn, facultyId, { requireNotArrived = false } = {}) {
  const [[candidate]] = await conn.query(
    `SELECT queue_id, slot_id FROM queues
      WHERE assigned_faculty_id = ? AND status = 'serving'
      ORDER BY called_at DESC LIMIT 1`,
    [facultyId],
  );
  if (!candidate) return null;
  const slot = await lockSlot(conn, candidate.slot_id);
  if (!slot) return null;
  const [[entry]] = await conn.query(
    `SELECT q.queue_id, q.student_id, q.status, q.service_id, q.slot_id,
            COALESCE(q.service_label_snapshot, s.service_name) AS service_name
       FROM queues q
       JOIN services s ON q.service_id = s.service_id
      WHERE q.queue_id = ? AND q.assigned_faculty_id = ? AND q.status = 'serving'
        ${requireNotArrived ? "AND q.arrived_at IS NULL" : ""}
      FOR UPDATE`,
    [candidate.queue_id, facultyId],
  );
  return entry ? { entry, slot } : null;
}

// GET /api/professor/queue
// Everything the professor's Queue page shows in one request.
router.get(
  "/queue",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      const [[faculty]] = await pool.query(
        `SELECT f.department_id, d.department_abbreviation
           FROM faculty f JOIN departments d ON f.department_id = d.department_id
          WHERE f.faculty_id = ?`,
        [facultyId],
      );
      if (!faculty) {
        return res.status(403).json({ error: "Your account has no department assigned" });
      }
      const today = getManilaDateString();

      // Services the office assigned to them, and whether any live office
      // queue covers each right now (its own queue, or a Universal one).
      const services = await getHostableServices({
        role: "faculty",
        userId: facultyId,
        deptId: faculty.department_id,
      });
      const [liveRows] = await pool.query(
        `SELECT service_id, is_universal FROM queue_slots
          WHERE department_id = ? AND slot_date = ? AND status IN ('open', 'paused', 'full')`,
        [faculty.department_id, today],
      );
      const universalLive = liveRows.some((r) => r.is_universal);
      const liveServiceIds = new Set(liveRows.filter((r) => !r.is_universal).map((r) => r.service_id));

      const [rows] = await pool.query(
        `SELECT
           q.queue_id, q.queue_number, q.status, q.notes, q.created_at, q.called_at, q.arrived_at,
           q.assigned_at, q.priority_rank, q.slot_id, q.service_id,
           COALESCE(q.service_label_snapshot, s.service_name) AS service_label,
           s.service_name,
           l.location_name,
           CONCAT(st.first_name, ' ', st.last_name) AS student_name,
           st.student_number,
           CONCAT(ad.first_name, ' ', ad.last_name) AS passed_by_name,
           qs.is_universal,
           qs.status AS slot_status,
           qs.no_show_timeout_minutes,
           qs.service_time_minutes,
           CASE WHEN qs.is_universal THEN 'Universal Service Queue' ELSE s2.service_name END AS from_queue
         FROM queues q
         JOIN students st ON q.student_id = st.student_id
         JOIN services s ON q.service_id = s.service_id
         JOIN queue_slots qs ON q.slot_id = qs.slot_id
         LEFT JOIN services s2 ON qs.service_id = s2.service_id
         LEFT JOIN locations l ON s.location_id = l.location_id
         LEFT JOIN administrators ad ON ad.admin_id = q.assigned_by
         WHERE q.assigned_faculty_id = ? AND q.status IN ('waiting', 'serving')
         ORDER BY (q.status = 'serving') DESC, ${queueOrderBy("q")}`,
        [facultyId],
      );

      // Requirements checklist per ticket, grouped into one query (same shape
      // as the office's entries endpoint).
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

      let waitingPosition = 0;
      const entries = rows.map((r) => {
        const requirements = checksByQueue.get(r.queue_id) ?? [];
        const mandatory = requirements.filter((x) => x.isMandatory);
        if (r.status === "waiting") waitingPosition += 1;
        const serviceCode = r.service_name.split(" ")[0].substring(0, 3).toUpperCase();
        return {
          queueId: r.queue_id,
          queueNumberBadge: `${faculty.department_abbreviation}-${serviceCode}-${String(r.queue_number).padStart(3, "0")}`,
          status: r.status,
          position: r.status === "waiting" ? waitingPosition : null,
          studentName: r.student_name,
          studentNumber: r.student_number,
          service: r.service_label,
          location: r.location_name || null,
          fromQueue: r.from_queue,
          concern: r.notes || "No concern specified",
          joinedAt: formatTime(getManilaTimeString(r.created_at)),
          passedAt: r.assigned_at,
          passedBy: r.passed_by_name || null,
          calledAt: r.called_at,
          arrivedAt: r.arrived_at,
          isPriority: r.priority_rank > 0,
          noShowTimeoutMinutes: r.no_show_timeout_minutes,
          serviceTimeMinutes: r.service_time_minutes,
          estimatedWait:
            r.status === "waiting"
              ? getQueueDisplayInfo({
                  status: r.status,
                  rawPosition: waitingPosition,
                  avgServiceMinutes: r.service_time_minutes,
                }).estimatedWait
              : null,
          requirements,
          requirementsReady: mandatory.length
            ? { checked: mandatory.filter((x) => x.isChecked).length, total: mandatory.length }
            : null,
        };
      });

      const startUTC = manilaDayStartUTC(today);
      const endUTC = manilaDayEndExclusiveUTC(today);
      const [[statRow]] = await pool.query(
        `SELECT
           COALESCE(SUM(status = 'completed'), 0) AS served_today,
           COALESCE(SUM(status = 'no_show'), 0) AS no_show_today
         FROM queues
        WHERE assigned_faculty_id = ? AND status IN ('completed', 'no_show')
          AND completed_at >= ? AND completed_at < ?`,
        [facultyId, startUTC, endUTC],
      );

      res.json({
        services: services.map((s) => ({
          serviceId: s.service_id,
          serviceName: s.service_name,
          location: s.location_name || null,
          isLive: universalLive || liveServiceIds.has(s.service_id),
        })),
        stats: {
          waiting: entries.filter((e) => e.status === "waiting").length,
          servedToday: Number(statRow.served_today),
          noShowToday: Number(statRow.no_show_today),
        },
        current: entries.find((e) => e.status === "serving") ?? null,
        entries: entries.filter((e) => e.status === "waiting"),
      });
    } catch (error) {
      sendServerError(res, error, "Professor queue fetch error:");
    }
  },
);

// PATCH /api/professor/queue/call-next
// Calls the next student in this professor's line. Refused while they're
// still serving someone. Each attempt runs in a fresh transaction so it
// never holds two slot locks at once; a pick that changed underneath us
// (reassigned / pulled back / left) just retries.
router.patch(
  "/queue/call-next",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    try {
      for (let attempt = 1; attempt <= MAX_PICK_ATTEMPTS; attempt += 1) {
        const conn = await getTxConnection();
        let result = null;
        try {
          await conn.beginTransaction();
          const faculty = await lockFaculty(conn, facultyId);
          if (!faculty) {
            await conn.rollback();
            return res.status(403).json({ error: "Faculty account not found" });
          }

          // Plain read on purpose -- a locking read here would lock a queues
          // row before its slot. Safe: only this route moves a ticket into
          // this professor's 'serving', and it holds the faculty lock.
          const [[busy]] = await conn.query(
            `SELECT queue_id FROM queues WHERE assigned_faculty_id = ? AND status = 'serving' LIMIT 1`,
            [facultyId],
          );
          if (busy) {
            await conn.rollback();
            return res.status(409).json({
              error: "You're still serving a student. Mark them as served first.",
            });
          }

          const [[candidate]] = await conn.query(
            `SELECT q.queue_id, q.slot_id FROM queues q
              WHERE q.assigned_faculty_id = ? AND q.status = 'waiting'
              ORDER BY ${queueOrderBy("q")}
              LIMIT 1`,
            [facultyId],
          );
          if (!candidate) {
            await conn.rollback();
            return res.status(404).json({ error: "No students are waiting for you" });
          }

          const slot = await lockSlot(conn, candidate.slot_id);
          const [[next]] = await conn.query(
            `SELECT q.queue_id, q.student_id, s.service_name,
                    COALESCE(q.service_label_snapshot, s.service_name) AS service_label,
                    l.location_name
               FROM queues q
               JOIN services s ON q.service_id = s.service_id
               LEFT JOIN locations l ON s.location_id = l.location_id
              WHERE q.queue_id = ? AND q.assigned_faculty_id = ? AND q.status = 'waiting'
              FOR UPDATE`,
            [candidate.queue_id, facultyId],
          );
          if (!slot || !next) {
            await conn.rollback();
            continue; // changed underneath us -- try the new front of the line
          }

          await conn.query(
            `UPDATE queues SET status = 'serving', called_at = NOW(), arrived_at = NULL
              WHERE queue_id = ? AND status = 'waiting' AND assigned_faculty_id = ?`,
            [next.queue_id, facultyId],
          );
          await conn.query(
            `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
             VALUES (?, 'waiting', 'serving', ?, ?, NOW())`,
            [next.queue_id, facultyId, `Called by ${faculty.name}`],
          );
          await conn.commit();
          // Hand the connection back now -- see utils/txConnection.js.
          conn.release();
          result = { next, slot, faculty };
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        if (!result) continue;
        const { next, slot, faculty } = result;
        const calledPayload = {
          slotId: slot.slot_id,
          queueId: next.queue_id,
          studentId: next.student_id,
          facultyId,
          calledAt: new Date().toISOString(),
        };
        emitToSlot(slot.slot_id, "queue:called", calledPayload);
        emitToUser(next.student_id, "queue:called", calledPayload);
        emitToDept(slot.department_id, "queue:called", calledPayload);
        emitToUser(facultyId, "queue:called", calledPayload);
        const locationPart = next.location_name ? ` to ${next.location_name}` : "";
        createNotification(
          next.student_id,
          `${faculty.name} is ready for you for ${next.service_label}. Please proceed${locationPart}.`,
          "queue",
        );
        try {
          await notifyAlmostUp({ facultyId });
        } catch (nudgeErr) {
          console.error("[professor call-next] almost-up nudge failed:", nudgeErr.message);
        }
        return res.json({ message: "Next student called", queueId: next.queue_id });
      }

      return res.status(409).json({ error: "Your line just changed. Please try again." });
    } catch (error) {
      sendServerError(res, error, "Professor call next error:");
    }
  },
);

// PATCH /api/professor/queue/mark-arrived
// The called student is physically here: stamps arrived_at, which stops the
// office queue's no-show grace clock for them (queueNoShowSweeper.js).
router.patch(
  "/queue/mark-arrived",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const conn = await getTxConnection();
    try {
      await conn.beginTransaction();
      const faculty = await lockFaculty(conn, facultyId);
      const locked = faculty && (await lockCurrentServing(conn, facultyId, { requireNotArrived: true }));
      if (!locked) {
        await conn.rollback();
        return res.status(404).json({ error: "No called student is awaiting arrival" });
      }
      const { entry, slot } = locked;

      await conn.query(
        `UPDATE queues SET arrived_at = NOW() WHERE queue_id = ? AND status = 'serving' AND arrived_at IS NULL`,
        [entry.queue_id],
      );
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'serving', 'serving', ?, ?, NOW())`,
        [entry.queue_id, facultyId, `Marked as arrived by ${faculty.name}`],
      );
      await conn.commit();
      // Hand the connection back now -- see utils/txConnection.js.
      conn.release();

      const payload = { slotId: slot.slot_id, queueId: entry.queue_id, studentId: entry.student_id, facultyId };
      emitToSlot(slot.slot_id, "queue:arrived", payload);
      emitToUser(entry.student_id, "queue:arrived", payload);
      emitToDept(slot.department_id, "queue:arrived", payload);
      emitToUser(facultyId, "queue:arrived", payload);
      res.json({ message: "Student marked as arrived", queueId: entry.queue_id });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Professor mark arrived error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/professor/queue/serve
// Finishes the current student. Counts as served on the office's queue (the
// ticket never left its slot), and the transaction records show this
// professor as the one who handled it (queue_status_logs.changed_by).
router.patch(
  "/queue/serve",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const conn = await getTxConnection();
    try {
      await conn.beginTransaction();
      const faculty = await lockFaculty(conn, facultyId);
      const locked = faculty && (await lockCurrentServing(conn, facultyId));
      if (!locked) {
        await conn.rollback();
        return res.status(404).json({ error: "You aren't serving a student right now" });
      }
      const { entry, slot } = locked;

      await conn.query(
        `UPDATE queues SET status = 'completed', completed_at = NOW() WHERE queue_id = ? AND status = 'serving'`,
        [entry.queue_id],
      );
      await conn.query(
        `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'serving', 'completed', ?, ?, NOW())`,
        [entry.queue_id, facultyId, `Marked as served by ${faculty.name}`],
      );
      // Never frees a seat, but may be the last unserved ticket on a
      // full/expired/closed office slot.
      const settleResult = await settleSlotAfterEntryChange(conn, slot.slot_id);
      await conn.commit();
      // Hand the connection back now -- see utils/txConnection.js.
      conn.release();

      const servedPayload = {
        slotId: slot.slot_id,
        queueId: entry.queue_id,
        studentId: entry.student_id,
        facultyId,
        completedAt: new Date().toISOString(),
      };
      emitToSlot(slot.slot_id, "queue:served", servedPayload);
      emitToUser(entry.student_id, "queue:served", servedPayload);
      emitToDept(slot.department_id, "queue:served", servedPayload);
      emitToUser(facultyId, "queue:served", servedPayload);
      createNotification(entry.student_id, `Your ${entry.service_name} service has been completed.`, "queue");
      if (settleResult) {
        const settledPayload = { slotId: slot.slot_id, status: settleResult.newStatus };
        emitToSlot(slot.slot_id, "queue:slot-status", settledPayload);
        emitToDept(slot.department_id, "queue:slot-status", settledPayload);
      }
      res.json({ message: "Student marked as served", queueId: entry.queue_id });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Professor serve error:");
    } finally {
      conn.release();
    }
  },
);

// PATCH /api/professor/queue/skip   Body: { reason }
// Voids the current student as a no-show -- same path as the office's skip
// and the automatic grace-period timeout, so it frees their seat on the
// office's queue and counts toward their no-show restriction strikes.
router.patch(
  "/queue/skip",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const reason = (req.body?.reason ?? "").trim();
    if (!reason) {
      return res.status(400).json({ error: "A reason is required to skip a student" });
    }
    const conn = await getTxConnection();
    try {
      await conn.beginTransaction();
      const faculty = await lockFaculty(conn, facultyId);
      const locked = faculty && (await lockCurrentServing(conn, facultyId));
      if (!locked) {
        await conn.rollback();
        return res.status(404).json({ error: "You aren't serving a student right now" });
      }
      const { entry, slot } = locked;

      const result = await voidQueueEntry(conn, {
        queueId: entry.queue_id,
        slotId: slot.slot_id,
        changedBy: facultyId,
        note: `Manually voided by ${faculty.name} (skipped): ${reason}`,
      });
      await conn.commit();
      // Hand the connection back now -- see utils/txConnection.js.
      conn.release();

      if (result.voided) {
        emitVoidEvents({
          slotId: slot.slot_id,
          queueId: entry.queue_id,
          studentId: entry.student_id,
          deptId: slot.department_id,
          settleResult: result.settleResult,
          serviceName: entry.service_name,
        });
        emitToUser(facultyId, "queue:no-show", {
          slotId: slot.slot_id,
          queueId: entry.queue_id,
          studentId: entry.student_id,
          facultyId,
        });
      }
      res.json({
        message: result.voided
          ? "Student skipped and marked as no-show"
          : "That student's status had already changed",
        queueId: entry.queue_id,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Professor skip error:");
    } finally {
      conn.release();
    }
  },
);

// POST /api/professor/queue/entries/:queueId/return
// Hands a still-waiting student back to the office line (e.g. passed to the
// wrong person). They keep their original place. If the office has already
// stopped that queue there's no line to return to, so the ticket is
// cancelled with a priority credit instead -- never a no-show strike.
router.post(
  "/queue/entries/:queueId/return",
  authenticateToken,
  authorizeRoles("faculty"),
  async (req, res) => {
    const facultyId = req.user.userId;
    const queueId = parseInt(req.params.queueId, 10);
    if (!Number.isInteger(queueId) || queueId <= 0) {
      return res.status(404).json({ error: "Student not found in your line" });
    }
    const conn = await getTxConnection();
    try {
      await conn.beginTransaction();
      const faculty = await lockFaculty(conn, facultyId);
      const [[lookup]] = faculty
        ? await conn.query(
            `SELECT slot_id FROM queues WHERE queue_id = ? AND assigned_faculty_id = ?`,
            [queueId, facultyId],
          )
        : [[null]];
      const slot = lookup ? await lockSlot(conn, lookup.slot_id) : null;
      const [[entry]] = slot
        ? await conn.query(
            `SELECT q.queue_id, q.student_id, q.status, q.service_id,
                    COALESCE(q.service_label_snapshot, s.service_name) AS service_name
               FROM queues q
               JOIN services s ON q.service_id = s.service_id
              WHERE q.queue_id = ? AND q.assigned_faculty_id = ? AND q.slot_id = ?
              FOR UPDATE`,
            [queueId, facultyId, slot.slot_id],
          )
        : [[null]];
      if (!entry) {
        await conn.rollback();
        return res.status(404).json({ error: "Student not found in your line" });
      }
      if (entry.status !== "waiting") {
        await conn.rollback();
        return res.status(409).json({
          error: "You've already called this student. Mark them served or as a no-show instead.",
        });
      }

      const { cancelled } = await returnEntryToOffice(conn, entry, slot, {
        changedBy: facultyId,
        note: `Returned to office line by ${faculty.name}`,
      });
      const settle = cancelled ? await settleSlotAfterEntryChange(conn, slot.slot_id) : null;
      await conn.commit();
      // Hand the connection back now -- see utils/txConnection.js.
      conn.release();

      if (cancelled) {
        emitUnservedCancelled({
          slotId: slot.slot_id,
          deptId: slot.department_id,
          queueId,
          studentId: entry.student_id,
          facultyId,
          reason: "The office queue had already been stopped",
          serviceName: entry.service_name,
        });
      } else {
        const payload = {
          slotId: slot.slot_id,
          queueId,
          studentId: entry.student_id,
          facultyId: null,
          previousFacultyId: facultyId,
        };
        emitToSlot(slot.slot_id, "queue:returned", payload);
        emitToDept(slot.department_id, "queue:returned", payload);
        emitToUser(entry.student_id, "queue:returned", payload);
        emitToUser(facultyId, "queue:returned", payload);
        createNotification(
          entry.student_id,
          `You've been moved back to the office line for ${entry.service_name}. You kept your place.`,
          "queue",
        );
      }
      if (settle) {
        emitToSlot(slot.slot_id, "queue:slot-status", { slotId: slot.slot_id, status: settle.newStatus });
        emitToDept(slot.department_id, "queue:slot-status", { slotId: slot.slot_id, status: settle.newStatus });
      }
      try {
        if (!cancelled) await notifyAlmostUp({ slotId: slot.slot_id });
        await notifyAlmostUp({ facultyId });
      } catch (nudgeErr) {
        console.error("[professor return] almost-up nudge failed:", nudgeErr.message);
      }

      res.json({
        message: cancelled
          ? "The office queue was already stopped, so the student's ticket was cancelled with priority for next time"
          : "Student returned to the office line",
        queueId,
        cancelled,
      });
    } catch (error) {
      await conn.rollback();
      sendServerError(res, error, "Professor return student error:");
    } finally {
      conn.release();
    }
  },
);

module.exports = router;
