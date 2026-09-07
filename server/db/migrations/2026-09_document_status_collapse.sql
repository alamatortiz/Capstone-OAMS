-- ─────────────────────────────────────────────────────────────
-- Document status lifeline collapse + document_request_files
-- ─────────────────────────────────────────────────────────────
-- Collapses the document lifeline to strictly Pending -> Processing -> Ready
-- -> Claimed (+ Rejected, Cancelled) for document_requests,
-- faculty_document_requests AND document_submissions. The old 'generated'
-- (displayed as "Ready") and 'released' states are folded into 'ready';
-- document_submissions GAINS 'ready' (it never had it).
--
-- No automatic migration runner exists -- apply this by hand against an
-- existing volume:  mysql -u root -p oams_db < this-file.sql
-- (A fresh `docker compose down -v && up` re-runs oams_db.sql, which already
--  carries the final schema, so this file is only for existing data.)
--
-- The three `status` columns are `ENUM(...) DEFAULT 'pending'` today -- NOT
-- `NOT NULL`. This migration preserves that exactly.

-- 1. Widen the enum to a superset so both old and new members are valid while
--    the UPDATE runs (MySQL won't MODIFY away an enum member rows still use).
ALTER TABLE document_requests
    MODIFY status ENUM('pending','processing','generated','released','ready','claimed','rejected','cancelled') DEFAULT 'pending';
ALTER TABLE faculty_document_requests
    MODIFY status ENUM('pending','processing','generated','released','ready','claimed','rejected','cancelled') DEFAULT 'pending';

-- 2. Fold generated + released into ready.
UPDATE document_requests         SET status = 'ready' WHERE status IN ('generated','released');
UPDATE faculty_document_requests SET status = 'ready' WHERE status IN ('generated','released');

-- 3. Collapse to the final set on all three tables.
ALTER TABLE document_requests
    MODIFY status ENUM('pending','processing','ready','claimed','rejected','cancelled') DEFAULT 'pending';
ALTER TABLE faculty_document_requests
    MODIFY status ENUM('pending','processing','ready','claimed','rejected','cancelled') DEFAULT 'pending';
ALTER TABLE document_submissions
    MODIFY status ENUM('pending','processing','ready','claimed','rejected','cancelled') DEFAULT 'pending';

-- 4. New table: soft-copy files the office attaches to a document REQUEST
--    (office -> requester). Mirrors document_submission_files' 'admin_return'
--    channel; one direction only, so no `direction` enum. Exactly one of
--    request_id / faculty_request_id is set (enforced app-side).
CREATE TABLE IF NOT EXISTS document_request_files (
    file_id            INT          AUTO_INCREMENT PRIMARY KEY,
    request_id         INT          NULL,
    faculty_request_id INT          NULL,
    filename           VARCHAR(255) NOT NULL,
    file_path          VARCHAR(255) NOT NULL,
    mime_type          VARCHAR(100) NOT NULL,
    file_size          INT          NOT NULL,
    uploaded_by        INT          NOT NULL,
    uploaded_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id)         REFERENCES document_requests(request_id)         ON DELETE CASCADE,
    FOREIGN KEY (faculty_request_id) REFERENCES faculty_document_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)        REFERENCES users(user_id),
    INDEX idx_document_request_files_request (request_id),
    INDEX idx_document_request_files_faculty (faculty_request_id)
);

-- Note: `document_requests.released_at` / `faculty_document_requests.released_at`
-- are now dead (unwritten, unread). Left in place; drop in a later migration if
-- desired. `is_digital_delivery` stays in use (the "Generate Document" QR flow).
