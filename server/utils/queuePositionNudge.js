const pool = require("../db");
const { createNotification } = require("./notifications");

// After the front of a slot's line advances (a student was called, or someone
// ahead left), the students now at position #2 and #3 get a one-shot
// "you're almost up" heads-up. `queues.position_reminder_sent_at` (CAS below)
// makes sure each entry is nudged at most once, ever. Position #1 isn't
// touched here -- they get the real "it's your turn" push on the next
// call-next. Best-effort: callers wrap this so a nudge failure can never
// fail the call/leave it runs after.
async function notifyAlmostUp(slotId) {
  const [upcoming] = await pool.query(
    `SELECT q.queue_id, q.student_id, s.service_name
       FROM queues q
       JOIN services s ON q.service_id = s.service_id
      WHERE q.slot_id = ? AND q.status = 'waiting'
      ORDER BY q.queue_number ASC
      LIMIT 3`,
    [slotId],
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
