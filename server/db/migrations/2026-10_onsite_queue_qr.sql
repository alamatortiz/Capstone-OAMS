-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: on-site QR queueing, faculty queue hosting, no-show strikes,
--            requirement pre-processing, queue relay, priority credits,
--            and per-appointment student feedback.
--
-- Driven by the 2026-09-30 panel review, which required that queueing stop
-- being joinable from anywhere ("No more online reservation") and become
-- on-site QR scanning only, with anti-abuse and pre-processing.
--
-- Apply to an already-populated dev/prod DB. A fresh `oams_db.sql` re-seed
-- already contains all of this. Ordering per column: add nullable -> backfill
-- -> tighten. The ADD COLUMN steps will error "Duplicate column" on a second
-- run -- that's fine, it means the column is already there.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. queue_slots: a slot can now be hosted by a faculty member ─────────────
-- Both administrators.admin_id and faculty.faculty_id are PK-FKs onto
-- users.user_id, so one generic host_user_id is referentially sound with no
-- ID-space collision, and every ownership check stays a single predicate
-- instead of a two-branch COALESCE across ~10 route handlers.
--
-- admin_id is NOT dropped: it is redefined as "the secretary who configured
-- this slot" (NULL when a faculty member opened their own delegated queue).
-- That keeps the existing analytics joins compiling and preserves the audit
-- trail of who set the window up, which is distinct from who is running it.
ALTER TABLE queue_slots
  ADD COLUMN host_user_id INT NULL AFTER admin_id,
  ADD COLUMN host_role ENUM('admin','faculty') NOT NULL DEFAULT 'admin' AFTER host_user_id;

-- Every pre-existing slot was opened by the admin who owns it.
UPDATE queue_slots SET host_user_id = admin_id WHERE host_user_id IS NULL;

ALTER TABLE queue_slots
  MODIFY COLUMN host_user_id INT NOT NULL,
  MODIFY COLUMN admin_id INT NULL,
  ADD CONSTRAINT fk_queue_slots_host
    FOREIGN KEY (host_user_id) REFERENCES users(user_id),
  ADD INDEX idx_slot_host (host_user_id, slot_date, status);

-- ── 2. service_delegations: which faculty may host which service ────────────
-- Authorization about a *service*, independent of any one slot -- a slot can
-- only say who is running it right now, not who is permitted to.
CREATE TABLE service_delegations (
    delegation_id   INT          AUTO_INCREMENT PRIMARY KEY,
    service_id      INT          NOT NULL,
    faculty_id      INT          NOT NULL,
    delegated_by    INT          NOT NULL,          -- administrators.admin_id
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    revoked_at      TIMESTAMP    NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- One row per pair; re-delegating flips is_active back on rather than
    -- inserting a duplicate, so the history of who granted it is preserved.
    UNIQUE KEY uq_service_faculty (service_id, faculty_id),
    INDEX idx_delegation_faculty (faculty_id, is_active),
    FOREIGN KEY (service_id)   REFERENCES services(service_id)        ON DELETE CASCADE,
    FOREIGN KEY (faculty_id)   REFERENCES faculty(faculty_id)         ON DELETE CASCADE,
    FOREIGN KEY (delegated_by) REFERENCES administrators(admin_id)
);

-- ── 3. queue_slot_tokens: the rotating on-site join code ────────────────────
-- Only a sha256 hash of the token is stored, never the raw value -- a DB dump
-- must not hand someone a working join code.
--
-- Tokens are deliberately MULTI-USE within their TTL: many students scan the
-- same screen at once. Replay is bounded by the short window (60s) plus the
-- existing per-slot duplicate-join guard, not by single-use consumption.
CREATE TABLE queue_slot_tokens (
    token_id        BIGINT       AUTO_INCREMENT PRIMARY KEY,
    slot_id         INT          NOT NULL,
    token_hash      CHAR(64)     NOT NULL,          -- sha256 hex of a 32-byte random token
    issued_by       INT          NOT NULL,          -- users.user_id of the host
    issued_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME     NOT NULL,
    -- Set when the slot is paused/closed or a newer token supersedes this one,
    -- so a code left displayed on a sleeping screen stops working immediately
    -- rather than lingering until its TTL runs out.
    revoked_at      DATETIME     NULL,
    UNIQUE KEY uq_token_hash (token_hash),
    INDEX idx_token_slot_exp (slot_id, expires_at),
    FOREIGN KEY (slot_id)   REFERENCES queue_slots(slot_id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(user_id)
);

-- ── 4. queue_block_overrides: host clearing a no-show block ─────────────────
-- There is deliberately NO no_show_count column. Strikes are derived by
-- COUNTing today's queues.status='no_show' rows, so they can never drift out
-- of sync with the entries they describe. This table only records the
-- exceptions: a host forgiving a student in person.
--
-- cleared_at doubles as a watermark -- strikes are recounted from it, so a
-- student who no-shows again after being forgiven is blocked again.
CREATE TABLE queue_block_overrides (
    override_id     INT          AUTO_INCREMENT PRIMARY KEY,
    student_id      INT          NOT NULL,
    block_date      DATE         NOT NULL,
    cleared_by      INT          NOT NULL,          -- users.user_id (admin or faculty host)
    cleared_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    note            VARCHAR(255) NULL,
    INDEX idx_override_student_date (student_id, block_date),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (cleared_by) REFERENCES users(user_id)
);

-- ── 5. queue_priority_credits: compensation for being left unserved ─────────
-- When a queue closes with people still waiting, those students are owed a
-- head start -- but nothing may be reserved for them, because that would
-- reintroduce the online reservation the panel just removed. A credit is
-- inert: it does nothing until the student physically comes back and scans
-- in again, at which point it puts them at the front and is consumed. If
-- they never return it simply expires.
CREATE TABLE queue_priority_credits (
    credit_id         INT        AUTO_INCREMENT PRIMARY KEY,
    student_id        INT        NOT NULL,
    service_id        INT        NOT NULL,
    source_queue_id   INT        NULL,              -- the entry that went unserved
    reason            VARCHAR(255) NULL,
    expires_at        DATETIME   NOT NULL,
    consumed_at       DATETIME   NULL,
    consumed_queue_id INT        NULL,              -- the entry that spent it
    created_at        TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_credit_lookup (student_id, service_id, consumed_at, expires_at),
    FOREIGN KEY (student_id)        REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id)        REFERENCES services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (source_queue_id)   REFERENCES queues(queue_id)     ON DELETE SET NULL,
    FOREIGN KEY (consumed_queue_id) REFERENCES queues(queue_id)     ON DELETE SET NULL
);

-- ── 6. queue_requirement_checks: pre-processing while waiting ───────────────
-- The student ticks off the service's requirements from their phone after
-- joining, so the host sees a pre-validated checklist when they're called.
-- Keyed on the queue entry (not the student) so each visit is independent.
CREATE TABLE queue_requirement_checks (
    queue_id        INT          NOT NULL,
    requirement_id  INT          NOT NULL,
    is_checked      BOOLEAN      NOT NULL DEFAULT FALSE,
    checked_at      TIMESTAMP    NULL,
    PRIMARY KEY (queue_id, requirement_id),
    FOREIGN KEY (queue_id)       REFERENCES queues(queue_id)                      ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES service_requirements(requirement_id)  ON DELETE CASCADE
);

-- ── 7. appointment_feedback: optional, one per appointment ──────────────────
-- appointment_id is the PRIMARY KEY, not just indexed -- that is what enforces
-- "exactly once" at the DB layer, so a double-submit races into a duplicate-key
-- error instead of two rows. Distinct from appointments.shared_comment, which
-- is the professor's "actions taken" note and is not student-writable.
CREATE TABLE appointment_feedback (
    appointment_id  INT          PRIMARY KEY,
    student_id      INT          NOT NULL,
    feedback_text   TEXT         NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedback_student (student_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)     REFERENCES students(student_id)         ON DELETE CASCADE
);

-- ── 8. queues: ordering, provenance and cancellation attribution ────────────
-- priority_rank exists because queue_number CANNOT be renumbered to express
-- priority or a transfer: uq_queue_slot_number(slot_id, queue_number) turns
-- any shuffle into a deadlock farm. Instead queue_number stays a stable
-- display label and the canonical order becomes
--   ORDER BY priority_rank DESC, created_at ASC, queue_id ASC
-- A priority credit sets rank 1. A relayed entry keeps its ORIGINAL
-- created_at, which by itself lands it mid-line in the destination rather
-- than at the back -- so "transfer without losing your place" needs no
-- special case beyond preserving that timestamp.
ALTER TABLE queues
  ADD COLUMN priority_rank TINYINT NOT NULL DEFAULT 0 AFTER queue_number,
  -- Mirrors appointments.cancelled_by so both modules attribute an ended
  -- record the same way. 'system_not_entertained' is the queue equivalent of
  -- the appointment sweeper's value: the office closed before reaching them.
  ADD COLUMN cancelled_by ENUM('student','admin','faculty','system','system_no_show','system_not_entertained') NULL AFTER admin_reason,
  ADD COLUMN transferred_from_slot_id INT NULL AFTER cancelled_by,
  -- Defaulted to 'online' on purpose: every row that exists at migration time
  -- really was joined online, so the backfill is historically accurate. The
  -- default flips to 'onsite_qr' immediately below for all future joins.
  ADD COLUMN joined_via ENUM('online','onsite_qr') NOT NULL DEFAULT 'online' AFTER transferred_from_slot_id,
  ADD INDEX idx_queue_order (slot_id, status, priority_rank, created_at);

ALTER TABLE queues
  ALTER COLUMN joined_via SET DEFAULT 'onsite_qr';

ALTER TABLE queues
  ADD CONSTRAINT fk_queues_transferred_from
    FOREIGN KEY (transferred_from_slot_id) REFERENCES queue_slots(slot_id) ON DELETE SET NULL;
