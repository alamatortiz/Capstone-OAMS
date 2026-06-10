-- CREATE DATABASE oams_db;
USE oams_db;
-- DROP DATABASE oams_db;
-- 1. DEPARTMENTS
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    department_abbreviation VARCHAR(100) NOT NULL,
    office_location VARCHAR(100)
);


-- 2. PARENT USERS  (MODIFIED)
-- Added: status, login tracking, external auth fields for Pinnacle/SSO
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role ENUM('student','faculty','admin') NOT NULL,
    status ENUM('active','inactive','suspended') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    external_auth_id VARCHAR(100) NULL,
    external_auth_source VARCHAR(50) DEFAULT 'local',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. CHILD USER TABLES
CREATE TABLE students (
    student_id INT PRIMARY KEY,
    student_number VARCHAR(20) UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    course VARCHAR(100),
    year_level INT,
    email VARCHAR(100) NULL,
    department_id INT,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE faculty (
    faculty_id INT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    specialization VARCHAR(100),
    email VARCHAR(100) NULL,
    department_id INT,
    FOREIGN KEY (faculty_id) REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- NOTE: No super_admin role. Admins are scoped by department_id.
CREATE TABLE administrators (
    admin_id INT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    position VARCHAR(100),
    email VARCHAR(100) NULL,
    department_id INT,
    FOREIGN KEY (admin_id) REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);


-- 4. USER ACCOUNT MANAGEMENT  (NEW)
CREATE TABLE user_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    logout_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE login_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_id_attempted VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_status ENUM('success','failed') NOT NULL,
    failure_reason VARCHAR(255),
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 5. SERVICES & REQUIREMENTS
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100),
    description TEXT,
    department_id INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- NEW: Supports use-case validation (e.g., "Requirements Not Met" extension)
CREATE TABLE service_requirements (
    requirement_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);


-- 6. QUEUE SLOT MANAGEMENT  (NEW)
-- NOTE: For QUEUEING, not appointments. Controls capacity per service window.

CREATE TABLE queue_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    admin_id INT NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL DEFAULT 20,
    current_count INT DEFAULT 0,
    status ENUM('open','paused','closed','cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (admin_id) REFERENCES administrators(admin_id)
);


-- 7. QUEUE SYSTEM  (MODIFIED)

-- Added: slot_id, tracking timestamps, notes
CREATE TABLE queues (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    service_id INT,
    slot_id INT NULL,
    queue_number INT,
    status ENUM('waiting','serving','completed','cancelled') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    FOREIGN KEY (slot_id) REFERENCES queue_slots(slot_id)
);

-- NEW: Queue tracking / audit trail (Albor's queue tracking system)
CREATE TABLE queue_status_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    queue_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES queues(queue_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
);


-- 8. APPOINTMENT SYSTEM

CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    faculty_id INT,
    appointment_date DATE,
    appointment_time TIME,
    status ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
);


-- 9. DOCUMENT PROCESSING

CREATE TABLE document_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    service_id INT,
    request_type VARCHAR(100),
    status ENUM('pending','processing','generated','released') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);

CREATE TABLE generated_files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT,
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    qr_code VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES document_requests(request_id)
);

CREATE TABLE qr_tracking_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT,
    scanned_by INT,
    scan_location VARCHAR(100),
    scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES generated_files(file_id),
    FOREIGN KEY (scanned_by) REFERENCES users(user_id)
);


-- 10. AI-POWERED CHAT SYSTEM  (NEW)

CREATE TABLE chat_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    status ENUM('active','closed','expired') DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE chat_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender_type ENUM('user','ai','admin') NOT NULL,
    message_content TEXT NOT NULL,
    intent_detected VARCHAR(100),
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Local knowledge base for AI FAQ responses
CREATE TABLE chatbot_knowledge_base (
    kb_id INT AUTO_INCREMENT PRIMARY KEY,
    intent VARCHAR(100) NOT NULL,
    keywords TEXT,
    response_text TEXT NOT NULL,
    category VARCHAR(100),
    department_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);


-- 11. FAQ

CREATE TABLE faqs (
    faq_id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT,
    answer TEXT,
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);


-- 12. EXTERNAL SYNC (Pinnacle Microservice)  (NEW)

CREATE TABLE external_sync_logs (
    sync_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    external_system VARCHAR(50) DEFAULT 'Pinnacle',
    sync_type ENUM('auth','profile','enrollment','schedule') NOT NULL,
    external_user_id VARCHAR(100),
    sync_status ENUM('pending','success','failed') DEFAULT 'pending',
    request_payload JSON,
    response_payload JSON,
    error_message TEXT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);


-- 13. DATA ADMIN MANAGEMENT  (NEW)

-- Audit trail for all admin actions
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action ENUM('CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT') NOT NULL,
    target_table VARCHAR(100),
    target_record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES administrators(admin_id)
);

-- System configuration controlled by admins
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES administrators(admin_id)
);


-- 14. NOTIFICATIONS

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


-- Clear any existing log test records to isolate our live trial
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE login_logs;
TRUNCATE TABLE students;
TRUNCATE TABLE faculty;
TRUNCATE TABLE administrators;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert the Departments
INSERT INTO departments (department_id, department_name, department_abbreviation, office_location)
VALUES 
(1001, 'College of Computing Studies', 'CCS', 'PNC Main Bldg. 2nd Floor'),
(2001, 'College of Business, Accountancy and Administration', 'CBAA', 'PNC Main Bldg. 2nd Floor'),
(3001, 'College of Education', 'COED', 'PNC Main Bldg. 2nd Floor'),
(4001, 'College of Engineering', 'COE', 'PNC Main Bldg. 2nd Floor'),
(5001, 'College of Arts and Sciences', 'CAS', 'PNC Main Bldg. 2nd Floor'),
(6001, 'College of Health and Allied Sciences', 'CHAS', 'PNC Main Bldg. 2nd Floor');

-- 1. Student Account
INSERT INTO users (user_id, password, role, status) 
VALUES (101, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
 (104, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
 (105, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
 (108, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
 (109, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- 2. Faculty Account
INSERT INTO users (user_id, password, role, status) 
VALUES (102, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
 (106, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
 (107, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- 3. Administrator Account
INSERT INTO users (user_id, password, role, status) 
VALUES (103,  '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- 1. Link Student Profile (Matches John Ortiz context)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id)
VALUES (101, '2300544', 'Alvin Matthew', 'Ortiz', 'Information Technology', 3, 'ortiz@pnc.edu.ph', 1001),
 (104, '2302494', 'Luiz Gabriel', 'Rosales', 'Information Technology', 3, 'rosales@pnc.edu.ph', 1001),
 (105, '2300695', 'Joaquin Aaron', 'Recio', 'Information Technology', 3, 'recio@pnc.edu.ph', 1001),
 (108, '2300694', 'Joaquin Aaron', 'Recio', 'Information Technology', 3, 'recio@pnc.edu.ph', 2001),
 (109, '2300693', 'Joaquin Aaron', 'Recio', 'Information Technology', 3, 'recio@pnc.edu.ph', 3001);

-- 2. Link Faculty Profile
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id)
VALUES (102, 'EMP-2026-002', 'Patrick', 'Ogalesco', 'Web and Mobile Applications', 'ogalesco.maria@pnc.edu.ph', 1001),
 (106, 'EMP-2026-003', 'Marvin', 'Bicua', 'Database Management', 'bicua.maria@pnc.edu.ph', 1001),
 (107, 'EMP-2026-004', 'Janus Raymond', 'Tan', 'Backend Development', 'tan.maria@pnc.edu.ph', 1001);

-- 3. Link Admin Profile
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id)
VALUES (103, 'ADM-2026-003', 'Admin', 'Superuser', 'System Registrar Office', 'admin.oams@pnc.edu.ph', 1001);

-- ============================================================
-- DUMMY SEED DATA — Student Dashboard Testing
-- Run this AFTER the main oams_db.sql schema + user inserts
-- Password for all accounts: password123
-- ============================================================

-- ── Services (needed before queues/documents can reference them) ──────────
INSERT INTO services (service_id, service_name, description, department_id) VALUES
(1, 'Enrollment Assistance',    'Help with enrollment and subject loading',         1001),
(2, 'Grade Inquiry',            'Request for grade verification or correction',     1001),
(3, 'Good Moral Certificate',   'Request for Good Moral Certificate',               1001),
(4, 'Transcript of Records',    'Request for official Transcript of Records',       1001),
(5, 'Certificate of Enrollment','Request for Certificate of Enrollment',            2001),
(6, 'Clearance Processing',     'Process student clearance for graduation/leave',   3001);

-- ── Queue Slots (open slots for today — required by queue FK) ─────────────
INSERT INTO queue_slots (slot_id, service_id, admin_id, slot_date, start_time, end_time, max_capacity, current_count, status) VALUES
(1, 1, 103, CURDATE(), '08:00:00', '12:00:00', 30, 12, 'open'),
(2, 2, 103, CURDATE(), '08:00:00', '17:00:00', 20, 7,  'open'),
(3, 3, 103, CURDATE(), '13:00:00', '17:00:00', 15, 4,  'open'),
(4, 4, 103, CURDATE(), '08:00:00', '12:00:00', 20, 9,  'open');

-- ── QUEUES ────────────────────────────────────────────────────────────────
-- Student 101 (Alvin Matthew Ortiz): 1 active queue + 2 completed
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at, called_at, completed_at) VALUES
(1,  101, 1, 1,  8,  'waiting',   NOW() - INTERVAL 20 MINUTE, NULL, NULL),
(2,  101, 3, 3,  3,  'completed', NOW() - INTERVAL 3 DAY,     NOW() - INTERVAL 3 DAY + INTERVAL 30 MINUTE, NOW() - INTERVAL 3 DAY + INTERVAL 45 MINUTE),
(3,  101, 4, 4,  11, 'completed', NOW() - INTERVAL 7 DAY,     NOW() - INTERVAL 7 DAY + INTERVAL 20 MINUTE, NOW() - INTERVAL 7 DAY + INTERVAL 40 MINUTE);

-- Student 104 (Luiz Gabriel Rosales): different position — further back in queue
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
(4,  104, 1, 1,  11, 'waiting',   NOW() - INTERVAL 5 MINUTE),
(5,  104, 2, 2,  5,  'waiting',   NOW() - INTERVAL 10 MINUTE);

-- Other students in the same slots (so position math works correctly)
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
(10, 105, 1, 1,  1,  'waiting', NOW() - INTERVAL 60 MINUTE),
(11, 108, 1, 1,  2,  'waiting', NOW() - INTERVAL 55 MINUTE),
(12, 109, 1, 1,  3,  'waiting', NOW() - INTERVAL 50 MINUTE),
(13, 105, 1, 1,  4,  'waiting', NOW() - INTERVAL 45 MINUTE),
(14, 108, 1, 1,  5,  'waiting', NOW() - INTERVAL 40 MINUTE),
(15, 109, 1, 1,  6,  'waiting', NOW() - INTERVAL 35 MINUTE),
(16, 105, 1, 1,  7,  'waiting', NOW() - INTERVAL 30 MINUTE),
-- queue_number 8 = student 101 (position 8)
(17, 108, 1, 1,  9,  'waiting', NOW() - INTERVAL 15 MINUTE),
(18, 109, 1, 1,  10, 'waiting', NOW() - INTERVAL 12 MINUTE);
-- queue_number 11 = student 104 (position 11)

-- ── APPOINTMENTS ──────────────────────────────────────────────────────────
-- Student 101: 2 upcoming, 1 completed
INSERT INTO appointments (appointment_id, student_id, faculty_id, appointment_date, appointment_time, status, notes, created_at) VALUES
(1, 101, 102, CURDATE() + INTERVAL 2 DAY, '10:00:00', 'approved', 'Thesis consultation',  NOW() - INTERVAL 1 DAY),
(2, 101, 106, CURDATE() + INTERVAL 4 DAY, '14:00:00', 'pending',  'Grade inquiry',         NOW() - INTERVAL 2 HOUR),
(3, 101, 107, CURDATE() - INTERVAL 5 DAY, '09:00:00', 'completed','Project review',         NOW() - INTERVAL 6 DAY);

-- Student 104: 1 upcoming, 2 completed
INSERT INTO appointments (appointment_id, student_id, faculty_id, appointment_date, appointment_time, status, notes, created_at) VALUES
(4, 104, 102, CURDATE() + INTERVAL 1 DAY, '11:00:00', 'pending',   'Academic advising',    NOW() - INTERVAL 3 HOUR),
(5, 104, 106, CURDATE() - INTERVAL 2 DAY, '13:00:00', 'completed', 'Lab consultation',     NOW() - INTERVAL 3 DAY),
(6, 104, 107, CURDATE() - INTERVAL 8 DAY, '15:00:00', 'completed', 'Project presentation', NOW() - INTERVAL 9 DAY);

-- ── DOCUMENT REQUESTS ─────────────────────────────────────────────────────
-- Student 101: 2 requests (1 processing, 1 released = completed)
INSERT INTO document_requests (request_id, student_id, service_id, request_type, status, created_at) VALUES
(1, 101, 3, 'Good Moral Certificate', 'processing', NOW() - INTERVAL 3 DAY),
(2, 101, 4, 'Transcript of Records',  'released',   NOW() - INTERVAL 14 DAY);

-- Student 104: 3 requests (2 pending, 1 released)
INSERT INTO document_requests (request_id, student_id, service_id, request_type, status, created_at) VALUES
(3, 104, 3, 'Good Moral Certificate', 'pending',    NOW() - INTERVAL 1 DAY),
(4, 104, 4, 'Transcript of Records',  'pending',    NOW() - INTERVAL 2 DAY),
(5, 104, 5, 'Certificate of Enrollment', 'released',NOW() - INTERVAL 10 DAY);

