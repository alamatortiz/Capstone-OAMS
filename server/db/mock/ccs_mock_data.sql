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
TRUNCATE TABLE chat_messages;
TRUNCATE TABLE chat_sessions;
TRUNCATE TABLE chatbot_knowledge_base;
TRUNCATE TABLE faqs;
TRUNCATE TABLE login_logs;
TRUNCATE TABLE user_sessions;
TRUNCATE TABLE students;
TRUNCATE TABLE faculty;
TRUNCATE TABLE administrators;
TRUNCATE TABLE users;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- DYNAMIC GENERATOR TRIGGER FOR TRACKING NUMBER
DROP TRIGGER IF EXISTS ts_auto_tracking_number;
DELIMITER //

CREATE TRIGGER ts_auto_tracking_number
BEFORE INSERT ON document_requests
FOR EACH ROW
BEGIN
    DECLARE next_id INT;
    
    -- Dynamically look up the next primary increment token sequence
    SELECT COALESCE(MAX(request_id), 0) + 1 INTO next_id FROM document_requests;
    
    -- Combines text with padded zero increment (e.g., REQ-00001, REQ-00002)
    SET NEW.tracking_number = CONCAT('REQ-', LPAD(next_id, 5, '0'));
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
-- SECTION 1 · USERS (parent table)
-- Insert order: admin → faculty → students (respects no cross-deps)
-- ─────────────────────────────────────────────────────────────

-- 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(103, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- 1b. Faculty (5): 3 named + 2 generated
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
-- 3 named + 2 generated | all in CCS (department_id 1001)
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
INSERT INTO services (service_id, service_name, description, department_id, status, average_service_time, auto_close) VALUES
(1, 'Enrollment Assistance',     'Help with enrollment and subject loading',        1001, 'active', 20, TRUE),
(2, 'Grade Inquiry',             'Request for grade verification or correction',    1001, 'active', 15, TRUE),
(3, 'Good Moral Certificate',    'Request for Good Moral Certificate',              1001, 'active', 10, TRUE),
(4, 'Transcript of Records',     'Request for official Transcript of Records',      1001, 'active', 15, FALSE),
(5, 'Certificate of Enrollment', 'Request for Certificate of Enrollment',           2001, 'active', 10, TRUE),
(6, 'Clearance Processing',      'Process student clearance for graduation/leave',  3001, 'active', 30, FALSE),
(7, 'General Inquiry Counter',   'Walk-in general inquiries available to all departments', NULL, 'active', 10, TRUE);

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
-- SECTION 5b · APPOINTMENT SERVICES (created by faculty)
-- Each row is a service type a faculty member offers for appointments.
-- ─────────────────────────────────────────────────────────────
INSERT INTO appointment_services (service_id, service_name, description, faculty_id) VALUES
(1, 'Web Development Consultation',  'Frontend/backend web development guidance',    102),
(2, 'Mobile App Consultation',       'Mobile application development advice',        102),
(3, 'Database Design Review',        'Database schema and query optimization',       106),
(4, 'Backend Architecture Review',   'Server-side architecture guidance',            107),
(5, 'Software Engineering Consult',  'SDLC and software design principles',          110),
(6, 'Network Security Consultation', 'Cybersecurity and network security guidance',  111);

-- ─────────────────────────────────────────────────────────────
-- SECTION 5c · DOCUMENT SERVICES
-- ─────────────────────────────────────────────────────────────
-- recipient_type: 'students' | 'faculty' | 'both'
-- department_id NULL = available across all departments
INSERT INTO document_services (service_id, service_name, description, department_id, recipient_type, status, fee, processing_time) VALUES
(1, 'Good Moral Certificate',       'Request for Good Moral Certificate',              1001, 'students', 'active',  75.00, '2-3 business days'),
(2, 'Transcript of Records',        'Request for official Transcript of Records',      1001, 'students', 'active', 150.00, '5-7 business days'),
(3, 'Certificate of Enrollment',    'Request for Certificate of Enrollment',           2001, 'students', 'active',  50.00, '1-2 business days'),
(4, 'Clearance Processing',         'Process student clearance for graduation/leave',  3001, 'students', 'active',   0.00, '3-5 business days'),
(5, 'Certificate of Employment',    'Official certificate of employment for faculty',  NULL, 'faculty',  'active',   0.00, '2-3 business days');

-- ─────────────────────────────────────────────────────────────
-- SECTION 5c-REQ · DOCUMENT REQUIREMENTS
-- Documents/items required for document (non-queue) service requests.
-- Only service_id 5 is queried today (GET /api/faculty/document-services).
-- ─────────────────────────────────────────────────────────────
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of Employment (service_id 5, faculty-only)
(5, 'Completed COE Request Form', 'Certificate of Employment request form filled out in full', TRUE),
(5, 'Valid Employee ID',          'Current school year faculty/employee ID',                    TRUE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6 · QUEUE SLOTS (open slots for today)
-- current_count reflects the number of active (waiting) entries
-- in Section 7 for each slot:
--   Slot 1: queue_numbers 1–11 = 11 waiting entries → current_count 11
--   Slot 2: queue_number 5    =  1 waiting entry    → current_count  1
--   Slot 3: queue_number 3 (completed, not active)  → current_count  0
--   Slot 4: queue_number 11 (completed, not active) → current_count  0
--   Slot 5: no-show sweeper demo, 5-minute custom timeout (see Section 7)
-- ─────────────────────────────────────────────────────────────
INSERT INTO queue_slots (slot_id, service_id, admin_id, slot_date, start_time, end_time, max_capacity, current_count, no_show_timeout_minutes, status) VALUES
(1, 1, 103, CURDATE(), '08:00:00', '12:00:00', 30, 11, 15, 'open'),
(2, 2, 103, CURDATE(), '08:00:00', '17:00:00', 20,  1, 15, 'open'),
(3, 3, 103, CURDATE(), '13:00:00', '17:00:00', 15,  0, 15, 'open'),
(4, 4, 103, CURDATE(), '08:00:00', '12:00:00', 20,  0, 15, 'open'),
(5, 1, 103, CURDATE(), '13:00:00', '17:00:00', 10,  0,  5, 'open');


-- ─────────────────────────────────────────────────────────────
-- SECTION 7 · QUEUES
-- Student 101 (Alvin Matthew Ortiz)  : queue_number 8  in slot 1 (waiting)
--                                      + 2 completed entries in slots 3 & 4
-- Student 104 (Luiz Gabriel Rosales) : queue_number 11 in slot 1 (waiting)
--                                      + queue_number 5 in slot 2 (waiting)
-- Students 105, 108, 109 fill positions 1–7 and 9–10 in slot 1
-- Slot 5 demonstrates the automatic no-show voiding sweeper
-- (server/jobs/queueNoShowSweeper.js) against its 5-minute custom timeout:
--   Student 108 was called 10 min ago (past the 5-min timeout) -> auto-voided
--                                       to 'no_show' within 30s of server start
--   Student 109 was called 2 min ago (still within timeout)    -> stays 'serving'
-- ─────────────────────────────────────────────────────────────

-- Student 101: 1 active + 2 historical completed
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at, called_at, completed_at) VALUES
(1, 101, 1, 1,  8,  'waiting',   NOW() - INTERVAL 20 MINUTE, NULL, NULL),
(2, 101, 3, 3,  3,  'completed', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 30 MINUTE, NOW() - INTERVAL 3 DAY + INTERVAL 45 MINUTE),
(3, 101, 4, 4, 11,  'completed', NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY + INTERVAL 20 MINUTE, NOW() - INTERVAL 7 DAY + INTERVAL 40 MINUTE);

-- Student 104: 2 active
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
(4, 104, 1, 1, 11, 'waiting', NOW() - INTERVAL  5 MINUTE),
(5, 104, 2, 2,  5, 'waiting', NOW() - INTERVAL 10 MINUTE);

-- Filler entries for slot 1 positions 1–7 and 9–10 (queue position math correctness)
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
(10, 105, 1, 1,  1, 'waiting', NOW() - INTERVAL 60 MINUTE),
(11, 108, 1, 1,  2, 'waiting', NOW() - INTERVAL 55 MINUTE),
(12, 109, 1, 1,  3, 'waiting', NOW() - INTERVAL 50 MINUTE),
(13, 105, 1, 1,  4, 'waiting', NOW() - INTERVAL 45 MINUTE),
(14, 108, 1, 1,  5, 'waiting', NOW() - INTERVAL 40 MINUTE),
(15, 109, 1, 1,  6, 'waiting', NOW() - INTERVAL 35 MINUTE),
(16, 105, 1, 1,  7, 'waiting', NOW() - INTERVAL 30 MINUTE),
-- position 8 = student 101 (queue_id 1 above)
(17, 108, 1, 1,  9, 'waiting', NOW() - INTERVAL 15 MINUTE),
(18, 109, 1, 1, 10, 'waiting', NOW() - INTERVAL 12 MINUTE);
-- position 11 = student 104 (queue_id 4 above)

-- Slot 5: no-show sweeper demo (queue_ids 6–9 intentionally skipped, reserved for future test cases)
INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at, called_at) VALUES
(19, 108, 1, 5, 1, 'serving', NOW() - INTERVAL 12 MINUTE, NOW() - INTERVAL 10 MINUTE),
(20, 109, 1, 5, 2, 'serving', NOW() - INTERVAL  3 MINUTE, NOW() - INTERVAL  2 MINUTE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 14 · FACULTY AVAILABILITY (recurring weekly consultation hours)
-- Moved before SECTION 8 so appointments.availability_id (FK to this
-- table) can reference these rows without disabling FK checks.
-- Insertion order determines auto-increment IDs (used in Section 14D and 8):
--   102 Ogalesco   : IDs 1–4
--   106 Bicua      : IDs 5–8
--   107 Tan        : IDs 9–12
--   110 Villanueva : IDs 13–15
--   111 Dela Cruz  : IDs 16–17
-- ─────────────────────────────────────────────────────────────
INSERT INTO faculty_availability (faculty_id, day_of_week, start_time, end_time, location, max_students) VALUES
-- 102 Patrick Ogalesco: max 5 students
(102, 'Monday',    '09:00:00', '12:00:00', 'CCS Faculty Room 201', 5),
(102, 'Monday',    '14:00:00', '17:00:00', 'CCS Faculty Room 201', 5),
(102, 'Wednesday', '09:00:00', '12:00:00', 'CCS Faculty Room 201', 5),
(102, 'Friday',    '13:00:00', '16:00:00', 'CCS Faculty Room 201', 5),
-- 106 Marvin Bicua: indefinite capacity
(106, 'Tuesday',   '10:00:00', '12:00:00', 'CCS Faculty Room 203', NULL),
(106, 'Tuesday',   '14:00:00', '17:00:00', 'CCS Faculty Room 203', NULL),
(106, 'Thursday',  '09:00:00', '11:00:00', 'CCS Faculty Room 203', NULL),
(106, 'Thursday',  '13:00:00', '16:00:00', 'CCS Faculty Room 203', NULL),
-- 107 Janus Raymond Tan: max 3 students
(107, 'Monday',    '10:00:00', '12:00:00', 'CCS Dean\'s Office', 3),
(107, 'Wednesday', '10:00:00', '12:00:00', 'CCS Dean\'s Office', 3),
(107, 'Wednesday', '14:00:00', '16:00:00', 'CCS Dean\'s Office', 3),
(107, 'Friday',    '09:00:00', '12:00:00', 'CCS Dean\'s Office', 3),
-- 110 Lena Villanueva: max 5 students
(110, 'Monday',    '13:00:00', '17:00:00', 'CCS Faculty Room 105', 5),
(110, 'Wednesday', '10:00:00', '12:00:00', 'CCS Faculty Room 105', 5),
(110, 'Friday',    '14:00:00', '17:00:00', 'CCS Faculty Room 105', 5),
-- 111 Marco Dela Cruz: indefinite capacity
(111, 'Tuesday',   '08:00:00', '12:00:00', 'CCS Faculty Room 401', NULL),
(111, 'Thursday',  '13:00:00', '17:00:00', 'CCS Faculty Room 401', NULL);

-- ─────────────────────────────────────────────────────────────
-- SECTION 14D · WEEKLY AVAILABILITY SERVICES
-- Links appointment_services types to recurring weekly slots.
-- IDs reference Section 14 insertion order above.
-- ─────────────────────────────────────────────────────────────
INSERT INTO faculty_availability_services (availability_id, service_id) VALUES
-- Prof 102 (Ogalesco): Web Dev (1) + Mobile App (2) on all slots
(1,1), (1,2), (2,1), (2,2), (3,1), (3,2), (4,1), (4,2),
-- Prof 106 (Bicua): DB Design (3) on all slots
(5,3), (6,3), (7,3), (8,3),
-- Prof 107 (Tan): Backend Architecture (4) on all slots
(9,4), (10,4), (11,4), (12,4),
-- Prof 110 (Villanueva): Software Engineering (5) on all slots
(13,5), (14,5), (15,5),
-- Prof 111 (Dela Cruz): Network Security (6) on all slots
(16,6), (17,6);

-- ─────────────────────────────────────────────────────────────
-- SECTION 8 · APPOINTMENTS
-- appointment_time stores the availability window's start_time.
-- availability_id references Section 14 (faculty_availability) recurring
-- template IDs — one template now maps to many possible calendar dates, so
-- appointment_date is computed as the next real-world occurrence of that
-- template's day_of_week (via CURDATE() + days-until-next-weekday), keeping
-- this file weekday-consistent no matter what day it's actually seeded on.
-- Past completed appointments use availability_id NULL (pre-system booking).
-- service_id: FK to appointment_services (must match the faculty's linked types).
-- ─────────────────────────────────────────────────────────────
INSERT INTO appointments (appointment_id, student_id, faculty_id, department_id, service_id, availability_id, appointment_date, appointment_time, status, notes, created_at) VALUES

-- ── Student 101 · Alvin Matthew Ortiz (2300544) ──────────────────────────────
-- Upcoming approved: Prof Ogalesco · Wednesday AM template (ID 3 · 09:00–12:00)
(1, 101, 102, 1001, 1,  3,    CURDATE() + INTERVAL ((2 - WEEKDAY(CURDATE()) + 7) % 7) DAY,       '09:00:00', 'approved',  'Thesis consultation on web development',     NOW() - INTERVAL 1 DAY),
-- Upcoming pending: Prof Tan · Wednesday AM template, next week (ID 10 · 10:00–12:00)
(2, 101, 107, 1001, 4,  10,   CURDATE() + INTERVAL (((2 - WEEKDAY(CURDATE()) + 7) % 7) + 7) DAY, '10:00:00', 'pending',   'Backend architecture for capstone project',  NOW() - INTERVAL 2 HOUR),
-- Past completed: pre-system booking (no availability slot)
(3, 101, 107, 1001, 4,  NULL, CURDATE() - INTERVAL 5 DAY,                                        '09:00:00', 'completed', 'Project review',                             NOW() - INTERVAL 6 DAY),

-- ── Student 104 · Luiz Gabriel Rosales (2302494) ─────────────────────────────
-- Upcoming pending: Prof Ogalesco · Wednesday AM template, next week (ID 3 · 09:00–12:00)
(4, 104, 102, 1001, 2,  3,    CURDATE() + INTERVAL (((2 - WEEKDAY(CURDATE()) + 7) % 7) + 7) DAY, '09:00:00', 'pending',   'Mobile app academic advising',               NOW() - INTERVAL 3 HOUR),
-- Upcoming pending: Prof Dela Cruz · Tuesday AM template (ID 16 · 08:00–12:00)
(5, 104, 111, 1001, 6,  16,   CURDATE() + INTERVAL ((1 - WEEKDAY(CURDATE()) + 7) % 7) DAY,       '08:00:00', 'pending',   'Network security thesis consultation',        NOW() - INTERVAL 1 HOUR),
-- Past completed: pre-system booking (no availability slot)
(6, 104, 106, 1001, 3,  NULL, CURDATE() - INTERVAL 3 DAY,                                        '13:00:00', 'completed', 'Database lab consultation',                   NOW() - INTERVAL 4 DAY),

-- ── Filler · other students in the upcoming Monday templates (realistic occupancy) ──
-- Template 1  (102 · Monday AM · max 5): 2 of 5 spots taken
(7,  105, 102, 1001, 1,  1,  CURDATE() + INTERVAL ((0 - WEEKDAY(CURDATE()) + 7) % 7) DAY, '09:00:00', 'approved', 'Web dev thesis discussion',    NOW() - INTERVAL 4 HOUR),
(8,  108, 102, 1001, 2,  1,  CURDATE() + INTERVAL ((0 - WEEKDAY(CURDATE()) + 7) % 7) DAY, '09:00:00', 'pending',  'Mobile app project inquiry',   NOW() - INTERVAL 2 HOUR),
-- Template 9  (107 · Monday AM · max 3): 1 of 3 spots taken
(9,  109, 107, 1001, 4,  9,  CURDATE() + INTERVAL ((0 - WEEKDAY(CURDATE()) + 7) % 7) DAY, '10:00:00', 'approved', 'Capstone backend review',      NOW() - INTERVAL 5 HOUR),
-- Template 13 (110 · Monday PM · max 5): 1 of 5 spots taken
(10, 105, 110, 1001, 5,  13, CURDATE() + INTERVAL ((0 - WEEKDAY(CURDATE()) + 7) % 7) DAY, '13:00:00', 'pending',  'SDLC consultation for thesis', NOW() - INTERVAL 3 HOUR);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9 · DOCUMENT REQUESTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO document_requests (request_id, student_id, service_id, request_type, purpose, status, estimated_completion, released_at, notes, created_at) VALUES
-- Student 101: 1 processing, 1 released
(1,  101, 1, 'Good Moral Certificate',    'Local Doc Req 1', 'processing', '2026-06-14', NULL,                        'Document Test 1', NOW() - INTERVAL 3 DAY),
(2,  101, 2, 'Transcript of Records',     'Local Doc Req 2', 'released',   '2026-06-14', NOW() - INTERVAL 7 DAY,  'Document Test 2', NOW() - INTERVAL 14 DAY),
-- Student 104: 2 pending, 1 released
(3,  104, 1, 'Good Moral Certificate',    'Local Doc Req 3', 'pending',    '2026-06-14', NULL,                        'Document Test 3', NOW() - INTERVAL 1 DAY),
(4,  104, 2, 'Transcript of Records',     'Local Doc Req 4', 'pending',    '2026-06-14', NULL,                        'Document Test 4', NOW() - INTERVAL 2 DAY),
(5,  104, 1, 'Good Moral Certificate',    'Local Doc Req 5', 'released',   '2026-06-14', NOW() - INTERVAL 5 DAY,  'Document Test 5', NOW() - INTERVAL 10 DAY);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9b · GENERATED FILES & QR TRACKING
-- generated_files for released documents (request_id 2 and 5)
-- qr_tracking_logs seeded with 3 historical scans by admin (user_id 103)
-- ─────────────────────────────────────────────────────────────
INSERT INTO generated_files (file_id, request_id, file_name, file_path, qr_code, generated_at) VALUES
(1, 2, 'TOR-2100001.pdf', '/files/TOR-2100001.pdf', 'REQ-00002-QR', NOW() - INTERVAL 12 DAY),
(2, 5, 'GMC-2100065.pdf', '/files/GMC-2100065.pdf', 'REQ-00005-QR', NOW() - INTERVAL 8 DAY);

INSERT INTO qr_tracking_logs (file_id, scanned_by, scan_location, scan_time) VALUES
(1, 103, 'CCS Office', NOW() - INTERVAL 2 MINUTE),
(2, 103, 'CCS Office', NOW() - INTERVAL 1 HOUR),
(1, 103, 'CCS Office', NOW() - INTERVAL 1 DAY);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9c · SYSTEM SETTINGS (Pinnacle Sync config)
-- ─────────────────────────────────────────────────────────────
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('pinnacle_api_url',       'https://pinnacle-api.pnc.edu.ph/v1', 'PinnaCle API base URL'),
('pinnacle_api_key',       '',                                    'PinnaCle API authentication key'),
('pinnacle_sync_interval', '60',                                  'Auto-sync interval in minutes'),
('pinnacle_sync_enabled',  'false',                               'Whether auto-sync is active');


-- ─────────────────────────────────────────────────────────────
-- SECTION 9d · FACULTY DOCUMENT REQUESTS (faculty requesting their own documents)
-- All reference the faculty-only "Certificate of Employment" service (service_id 5).
-- ─────────────────────────────────────────────────────────────
INSERT INTO faculty_document_requests (request_id, tracking_number, faculty_id, service_id, request_type, purpose, status, estimated_completion, released_at, notes, created_at) VALUES
(1, 'FDR-00001', 102, 5, 'Certificate of Employment', 'Bank loan requirement', 'released',   '2026-06-10', NOW() - INTERVAL 4 DAY, 'Faculty Doc Req 1', NOW() - INTERVAL 9 DAY),
(2, 'FDR-00002', 106, 5, 'Certificate of Employment', 'Visa application',      'processing', '2026-06-16', NULL,                    'Faculty Doc Req 2', NOW() - INTERVAL 2 DAY),
(3, 'FDR-00003', 110, 5, 'Certificate of Employment', 'HR records update',     'pending',    '2026-06-18', NULL,                    'Faculty Doc Req 3', NOW() - INTERVAL 1 DAY);


-- ─────────────────────────────────────────────────────────────
-- SECTION 10 · FAQS / ANNOUNCEMENTS
-- Used by the admin dashboard announcements card.
-- department_id NULL = global/cross-department announcement.
-- ─────────────────────────────────────────────────────────────
INSERT INTO faqs (faq_id, question, answer, type, status, created_by, is_pinned, department_id) VALUES
(1, 'How do I request a Good Moral Certificate?',
   'Submit a document request through the OAMS portal under Document Requests. Processing takes 3 - 5 business days. Claim your document at the CCS office upon notification.',
   'general', 'active', 'CCS Admin Office', FALSE, 1001),
(2, 'How do I book a consultation with my professor?',
   'Go to Appointments in your student dashboard, select your professor, choose an available time slot, and submit your request. You will be notified once the professor approves.',
   'general', 'active', 'CCS Admin Office', FALSE, 1001),
(3, 'How does the online queue work?',
   'Join a queue from the Queue section of your dashboard. You will receive a queue number and can monitor your position in real time. Proceed to the office when you are called.',
   'general', 'active', 'CCS Admin Office', FALSE, 1001),
(4, 'What documents are required for enrollment assistance?',
   'Bring your registration form, previous grades, and any outstanding clearance slips. Visit the CCS office or join the Enrollment Assistance queue online.',
   'reminder', 'active', 'CCS Admin Office', FALSE, 1001),
(5, 'What are the CCS office hours?',
   'The CCS office is open Monday to Friday, 8:00 AM to 5:00 PM. Queue slots are available from 8:00 AM to 12:00 PM and 1:00 PM to 5:00 PM.',
   'general', 'active', 'CCS Admin Office', FALSE, 1001),
(6, 'Enrollment period for AY 2026 - 2027 is now open.',
   'All students must complete online enrollment via the OAMS portal by June 30, 2026. Walk-in enrollment will not be accommodated after the deadline.',
   'important', 'active', 'Admin Office', TRUE, NULL),
(7, 'System maintenance scheduled for June 15, 2026.',
   'OAMS will be unavailable from 12:00 AM to 4:00 AM on June 15, 2026 for scheduled maintenance. Please plan your transactions accordingly.',
   'important', 'active', 'Admin Office', TRUE, NULL);


-- ─────────────────────────────────────────────────────────────
-- SECTION 11 · CHATBOT KNOWLEDGE BASE
-- Seed entries for the AI chat intent classifier.
-- department_id NULL = available across all departments.
-- ─────────────────────────────────────────────────────────────
INSERT INTO chatbot_knowledge_base (kb_id, intent, keywords, response_text, category, department_id, is_active) VALUES
(1, 'request_good_moral',
   'good moral, good moral certificate, character certificate',
   'To request a Good Moral Certificate, go to Document Requests in your dashboard and select Good Moral Certificate. Processing takes 3 - 5 business days. You will be notified when it is ready for pickup at the CCS office.',
   'documents', 1001, TRUE),
(2, 'request_transcript',
   'transcript, TOR, transcript of records, official transcript',
   'To request a Transcript of Records, go to Document Requests and select Transcript of Records. Please allow 5 - 7 business days for processing. You will receive a notification when your TOR is ready.',
   'documents', 1001, TRUE),
(3, 'book_appointment',
   'appointment, consult, consultation, meet professor, schedule meeting',
   'To book an appointment, go to Appointments in your dashboard, select a professor, and choose an available time slot. Your request will be sent to the professor for approval.',
   'appointments', 1001, TRUE),
(4, 'check_queue',
   'queue, queue number, waiting, position, how long, queue status',
   'You can check your current queue position from the Queue section of your dashboard. Your real-time position and estimated wait time are displayed there.',
   'queue', 1001, TRUE),
(5, 'enrollment_assistance',
   'enrollment, enroll, subject loading, load subjects, registration',
   'For enrollment assistance, join the Enrollment Assistance queue from your dashboard or visit the CCS office during office hours (Monday - Friday, 8 AM - 5 PM).',
   'enrollment', 1001, TRUE),
(6, 'office_hours',
   'office hours, open, schedule, when, available',
   'The CCS office is open Monday to Friday from 8:00 AM to 5:00 PM. Queue slots open at 8:00 AM and 1:00 PM daily.',
   'general', 1001, TRUE),
(7, 'grade_inquiry',
   'grade, grades, grade inquiry, grade correction, check grade',
   'For grade inquiries or corrections, submit a Grade Inquiry request from the Document Requests section or book an appointment with your professor directly.',
   'documents', 1001, TRUE),
(8, 'contact_support',
   'help, support, contact, problem, issue, not working',
   'If you are experiencing an issue with OAMS, please describe your problem and a staff member will be notified to assist you. You can also visit the CCS office directly.',
   'support', NULL, TRUE);


-- ─────────────────────────────────────────────────────────────
-- SECTION 12 · NOTIFICATIONS
-- Sample notifications for named students and the admin.
-- ─────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, message, is_read, created_at) VALUES
-- Student 101 (Alvin Matthew Ortiz · 2300544)
(101, CONCAT('Your appointment with Prof. Ogalesco on ', DATE_FORMAT(CURDATE() + INTERVAL 2 DAY, '%M %d'), ' (9:00 AM - 12:00 PM) has been approved.'), FALSE, NOW() - INTERVAL 1 DAY),
(101, 'Your appointment request with Prof. Tan on July 08 (10:00 AM - 12:00 PM) is pending approval.',                                   FALSE, NOW() - INTERVAL 2 HOUR),
(101, 'Your Good Moral Certificate request is now being processed.',                                                                      FALSE, NOW() - INTERVAL 3 DAY),
(101, 'Your Transcript of Records is ready for pickup at the CCS office.',                                                                TRUE,  NOW() - INTERVAL 14 DAY),
-- Student 104 (Luiz Gabriel Rosales · 2302494)
(104, 'Your appointment request with Prof. Ogalesco on July 08 (9:00 AM - 12:00 PM) is pending approval.',                               FALSE, NOW() - INTERVAL 3 HOUR),
(104, 'Your appointment request with Prof. Dela Cruz on June 30 (8:00 AM - 12:00 PM) is pending approval.',                              FALSE, NOW() - INTERVAL 1 HOUR),
(104, 'Your Good Moral Certificate request has been received and is pending review.',                                                     FALSE, NOW() - INTERVAL 1 DAY),
-- Admin 103
(103, 'New document request submitted by Alvin Matthew Ortiz (Good Moral Certificate).',                                                 TRUE,  NOW() - INTERVAL 3 DAY),
(103, 'New document request submitted by Luiz Gabriel Rosales (Transcript of Records).',                                                 TRUE,  NOW() - INTERVAL 2 DAY);

-- ─────────────────────────────────────────────────────────────
-- SECTION 13 · FACULTY POSITIONS (update existing rows)
-- ─────────────────────────────────────────────────────────────
UPDATE faculty SET position = 'Department Chair'    WHERE faculty_id = 102;
UPDATE faculty SET position = 'Faculty Member'       WHERE faculty_id = 106;
UPDATE faculty SET position = 'Program Coordinator'  WHERE faculty_id = 107;
UPDATE faculty SET position = 'Faculty Member'       WHERE faculty_id = 110;
UPDATE faculty SET position = 'Faculty Member'       WHERE faculty_id = 111;