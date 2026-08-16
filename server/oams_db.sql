-- ============================================================
-- OAMS Database Schema
-- Path: server/oams_db.sql
-- Run this file first, then server/db/mock/ccs_mock_data.sql
--
-- DANGER: The DROP DATABASE line below is commented out.
-- Only uncomment it intentionally in a controlled environment.
-- ============================================================

-- CREATE DATABASE oams_db;
-- DROP DATABASE oams_db;  ← DANGER: only run manually, never in automation
USE oams_db;

-- ─────────────────────────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE departments (
    department_id       INT          AUTO_INCREMENT PRIMARY KEY,
    department_name     VARCHAR(100) NOT NULL,
    department_abbreviation VARCHAR(20) NOT NULL,  -- tightened from VARCHAR(100)
    office_location     VARCHAR(100),
    office_hours        TEXT         NULL
);

-- ─────────────────────────────────────────────────────────────
-- 2. PARENT USERS
-- Holds credentials and role assignment only.
-- Profile data lives in child tables (students/faculty/administrators).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
    user_id             INT          AUTO_INCREMENT PRIMARY KEY,
    password            VARCHAR(255) NOT NULL,
    role                ENUM('student','faculty','admin') NOT NULL,
    status              ENUM('active','inactive','suspended') DEFAULT 'active',
    last_login_at       TIMESTAMP    NULL,
    failed_login_attempts INT        NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP    NULL DEFAULT NULL,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)   -- added: role is queried on every authenticated request
);

-- ─────────────────────────────────────────────────────────────
-- 3. CHILD USER TABLES
-- NOTE: student_id / faculty_id / admin_id are NOT auto-increment —
--       they mirror users.user_id via FK.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE students (
    student_id      INT          PRIMARY KEY,
    student_number  VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    course          VARCHAR(100) NOT NULL,
    year_level      INT          NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    department_id   INT          NOT NULL,
    FOREIGN KEY (student_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_students_dept (department_id)
);

CREATE TABLE faculty (
    faculty_id          INT          PRIMARY KEY,
    employee_id         VARCHAR(20)  NOT NULL UNIQUE,
    first_name          VARCHAR(50)  NOT NULL,
    last_name           VARCHAR(50)  NOT NULL,
    specialization      VARCHAR(100),
    position            VARCHAR(100) NOT NULL DEFAULT 'Faculty Member',
    email               VARCHAR(100) NOT NULL UNIQUE,
    department_id       INT          NOT NULL,
    availability_status ENUM('available','unavailable') NOT NULL DEFAULT 'available',
    FOREIGN KEY (faculty_id)    REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_faculty_dept (department_id)
);

-- NOTE: No super_admin role. Admins are scoped to their department_id.
CREATE TABLE administrators (
    admin_id        INT          PRIMARY KEY,
    employee_id     VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    position        VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    department_id   INT          NOT NULL,
    FOREIGN KEY (admin_id)      REFERENCES users(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. USER ACCOUNT MANAGEMENT
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_sessions (
    session_id      INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    session_token   VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    login_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL,
    logout_at       TIMESTAMP    NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- One user can hold multiple tokens (phone + tablet). Unique on the token,
-- not user_id, so re-registering on login upserts (device kept, owner may
-- change -- shared/reissued devices on campus are a real case).
CREATE TABLE push_tokens (
    push_token_id   INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uq_push_tokens_token (expo_push_token)
);

CREATE TABLE login_logs (
    log_id           INT          AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NULL,               -- NULL on failed attempt for unknown user
    user_id_attempted VARCHAR(50) NOT NULL,           -- the raw value typed at login
    ip_address       VARCHAR(45),
    user_agent       TEXT,
    login_status     ENUM('success','failed') NOT NULL,
    failure_reason   VARCHAR(255),
    attempted_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 5. SERVICES & REQUIREMENTS (queue only)
-- ─────────────────────────────────────────────────────────────

-- Fixed set of on-campus premises (rooms/offices/windows) admins and
-- faculty pick from instead of typing free text. department_id NULL =
-- shared/global location (visible to every department's dropdown).
CREATE TABLE locations (
    location_id     INT          AUTO_INCREMENT PRIMARY KEY,
    department_id   INT          NULL,
    location_name   VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE,
    UNIQUE KEY uq_location_dept_name (department_id, location_name)
);

CREATE TABLE services (
    service_id            INT          AUTO_INCREMENT PRIMARY KEY,
    service_name          VARCHAR(100) NOT NULL,
    description           TEXT,
    department_id         INT          NOT NULL,   -- the owning/creating department, always real
    is_cross_college       BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE = other departments' students can also use it
    location_id           INT          NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id)   REFERENCES locations(location_id)     ON DELETE SET NULL
);

CREATE TABLE service_requirements (
    requirement_id   INT          AUTO_INCREMENT PRIMARY KEY,
    service_id       INT          NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    description      TEXT,
    is_mandatory     BOOLEAN      DEFAULT TRUE,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

CREATE TABLE service_procedure_steps (
    step_id      INT          AUTO_INCREMENT PRIMARY KEY,
    service_id   INT          NOT NULL,
    step_number  INT          NOT NULL,
    step_title   VARCHAR(255) NOT NULL,
    description  TEXT,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    UNIQUE KEY uq_service_step (service_id, step_number)
);

-- ─────────────────────────────────────────────────────────────
-- 5b. APPOINTMENT SERVICES (created by faculty, for appointments only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE appointment_services (
    service_id      INT          AUTO_INCREMENT PRIMARY KEY,
    service_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    faculty_id      INT          NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 5c. DOCUMENT SERVICES (document requests only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE document_services (
    service_id       INT          AUTO_INCREMENT PRIMARY KEY,
    service_name     VARCHAR(100) NOT NULL,
    description      TEXT,
    department_id    INT          NOT NULL,   -- the owning/creating department, always real
    is_cross_college BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE = other departments' students/faculty can also use it
    recipient_type   ENUM('students','faculty','both') NOT NULL DEFAULT 'students',
    status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
    processing_time  VARCHAR(100) NULL,
    requires_coding  BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE = office must assign an official (dean-sanctioned) code before release
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT
);

CREATE TABLE document_requirements (
    requirement_id   INT          AUTO_INCREMENT PRIMARY KEY,
    service_id       INT          NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    description      TEXT,
    is_mandatory     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES document_services(service_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 6. QUEUE SLOT MANAGEMENT
-- Controls capacity per service window. Separate from appointments.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE queue_slots (
    slot_id         INT          AUTO_INCREMENT PRIMARY KEY,
    service_id      INT          NOT NULL,
    admin_id        INT          NOT NULL,
    slot_date       DATE         NOT NULL,
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    max_capacity    INT          NOT NULL DEFAULT 20,
    current_count   INT          NOT NULL DEFAULT 0,
    no_show_timeout_minutes INT  NOT NULL DEFAULT 15,
    service_time_minutes INT     NOT NULL DEFAULT 15, -- admin-configured est. time per student for this specific queue instance
    status          ENUM('open','paused','full','expired','completed','closed','cancelled') DEFAULT 'open',
    pause_reason    VARCHAR(255) NULL,
    close_reason    VARCHAR(255) NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (admin_id)   REFERENCES administrators(admin_id),
    -- prevents duplicate slots for the same service on the same day/time window
    UNIQUE KEY uq_slot_window (service_id, slot_date, start_time)
);

-- ─────────────────────────────────────────────────────────────
-- 7. QUEUE SYSTEM
-- ─────────────────────────────────────────────────────────────
CREATE TABLE queues (
    queue_id        INT          AUTO_INCREMENT PRIMARY KEY,
    student_id      INT          NOT NULL,
    service_id      INT          NOT NULL,
    slot_id         INT          NULL,
    queue_number    INT          NOT NULL,
    status          ENUM('waiting','serving','completed','cancelled','no_show') DEFAULT 'waiting',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- Auto-touched on any change to this row (status, notes, etc). Lets the
    -- transactions feeds (GET .../transactions) sort by "most recently
    -- modified" instead of only "most recently created".
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    called_at       TIMESTAMP    NULL,
    -- Set when an admin confirms a called ('serving') student has physically
    -- shown up, distinct from called_at. Stops the no-show sweeper's timeout
    -- clock (queueNoShowSweeper.js) so a long service session isn't mistaken
    -- for an absence -- see PATCH /queue-hosting/:slotId/mark-arrived.
    arrived_at      TIMESTAMP    NULL,
    completed_at    TIMESTAMP    NULL,
    cancelled_at    TIMESTAMP    NULL,
    notes           TEXT,
    -- Reason an admin gave when force-cancelling this entry by stopping the
    -- whole queue slot. NULL when the student left voluntarily. Kept separate
    -- from `notes` (the student's own concern text) so neither overwrites
    -- the other.
    admin_reason    VARCHAR(255) NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (slot_id)    REFERENCES queue_slots(slot_id),
    -- Defense-in-depth: queue numbers are generated app-side under a row
    -- lock on the owning slot (POST /queues/join), but nothing previously
    -- stopped a duplicate at the DB layer if that ever got bypassed.
    UNIQUE KEY uq_queue_slot_number (slot_id, queue_number),
    -- Supports the per-service/date-range aggregate queries used by
    -- GET /admin/queue-analytics (performance, peak-hour, and trend
    -- comparisons all filter+group on this pair).
    INDEX idx_queues_service_created (service_id, created_at)
);

-- Audit trail for all queue status transitions
CREATE TABLE queue_status_logs (
    log_id          INT          AUTO_INCREMENT PRIMARY KEY,
    queue_id        INT          NOT NULL,
    old_status      VARCHAR(50),
    new_status      VARCHAR(50)  NOT NULL,
    changed_by      INT          NULL,
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id)   REFERENCES queues(queue_id)   ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id)     ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- FACULTY AVAILABILITY
-- Recurring weekly schedule: faculty sets a day-of-week + time
-- window that repeats every week until edited/removed.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id       INT NOT NULL,
    day_of_week      ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    location         VARCHAR(150),
    max_students     INT NULL,    -- NULL = indefinite (no cap on bookings)
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    INDEX idx_faculty_availability_faculty (faculty_id)
);

-- Links which appointment_services a faculty offers for a recurring weekly slot
CREATE TABLE faculty_availability_services (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    availability_id   INT NOT NULL,
    service_id        INT NOT NULL,
    FOREIGN KEY (availability_id) REFERENCES faculty_availability(availability_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id)      REFERENCES appointment_services(service_id) ON DELETE CASCADE,
    UNIQUE KEY uq_availability_service (availability_id, service_id)
);

-- ─────────────────────────────────────────────────────────────
-- 8. APPOINTMENT SYSTEM
-- ─────────────────────────────────────────────────────────────
CREATE TABLE appointments (
    appointment_id      INT          AUTO_INCREMENT PRIMARY KEY,
    student_id          INT          NOT NULL,
    faculty_id          INT          NOT NULL,
    department_id       INT          NOT NULL,
    service_id          INT          NULL,   -- FK to appointment_services (the chosen appointment type)
    availability_id     INT          NULL,   -- FK to faculty_availability; the recurring template this was booked against
    location_snapshot     VARCHAR(150) NULL, -- location captured at booking time, immune to the template being edited/deleted later
    window_start_snapshot TIME         NULL, -- consultation window captured at booking time (same reason)
    window_end_snapshot   TIME         NULL,
    appointment_date    DATE         NOT NULL,
    appointment_time    TIME         NOT NULL,
    status              ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
    cancelled_by        ENUM('student','faculty','system') NULL, -- who/what triggered a 'cancelled' status, for activity-feed attribution
    notes               TEXT,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- Auto-touched on any change to this row. Lets the transactions feeds
    -- sort by "most recently modified" -- appointments otherwise have no
    -- other timestamp column, so without this an approved/completed
    -- appointment would forever sort/display by its original booking time.
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Set by appointmentReminderSweeper.js once a reminder notification has
    -- been sent for this appointment, so the sweep never re-notifies the
    -- same appointment on a later run (unlike updated_at, a fixed
    -- appointment_date/time keeps matching the sweep's "within N hours"
    -- window on every tick until the appointment passes).
    reminder_sent_at    TIMESTAMP    NULL DEFAULT NULL,
    -- Set by appointmentReminderSweeper.js once it has nudged the faculty
    -- member that a 'pending' request has sat unanswered for 48+ hours --
    -- a separate flag from reminder_sent_at since they track two unrelated
    -- notifications on the same row (one to the student pre-appointment,
    -- one to faculty while still awaiting approval).
    pending_nudge_sent_at TIMESTAMP  NULL DEFAULT NULL,
    -- Computed from this row's own columns; NULL whenever status is
    -- cancelled/rejected, so any number of cancelled/rejected rows can share
    -- the same student/faculty/date/time -- only a genuinely ACTIVE duplicate
    -- collides via uq_active_booking below. MySQL has no native partial/
    -- filtered unique index, so this generated column is the standard
    -- workaround. STORED (not VIRTUAL) so the unique index has a real
    -- materialized value to check.
    active_booking_key VARCHAR(80) GENERATED ALWAYS AS (
        CASE WHEN status NOT IN ('cancelled', 'rejected')
             THEN CONCAT(student_id, '_', faculty_id, '_', appointment_date, '_', appointment_time)
             ELSE NULL END
    ) STORED,
    FOREIGN KEY (student_id)      REFERENCES students(student_id),
    FOREIGN KEY (faculty_id)      REFERENCES faculty(faculty_id),
    FOREIGN KEY (department_id)   REFERENCES departments(department_id),
    FOREIGN KEY (service_id)      REFERENCES appointment_services(service_id)     ON DELETE SET NULL,
    FOREIGN KEY (availability_id) REFERENCES faculty_availability(availability_id) ON DELETE SET NULL,
    -- Targets ACTIVE bookings only (see active_booking_key above), so a
    -- student cancelling then rebooking the same slot can always insert a
    -- fresh row -- a second genuinely active booking for the same slot still
    -- collides, as a defense-in-depth backstop behind the application-level
    -- guard in POST /appointments/book-slot.
    UNIQUE KEY uq_active_booking (active_booking_key),
    -- student_id's FK needs its own supporting index now that
    -- uq_appointment_slot (which used to cover it as a leftmost column) is
    -- gone; faculty_id/service_id/availability_id already get one
    -- automatically from their own FK definitions above.
    INDEX idx_appointments_student (student_id),
    INDEX idx_appointments_dept_service (department_id, service_id)
);

-- ─────────────────────────────────────────────────────────────
-- 9. DOCUMENT PROCESSING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE document_requests (
    request_id              INT          AUTO_INCREMENT PRIMARY KEY,
    tracking_number         VARCHAR(50)  NOT NULL UNIQUE, -- Dynamically assigned via trigger below    
    student_id              INT          NOT NULL,  
    service_id              INT          NOT NULL,
    request_type            VARCHAR(100) NOT NULL,
    purpose                 VARCHAR(255) NOT NULL,
    copies                  INT          NOT NULL DEFAULT 1,
    -- 'cancelled' = student voluntarily withdrew the request while it was
    -- still pending/processing. Kept as a status (not a DELETE) so it stays
    -- visible in transaction history, same as queues/appointments.
    status                  ENUM('pending','processing','generated','released','claimed','rejected','cancelled') DEFAULT 'pending',
    estimated_completion    DATE         NULL,
    needed_by               DATE         NULL,
    released_at             TIMESTAMP    NULL,
    claimed_at              TIMESTAMP    NULL,
    notes                   TEXT         NULL,
    official_code           VARCHAR(100) NULL, -- manually entered by admin, dean-sanctioned; only set when the service requires_coding
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- Auto-touched on any change to this row (status, notes, etc). Lets the
    -- transactions feeds sort by "most recently modified" instead of only
    -- "most recently created".
    updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Set by documentPickupSweeper.js once it has notified an admin that this
    -- request has sat unclaimed for 7+ days -- prevents re-escalating the
    -- same request on every subsequent daily sweep (the student's own daily
    -- reminder is separate and intentionally keeps repeating; see updated_at).
    escalated_at            TIMESTAMP    NULL DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES document_services(service_id),
    INDEX idx_document_requests_tracking (tracking_number)
);

-- request_id is nullable because a generated_files row can belong to either a
-- student document_requests row OR a faculty_document_requests row (never both)
-- -- see the faculty_request_id column/FK/CHECK added via ALTER TABLE right
-- after faculty_document_requests is created below (forward reference, so it
-- can't be inline here). file_name/file_path are nullable because this table
-- no longer tracks an actual generated file -- it exists purely to link an
-- admin-assigned official_code's QR value to a request for the scan/verify flow.
CREATE TABLE generated_files (
    file_id         INT          AUTO_INCREMENT PRIMARY KEY,
    request_id      INT          NULL,
    qr_code         VARCHAR(255),
    generated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES document_requests(request_id) ON DELETE CASCADE
);

CREATE TABLE qr_tracking_logs (
    log_id          INT          AUTO_INCREMENT PRIMARY KEY,
    file_id         INT          NOT NULL,
    scanned_by      INT          NOT NULL,
    scan_location   VARCHAR(100),
    scan_time       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id)    REFERENCES generated_files(file_id),
    FOREIGN KEY (scanned_by) REFERENCES users(user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 9b. DOCUMENT SUBMISSIONS (student -> office: sending a document, e.g.
--     for encoding -- as opposed to document_requests, which is the
--     office -> student direction. Deliberately named distinctly from the
--     dormant `submissions`/`submitted_files` tables further down (an
--     unrelated, unbuilt professor class-assignment feature) to avoid
--     confusing the two "submission" concepts.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE document_submissions (
    submission_id   INT          AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(50)  NOT NULL UNIQUE, -- assigned via trigger below (SUB-00001, ...)
    student_id      INT          NOT NULL,
    -- Direct FK, unlike document_requests.service_id -- there's no
    -- document_services concept here (no type/copies/coding), so the
    -- department is resolved once at creation time from the student's own
    -- department_id and stored directly.
    department_id   INT          NOT NULL,
    title           VARCHAR(255) NOT NULL, -- student-authored; stands in for "document type" everywhere in the UI
    purpose         VARCHAR(255) NOT NULL,
    -- Deliberately smaller than document_requests.status: no 'generated'/
    -- 'released' -- nothing is physically generated or picked up in this
    -- direction, so claimed is reached directly from processing.
    status          ENUM('pending','processing','claimed','rejected','cancelled') DEFAULT 'pending',
    needed_by       DATE         NULL,
    notes           TEXT         NULL, -- admin processing/rejection notes, mirrors document_requests.notes
    claimed_at      TIMESTAMP    NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)    REFERENCES students(student_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_document_submissions_tracking (tracking_number),
    INDEX idx_document_submissions_student (student_id),
    INDEX idx_document_submissions_dept (department_id)
);

-- One table for BOTH attachment channels (the student's uploaded files AND
-- the office's return files), disambiguated by `direction` -- not two
-- separate tables, since both channels need identical columns and identical
-- budget logic (5 files / 10MB each, independently per direction via
-- "AND direction = ?"). All reads/writes go through
-- server/utils/documentSubmissionAttachments.js, which always takes an
-- explicit `direction` argument, so a missing filter can't leak one
-- channel's files into the other.
CREATE TABLE document_submission_files (
    file_id         INT          AUTO_INCREMENT PRIMARY KEY,
    submission_id   INT          NOT NULL,
    direction       ENUM('student_upload','admin_return') NOT NULL,
    filename        VARCHAR(255) NOT NULL, -- original filename, display only
    file_path       VARCHAR(255) NOT NULL, -- UUID-based name actually on disk
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INT          NOT NULL,
    uploaded_by     INT          NOT NULL, -- users.user_id -- the student for student_upload rows, the admin for admin_return rows
    uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES document_submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)   REFERENCES users(user_id),
    INDEX idx_document_submission_files_submission (submission_id, direction)
);

-- Auto-generates tracking_number on insert (SUB-00001, SUB-00002, ...).
-- Unlike ts_auto_tracking_number/_faculty (which only exist in
-- server/db/mock/ccs_mock_data.sql, not here -- a fresh DB never gets those
-- unless the mock file happens to run after this one), this trigger is
-- defined directly in the schema file where it belongs.
DROP TRIGGER IF EXISTS ts_auto_tracking_number_submission;
DELIMITER //
CREATE TRIGGER ts_auto_tracking_number_submission
BEFORE INSERT ON document_submissions
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    SELECT COALESCE(MAX(submission_id), 0) + 1 INTO next_id FROM document_submissions;
    SET NEW.tracking_number = CONCAT('SUB-', LPAD(next_id, 5, '0'));
END//
DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- 11. ANNOUNCEMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE announcements (
    announcement_id  INT          AUTO_INCREMENT PRIMARY KEY,
    title           TEXT         NOT NULL,
    content         TEXT         NOT NULL,
    type            ENUM('important','event','reminder','general') NOT NULL DEFAULT 'general',
    status          ENUM('active','archived')                      NOT NULL DEFAULT 'active',
    created_by      VARCHAR(255) NULL,
    is_pinned       BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Who this announcement is for. Faculty-audience announcements have no
    -- real category -- `type` is always forced to 'general' for them
    -- server-side and the type picker is hidden client-side, since the ENUM
    -- above has no NULL option and adding one would ripple through every
    -- existing type-keyed lookup for no benefit.
    audience        ENUM('students','faculty') NOT NULL DEFAULT 'students',
    department_id   INT          NOT NULL,   -- the posting department, always real
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- Deliberately NOT "ON UPDATE CURRENT_TIMESTAMP" -- pin/archive/restore all
    -- run their own UPDATE against this row and must NOT bump this column, only
    -- an actual content edit (or a restore, treated as a repost) should. Those
    -- specific handlers set this explicitly in their own UPDATE statement.
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    INDEX idx_announcements_pinned_updated (is_pinned, updated_at),
    INDEX idx_announcements_audience (audience, department_id, status)
);

-- Up to 5 files per announcement, sharing a combined 50MB budget enforced
-- app-side (multer only enforces per-file size + file count natively).
CREATE TABLE announcement_attachments (
    attachment_id   INT          AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT          NOT NULL,
    filename        VARCHAR(255) NOT NULL, -- original filename, display only
    file_path       VARCHAR(255) NOT NULL, -- UUID-based name actually on disk, relative to server root
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INT          NOT NULL, -- bytes; used for the shared-budget check and UI totals
    uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(announcement_id) ON DELETE CASCADE,
    INDEX idx_announcement_attachments_announcement (announcement_id)
);

-- ─────────────────────────────────────────────────────────────
-- 12. EXTERNAL SYNC (Pinnacle / SSO Microservice)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE external_sync_logs (
    sync_id           INT          AUTO_INCREMENT PRIMARY KEY,
    external_system   VARCHAR(50)  DEFAULT 'Pinnacle',
    sync_type         ENUM('auth','profile','enrollment','schedule') NOT NULL,
    sync_status       ENUM('pending','success','failed') DEFAULT 'pending',
    synced_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 13. DATA ADMIN MANAGEMENT
-- ─────────────────────────────────────────────────────────────

-- Full audit trail for all admin-initiated actions
CREATE TABLE audit_logs (
    log_id           INT          AUTO_INCREMENT PRIMARY KEY,
    admin_id         INT          NOT NULL,
    action           ENUM('CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT') NOT NULL,
    target_table     VARCHAR(100),
    target_record_id INT,
    old_values       JSON,
    new_values       JSON,
    ip_address       VARCHAR(45),
    user_agent       TEXT,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administrators(admin_id)
);

-- System configuration controlled by admins
CREATE TABLE system_settings (
    setting_id      INT          AUTO_INCREMENT PRIMARY KEY,
    setting_key     VARCHAR(100) NOT NULL UNIQUE,
    setting_value   TEXT,
    description     TEXT,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 14. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    notification_id  INT          AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    message          TEXT         NOT NULL,
    type             ENUM('queue','document','appointment','announcement') NOT NULL DEFAULT 'queue',
    is_read          BOOLEAN      DEFAULT FALSE,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 15. FACULTY DOCUMENT REQUESTS (faculty requesting their own documents)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty_document_requests (
    request_id           INT          AUTO_INCREMENT PRIMARY KEY,
    tracking_number      VARCHAR(50)  NOT NULL UNIQUE,
    faculty_id           INT          NOT NULL,
    service_id           INT          NOT NULL,
    request_type         VARCHAR(100) NOT NULL DEFAULT 'General',
    purpose              VARCHAR(255) NOT NULL,
    copies               INT          NOT NULL DEFAULT 1,
    -- 'cancelled' = faculty voluntarily withdrew the request while it was
    -- still pending/processing. Kept as a status (not a DELETE) so it stays
    -- visible in transaction history, same as queues/appointments.
    status               ENUM('pending','processing','generated','released','claimed','rejected','cancelled') DEFAULT 'pending',
    estimated_completion DATE         NULL,
    needed_by            DATE         NULL,
    released_at          TIMESTAMP    NULL,
    claimed_at           TIMESTAMP    NULL,
    notes                TEXT         NULL,
    official_code        VARCHAR(100) NULL, -- manually entered by admin, dean-sanctioned; only set when the service requires_coding
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- Auto-touched on any change to this row. Lets the transactions feeds
    -- sort by "most recently modified" instead of only "most recently created".
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Set by documentPickupSweeper.js once it has notified an admin that this
    -- request has sat unclaimed for 7+ days -- see document_requests.escalated_at
    -- for the full reasoning (identical pattern, mirrored here).
    escalated_at         TIMESTAMP    NULL DEFAULT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES document_services(service_id),
    INDEX idx_faculty_doc_requests_faculty (faculty_id)
);

-- generated_files can belong to either a student or a faculty document request, never both.
-- Added here via ALTER (not inline in the generated_files CREATE TABLE above) because
-- faculty_document_requests has to exist first for the FK to be valid.
ALTER TABLE generated_files
    ADD COLUMN faculty_request_id INT NULL AFTER request_id,
    ADD CONSTRAINT fk_generated_files_faculty_request
        FOREIGN KEY (faculty_request_id) REFERENCES faculty_document_requests(request_id) ON DELETE CASCADE,
    ADD CONSTRAINT chk_generated_files_one_parent
        CHECK ((request_id IS NOT NULL AND faculty_request_id IS NULL) OR (request_id IS NULL AND faculty_request_id IS NOT NULL));

-- ─────────────────────────────────────────────────────────────
-- 16. SECTIONS & SUBMISSIONS (schema only -- no routes/controllers/UI yet)
-- Professors will eventually host a section of students and post file-
-- submission assignments; students submit files that were either generated
-- by COAMS itself (always carries a reference_code) or issued by the school
-- some other way (code optional). Reserved for a future feature -- kept here
-- now so the schema exists ahead of time.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE sections (
    section_id      INT          AUTO_INCREMENT PRIMARY KEY,
    faculty_id      INT          NOT NULL,
    department_id   INT          NOT NULL,
    section_name    VARCHAR(100) NOT NULL,
    status          ENUM('active','archived') DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id)    REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_sections_faculty (faculty_id)
);

-- Join table (not a direct FK on students) so a student's enrollment history
-- survives being dropped and re-enrolled without any change to `students`.
CREATE TABLE section_enrollments (
    enrollment_id   INT          AUTO_INCREMENT PRIMARY KEY,
    section_id      INT          NOT NULL,
    student_id      INT          NOT NULL,
    status          ENUM('enrolled','dropped') DEFAULT 'enrolled',
    enrolled_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE KEY uq_section_enrollments_section_student (section_id, student_id)
);

CREATE TABLE submissions (
    submission_id   INT          AUTO_INCREMENT PRIMARY KEY,
    section_id      INT          NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    requires_code   BOOLEAN      NOT NULL DEFAULT FALSE, -- mirrors document_services.requires_coding
    deadline        DATETIME     NULL,
    status          ENUM('open','closed') DEFAULT 'open',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    INDEX idx_submissions_section (section_id)
);

-- A submitted file is either COAMS-generated (always carries a reference_code,
-- mirroring generated_files.qr_code) or issued by the school some other way
-- (code optional) -- enforced by the CHECK below. Mirrors announcement_attachments
-- for the filename/file_path/mime_type/file_size shape; this feature will reuse
-- server/middleware/upload.js's existing multer config when it's eventually built.
CREATE TABLE submitted_files (
    submitted_file_id INT          AUTO_INCREMENT PRIMARY KEY,
    submission_id     INT          NOT NULL,
    student_id        INT          NOT NULL,
    filename          VARCHAR(255) NOT NULL,
    file_path         VARCHAR(255) NOT NULL,
    mime_type         VARCHAR(100) NOT NULL,
    file_size         INT          NOT NULL,
    source            ENUM('coams','school') NOT NULL,
    reference_code    VARCHAR(100) NULL,
    submitted_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id)    REFERENCES students(student_id),
    CHECK (source = 'school' OR reference_code IS NOT NULL),
    INDEX idx_submitted_files_submission (submission_id)
);

-- ============================================================
-- Schema definition ends here.
-- Seed data (departments, users, mock records) is in:
--   server/db/mock/ccs_mock_data.sql
-- Run this file first, then ccs_mock_data.sql.
-- ============================================================