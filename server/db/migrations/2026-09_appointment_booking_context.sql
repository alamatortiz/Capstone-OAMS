-- ─────────────────────────────────────────────────────────────
-- Appointment booking context: year level + program, course code
-- ─────────────────────────────────────────────────────────────
-- Adds:
--   * appointments.booking_year_program -- the student's year level + program
--                                           shorthand, entered manually per
--                                           booking (e.g. "1 CS-A", "3 IT-B").
--                                           Free text, no structured parsing --
--                                           this is student-defined shorthand,
--                                           not two independently-validated
--                                           values, and isn't pulled from
--                                           students.year_level/course (a
--                                           student's declared class for a
--                                           consultation can legitimately
--                                           differ from what's on file, and
--                                           nothing guarantees the profile
--                                           field is even populated).
--   * appointments.course_code          -- the specific class/subject this
--                                           consultation concerns, e.g. "CS 101".
--
-- These columns are ALSO in server/oams_db.sql, so a fresh
-- `docker compose down -v && up` already has them. This file is only for an
-- existing dev/prod volume -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_appointment_booking_context.sql
-- Re-running errors with "Duplicate column name ..." -- that is fine, it
-- just means the column is already present.
--
-- NOTE: this replaces an earlier draft of this same migration that split the
-- above into two columns (booking_year_level INT + booking_program
-- VARCHAR(100)) -- corrected before shipping anywhere with real data. If you
-- already applied that earlier version by hand, run this instead:
--   ALTER TABLE appointments
--       DROP COLUMN booking_year_level,
--       DROP COLUMN booking_program,
--       ADD COLUMN booking_year_program VARCHAR(150) NULL AFTER notes;

ALTER TABLE appointments
    ADD COLUMN booking_year_program VARCHAR(150) NULL AFTER notes,
    ADD COLUMN course_code VARCHAR(50) NULL AFTER booking_year_program;
