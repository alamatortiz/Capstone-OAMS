-- Appointments get a tracking number, same scheme as document_requests/
-- document_submissions (assigned in app code via utils/trackingNumber.js's
-- nextTrackingNumber(), prefix "APT"). NULL for existing rows -- there is no
-- retroactive backfill, since a tracking number is meant to be handed to the
-- student at booking time, not assigned after the fact.
ALTER TABLE appointments
  ADD COLUMN tracking_number VARCHAR(20) NULL UNIQUE AFTER appointment_id;
