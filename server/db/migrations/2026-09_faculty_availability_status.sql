-- ─────────────────────────────────────────────────────────────
-- faculty.availability_status + faculty.unavailable_reason
-- ─────────────────────────────────────────────────────────────
-- Backs the professor-side Available/Unavailable toggle
-- (client/src/components/ProfessorSidebar.jsx -> PATCH
--  /api/professor/availability-status) and the status shown on the student
-- "Professor Schedules" page and the admin "Faculty Availability" page.
--
-- These two columns are ALREADY in oams_db.sql -- a fresh
-- `docker compose down -v && up` re-runs it and has them. This file exists
-- only for an already-populated dev/prod volume that predates them: they
-- were hand-applied to some dev DBs and never captured as a migration, so an
-- un-migrated DB currently 500s /api/student/professor-schedules and
-- /api/admin/faculty-availability (unknown column).
--
-- No automatic migration runner exists -- apply by hand:
--   mysql -u root -p oams_db < server/db/migrations/2026-09_faculty_availability_status.sql
-- Re-running errors with "Duplicate column name 'availability_status'" --
-- that is fine, it just means the columns are already present.

ALTER TABLE faculty
    ADD COLUMN availability_status ENUM('available','unavailable') NOT NULL DEFAULT 'available' AFTER department_id,
    ADD COLUMN unavailable_reason  VARCHAR(255) NULL AFTER availability_status;
