-- ─────────────────────────────────────────────────────────────
-- Appointment auto-cancel for "not entertained" (no actions taken recorded)
-- ─────────────────────────────────────────────────────────────
-- appointmentReminderSweeper.js's sweepStaleApproved() used to blanket
-- auto-complete every approved appointment once its window passed, whether
-- or not the professor ever actually saw the student. It now branches: if
-- the professor recorded "actions taken" (shared_comment) it still
-- auto-completes as before; if not, it auto-cancels instead so a stale
-- record doesn't silently read as "completed" when nobody was served.
--
-- That auto-cancel needs its own cancelled_by value rather than reusing the
-- existing 'system' -- that value already has a specific, hardcoded meaning
-- across the codebase ("auto-cancelled because the professor edited/deleted
-- the schedule template", professorRoutes.js:1341,1555) baked into two
-- activity-feed title generators. Reusing it here would make a student's
-- activity feed say "schedule changed" for an appointment that was actually
-- never actioned.
--
-- Also reflected in server/oams_db.sql, so a fresh `docker compose down -v
-- && up` already has the final shape. This file is only for an existing
-- dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_appointment_not_entertained_cancellation.sql
-- Re-running is safe: the MODIFY on cancelled_by is naturally idempotent
-- (re-stating the same enum list errors on nothing).

ALTER TABLE appointments
    MODIFY COLUMN cancelled_by ENUM('student','faculty','system','system_expired','student_no_show','system_not_entertained') NULL;
