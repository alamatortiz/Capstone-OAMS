const pool = require("../db");
const { createNotification } = require("../utils/notifications");

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const REMINDER_LEAD_HOURS = 24;

// `appointment_date`/`appointment_time` are plain calendar-date/wall-clock
// values (no timezone conversion needed, unlike TIMESTAMP columns) -- this
// just normalizes whichever JS shape mysql2 hands back (Date object for
// DATE, string for TIME) into "YYYY-MM-DD" / "HH:MM" for the message.
function formatDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function formatTime(value) {
  return String(value).slice(0, 5);
}

function buildMessage({ appointment_date, appointment_time, location_snapshot }) {
  const dateStr = formatDate(appointment_date);
  const timeStr = formatTime(appointment_time);
  const locationPart = location_snapshot ? ` at ${location_snapshot}` : "";
  return `Reminder: your appointment is scheduled for ${dateStr} at ${timeStr}${locationPart}.`;
}

// Finds every 'approved' appointment starting within REMINDER_LEAD_HOURS that
// hasn't been reminded yet, and notifies the student. Unlike the document
// sweeper, a fixed appointment_date/time keeps matching this window on every
// tick until the appointment passes -- so `reminder_sent_at` is required
// here to stop the sweep from re-notifying the same appointment repeatedly.
async function sweepAppointmentReminders() {
  try {
    const [due] = await pool.query(
      `SELECT appointment_id, student_id, appointment_date, appointment_time, location_snapshot
       FROM appointments
       WHERE status = 'approved'
         AND reminder_sent_at IS NULL
         AND TIMESTAMP(appointment_date, appointment_time) BETWEEN NOW() AND (NOW() + INTERVAL ? HOUR)`,
      [REMINDER_LEAD_HOURS],
    );

    if (due.length === 0) return;

    let remindedCount = 0;
    for (const row of due) {
      const [result] = await pool.query(
        `UPDATE appointments SET reminder_sent_at = NOW() WHERE appointment_id = ? AND reminder_sent_at IS NULL`,
        [row.appointment_id],
      );
      // Compare-and-swap on reminder_sent_at IS NULL, same defensive pattern
      // as queueNoShowSweeper's status='serving' check -- if another sweep
      // tick already claimed this row, affectedRows is 0 and we skip it.
      if (result.affectedRows === 0) continue;

      createNotification(row.student_id, buildMessage(row), "appointment");
      remindedCount += 1;
    }

    if (remindedCount > 0) {
      console.log(
        `[appointmentReminderSweeper] Sent ${remindedCount} reminder${remindedCount === 1 ? "" : "s"}`,
      );
    }
  } catch (error) {
    console.error("[appointmentReminderSweeper] Sweep failed:", error);
  }
}

function startAppointmentReminderSweeper() {
  return setInterval(sweepAppointmentReminders, SWEEP_INTERVAL_MS);
}

module.exports = { startAppointmentReminderSweeper, sweepAppointmentReminders };
