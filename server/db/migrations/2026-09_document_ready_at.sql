-- When a document became "ready for pickup" -- lets analytics measure real
-- processing time (requested -> ready) and pickup wait (ready -> claimed).
-- Stamped once by the admin status routes (COALESCE keeps the first time).
-- NULL for documents that were marked ready before this column existed.
ALTER TABLE document_requests         ADD COLUMN ready_at TIMESTAMP NULL DEFAULT NULL AFTER claim_by;
ALTER TABLE faculty_document_requests ADD COLUMN ready_at TIMESTAMP NULL DEFAULT NULL AFTER claim_by;
ALTER TABLE document_submissions      ADD COLUMN ready_at TIMESTAMP NULL DEFAULT NULL AFTER claim_by;
