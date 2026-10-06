const pool = require("../db");
const { createNotification } = require("./notifications");
const { queueOrderBy } = require("./queueDisplay");

// After the front of a line advances (a student was called, or someone
// ahead left or was passed on), the students now at position #2 and #3 get a
// one-shot "you're almost up" heads-up. `queues.position_reminder_sent_at`
// (CAS below) makes sure each entry is nudged at most once per line (it is
// reset when a ticket is passed to or returned from a professor). Position #1
// isn't touched here -- they get the real "it's your turn" push on the next
// call. Best-effort: callers wrap this so a nudge failure can never fail the
// action it runs after.
//
// A line is either an office slot's own line ({ slotId }) or a professor's
// line ({ facultyId }), which can span several office slots -- see
// queueLanePredicate in queueDisplay.js.
async function notifyAlmostUp({ slotId = null, facultyId = null }) {
  if (!slotId && !facultyId) return;
  const [upcoming] = await pool.query(
    `SELECT q.queue_id, q.student_id, s.service_name
       FROM queues q
       JOIN services s ON q.service_id = s.service_id
      WHERE ${facultyId ? "q.assigned_faculty_id = ?" : "q.slot_id = ? AND q.assigned_faculty_id IS NULL"}
        AND q.status = 'waiting'
      ORDER BY ${queueOrderBy("q")}
      LIMIT 3`,
    [facultyId ?? slotId],
  );

  // Index 0 is the new #1 (skip); 1 and 2 are #2 and #3.
  for (let i = 1; i < upcoming.length; i += 1) {
    const row = upcoming[i];
    const [cas] = await pool.query(
      `UPDATE queues SET position_reminder_sent_at = NOW(), updated_at = updated_at
        WHERE queue_id = ? AND position_reminder_sent_at IS NULL`,
      [row.queue_id],
    );
    if (cas.affectedRows === 0) continue;
    createNotification(
      row.student_id,
      `You're almost up — you're #${i + 1} in line for ${row.service_name}.`,
      "queue",
    );
  }
}

module.exports = { notifyAlmostUp };
