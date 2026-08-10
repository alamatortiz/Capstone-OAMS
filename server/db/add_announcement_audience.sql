-- One-off migration for an already-running database.
-- Fresh installs already get this column from oams_db.sql's CREATE TABLE;
-- this file only exists to bring an existing database up to date.
--   mysql --host=<host> --port=<port> -u <user> -p --ssl-ca=ca.pem <db> < server/db/add_announcement_audience.sql

ALTER TABLE announcements
  ADD COLUMN audience ENUM('students','faculty') NOT NULL DEFAULT 'students' AFTER is_pinned,
  ADD INDEX idx_announcements_audience (audience, department_id, status);
