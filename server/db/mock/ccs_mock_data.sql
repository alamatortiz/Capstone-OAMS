-- ============================================================
-- OAMS CCS Mock Data
-- Path: server/db/mock/ccs_mock_data.sql
-- Description: All seed/mock INSERT statements for the OAMS
--              CCS pilot module. Run AFTER oams_db.sql.
--
-- Accounts summary:
--   Admin    : 1  (user_id 103)
--   Faculty  : 5  (user_ids 102, 106, 107, 110, 111)
--   Students : 100 (user_ids 101,104,105,108,109 named +
--                   user_ids 200–294 procedurally generated)
--
-- Password for ALL accounts : password123
--   bcrypt hash: $2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK
-- ============================================================

USE oams_db;

-- ─────────────────────────────────────────────────────────────
-- RESET (dev/test only)
-- Clears all seeded data so this file can be re-run cleanly.
-- Disable FK checks temporarily to allow truncation in any order.
-- ─────────────────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE system_settings;
TRUNCATE TABLE external_sync_logs;
TRUNCATE TABLE qr_tracking_logs;
TRUNCATE TABLE generated_files;
TRUNCATE TABLE faculty_document_requests;
TRUNCATE TABLE document_requests;
TRUNCATE TABLE appointments;
TRUNCATE TABLE queue_status_logs;
TRUNCATE TABLE queues;
TRUNCATE TABLE queue_slots;
TRUNCATE TABLE service_requirements;
TRUNCATE TABLE service_procedure_steps;
TRUNCATE TABLE document_requirements;
TRUNCATE TABLE appointment_services;
TRUNCATE TABLE faculty_availability_services;
TRUNCATE TABLE faculty_availability;
TRUNCATE TABLE document_services;
TRUNCATE TABLE services;
TRUNCATE TABLE locations;
TRUNCATE TABLE announcement_attachments;
TRUNCATE TABLE announcements;
TRUNCATE TABLE login_logs;
TRUNCATE TABLE user_sessions;
TRUNCATE TABLE students;
TRUNCATE TABLE faculty;
TRUNCATE TABLE administrators;
TRUNCATE TABLE users;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- Auto-generates tracking_number on insert (REQ-00001, REQ-00002, ...)
DROP TRIGGER IF EXISTS ts_auto_tracking_number;
DELIMITER //

CREATE TRIGGER ts_auto_tracking_number
BEFORE INSERT ON document_requests
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    SELECT COALESCE(MAX(request_id), 0) + 1 INTO next_id FROM document_requests;
    SET NEW.tracking_number = CONCAT('REQ-', LPAD(next_id, 5, '0'));
END//

DELIMITER ;

-- Mirrors ts_auto_tracking_number above, but for faculty's own document requests (FDR-00001, ...)
DROP TRIGGER IF EXISTS ts_auto_tracking_number_faculty;
DELIMITER //

CREATE TRIGGER ts_auto_tracking_number_faculty
BEFORE INSERT ON faculty_document_requests
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    SELECT COALESCE(MAX(request_id), 0) + 1 INTO next_id FROM faculty_document_requests;
    SET NEW.tracking_number = CONCAT('FDR-', LPAD(next_id, 5, '0'));
END//

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- SECTION 0 · DEPARTMENTS
-- Fixed institution records. All 6 colleges seeded here.
-- ─────────────────────────────────────────────────────────────
INSERT INTO departments (department_id, department_name, department_abbreviation, office_location, office_hours) VALUES
(1001, 'College of Computing Studies',                        'CCS',  'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 8:00 AM - 5:00 PM'),
(2001, 'College of Business, Accountancy and Administration', 'CBAA', 'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM'),
(3001, 'College of Education',                                'COED', 'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 8:00 AM - 5:00 PM'),
(4001, 'College of Engineering',                              'COE',  'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 7:30 AM - 5:00 PM'),
(5001, 'College of Arts and Sciences',                        'CAS',  'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 8:00 AM - 5:00 PM'),
(6001, 'College of Health and Allied Sciences',               'CHAS', 'PNC Main Bldg. 2nd Floor', 'Monday - Friday: 8:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM');


-- ─────────────────────────────────────────────────────────────
-- SECTION 0b · LOCATIONS
-- Fixed set of on-campus premises admins/faculty pick from via dropdown
-- instead of typing free text. department_id NULL = shared/global.
-- ─────────────────────────────────────────────────────────────
INSERT INTO locations (location_id, department_id, location_name) VALUES
(1,  1001, 'CCS Office'),
(2,  1001, 'Room 201'),
(3,  2001, 'CBAA Office'),
(4,  3001, 'COED Office'),
(5,  4001, 'COE Office'),
(6,  5001, 'CAS Office'),
(7,  6001, 'CHAS Office'),
(8,  NULL, 'Registrar Window 1'),
(9,  NULL, 'Registrar Window 2'),
(10, NULL, 'Main Building Lobby');


-- ─────────────────────────────────────────────────────────────
-- SECTION 1 · USERS (parent table)
-- Insert order: admin → faculty → students (respects no cross-deps)
-- ─────────────────────────────────────────────────────────────

-- 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(103, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- 1b. Faculty (5): all named
INSERT INTO users (user_id, password, role, status) VALUES
(102, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(106, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(107, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(110, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(111, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
-- Named students
(101, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(104, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(105, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(108, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(109, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
-- Generated students (user_ids 200–294)
(200, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(201, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(202, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(203, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(204, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(205, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(206, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(207, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(208, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(209, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(210, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(211, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(212, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(213, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(214, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(215, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(216, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(217, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(218, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(219, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(220, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(221, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(222, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(223, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(224, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(225, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(226, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(227, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(228, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(229, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(230, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(231, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(232, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(233, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(234, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(235, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(236, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(237, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(238, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(239, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(240, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(241, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(242, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(243, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(244, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(245, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(246, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(247, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(248, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(249, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(250, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(251, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(252, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(253, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(254, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(255, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(256, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(257, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(258, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(259, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(260, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(261, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(262, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(263, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(264, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(265, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(266, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(267, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(268, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(269, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(270, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(271, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(272, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(273, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(274, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(275, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(276, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(277, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(278, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(279, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(280, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(281, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(282, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(283, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(284, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(285, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(286, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(287, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(288, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(289, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(290, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(291, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(292, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(293, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(294, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');


-- ─────────────────────────────────────────────────────────────
-- SECTION 2 · ADMINISTRATORS (child profile)
-- ─────────────────────────────────────────────────────────────
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(103, 'ADM-2026-001', 'Admin', 'Superuser', 'System Registrar Office', 'admin.oams@pnc.edu.ph', 1001);


-- ─────────────────────────────────────────────────────────────
-- SECTION 3 · FACULTY (child profiles)
-- All 5 named, all in CCS (department_id 1001)
-- Employee ID format: EMP-2026-XXX
-- ─────────────────────────────────────────────────────────────
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(102, 'EMP-2026-002', 'Patrick',       'Ogalesco',  'Web and Mobile Applications', 'ogalesco.patrick@pnc.edu.ph',  1001),
(106, 'EMP-2026-003', 'Marvin',        'Bicua',     'Database Management',         'bicua.marvin@pnc.edu.ph',      1001),
(107, 'EMP-2026-004', 'Janus Raymond', 'Tan',       'Backend Development',         'tan.janus@pnc.edu.ph',         1001),
(110, 'EMP-2026-005', 'Lena',          'Villanueva','Software Engineering',        'villanueva.lena@pnc.edu.ph',   1001),
(111, 'EMP-2026-006', 'Marco',         'Dela Cruz', 'Network and Cybersecurity',   'delacruz.marco@pnc.edu.ph',    1001);


-- ─────────────────────────────────────────────────────────────
-- SECTION 4 · STUDENTS (child profiles)
-- 5 named + 95 generated | all in CCS (department_id 1001)
-- Courses alternate: IT / CS | Year levels rotate: 1,2,3,4
-- student_number format: 23XXXXX
-- ─────────────────────────────────────────────────────────────

-- 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(101, '2300544', 'Alvin Matthew', 'Ortiz',   'Information Technology', 3, 'ortiz.alvinmatthew@pnc.edu.ph',  1001),
(104, '2302494', 'Luiz Gabriel',  'Rosales', 'Information Technology', 3, 'rosales.luizgabriel@pnc.edu.ph', 1001),
(105, '2300695', 'Joaquin Aaron', 'Recio',   'Information Technology', 3, 'recio.joaquinaaron@pnc.edu.ph',  1001),
(108, '2300694', 'Miguel',        'Bautista','Computer Science',        2, 'bautista.miguel@pnc.edu.ph',     1001),
(109, '2300693', 'Sofia',         'Ilagan',  'Computer Science',        2, 'ilagan.sofia@pnc.edu.ph',        1001);

-- 4b. Generated students (student_numbers 2300001–2300095, user_ids 200–294)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(200, '2300001', 'Carlos',     'Santos',       'Information Technology', 1, 'santos.carlos@pnc.edu.ph',          1001),
(201, '2300002', 'Maria',      'Reyes',         'Computer Science',       2, 'reyes.maria@pnc.edu.ph',            1001),
(202, '2300003', 'Jose',       'Cruz',          'Information Technology', 3, 'cruz.jose@pnc.edu.ph',              1001),
(203, '2300004', 'Ana',        'Garcia',        'Computer Science',       4, 'garcia.ana@pnc.edu.ph',             1001),
(204, '2300005', 'Miguel',     'Torres',        'Information Technology', 1, 'torres.miguel@pnc.edu.ph',          1001),
(205, '2300006', 'Sofia',      'Lopez',         'Computer Science',       2, 'lopez.sofia@pnc.edu.ph',            1001),
(206, '2300007', 'Rafael',     'Gomez',         'Information Technology', 3, 'gomez.rafael@pnc.edu.ph',           1001),
(207, '2300008', 'Isabella',   'Ramirez',       'Computer Science',       4, 'ramirez.isabella@pnc.edu.ph',       1001),
(208, '2300009', 'Luis',       'Flores',        'Information Technology', 1, 'flores.luis@pnc.edu.ph',            1001),
(209, '2300010', 'Camila',     'Martinez',      'Computer Science',       2, 'martinez.camila@pnc.edu.ph',        1001),
(210, '2300011', 'Diego',      'Hernandez',     'Information Technology', 3, 'hernandez.diego@pnc.edu.ph',        1001),
(211, '2300012', 'Valentina',  'Morales',       'Computer Science',       4, 'morales.valentina@pnc.edu.ph',      1001),
(212, '2300013', 'Andres',     'Jimenez',       'Information Technology', 1, 'jimenez.andres@pnc.edu.ph',         1001),
(213, '2300014', 'Daniela',    'Vargas',        'Computer Science',       2, 'vargas.daniela@pnc.edu.ph',         1001),
(214, '2300015', 'Santiago',   'Castillo',      'Information Technology', 3, 'castillo.santiago@pnc.edu.ph',      1001),
(215, '2300016', 'Gabriela',   'Ramos',         'Computer Science',       4, 'ramos.gabriela@pnc.edu.ph',         1001),
(216, '2300017', 'Mateo',      'Mendoza',       'Information Technology', 1, 'mendoza.mateo@pnc.edu.ph',          1001),
(217, '2300018', 'Natalia',    'Alvarez',       'Computer Science',       2, 'alvarez.natalia@pnc.edu.ph',        1001),
(218, '2300019', 'Alejandro',  'Romero',        'Information Technology', 3, 'romero.alejandro@pnc.edu.ph',       1001),
(219, '2300020', 'Fernanda',   'Navarro',       'Computer Science',       4, 'navarro.fernanda@pnc.edu.ph',       1001),
(220, '2300021', 'Ricardo',    'Delgado',       'Information Technology', 1, 'delgado.ricardo@pnc.edu.ph',        1001),
(221, '2300022', 'Paola',      'Ortega',        'Computer Science',       2, 'ortega.paola@pnc.edu.ph',           1001),
(222, '2300023', 'Eduardo',    'Molina',        'Information Technology', 3, 'molina.eduardo@pnc.edu.ph',         1001),
(223, '2300024', 'Monica',     'Ruiz',          'Computer Science',       4, 'ruiz.monica@pnc.edu.ph',            1001),
(224, '2300025', 'Fernando',   'Gutierrez',     'Information Technology', 1, 'gutierrez.fernando@pnc.edu.ph',     1001),
(225, '2300026', 'Claudia',    'Soto',          'Computer Science',       2, 'soto.claudia@pnc.edu.ph',           1001),
(226, '2300027', 'Roberto',    'Aguilar',       'Information Technology', 3, 'aguilar.roberto@pnc.edu.ph',        1001),
(227, '2300028', 'Patricia',   'Medina',        'Computer Science',       4, 'medina.patricia@pnc.edu.ph',        1001),
(228, '2300029', 'Jorge',      'Perez',         'Information Technology', 1, 'perez.jorge@pnc.edu.ph',            1001),
(229, '2300030', 'Andrea',     'Fuentes',       'Computer Science',       2, 'fuentes.andrea@pnc.edu.ph',         1001),
(230, '2300031', 'Antonio',    'Vega',          'Information Technology', 3, 'vega.antonio@pnc.edu.ph',           1001),
(231, '2300032', 'Cristina',   'Castro',        'Computer Science',       4, 'castro.cristina@pnc.edu.ph',        1001),
(232, '2300033', 'Manuel',     'Rojas',         'Information Technology', 1, 'rojas.manuel@pnc.edu.ph',           1001),
(233, '2300034', 'Lorena',     'Blanco',        'Computer Science',       2, 'blanco.lorena@pnc.edu.ph',          1001),
(234, '2300035', 'Francisco',  'Moreno',        'Information Technology', 3, 'moreno.francisco@pnc.edu.ph',       1001),
(235, '2300036', 'Beatriz',    'Silva',         'Computer Science',       4, 'silva.beatriz@pnc.edu.ph',          1001),
(236, '2300037', 'Pablo',      'Rios',          'Information Technology', 1, 'rios.pablo@pnc.edu.ph',             1001),
(237, '2300038', 'Rosa',       'Cabrera',       'Computer Science',       2, 'cabrera.rosa@pnc.edu.ph',           1001),
(238, '2300039', 'Sergio',     'Salinas',       'Information Technology', 3, 'salinas.sergio@pnc.edu.ph',         1001),
(239, '2300040', 'Elena',      'Espinoza',      'Computer Science',       4, 'espinoza.elena@pnc.edu.ph',         1001),
(240, '2300041', 'Oscar',      'Padilla',       'Information Technology', 1, 'padilla.oscar@pnc.edu.ph',          1001),
(241, '2300042', 'Alicia',     'Guerrero',      'Computer Science',       2, 'guerrero.alicia@pnc.edu.ph',        1001),
(242, '2300043', 'Victor',     'Luna',          'Information Technology', 3, 'luna.victor@pnc.edu.ph',            1001),
(243, '2300044', 'Carmen',     'Mendez',        'Computer Science',       4, 'mendez.carmen@pnc.edu.ph',          1001),
(244, '2300045', 'Hugo',       'Sandoval',      'Information Technology', 1, 'sandoval.hugo@pnc.edu.ph',          1001),
(245, '2300046', 'Diana',      'Pena',          'Computer Science',       2, 'pena.diana@pnc.edu.ph',             1001),
(246, '2300047', 'Raul',       'Herrera',       'Information Technology', 3, 'herrera.raul@pnc.edu.ph',           1001),
(247, '2300048', 'Melissa',    'Rivera',        'Computer Science',       4, 'rivera.melissa@pnc.edu.ph',         1001),
(248, '2300049', 'Ivan',       'Nunez',         'Information Technology', 1, 'nunez.ivan@pnc.edu.ph',             1001),
(249, '2300050', 'Sandra',     'Carrillo',      'Computer Science',       2, 'carrillo.sandra@pnc.edu.ph',        1001),
(250, '2300051', 'Marco',      'Tapia',         'Information Technology', 3, 'tapia.marco@pnc.edu.ph',            1001),
(251, '2300052', 'Silvia',     'Ibarra',        'Computer Science',       4, 'ibarra.silvia@pnc.edu.ph',          1001),
(252, '2300053', 'Jesus',      'Acosta',        'Information Technology', 1, 'acosta.jesus@pnc.edu.ph',           1001),
(253, '2300054', 'Laura',      'Campos',        'Computer Science',       2, 'campos.laura@pnc.edu.ph',           1001),
(254, '2300055', 'Daniel',     'Ayala',         'Information Technology', 3, 'ayala.daniel@pnc.edu.ph',           1001),
(255, '2300056', 'Adriana',    'Orozco',        'Computer Science',       4, 'orozco.adriana@pnc.edu.ph',         1001),
(256, '2300057', 'Angel',      'Bautista',      'Information Technology', 1, 'bautista.angel@pnc.edu.ph',         1001),
(257, '2300058', 'Veronica',   'Valdez',        'Computer Science',       2, 'valdez.veronica@pnc.edu.ph',        1001),
(258, '2300059', 'Adrian',     'Lara',          'Information Technology', 3, 'lara.adrian@pnc.edu.ph',            1001),
(259, '2300060', 'Karla',      'Vasquez',       'Computer Science',       4, 'vasquez.karla@pnc.edu.ph',          1001),
(260, '2300061', 'Emmanuel',   'Contreras',     'Information Technology', 1, 'contreras.emmanuel@pnc.edu.ph',     1001),
(261, '2300062', 'Stephanie',  'Figueroa',      'Computer Science',       2, 'figueroa.stephanie@pnc.edu.ph',     1001),
(262, '2300063', 'Jonathan',   'Trujillo',      'Information Technology', 3, 'trujillo.jonathan@pnc.edu.ph',      1001),
(263, '2300064', 'Mariana',    'Suarez',        'Computer Science',       4, 'suarez.mariana@pnc.edu.ph',         1001),
(264, '2300065', 'Kevin',      'Cervantes',     'Information Technology', 1, 'cervantes.kevin@pnc.edu.ph',        1001),
(265, '2300066', 'Vanessa',    'Cordova',       'Computer Science',       2, 'cordova.vanessa@pnc.edu.ph',        1001),
(266, '2300067', 'Bryan',      'Estrada',       'Information Technology', 3, 'estrada.bryan@pnc.edu.ph',          1001),
(267, '2300068', 'Alexandra',  'Galvan',        'Computer Science',       4, 'galvan.alexandra@pnc.edu.ph',       1001),
(268, '2300069', 'Aaron',      'Zavala',        'Information Technology', 1, 'zavala.aaron@pnc.edu.ph',           1001),
(269, '2300070', 'Priscilla',  'Esquivel',      'Computer Science',       2, 'esquivel.priscilla@pnc.edu.ph',     1001),
(270, '2300071', 'Christian',  'Dominguez',     'Information Technology', 3, 'dominguez.christian@pnc.edu.ph',    1001),
(271, '2300072', 'Samantha',   'Arroyo',        'Computer Science',       4, 'arroyo.samantha@pnc.edu.ph',        1001),
(272, '2300073', 'Steven',     'Meza',          'Information Technology', 1, 'meza.steven@pnc.edu.ph',            1001),
(273, '2300074', 'Nicole',     'Ponce',         'Computer Science',       2, 'ponce.nicole@pnc.edu.ph',           1001),
(274, '2300075', 'Nathan',     'Coronado',      'Information Technology', 3, 'coronado.nathan@pnc.edu.ph',        1001),
(275, '2300076', 'Michelle',   'Serrano',       'Computer Science',       4, 'serrano.michelle@pnc.edu.ph',       1001),
(276, '2300077', 'Brandon',    'Avila',         'Information Technology', 1, 'avila.brandon@pnc.edu.ph',          1001),
(277, '2300078', 'Brittany',   'Pacheco',       'Computer Science',       2, 'pacheco.brittany@pnc.edu.ph',       1001),
(278, '2300079', 'Tyler',      'Ochoa',         'Information Technology', 3, 'ochoa.tyler@pnc.edu.ph',            1001),
(279, '2300080', 'Ashley',     'Ferreira',      'Computer Science',       4, 'ferreira.ashley@pnc.edu.ph',        1001),
(280, '2300081', 'Ryan',       'Montoya',       'Information Technology', 1, 'montoya.ryan@pnc.edu.ph',           1001),
(281, '2300082', 'Kayla',      'Vergara',       'Computer Science',       2, 'vergara.kayla@pnc.edu.ph',          1001),
(282, '2300083', 'Justin',     'Barrera',       'Information Technology', 3, 'barrera.justin@pnc.edu.ph',         1001),
(283, '2300084', 'Amber',      'Acevedo',       'Computer Science',       4, 'acevedo.amber@pnc.edu.ph',          1001),
(284, '2300085', 'Jason',      'Cano',          'Information Technology', 1, 'cano.jason@pnc.edu.ph',             1001),
(285, '2300086', 'Heather',    'Villanueva',    'Computer Science',       2, 'villanueva.heather@pnc.edu.ph',     1001),
(286, '2300087', 'Eric',       'Osorio',        'Information Technology', 3, 'osorio.eric@pnc.edu.ph',            1001),
(287, '2300088', 'Tiffany',    'Mejia',         'Computer Science',       4, 'mejia.tiffany@pnc.edu.ph',          1001),
(288, '2300089', 'Brian',      'Salazar',       'Information Technology', 1, 'salazar.brian@pnc.edu.ph',          1001),
(289, '2300090', 'Crystal',    'Rosario',       'Computer Science',       2, 'rosario.crystal@pnc.edu.ph',        1001),
(290, '2300091', 'Jeremy',     'Quinones',      'Information Technology', 3, 'quinones.jeremy@pnc.edu.ph',        1001),
(291, '2300092', 'Krystal',    'Llanos',        'Computer Science',       4, 'llanos.krystal@pnc.edu.ph',         1001),
(292, '2300093', 'Timothy',    'Buenaventura',  'Information Technology', 1, 'buenaventura.timothy@pnc.edu.ph',   1001),
(293, '2300094', 'Jasmine',    'Encarnacion',   'Computer Science',       2, 'encarnacion.jasmine@pnc.edu.ph',    1001),
(294, '2300095', 'Dwayne',     'Johnson',       'Information Technology', 3, 'johnson.dwayne@pnc.edu.ph',         1001);


-- ─────────────────────────────────────────────────────────────
-- SECTION 5 · SERVICES (queue only)
-- ─────────────────────────────────────────────────────────────
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(1, 'Enrollment Assistance',     'Help with enrollment and subject loading',        1001, FALSE, 1),
(2, 'Grade Inquiry',             'Request for grade verification or correction',    1001, FALSE, 2),
(3, 'Good Moral Certificate',    'Request for Good Moral Certificate',              1001, FALSE, 1),
(4, 'Transcript of Records',     'Request for official Transcript of Records',      1001, FALSE, 1),
(5, 'Certificate of Enrollment', 'Request for Certificate of Enrollment',           2001, FALSE, 3),
(6, 'Clearance Processing',      'Process student clearance for graduation/leave',  3001, FALSE, 4),
-- Hosted by CCS, but every other department's students can also join it.
(7, 'General Inquiry Counter',   'Walk-in general inquiries available to all departments', 1001, TRUE, 10);

-- ─────────────────────────────────────────────────────────────
-- SECTION 5a-REQ · SERVICE REQUIREMENTS
-- Documents/items students must bring for each queue service.
-- ─────────────────────────────────────────────────────────────
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Enrollment Assistance (service_id 1)
(1, 'Advising Form',                    'Signed by your program adviser',                            TRUE),
(1, 'Previous COR',                     'Certificate of Registration from the prior semester',       TRUE),
(1, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
(1, 'Enrollment Portal Access',         'Active login credentials for the online enrollment system', FALSE),
-- Grade Inquiry (service_id 2)
(2, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
(2, 'Grade Slip or Report Card',        'If already available; not required but helpful',            FALSE),
-- Good Moral Certificate (service_id 3)
(3, 'Student Affairs Clearance',        'Clearance slip from the Student Affairs Office',            TRUE),
(3, 'Completed Request Form',           'Good Moral Certificate request form filled out in full',    TRUE),
(3, 'Official Receipt',                 'Payment receipt from the cashier',                          TRUE),
(3, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
-- Transcript of Records (service_id 4)
(4, 'Completed TOR Request Form',       'Request form filled out in full',                           TRUE),
(4, 'Official Receipt',                 'Payment receipt from the cashier',                          TRUE),
(4, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
-- Certificate of Enrollment (service_id 5)
(5, 'Completed COE Request Form',       'Certificate of Enrollment request form filled out in full', TRUE),
(5, 'Official Receipt',                 'Payment receipt from the cashier',                          TRUE),
(5, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
-- Clearance Processing (service_id 6)
(6, 'Clearance Form',                   'Obtained from your department office',                      TRUE),
(6, 'Valid Student ID',                 'Current school year student ID',                            TRUE),
(6, 'No Outstanding Obligations',       'All library, laboratory, and financial obligations settled', TRUE);

-- ─────────────────────────────────────────────────────────────
-- SECTION 5a-STEPS · SERVICE PROCEDURE STEPS
-- Step-by-step process for each queue service.
-- ─────────────────────────────────────────────────────────────
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Enrollment Assistance (service_id 1)
(1, 1, 'Get advising form signed',          'Have your advising form signed by your program adviser before visiting the office'),
(1, 2, 'Settle outstanding balances',       'Pay any outstanding fees or balances at the cashier window'),
(1, 3, 'Present documents at counter',      'Bring your signed advising form, previous COR, and student ID to the enrollment counter'),
(1, 4, 'Wait for validation',               'Staff will validate your enrollment details and process your subjects'),
(1, 5, 'Receive Certificate of Registration','Claim your COR once enrollment is confirmed and processing is complete'),
-- Grade Inquiry (service_id 2)
(2, 1, 'Join the queue',                    'Submit a Grade Inquiry request via the portal or take a number at the office'),
(2, 2, 'Present your ID at the window',     'Show your valid student ID and COR when your number is called'),
(2, 3, 'State your concern',                'Clearly explain your grade concern to the assigned faculty or registrar staff'),
(2, 4, 'Wait for verification',             'Staff will verify the grade against official records and source documents'),
(2, 5, 'Receive the result',                'You will receive the official response, endorsement slip, or correction notice'),
-- Good Moral Certificate (service_id 3)
(3, 1, 'Secure Student Affairs clearance',  'Visit the Student Affairs Office and obtain a signed clearance slip first'),
(3, 2, 'Fill out the request form',         'Complete the Good Moral Certificate request form accurately'),
(3, 3, 'Pay the processing fee',            'Proceed to the cashier and pay the required fee; keep the official receipt'),
(3, 4, 'Submit all requirements',           'Hand over your clearance, completed form, receipt, and student ID to staff'),
(3, 5, 'Claim your certificate',            'Return after 2 - 3 business days with your valid ID to claim the certificate'),
-- Transcript of Records (service_id 4)
(4, 1, 'Fill out the TOR request form',     'Obtain and completely fill out the Transcript of Records request form'),
(4, 2, 'Pay the required fee',              'Proceed to the cashier to pay the TOR fee and secure your official receipt'),
(4, 3, 'Submit to the registrar',           'Submit the completed form and official receipt to the registrar office'),
(4, 4, 'Wait for processing',               'Processing takes 5 - 7 business days; you will be notified when ready'),
(4, 5, 'Claim your TOR',                    'Return with a valid ID to claim your official Transcript of Records'),
-- Certificate of Enrollment (service_id 5)
(5, 1, 'Fill out the COE request form',     'Obtain and completely fill out the Certificate of Enrollment request form'),
(5, 2, 'Pay the processing fee',            'Proceed to the cashier to pay the COE fee and keep the official receipt'),
(5, 3, 'Submit to the registrar office',    'Submit the form and receipt to the registrar or designated office window'),
(5, 4, 'Wait for processing',               'Processing takes 1 - 2 business days'),
(5, 5, 'Claim with your student ID',        'Return with your valid student ID to claim the Certificate of Enrollment'),
-- Clearance Processing (service_id 6)
(6, 1, 'Obtain the clearance form',         'Get the clearance form from your department or college office'),
(6, 2, 'Visit all listed offices',          'Go to every office listed on the form (library, laboratory, finance, etc.)'),
(6, 3, 'Settle all obligations',            'Clear any outstanding fees, unreturned items, or other obligations at each office'),
(6, 4, 'Collect all required signatures',   'Have each office sign and stamp the clearance form once obligations are cleared'),
(6, 5, 'Submit completed clearance',        'Submit the fully signed clearance form to the registrar to finalize the process');

-- ─────────────────────────────────────────────────────────────
-- SECTION 5c · DOCUMENT SERVICES
-- ─────────────────────────────────────────────────────────────
-- recipient_type: 'students' | 'faculty' | 'both'
-- Hosted by one department, is_cross_college marks which ones every other department can also request.
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(1, 'Good Moral Certificate',       'Request for Good Moral Certificate',              1001, FALSE, 'students', 'active', '2-3 business days'),
(2, 'Transcript of Records',        'Request for official Transcript of Records',      1001, FALSE, 'students', 'active', '5-7 business days'),
(3, 'Certificate of Enrollment',    'Request for Certificate of Enrollment',           2001, FALSE, 'students', 'active', '1-2 business days'),
(4, 'Clearance Processing',         'Process student clearance for graduation/leave',  3001, FALSE, 'students', 'active', '3-5 business days'),
(5, 'Certificate of Employment',    'Official certificate of employment for faculty',  1001, TRUE,  'faculty',  'active', '2-3 business days');

-- ─────────────────────────────────────────────────────────────
-- SECTION 5c-REQ · DOCUMENT REQUIREMENTS
-- Documents/items required for document (non-queue) service requests.
-- Queried by GET /api/student/documents/service-types and
-- GET /api/faculty/document-services for their respective service_ids.
-- ─────────────────────────────────────────────────────────────
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Good Moral Certificate (service_id 1, students)
(1, 'Valid Student ID',           'Current school year student ID',                                    TRUE),
(1, 'Student Affairs Clearance',  'Clearance slip confirming no pending accountabilities',             TRUE),
-- Transcript of Records (service_id 2, students)
(2, 'Completed TOR Request Form', 'Request form filled out in full',                                   TRUE),
(2, 'Registrar Clearance',        'Clearance confirming no outstanding academic holds',                TRUE),
(2, 'Official Receipt',           'Payment receipt from the cashier for the TOR processing fee',       TRUE),
-- Certificate of Enrollment (service_id 3, students)
(3, 'Valid Student ID',           'Current school year student ID',                                    TRUE),
(3, 'Current Registration Form',  'Certificate of Registration for the current semester',              TRUE),
-- Clearance Processing (service_id 4, students)
(4, 'Library Clearance',          'Sign-off from the library confirming no unreturned items or fines', TRUE),
(4, 'Accounting Clearance',       'Sign-off from accounting confirming no outstanding balances',       TRUE),
(4, 'Department Clearance',       'Sign-off from the student''s home department',                      TRUE),
-- Certificate of Employment (service_id 5, faculty-only)
(5, 'Completed COE Request Form', 'Certificate of Employment request form filled out in full',         TRUE),
(5, 'Valid Employee ID',          'Current school year faculty/employee ID',                            TRUE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6 · SYSTEM SETTINGS (Pinnacle Sync config)
-- ─────────────────────────────────────────────────────────────
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('pinnacle_api_url',       'https://pinnacle-api.pnc.edu.ph/v1', 'PinnaCle API base URL'),
('pinnacle_api_key',       '',                                    'PinnaCle API authentication key'),
('pinnacle_sync_interval', '60',                                  'Auto-sync interval in minutes'),
('pinnacle_sync_enabled',  'false',                               'Whether auto-sync is active');


-- ─────────────────────────────────────────────────────────────
-- SECTION 7 · SAMPLE ANNOUNCEMENTS (for UI evaluation)
-- One of each category (general/important/event/reminder), plus pinned
-- combos. department_id 1001 = CCS.
-- ─────────────────────────────────────────────────────────────
INSERT INTO announcements (title, content, type, is_pinned, department_id, created_by) VALUES
('Library Extended Hours for Midterms',
 'The CCS library will stay open until 9:00 PM on weekdays for the rest of the term to give everyone more room to study.',
 'general', FALSE, 1001, 'Admin Superuser'),
('Enrollment Deadline Extended',
 'Late enrollment for the current semester has been extended by one week. Visit the registrar window before the new cutoff.',
 'important', TRUE, 1001, 'Admin Superuser'),
('IT Week 2026 Kickoff',
 'Join us for IT Week 2026! A full week of tech talks, competitions, and department activities starts Monday.',
 'event', FALSE, 1001, 'Admin Superuser'),
('Reminder: Submit Clearance Forms',
 'A quick reminder to submit your clearance forms to the department office before the end of the month.',
 'reminder', FALSE, 1001, 'Admin Superuser'),
('University-Wide Job Fair',
 'PNC is hosting a university-wide job fair open to students from every college. Bring your resume!',
 'event', FALSE, 1001, 'Admin Superuser'),
('System Maintenance Notice',
 'The student portal will undergo scheduled maintenance this weekend and may be intermittently unavailable.',
 'important', TRUE, 1001, 'Admin Superuser');


-- ─────────────────────────────────────────────────────────────
-- SECTION 8 · SAMPLE TRANSACTIONS (for UI evaluation)
-- 3 per type (queue/appointment/document), one per UI status
-- (ongoing/completed/cancelled). All under student_id 104 (Luiz Gabriel
-- Rosales, student_number 2302494, CCS) so one login surfaces every variant.
-- ─────────────────────────────────────────────────────────────

-- Queue entries -- slot_id NULL is allowed (not tied to a live queue slot)
INSERT INTO queues (student_id, service_id, queue_number, status, admin_reason) VALUES
(104, 1, 1, 'waiting',   NULL),                    -- ongoing
(104, 2, 2, 'completed', NULL),                    -- completed
(104, 3, 3, 'cancelled', 'Office closed early');    -- cancelled -> "Queue Stopped" title

-- Appointments -- service_id/availability_id left NULL (no appointment_services seeded)
INSERT INTO appointments (student_id, faculty_id, department_id, appointment_date, appointment_time, status) VALUES
(104, 102, 1001, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 'pending'),    -- ongoing
(104, 106, 1001, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '14:00:00', 'completed'),  -- completed
(104, 107, 1001, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00', 'rejected');   -- cancelled

-- Document requests -- tracking_number is auto-assigned by the
-- ts_auto_tracking_number trigger, so it's omitted here.
INSERT INTO document_requests (student_id, service_id, request_type, purpose, status) VALUES
(104, 1, 'Good Moral Certificate', 'For scholarship application', 'processing'), -- ongoing
(104, 2, 'Transcript of Records',  'For further studies',         'claimed'),    -- completed
(104, 1, 'Good Moral Certificate', 'For employment',               'rejected');  -- cancelled
