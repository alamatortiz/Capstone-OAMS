-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: per-request document snapshots, frozen queue service labels,
--            and Universal Service Queue support.
--
-- Apply to an already-populated dev/prod DB. A fresh `oams_db.sql` re-seed
-- already contains all of this. Ordering per column: add nullable -> backfill
-- -> tighten. Safe to re-run (guards where practical); the ADD COLUMN steps
-- will error "Duplicate column" on a second run -- that's fine, it means the
-- column is already there.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. document_requests / faculty_document_requests: frozen catalogue copy
ALTER TABLE document_requests         ADD COLUMN service_snapshot JSON NULL AFTER official_code;
ALTER TABLE faculty_document_requests ADD COLUMN service_snapshot JSON NULL AFTER official_code;

-- Backfill from the live catalogue as it stands now (best effort for history).
UPDATE document_requests dr
JOIN document_services ds ON dr.service_id = ds.service_id
SET dr.service_snapshot = JSON_OBJECT(
  'name',           ds.service_name,
  'description',     ds.description,
  'processingTime',  ds.processing_time,
  'recipientType',   ds.recipient_type,
  'requiresCoding',  ds.requires_coding = 1,
  'isCrossCollege',  ds.is_cross_college = 1,
  'requirements', COALESCE((
    SELECT JSON_ARRAYAGG(JSON_OBJECT(
      'name',        req.requirement_name,
      'description',  req.description,
      'isMandatory',  req.is_mandatory = 1
    ))
    FROM document_requirements req
    WHERE req.service_id = ds.service_id
  ), JSON_ARRAY())
)
WHERE dr.service_snapshot IS NULL;

UPDATE faculty_document_requests fdr
JOIN document_services ds ON fdr.service_id = ds.service_id
SET fdr.service_snapshot = JSON_OBJECT(
  'name',           ds.service_name,
  'description',     ds.description,
  'processingTime',  ds.processing_time,
  'recipientType',   ds.recipient_type,
  'requiresCoding',  ds.requires_coding = 1,
  'isCrossCollege',  ds.is_cross_college = 1,
  'requirements', COALESCE((
    SELECT JSON_ARRAYAGG(JSON_OBJECT(
      'name',        req.requirement_name,
      'description',  req.description,
      'isMandatory',  req.is_mandatory = 1
    ))
    FROM document_requirements req
    WHERE req.service_id = ds.service_id
  ), JSON_ARRAY())
)
WHERE fdr.service_snapshot IS NULL;

-- 2. queues: frozen service label
ALTER TABLE queues ADD COLUMN service_label_snapshot VARCHAR(150) NULL AFTER admin_reason;

UPDATE queues q
JOIN services s ON q.service_id = s.service_id
SET q.service_label_snapshot = s.service_name
WHERE q.service_label_snapshot IS NULL;

-- 3. queue_slots: Universal Service Queue support
--    add nullable/defaulted -> backfill department_id -> tighten
ALTER TABLE queue_slots
  ADD COLUMN department_id INT NULL AFTER service_id,
  ADD COLUMN is_universal  BOOLEAN NOT NULL DEFAULT FALSE AFTER department_id;

UPDATE queue_slots qs
JOIN services s ON qs.service_id = s.service_id
SET qs.department_id = s.department_id
WHERE qs.department_id IS NULL;

-- Every existing slot references a real service, so department_id is now set
-- for all rows; make it NOT NULL + add the FK + index, and drop NOT NULL on
-- service_id so a universal slot can carry a NULL there.
ALTER TABLE queue_slots
  MODIFY COLUMN department_id INT NOT NULL,
  MODIFY COLUMN service_id INT NULL,
  ADD CONSTRAINT fk_queue_slots_department
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
  ADD INDEX idx_slot_dept_date_status (department_id, slot_date, status);
