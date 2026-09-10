-- ─────────────────────────────────────────────────────────────
-- Early reminders + document claim-by deadline
-- ─────────────────────────────────────────────────────────────
-- Adds the tracking/deadline columns three features need:
--   * appointments.imminent_reminder_sent_at  -- dedupe for the T-10min
--     "your appointment starts soon" reminder (separate from the existing
--     24h reminder_sent_at), sent to both the student and the professor.
--   * queues.position_reminder_sent_at        -- one-shot dedupe for the
--     "you're almost up (#2/#3 in line)" queue reminder.
--   * document_requests / faculty_document_requests / document_submissions
--     .claim_by            -- optional office-set "collect it by" date on a
--                             Ready document (distinct from the student's
--                             own needed_by wish-date).
--     .overdue_notified_at -- one-shot dedupe for the "past its claim-by
--                             date" nudge to the requester.
--
-- These columns are ALSO in server/oams_db.sql, so a fresh
-- `docker compose down -v && up` already has them. This file is only for an
-- existing dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_early_reminders_and_claim_deadline.sql
-- Re-running errors with "Duplicate column name ..." -- that is fine, it
-- just means the column is already present.

ALTER TABLE appointments
    ADD COLUMN imminent_reminder_sent_at TIMESTAMP NULL DEFAULT NULL AFTER pending_nudge_sent_at;

ALTER TABLE queues
    ADD COLUMN position_reminder_sent_at TIMESTAMP NULL DEFAULT NULL AFTER arrived_at;

ALTER TABLE document_requests
    ADD COLUMN claim_by            DATE      NULL           AFTER needed_by,
    ADD COLUMN overdue_notified_at TIMESTAMP NULL DEFAULT NULL AFTER escalated_at;

ALTER TABLE faculty_document_requests
    ADD COLUMN claim_by            DATE      NULL           AFTER needed_by,
    ADD COLUMN overdue_notified_at TIMESTAMP NULL DEFAULT NULL AFTER escalated_at;

ALTER TABLE document_submissions
    ADD COLUMN claim_by            DATE      NULL           AFTER needed_by,
    ADD COLUMN overdue_notified_at TIMESTAMP NULL DEFAULT NULL AFTER escalated_at;
