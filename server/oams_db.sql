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
    external_auth_id    VARCHAR(100) NULL,
    external_auth_source VARCHAR(50) DEFAULT 'local',
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
    faculty_id      INT          PRIMARY KEY,
    employee_id     VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    specialization  VARCHAR(100),
    position        VARCHAR(100) NOT NULL DEFAULT 'Faculty Member',
    email           VARCHAR(100) NOT NULL UNIQUE,
    department_id   INT          NOT NULL,
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
CREATE TABLE services (
    service_id            INT          AUTO_INCREMENT PRIMARY KEY,
    service_name          VARCHAR(100) NOT NULL,
    description           TEXT,
    department_id         INT          NULL,   -- NULL = available across all departments
    status                ENUM('active','inactive') NOT NULL DEFAULT 'active',
    average_service_time  INT          NOT NULL DEFAULT 15,
    auto_close            BOOLEAN      NOT NULL DEFAULT TRUE,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
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
    department_id    INT          NULL,   -- NULL = available across all departments
    recipient_type   ENUM('students','faculty','both') NOT NULL DEFAULT 'students',
    status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
    fee              DECIMAL(10,2) NOT NULL DEFAULT 0,
    processing_time  VARCHAR(100) NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
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
    status          ENUM('open','paused','closed','cancelled') DEFAULT 'open',
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
    status          ENUM('waiting','serving','completed','cancelled') DEFAULT 'waiting',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    called_at       TIMESTAMP    NULL,
    completed_at    TIMESTAMP    NULL,
    cancelled_at    TIMESTAMP    NULL,
    notes           TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (slot_id)    REFERENCES queue_slots(slot_id)
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
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id       INT NOT NULL,
    day_of_week      ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    location         VARCHAR(150),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    INDEX idx_faculty_availability_faculty (faculty_id)
);

-- ─────────────────────────────────────────────────────────────
-- FACULTY BLOCKED DATES (specific-date overrides for availability)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty_blocked_dates (
    blocked_id   INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id   INT NOT NULL,
    blocked_date DATE NOT NULL,
    reason       VARCHAR(255),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_faculty_blocked (faculty_id, blocked_date),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- FACULTY DATE-SPECIFIC AVAILABILITY
-- Faculty sets exact dates + times instead of recurring day-of-week slots
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faculty_date_availability (
    id                    INT  AUTO_INCREMENT PRIMARY KEY,
    faculty_id            INT  NOT NULL,
    available_date        DATE NOT NULL,
    start_time            TIME NOT NULL,
    end_time              TIME NOT NULL,
    max_students          INT  NULL,    -- NULL = indefinite (no cap on bookings)
    status                ENUM('open','closed') NOT NULL DEFAULT 'open',
    location              VARCHAR(150),
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    INDEX idx_fda_faculty (faculty_id),
    INDEX idx_fda_date (available_date)
);

-- Links which appointment_services a faculty offers for a specific availability slot
CREATE TABLE slot_services (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    availability_id   INT NOT NULL,
    service_id        INT NOT NULL,
    FOREIGN KEY (availability_id) REFERENCES faculty_date_availability(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id)      REFERENCES appointment_services(service_id) ON DELETE CASCADE,
    UNIQUE KEY uq_slot_service (availability_id, service_id)
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
    availability_id     INT          NULL,   -- FK to faculty_date_availability; links booking to the slot
    appointment_date    DATE         NOT NULL,
    appointment_time    TIME         NOT NULL,
    status              ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)      REFERENCES students(student_id),
    FOREIGN KEY (faculty_id)      REFERENCES faculty(faculty_id),
    FOREIGN KEY (department_id)   REFERENCES departments(department_id),
    FOREIGN KEY (service_id)      REFERENCES appointment_services(service_id)  ON DELETE SET NULL,
    FOREIGN KEY (availability_id) REFERENCES faculty_date_availability(id)     ON DELETE SET NULL,
    -- prevents duplicate bookings for the same student/faculty/date/time
    UNIQUE KEY uq_appointment_slot (student_id, faculty_id, appointment_date, appointment_time),
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
    status                  ENUM('pending','processing','generated','released','rejected') DEFAULT 'pending',
    estimated_completion    DATE         NULL,
    released_at             TIMESTAMP    NULL,
    notes                   TEXT         NULL,
    created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES document_services(service_id),
    INDEX idx_document_requests_tracking (tracking_number)
);

CREATE TABLE generated_files (
    file_id         INT          AUTO_INCREMENT PRIMARY KEY,
    request_id      INT          NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       VARCHAR(255) NOT NULL,
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
-- 10. AI-POWERED CHAT SYSTEM
-- ─────────────────────────────────────────────────────────────
CREATE TABLE chat_sessions (
    session_id      INT          AUTO_INCREMENT PRIMARY KEY,
    user_id         INT          NULL,   -- NULL = unauthenticated/guest session
    status          ENUM('active','closed','expired') DEFAULT 'active',
    started_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    ended_at        TIMESTAMP    NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE chat_messages (
    message_id       INT          AUTO_INCREMENT PRIMARY KEY,
    session_id       INT          NOT NULL,
    sender_type      ENUM('user','ai','admin') NOT NULL,
    message_content  TEXT         NOT NULL,
    intent_detected  VARCHAR(100),
    confidence_score DECIMAL(5,4),
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Local knowledge base for AI FAQ responses, scoped per department
CREATE TABLE chatbot_knowledge_base (
    kb_id           INT          AUTO_INCREMENT PRIMARY KEY,
    intent          VARCHAR(100) NOT NULL,
    keywords        TEXT,
    response_text   TEXT         NOT NULL,
    category        VARCHAR(100),
    department_id   INT          NULL,   -- NULL = global/cross-department entry
    is_active       BOOLEAN      DEFAULT TRUE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 11. FAQ
-- ─────────────────────────────────────────────────────────────
CREATE TABLE faqs (
    faq_id          INT          AUTO_INCREMENT PRIMARY KEY,
    question        TEXT         NOT NULL,
    answer          TEXT         NOT NULL,
    type            ENUM('important','event','reminder','general') NOT NULL DEFAULT 'general',
    status          ENUM('active','archived')                      NOT NULL DEFAULT 'active',
    created_by      VARCHAR(255) NULL,
    is_pinned       BOOLEAN      NOT NULL DEFAULT FALSE,
    department_id   INT          NULL,   -- NULL = global announcement
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    INDEX idx_faqs_pinned_created (is_pinned, created_at)
);

-- ─────────────────────────────────────────────────────────────
-- 12. EXTERNAL SYNC (Pinnacle / SSO Microservice)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE external_sync_logs (
    sync_id           INT          AUTO_INCREMENT PRIMARY KEY,
    user_id           INT          NULL,
    external_system   VARCHAR(50)  DEFAULT 'Pinnacle',
    sync_type         ENUM('auth','profile','enrollment','schedule') NOT NULL,
    external_user_id  VARCHAR(100),
    sync_status       ENUM('pending','success','failed') DEFAULT 'pending',
    request_payload   JSON,
    response_payload  JSON,
    error_message     TEXT,
    synced_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
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
-- NOTE: updated_by must be set explicitly on every UPDATE — it is not auto-managed.
CREATE TABLE system_settings (
    setting_id      INT          AUTO_INCREMENT PRIMARY KEY,
    setting_key     VARCHAR(100) NOT NULL UNIQUE,
    setting_value   TEXT,
    description     TEXT,
    updated_by      INT          NULL,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES administrators(admin_id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 14. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    notification_id  INT          AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    message          TEXT         NOT NULL,
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
    status               ENUM('pending','processing','generated','released','rejected') DEFAULT 'pending',
    estimated_completion DATE         NULL,
    released_at          TIMESTAMP    NULL,
    notes                TEXT         NULL,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES document_services(service_id),
    INDEX idx_faculty_doc_requests_faculty (faculty_id)
);

-- ============================================================
-- Schema definition ends here.
-- Seed data (departments, users, mock records) is in:
--   server/db/mock/ccs_mock_data.sql
-- Run this file first, then ccs_mock_data.sql.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- MIGRATION: Run against existing databases (do not re-run on fresh installs)
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE faculty_date_availability DROP COLUMN slot_duration_minutes;