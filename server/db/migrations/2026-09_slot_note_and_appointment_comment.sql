-- ─────────────────────────────────────────────────────────────
-- Per-slot note + shared appointment comment
-- ─────────────────────────────────────────────────────────────
-- Adds:
--   * faculty_availability.slot_note   -- optional free-text note a professor
--                                          can attach to a schedule slot (e.g.
--                                          a Google Meet link, room change).
--                                          Purely informational, never fires a
--                                          notification.
--   * appointments.slot_note_snapshot  -- booking-time snapshot of the above,
--                                          mirrors the existing location /
--                                          location_snapshot split so a later
--                                          template edit doesn't retroactively
--                                          change what an already-booked
--                                          student sees.
--   * appointments.shared_comment          -- one shared, overwritable comment
--                                          either the student or the
--                                          professor can read/edit.
--   * appointments.comment_updated_by      -- who last wrote it ('student' /
--                                          'faculty'), for a "last updated
--                                          by ..." UI line.
--   * appointments.comment_updated_at      -- when it was last written.
--
-- These columns are ALSO in server/oams_db.sql, so a fresh
-- `docker compose down -v && up` already has them. This file is only for an
-- existing dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_slot_note_and_appointment_comment.sql
-- Re-running errors with "Duplicate column name ..." -- that is fine, it
-- just means the column is already present.

ALTER TABLE faculty_availability
    ADD COLUMN slot_note VARCHAR(500) NULL AFTER location;

ALTER TABLE appointments
    ADD COLUMN slot_note_snapshot VARCHAR(500) NULL AFTER location_snapshot,
    ADD COLUMN shared_comment TEXT NULL AFTER notes,
    ADD COLUMN comment_updated_by ENUM('student','faculty') NULL,
    ADD COLUMN comment_updated_at TIMESTAMP NULL DEFAULT NULL;
