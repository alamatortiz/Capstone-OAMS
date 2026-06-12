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
TRUNCATE TABLE document_requests;
TRUNCATE TABLE appointments;
TRUNCATE TABLE queue_status_logs;
TRUNCATE TABLE queues;
TRUNCATE TABLE queue_slots;
TRUNCATE TABLE service_requirements;
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
INSERT INTO departments (department_id, department_name, department_abbreviation, office_location) VALUES
(1001, 'College of Computing Studies',                        'CCS',  'PNC Main Bldg. 2nd Floor'),
(2001, 'College of Business, Accountancy and Administration', 'CBAA', 'PNC Main Bldg. 2nd Floor'),
(3001, 'College of Education',                                'COED', 'PNC Main Bldg. 2nd Floor'),
(4001, 'College of Engineering',                              'COE',  'PNC Main Bldg. 2nd Floor'),
(5001, 'College of Arts and Sciences',                        'CAS',  'PNC Main Bldg. 2nd Floor'),
(6001, 'College of Health and Allied Sciences',               'CHAS', 'PNC Main Bldg. 2nd Floor');


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
-- SECTION 5 · SERVICES
-- Services 1–4 are CCS-scoped. Services 5–6 are for other
-- colleges (CBAA, COED) and are included for FK completeness
-- in cross-department document_requests testing only.
-- ─────────────────────────────────────────────────────────────
INSERT INTO services (service_id, service_name, description, department_id) VALUES
(1, 'Enrollment Assistance',     'Help with enrollment and subject loading',        1001),
(2, 'Grade Inquiry',             'Request for grade verification or correction',    1001),
(3, 'Good Moral Certificate',    'Request for Good Moral Certificate',              1001),
(4, 'Transcript of Records',     'Request for official Transcript of Records',      1001),
(5, 'Certificate of Enrollment', 'Request for Certificate of Enrollment',           2001),
(6, 'Clearance Processing',      'Process student clearance for graduation/leave',  3001);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6 · QUEUE SLOTS (open slots for today)
-- current_count reflects the number of active (waiting) entries
-- in Section 7 for each slot:
--   Slot 1: queue_numbers 1–11 = 11 waiting entries → current_count 11
--   Slot 2: queue_number 5    =  1 waiting entry    → current_count  1
--   Slot 3: queue_number 3 (completed, not active)  → current_count  0
--   Slot 4: queue_number 11 (completed, not active) → current_count  0
-- ─────────────────────────────────────────────────────────────
INSERT INTO queue_slots (slot_id, service_id, admin_id, slot_date, start_time, end_time, max_capacity, current_count, status) VALUES
-- (1, 1, 103, CURDATE(), '08:00:00', '12:00:00', 30, 11, 'open'),
-- (2, 2, 103, CURDATE(), '08:00:00', '17:00:00', 20,  1, 'open'),
(1, 1, 103, CURDATE(), '08:00:00', '12:00:00', 30, 0, 'open'),
(2, 2, 103, CURDATE(), '08:00:00', '17:00:00', 20,  0, 'open'),
(3, 3, 103, CURDATE(), '13:00:00', '17:00:00', 15,  0, 'open'),
(4, 4, 103, CURDATE(), '08:00:00', '12:00:00', 20,  0, 'open');


-- ─────────────────────────────────────────────────────────────
-- SECTION 7 · QUEUES
-- Student 101 (Alvin Matthew Ortiz)  : queue_number 8  in slot 1 (waiting)
--                                      + 2 completed entries in slots 3 & 4
-- Student 104 (Luiz Gabriel Rosales) : queue_number 11 in slot 1 (waiting)
--                                      + queue_number 5 in slot 2 (waiting)
-- Students 105, 108, 109 fill positions 1–7 and 9–10 in slot 1
-- queue_ids 6–9 intentionally skipped (reserved for future test cases)
-- ─────────────────────────────────────────────────────────────

-- Student 101: 1 active + 2 historical completed
-- INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at, called_at, completed_at) VALUES
-- (1, 101, 1, 1,  8,  'waiting',   NOW() - INTERVAL 20 MINUTE, NULL, NULL),
-- (2, 101, 3, 3,  3,  'completed', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY + INTERVAL 30 MINUTE, NOW() - INTERVAL 3 DAY + INTERVAL 45 MINUTE),
-- (3, 101, 4, 4, 11,  'completed', NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 7 DAY + INTERVAL 20 MINUTE, NOW() - INTERVAL 7 DAY + INTERVAL 40 MINUTE);

-- Student 104: 2 active
-- INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
-- (4, 104, 1, 1, 11, 'waiting', NOW() - INTERVAL  5 MINUTE),
-- (5, 104, 2, 2,  5, 'waiting', NOW() - INTERVAL 10 MINUTE);

-- Filler entries for slot 1 positions 1–7 and 9–10 (queue position math correctness)
-- INSERT INTO queues (queue_id, student_id, service_id, slot_id, queue_number, status, created_at) VALUES
-- (10, 105, 1, 1,  1, 'waiting', NOW() - INTERVAL 60 MINUTE),
-- (11, 108, 1, 1,  2, 'waiting', NOW() - INTERVAL 55 MINUTE),
-- (12, 109, 1, 1,  3, 'waiting', NOW() - INTERVAL 50 MINUTE),
-- (13, 105, 1, 1,  4, 'waiting', NOW() - INTERVAL 45 MINUTE),
-- (14, 108, 1, 1,  5, 'waiting', NOW() - INTERVAL 40 MINUTE),
-- (15, 109, 1, 1,  6, 'waiting', NOW() - INTERVAL 35 MINUTE),
-- (16, 105, 1, 1,  7, 'waiting', NOW() - INTERVAL 30 MINUTE),
-- position 8 = student 101 (queue_id 1 above)
-- (17, 108, 1, 1,  9, 'waiting', NOW() - INTERVAL 15 MINUTE),
-- (18, 109, 1, 1, 10, 'waiting', NOW() - INTERVAL 12 MINUTE);
-- position 11 = student 104 (queue_id 4 above)


-- ─────────────────────────────────────────────────────────────
-- SECTION 8 · APPOINTMENTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO appointments (appointment_id, student_id, faculty_id, department_id, service_id, appointment_date, appointment_time, status, notes, created_at) VALUES
-- Student 101: 1 approved upcoming, 1 pending upcoming, 1 completed
(1, 101, 102, 1001, 1, CURDATE() + INTERVAL 2 DAY, '10:00:00', 'approved',  'Thesis consultation',  NOW() - INTERVAL 1 DAY),
(2, 101, 106, 1001, 1, CURDATE() + INTERVAL 4 DAY, '14:00:00', 'pending',   'Grade inquiry',        NOW() - INTERVAL 2 HOUR),
(3, 101, 107, 1001, 1, CURDATE() - INTERVAL 5 DAY, '09:00:00', 'completed', 'Project review',       NOW() - INTERVAL 6 DAY),
-- Student 104: 1 pending upcoming, 2 completed
(4, 104, 102, 1001, 1, CURDATE() + INTERVAL 1 DAY, '11:00:00', 'pending',   'Academic advising',    NOW() - INTERVAL 3 HOUR),
(5, 104, 106, 1001, 1, CURDATE() - INTERVAL 2 DAY, '13:00:00', 'completed', 'Lab consultation',     NOW() - INTERVAL 3 DAY),
(6, 104, 107, 1001, 1, CURDATE() - INTERVAL 8 DAY, '15:00:00', 'completed', 'Project presentation', NOW() - INTERVAL 9 DAY);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9 · DOCUMENT REQUESTS
-- ─────────────────────────────────────────────────────────────
INSERT INTO document_requests (request_id, student_id, service_id, request_type, purpose, status, estimated_completion, notes, created_at) VALUES
-- Student 101: 1 processing, 1 released
(1,  101, 3, 'Good Moral Certificate',    'Local Doc Req 1', 'processing', '2026-06-14', 'Document Test 1', NOW() - INTERVAL 3 DAY),
(2,  101, 4, 'Transcript of Records',     'Local Doc Req 2', 'released',   '2026-06-14', 'Document Test 2', NOW() - INTERVAL 14 DAY),
-- Student 104: 2 pending, 1 released
(3,  104, 3, 'Good Moral Certificate',    'Local Doc Req 3', 'pending',    '2026-06-14', 'Document Test 3', NOW() - INTERVAL 1 DAY),
(4,  104, 4, 'Transcript of Records',     'Local Doc Req 4', 'pending',    '2026-06-14', 'Document Test 4', NOW() - INTERVAL 2 DAY),
(5,  104, 5, 'Certificate of Enrollment', 'Local Doc Req 5', 'released',   '2026-06-14', 'Document Test 5', NOW() - INTERVAL 10 DAY);


-- ─────────────────────────────────────────────────────────────
-- SECTION 10 · FAQS / ANNOUNCEMENTS
-- Used by the admin dashboard announcements card.
-- department_id NULL = global/cross-department announcement.
-- ─────────────────────────────────────────────────────────────
INSERT INTO faqs (faq_id, question, answer, department_id) VALUES
(1, 'How do I request a Good Moral Certificate?',
   'Submit a document request through the OAMS portal under Document Requests. Processing takes 3–5 business days. Claim your document at the CCS office upon notification.',
   1001),
(2, 'How do I book a consultation with my professor?',
   'Go to Appointments in your student dashboard, select your professor, choose an available time slot, and submit your request. You will be notified once the professor approves.',
   1001),
(3, 'How does the online queue work?',
   'Join a queue from the Queue section of your dashboard. You will receive a queue number and can monitor your position in real time. Proceed to the office when you are called.',
   1001),
(4, 'What documents are required for enrollment assistance?',
   'Bring your registration form, previous grades, and any outstanding clearance slips. Visit the CCS office or join the Enrollment Assistance queue online.',
   1001),
(5, 'What are the CCS office hours?',
   'The CCS office is open Monday to Friday, 8:00 AM to 5:00 PM. Queue slots are available from 8:00 AM to 12:00 PM and 1:00 PM to 5:00 PM.',
   1001),
(6, 'Enrollment period for AY 2026–2027 is now open.',
   'All students must complete online enrollment via the OAMS portal by June 30, 2026. Walk-in enrollment will not be accommodated after the deadline.',
   NULL),
(7, 'System maintenance scheduled for June 15, 2026.',
   'OAMS will be unavailable from 12:00 AM to 4:00 AM on June 15, 2026 for scheduled maintenance. Please plan your transactions accordingly.',
   NULL);


-- ─────────────────────────────────────────────────────────────
-- SECTION 11 · CHATBOT KNOWLEDGE BASE
-- Seed entries for the AI chat intent classifier.
-- department_id NULL = available across all departments.
-- ─────────────────────────────────────────────────────────────
INSERT INTO chatbot_knowledge_base (kb_id, intent, keywords, response_text, category, department_id, is_active) VALUES
(1, 'request_good_moral',
   'good moral, good moral certificate, character certificate',
   'To request a Good Moral Certificate, go to Document Requests in your dashboard and select Good Moral Certificate. Processing takes 3–5 business days. You will be notified when it is ready for pickup at the CCS office.',
   'documents', 1001, TRUE),
(2, 'request_transcript',
   'transcript, TOR, transcript of records, official transcript',
   'To request a Transcript of Records, go to Document Requests and select Transcript of Records. Please allow 5–7 business days for processing. You will receive a notification when your TOR is ready.',
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
   'For enrollment assistance, join the Enrollment Assistance queue from your dashboard or visit the CCS office during office hours (Monday–Friday, 8 AM–5 PM).',
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
-- Student 101
(101, CONCAT('Your appointment with Prof. Ogalesco on ', DATE_FORMAT(CURDATE() + INTERVAL 2 DAY, '%M %d'), ' has been approved.'),         FALSE, NOW() - INTERVAL 1 DAY),
(101, 'Your Good Moral Certificate request is now being processed.',                                                                    FALSE, NOW() - INTERVAL 3 DAY),
(101, 'Your Transcript of Records is ready for pickup at the CCS office.',                                                              TRUE,  NOW() - INTERVAL 14 DAY),
-- Student 104
(104, 'Your appointment request with Prof. Ogalesco is pending approval.',                                                              FALSE, NOW() - INTERVAL 3 HOUR),
(104, 'Your Good Moral Certificate request has been received and is pending review.',                                                   FALSE, NOW() - INTERVAL 1 DAY),
-- Admin 103
(103, 'New document request submitted by Alvin Matthew Ortiz (Good Moral Certificate).',                                               TRUE,  NOW() - INTERVAL 3 DAY),
(103, 'New document request submitted by Luiz Gabriel Rosales (Transcript of Records).',                                               TRUE,  NOW() - INTERVAL 2 DAY);