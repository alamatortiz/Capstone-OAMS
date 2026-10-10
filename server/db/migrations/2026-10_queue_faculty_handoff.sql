-- ─────────────────────────────────────────────────────────────
-- Queue faculty hand-off (service-dependent passing)
-- ─────────────────────────────────────────────────────────────
-- Professors no longer host their own queue_slots. Instead the college
-- office passes a student to a professor assigned to that student's service
-- (service_delegations), and the ticket STAYS on the office's slot -- so the
-- slot's capacity stays consumed, a professor-served ticket counts as served
-- on the office's queue, and a professor no-show frees the seat, all with
-- the existing slot-wide counting.
--
-- assigned_faculty_id NULL = the office's own line; non-NULL = that
-- professor's line (which can span several of the office's slots at once).
--
-- APPLY BY HAND TO PRODUCTION (TiDB) BEFORE DEPLOYING THE SERVER THAT
-- READS THESE COLUMNS -- every queue query references assigned_faculty_id.
--
-- Split into three statements on purpose: TiDB validates each ALTER clause
-- against the table as it was BEFORE the statement, so a FK on a column
-- added in the same ALTER fails ("Key column ... doesn't exist"). See the
-- identical note in oams_db.sql and 2026-10_onsite_queue_qr.sql.

ALTER TABLE queues
  ADD COLUMN assigned_faculty_id INT NULL AFTER slot_id,
  ADD COLUMN assigned_at TIMESTAMP NULL AFTER assigned_faculty_id,
  ADD COLUMN assigned_by INT NULL AFTER assigned_at,
  ADD INDEX idx_queue_faculty_lane (assigned_faculty_id, status, priority_rank, created_at);

ALTER TABLE queues
  ADD CONSTRAINT fk_queues_assigned_faculty
    FOREIGN KEY (assigned_faculty_id) REFERENCES faculty(faculty_id) ON DELETE SET NULL;

ALTER TABLE queues
  ADD CONSTRAINT fk_queues_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL;
