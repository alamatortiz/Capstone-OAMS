-- One-off migration for an already-running dev database.
-- Fresh installs already get this from oams_db.sql's CREATE TABLE; this file
-- only exists to bring an existing database up to date without tearing down
-- its Docker volume. Run once via a MySQL client or:
--   docker exec -i <db-container> mysql -uroot -p<password> oams_db < server/db/add_active_booking_constraint.sql
--
-- Fixes the cancel-then-rebook data-integrity bug: book-slot used to
-- "reactivate" (UPDATE in place, same appointment_id) a prior cancelled/
-- rejected row instead of inserting a fresh one, purely to dodge
-- uq_appointment_slot -- which applied to every row regardless of status.
-- This drops that key and replaces it with a generated-column-backed unique
-- key that only constrains ACTIVE (non-cancelled/non-rejected) bookings, so a
-- fresh INSERT is always safe on every booking cycle. See oams_db.sql's
-- appointments table for the fresh-install equivalent, and book-slot in
-- studentRoutes.js for the corresponding application-code change.
--
-- Safe to run on any database that currently satisfies uq_appointment_slot:
-- that old key was strictly stricter (at most one row total per
-- student/faculty/date/time, of ANY status) than the new one (at most one
-- ACTIVE row per student/faculty/date/time), so no existing data can violate
-- uq_active_booking when this migration creates it.
--
-- idx_appointments_student replaces uq_appointment_slot's incidental role as
-- student_id's sole supporting index for its foreign key (appointments_ibfk_1)
-- -- without it, MySQL refuses to drop uq_appointment_slot at all (error 1553:
-- "needed in a foreign key constraint"). faculty_id/service_id/availability_id
-- already have their own implicit single-column indexes from when their FKs
-- were created, so they need no equivalent here.

ALTER TABLE appointments
  ADD COLUMN active_booking_key VARCHAR(80) GENERATED ALWAYS AS (
    CASE WHEN status NOT IN ('cancelled', 'rejected')
         THEN CONCAT(student_id, '_', faculty_id, '_', appointment_date, '_', appointment_time)
         ELSE NULL END
  ) STORED AFTER created_at,
  ADD INDEX idx_appointments_student (student_id),
  ADD UNIQUE KEY uq_active_booking (active_booking_key),
  DROP INDEX uq_appointment_slot;
