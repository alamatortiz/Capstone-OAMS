-- One-off migration for an already-running dev database.
-- Fresh installs already get these columns from oams_db.sql's CREATE TABLE;
-- this file only exists to bring an existing database up to date without
-- tearing down its Docker volume. Run once via a MySQL client or:
--   docker exec -i <db-container> mysql -uroot -p<password> oams_db < server/db/add_appointment_snapshots.sql

ALTER TABLE appointments
  ADD COLUMN location_snapshot     VARCHAR(150) NULL AFTER availability_id,
  ADD COLUMN window_start_snapshot TIME         NULL AFTER location_snapshot,
  ADD COLUMN window_end_snapshot   TIME         NULL AFTER window_start_snapshot;
