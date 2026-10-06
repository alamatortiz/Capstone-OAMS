const { emitToSlot, emitToDept, emitToUser } = require("../sockets");
const { createNotification } = require("./notifications");
const { PRIORITY_CREDIT_DAYS } = require("./queuePriorityCredits");
const { settleSlotAfterEntryChange } = require("./queueSlotSettlement");

// Shared write paths for the office -> professor hand-off (see
// queues.assigned_faculty_id in oams_db.sql).
//
// Lock order, everywhere a ticket's line changes:
//   faculty row -> queue_slots row(s) (ascending slot_id) -> queues row(s)
// Writing a NON-NULL assigned_faculty_id makes MySQL's FK check take a shared
// lock on that faculty row, so any route doing that must lock the faculty row
// FOR UPDATE before the slot -- otherwise it cycles against the professor
// routes, which lock their own faculty row first. Setting it back to NULL
// triggers no FK check and needs no faculty lock.
//
// Every function here does DB writes only and returns what happened; the
// matching emit*() runs AFTER the caller commits, so a rollback can never
// leave a client looking at state that didn't happen.

// Ends an unfinished ticket the office failed to reach: the queue was stopped,
// the queue's day ended, or a student was handed back to a line that no
// longer exists. Extracted verbatim from the close route so every one of
// those paths cancels -- and compensates -- identically.
//
// `entry` needs { queue_id, student_id, status, service_id }.
async function cancelUnservedEntry(conn, entry, { reason, changedBy = null, note }) {
  await conn.query(
    // cancelled_by distinguishes "the office ran out of time before
    // reaching you" from an ordinary cancellation, mirroring what
    // appointments already do via the sweeper's
    // cancelled_by='system_not_entertained'.
    `UPDATE queues
        SET status = 'cancelled', cancelled_at = NOW(),
            admin_reason = ?, cancelled_by = 'system_not_entertained'
      WHERE queue_id = ?`,
    [reason, entry.queue_id],
  );
  await conn.query(
    `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, ?, 'cancelled', ?, ?, NOW())`,
    [entry.queue_id, entry.status, changedBy, note],
  );

  // Being failed by the office shouldn't cost them their place next time.
  // The credit is inert -- it reserves nothing and does nothing until they
  // physically come back and scan in again, which is what keeps this from
  // reintroducing the online reservation the panel removed. Unclaimed
  // credits simply expire.
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

// Post-commit side effects for cancelUnservedEntry().
function emitUnservedCancelled({ slotId, deptId, queueId, studentId, facultyId = null, reason, serviceName }) {
  const stoppedPayload = { slotId, queueId, studentId, reason };
  emitToUser(studentId, "queue:queue-stopped", stoppedPayload);
  // Lets every host screen (office monitor, the professor who had them) drop
  // the ticket without waiting for a poll.
  emitToSlot(slotId, "queue:student-left", { slotId, queueId, studentId });
  emitToDept(deptId, "queue:student-left", { slotId, queueId, studentId });
  if (facultyId) emitToUser(facultyId, "queue:student-left", { slotId, queueId, studentId });
  // Tell them about the credit in the same breath as the bad news --
  // "you weren't served" lands very differently alongside "and you go
  // first next time".
  createNotification(
    studentId,
    `The ${serviceName} queue closed before you were served (${reason}). ` +
      `Next time you scan in for it within ${PRIORITY_CREDIT_DAYS} days, you'll be placed at the front of the line.`,
    "queue",
  );
}

// Hands a ticket from a professor's line back to the office's line on the
// same slot -- or, if the office already stopped that queue, cancels it with
// a priority credit (there is no office line left to return to, and a
// student mustn't be left in a line nobody will ever call).
//
// Caller must already hold the slot lock and a locking read of the entry.
// `entry` needs { queue_id, student_id, status, service_id }; `slot` needs
// { status }. Returns { cancelled }.
async function returnEntryToOffice(conn, entry, slot, { changedBy, note, cancelReason }) {
  if (slot.status === "closed" || slot.status === "completed") {
    await cancelUnservedEntry(conn, entry, {
      reason: cancelReason ?? "The office queue had already been stopped",
      changedBy,
      note,
    });
    return { cancelled: true };
  }

  // created_at is untouched, so under the canonical ordering they land back
  // at the position their original arrival earns -- "you keep your place".
  await conn.query(
    `UPDATE queues
        SET assigned_faculty_id = NULL, assigned_at = NULL, assigned_by = NULL,
            status = 'waiting', called_at = NULL, arrived_at = NULL,
            position_reminder_sent_at = NULL
      WHERE queue_id = ?`,
    [entry.queue_id],
  );
  await conn.query(
    `INSERT INTO queue_status_logs (queue_id, old_status, new_status, changed_by, notes, created_at)
     VALUES (?, ?, 'waiting', ?, ?, NOW())`,
    [entry.queue_id, entry.status, changedBy, note],
  );
  return { cancelled: false };
}

// Empties a professor's line -- used when the superadmin deletes, suspends or
// moves a faculty account, so their students go back to the office instead
// of being stranded (or, on delete, silently becoming a SECOND office-line
// 'serving' ticket via the FK's ON DELETE SET NULL).
//
// Runs inside the caller's transaction. Returns the per-ticket outcomes for
// emitFacultyLaneReleased() to announce after commit.
async function releaseFacultyLane(conn, facultyId, { changedBy = null } = {}) {
  await conn.query(`SELECT faculty_id FROM faculty WHERE faculty_id = ? FOR UPDATE`, [facultyId]);

  const [slotRows] = await conn.query(
    `SELECT DISTINCT slot_id FROM queues
      WHERE assigned_faculty_id = ? AND status IN ('waiting', 'serving') AND slot_id IS NOT NULL
      ORDER BY slot_id`,
    [facultyId],
  );
  if (slotRows.length === 0) return { outcomes: [], settled: [], facultyId };

  const slotIds = slotRows.map((r) => r.slot_id);
  const [slots] = await conn.query(
    `SELECT qs.slot_id, qs.status, qs.department_id,
            CASE WHEN qs.is_universal THEN 'Universal Service Queue' ELSE s.service_name END AS service_name
       FROM queue_slots qs
       LEFT JOIN services s ON qs.service_id = s.service_id
      WHERE qs.slot_id IN (?) ORDER BY qs.slot_id FOR UPDATE`,
    [slotIds],
  );
  const slotById = new Map(slots.map((s) => [s.slot_id, s]));

  const [entries] = await conn.query(
    `SELECT q.queue_id, q.student_id, q.status, q.service_id, q.slot_id,
            COALESCE(q.service_label_snapshot, s.service_name) AS service_name
       FROM queues q
       JOIN services s ON q.service_id = s.service_id
      WHERE q.assigned_faculty_id = ? AND q.status IN ('waiting', 'serving')
      ORDER BY q.slot_id, q.queue_id
      FOR UPDATE`,
    [facultyId],
  );

  const outcomes = [];
  for (const entry of entries) {
    const slot = slotById.get(entry.slot_id);
    if (!slot) continue;
    const { cancelled } = await returnEntryToOffice(conn, entry, slot, {
      changedBy,
      note: "Returned to office line: the professor's account is no longer available",
      cancelReason: "The professor handling you is no longer available and the office queue had already been stopped",
    });
    outcomes.push({ entry, slot, cancelled });
  }

  const settled = [];
  for (const slotId of slotIds) {
    const result = await settleSlotAfterEntryChange(conn, slotId);
    if (result) settled.push({ slotId, deptId: slotById.get(slotId)?.department_id, ...result });
  }

  return { outcomes, settled, facultyId };
}

function emitFacultyLaneReleased(result) {
  if (!result || !result.outcomes) return;
  for (const { entry, slot, cancelled } of result.outcomes) {
    if (cancelled) {
      emitUnservedCancelled({
        slotId: slot.slot_id,
        deptId: slot.department_id,
        queueId: entry.queue_id,
        studentId: entry.student_id,
        reason: "The professor handling you is no longer available",
        serviceName: entry.service_name,
      });
      continue;
    }
    const payload = { slotId: slot.slot_id, queueId: entry.queue_id, studentId: entry.student_id, facultyId: null, previousFacultyId: result.facultyId };
    emitToSlot(slot.slot_id, "queue:returned", payload);
    emitToDept(slot.department_id, "queue:returned", payload);
    emitToUser(entry.student_id, "queue:returned", payload);
    createNotification(
      entry.student_id,
      `The professor handling your ${entry.service_name} visit is no longer available, so you've been moved back to the office line. You kept your place.`,
      "queue",
    );
  }
  for (const s of result.settled) {
    emitToSlot(s.slotId, "queue:slot-status", { slotId: s.slotId, status: s.newStatus });
    emitToDept(s.deptId, "queue:slot-status", { slotId: s.slotId, status: s.newStatus });
  }
}

module.exports = {
  cancelUnservedEntry,
  emitUnservedCancelled,
  returnEntryToOffice,
  releaseFacultyLane,
  emitFacultyLaneReleased,
};
