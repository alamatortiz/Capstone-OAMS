-- ─────────────────────────────────────────────────────────────
-- Drop appointments.reminder_sent_at (24h-out reminder removed)
-- ─────────────────────────────────────────────────────────────
-- The day-before appointment reminder was removed from
-- appointmentReminderSweeper.js: it only targeted APPROVED appointments
-- starting in the future, but approval is only allowed once the window has
-- opened, so it almost never fired. Its dedupe column is now unused --
-- nothing under server/ reads or writes it anymore (the schedule-edit
-- re-sync in professorRoutes.js now resets imminent_reminder_sent_at instead).
--
-- OPTIONAL cleanup. The app works the same whether or not this is applied,
-- since no code touches the column. Also reflected in server/oams_db.sql,
-- so a fresh `docker compose down -v && up` already lacks it. Apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-10_drop_appointment_reminder_sent_at.sql
-- Re-running errors with "check that column/key exists" -- that just means
-- it's already applied.

ALTER TABLE appointments
    DROP COLUMN reminder_sent_at;
