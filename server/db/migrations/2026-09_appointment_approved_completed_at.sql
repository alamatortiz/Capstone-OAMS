-- ─────────────────────────────────────────────────────────────
-- Appointment approved/completed timestamps
-- ─────────────────────────────────────────────────────────────
-- Adds two new real-world-instant columns to `appointments`, separate from
-- created_at (booking time) and updated_at (overwritten on EVERY status
-- change, so it can't distinguish "approved at" from "completed at"):
--   * appointments.approved_at  -- set the first time a professor approves
--     the request (PATCH /professor/appointments/:id/status).
--   * appointments.completed_at -- set the first time the appointment is
--     marked completed, whichever path gets there first: the professor
--     (same PATCH route), the student's own
--     PATCH /student/appointments/:appointmentId/complete, or
--     appointmentReminderSweeper.js's sweepStaleApproved() auto-complete.
-- Both are stamped with a bare NOW() at every write site, including the
-- sweeper -- see the timezone note in db.js: this connection runs in UTC
-- mode ("Z"), so NOW() already stores the correct real UTC instant, exactly
-- like created_at/updated_at/reminder_sent_at do. For the sweeper
-- specifically, completed_at means "when the sweeper noticed and
-- auto-completed it", NOT a backdated reconstruction of the appointment
-- window's end time -- consistent with how reminder_sent_at/
-- imminent_reminder_sent_at/pending_nudge_sent_at already work in that same
-- file. Both are guarded with "IS NULL" so an already-set column is never
-- overwritten (defense-in-depth alongside appointmentStatus.js's
-- isValidTransition, which already structurally prevents re-entering
-- 'approved' or re-completing a 'completed' row).
-- Purely additive -- no existing column, index, or app behavior changes.
--
-- These columns are ALSO in server/oams_db.sql, so a fresh
-- `docker compose down -v && up` already has them. This file is only for an
-- existing dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_appointment_approved_completed_at.sql
-- Re-running errors with "Duplicate column name ..." -- that is fine, it
-- just means the column is already present.

ALTER TABLE appointments
    ADD COLUMN approved_at  TIMESTAMP NULL DEFAULT NULL AFTER status,
    ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL AFTER approved_at;
