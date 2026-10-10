-- ─────────────────────────────────────────────────────────────
-- Tracking number counters (APT / REQ / FDR / SUB)
-- ─────────────────────────────────────────────────────────────
-- Replaces the old "MAX(id)+1 before insert" numbering, which let two
-- simultaneous requests compute the same tracking number (a booking then
-- failed with a misleading "you already have an active booking" error) and
-- skipped numbers whenever record ids did. See utils/trackingNumber.js.
--
-- NOTHING NEEDS TO BE RUN BY HAND: the server runs these exact statements
-- itself at startup (ensureTrackingCounters in utils/trackingNumber.js),
-- and server/oams_db.sql creates the table for fresh volumes. This file is
-- the record of the change, and is safe to run manually -- every statement
-- is idempotent (CREATE TABLE IF NOT EXISTS; INSERT IGNORE never overwrites
-- a counter that already exists).

CREATE TABLE IF NOT EXISTS tracking_counters (
    prefix     VARCHAR(10)  PRIMARY KEY,
    last_number INT UNSIGNED NOT NULL
);

-- Seed each counter from the highest number already issued in its table.
INSERT IGNORE INTO tracking_counters (prefix, last_number)
  SELECT 'APT', COALESCE(MAX(CAST(SUBSTRING_INDEX(tracking_number, '-', -1) AS UNSIGNED)), 0) FROM appointments;
INSERT IGNORE INTO tracking_counters (prefix, last_number)
  SELECT 'REQ', COALESCE(MAX(CAST(SUBSTRING_INDEX(tracking_number, '-', -1) AS UNSIGNED)), 0) FROM document_requests;
INSERT IGNORE INTO tracking_counters (prefix, last_number)
  SELECT 'FDR', COALESCE(MAX(CAST(SUBSTRING_INDEX(tracking_number, '-', -1) AS UNSIGNED)), 0) FROM faculty_document_requests;
INSERT IGNORE INTO tracking_counters (prefix, last_number)
  SELECT 'SUB', COALESCE(MAX(CAST(SUBSTRING_INDEX(tracking_number, '-', -1) AS UNSIGNED)), 0) FROM document_submissions;
