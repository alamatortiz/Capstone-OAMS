-- ============================================================
-- OAMS Other Colleges Mock Data (CBAA, COED, COE, CAS, CHAS)
-- Path: server/db/mock/other_colleges_mock_data.sql
-- Description: INSERT-ONLY seed data for the 5 remaining college
--              departments, mirroring the pattern established in
--              ccs_mock_data.sql. Additive to an already-populated
--              live database -- run AFTER oams_db.sql AND
--              ccs_mock_data.sql. Does NOT touch departments,
--              locations, or any CCS data (all already seeded).
--
-- Password for ALL accounts : password123
--   bcrypt hash: $2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK
--
-- Accounts summary (1 admin + 5 faculty + 100 students each):
--   CBAA: admin 300 | faculty 301-305 | students 306-405 (user_id range 300-405)
--   COED: admin 500 | faculty 501-505 | students 506-605 (user_id range 500-605)
--   COE : admin 700 | faculty 701-705 | students 706-805 (user_id range 700-805)
--   CAS : admin 900 | faculty 901-905 | students 906-1005 (user_id range 900-1005)
--   CHAS: admin 1100 | faculty 1101-1105 | students 1106-1205 (user_id range 1100-1205)
-- ============================================================


-- ================================================================
-- CBAA -- College of Business, Accountancy and Administration (department_id 2001)
-- user_id range: 300-405
-- ================================================================

-- CBAA · 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(300, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- CBAA · 1b. Faculty (5)
INSERT INTO users (user_id, password, role, status) VALUES
(301, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(302, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(303, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(304, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(305, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- CBAA · 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
(306, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(307, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(308, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(309, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(310, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(311, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(312, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(313, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(314, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(315, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(316, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(317, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(318, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(319, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(320, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(321, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(322, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(323, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(324, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(325, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(326, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(327, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(328, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(329, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(330, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(331, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(332, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(333, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(334, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(335, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(336, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(337, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(338, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(339, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(340, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(341, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(342, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(343, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(344, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(345, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(346, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(347, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(348, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(349, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(350, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(351, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(352, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(353, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(354, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(355, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(356, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(357, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(358, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(359, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(360, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(361, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(362, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(363, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(364, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(365, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(366, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(367, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(368, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(369, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(370, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(371, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(372, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(373, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(374, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(375, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(376, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(377, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(378, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(379, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(380, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(381, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(382, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(383, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(384, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(385, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(386, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(387, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(388, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(389, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(390, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(391, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(392, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(393, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(394, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(395, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(396, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(397, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(398, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(399, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(400, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(401, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(402, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(403, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(404, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(405, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- CBAA · 2. ADMINISTRATOR (child profile)
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(300, 'ADM-2026-002', 'Rex', 'Almario', 'CBAA Office Administrator', 'almario.rex@pnc.edu.ph', 2001);

-- CBAA · 3. FACULTY (child profiles) -- Employee ID format: EMP-2026-XXX
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(301, 'EMP-2026-007', 'Kevin', 'Almario', 'Financial Accounting', 'almario.kevin@pnc.edu.ph', 2001),
(302, 'EMP-2026-008', 'Raymond', 'Bartolome', 'Marketing Management', 'bartolome.raymond@pnc.edu.ph', 2001),
(303, 'EMP-2026-009', 'Angela', 'Capistrano', 'Human Resource Management', 'capistrano.angela@pnc.edu.ph', 2001),
(304, 'EMP-2026-010', 'Olivia', 'De Guzman', 'Taxation and Auditing', 'deguzman.olivia@pnc.edu.ph', 2001),
(305, 'EMP-2026-011', 'Gabrielle', 'Dimapilis', 'Entrepreneurship and Small Business Management', 'dimapilis.gabrielle@pnc.edu.ph', 2001);

-- CBAA · 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(306, '2400501', 'Elias', 'Almario', 'BS Accountancy', 1, 'almario.elias@pnc.edu.ph', 2001),
(307, '2400502', 'Keith', 'Bartolome', 'BS Business Administration', 2, 'bartolome.keith@pnc.edu.ph', 2001),
(308, '2400503', 'Quincy', 'Capistrano', 'BS Accountancy', 3, 'capistrano.quincy@pnc.edu.ph', 2001),
(309, '2400504', 'Maria', 'De Guzman', 'BS Business Administration', 4, 'deguzman.maria@pnc.edu.ph', 2001),
(310, '2400505', 'Mikaela', 'Dimapilis', 'BS Accountancy', 1, 'dimapilis.mikaela@pnc.edu.ph', 2001);

-- CBAA · 4b. Generated students (student_numbers 2400001-2400095)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(311, '2400001', 'Fatima', 'Fernandez', 'BS Accountancy', 1, 'fernandez.fatima@pnc.edu.ph', 2001),
(312, '2400002', 'Venus', 'Katigbak', 'BS Business Administration', 2, 'katigbak.venus@pnc.edu.ph', 2001),
(313, '2400003', 'Jose', 'Magsaysay', 'BS Accountancy', 3, 'magsaysay.jose@pnc.edu.ph', 2001),
(314, '2400004', 'Francis', 'Mercado', 'BS Business Administration', 4, 'mercado.francis@pnc.edu.ph', 2001),
(315, '2400005', 'Leo', 'Panganiban', 'BS Accountancy', 1, 'panganiban.leo@pnc.edu.ph', 2001),
(316, '2400006', 'Samuel', 'Santiago', 'BS Business Administration', 2, 'santiago.samuel@pnc.edu.ph', 2001),
(317, '2400007', 'Camille', 'Valenzuela', 'BS Accountancy', 3, 'valenzuela.camille@pnc.edu.ph', 2001),
(318, '2400008', 'Rachel', 'Bagsic', 'BS Business Administration', 4, 'bagsic.rachel@pnc.edu.ph', 2001),
(319, '2400009', 'Imelda', 'Inocencio', 'BS Accountancy', 1, 'inocencio.imelda@pnc.edu.ph', 2001),
(320, '2400010', 'Jhoanna', 'Abrigo', 'BS Business Administration', 2, 'abrigo.jhoanna@pnc.edu.ph', 2001),
(321, '2400011', 'Ricardo', 'Balagtas', 'BS Accountancy', 3, 'balagtas.ricardo@pnc.edu.ph', 2001),
(322, '2400012', 'Gilbert', 'Calderon', 'BS Business Administration', 4, 'calderon.gilbert@pnc.edu.ph', 2001),
(323, '2400013', 'Nathaniel', 'Dalisay', 'BS Accountancy', 1, 'dalisay.nathaniel@pnc.edu.ph', 2001),
(324, '2400014', 'Vincent', 'Del Rosario', 'BS Business Administration', 2, 'delrosario.vincent@pnc.edu.ph', 2001),
(325, '2400015', 'Faith', 'Evangelista', 'BS Accountancy', 3, 'evangelista.faith@pnc.edu.ph', 2001),
(326, '2400016', 'Ysabel', 'Isip', 'BS Business Administration', 4, 'isip.ysabel@pnc.edu.ph', 2001),
(327, '2400017', 'Maricel', 'Macapagal', 'BS Accountancy', 1, 'macapagal.maricel@pnc.edu.ph', 2001),
(328, '2400018', 'Marinel', 'Mariano', 'BS Business Administration', 2, 'mariano.marinel@pnc.edu.ph', 2001),
(329, '2400019', 'Fernando', 'Palad', 'BS Accountancy', 3, 'palad.fernando@pnc.edu.ph', 2001),
(330, '2400020', 'Isaac', 'Salonga', 'BS Business Administration', 4, 'salonga.isaac@pnc.edu.ph', 2001),
(331, '2400021', 'Oliver', 'Umali', 'BS Accountancy', 1, 'umali.oliver@pnc.edu.ph', 2001),
(332, '2400022', 'Zachary', 'Zamora', 'BS Business Administration', 2, 'zamora.zachary@pnc.edu.ph', 2001),
(333, '2400023', 'Irish', 'Gascon', 'BS Accountancy', 3, 'gascon.irish@pnc.edu.ph', 2001),
(334, '2400024', 'Bea', 'Nazareno', 'BS Business Administration', 4, 'nazareno.bea@pnc.edu.ph', 2001),
(335, '2400025', 'Rica', 'Arceo', 'BS Accountancy', 1, 'arceo.rica@pnc.edu.ph', 2001),
(336, '2400026', 'Cyrus', 'Buenavista', 'BS Business Administration', 2, 'buenavista.cyrus@pnc.edu.ph', 2001),
(337, '2400027', 'Cesar', 'Cayabyab', 'BS Accountancy', 3, 'cayabyab.cesar@pnc.edu.ph', 2001),
(338, '2400028', 'Julius', 'De Vera', 'BS Business Administration', 4, 'devera.julius@pnc.edu.ph', 2001),
(339, '2400029', 'Peter', 'Espino', 'BS Accountancy', 1, 'espino.peter@pnc.edu.ph', 2001),
(340, '2400030', 'Josh', 'Gonzales', 'BS Business Administration', 2, 'gonzales.josh@pnc.edu.ph', 2001),
(341, '2400031', 'Lorraine', 'Lazaro', 'BS Accountancy', 3, 'lazaro.lorraine@pnc.edu.ph', 2001),
(342, '2400032', 'Elaine', 'Marasigan', 'BS Business Administration', 4, 'marasigan.elaine@pnc.edu.ph', 2001),
(343, '2400033', 'Uma', 'Ongsiako', 'BS Accountancy', 1, 'ongsiako.uma@pnc.edu.ph', 2001),
(344, '2400034', 'Juan', 'Quimpo', 'BS Business Administration', 2, 'quimpo.juan@pnc.edu.ph', 2001),
(345, '2400035', 'Felix', 'Tolentino', 'BS Accountancy', 3, 'tolentino.felix@pnc.edu.ph', 2001),
(346, '2400036', 'Lawrence', 'Yabut', 'BS Business Administration', 4, 'yabut.lawrence@pnc.edu.ph', 2001),
(347, '2400037', 'Rex', 'Escudero', 'BS Accountancy', 1, 'escudero.rex@pnc.edu.ph', 2001),
(348, '2400038', 'Bianca', 'Lapid', 'BS Business Administration', 2, 'lapid.bianca@pnc.edu.ph', 2001),
(349, '2400039', 'Queenie', 'Ancheta', 'BS Accountancy', 3, 'ancheta.queenie@pnc.edu.ph', 2001),
(350, '2400040', 'Honey', 'Bernardo', 'BS Business Administration', 4, 'bernardo.honey@pnc.edu.ph', 2001),
(351, '2400041', 'Ysabelle', 'Carpio', 'BS Accountancy', 1, 'carpio.ysabelle@pnc.edu.ph', 2001),
(352, '2400042', 'Eduardo', 'De Jesus', 'BS Business Administration', 2, 'dejesus.eduardo@pnc.edu.ph', 2001),
(353, '2400043', 'Gerald', 'Dizon', 'BS Accountancy', 3, 'dizon.gerald@pnc.edu.ph', 2001),
(354, '2400044', 'Melvin', 'Galang', 'BS Business Administration', 4, 'galang.melvin@pnc.edu.ph', 2001),
(355, '2400045', 'Uriel', 'Lacson', 'BS Accountancy', 1, 'lacson.uriel@pnc.edu.ph', 2001),
(356, '2400046', 'Erika', 'Malabanan', 'BS Business Administration', 2, 'malabanan.erika@pnc.edu.ph', 2001),
(357, '2400047', 'Winnie', 'Nepomuceno', 'BS Accountancy', 3, 'nepomuceno.winnie@pnc.edu.ph', 2001),
(358, '2400048', 'Liezel', 'Pimentel', 'BS Business Administration', 4, 'pimentel.liezel@pnc.edu.ph', 2001),
(359, '2400049', 'Loraine', 'Sarmiento', 'BS Accountancy', 1, 'sarmiento.loraine@pnc.edu.ph', 2001),
(360, '2400050', 'Roberto', 'Ventura', 'BS Business Administration', 2, 'ventura.roberto@pnc.edu.ph', 2001),
(361, '2400051', 'Henry', 'Cariaga', 'BS Accountancy', 3, 'cariaga.henry@pnc.edu.ph', 2001),
(362, '2400052', 'Noel', 'Javier', 'BS Business Administration', 4, 'javier.noel@pnc.edu.ph', 2001),
(363, '2400053', 'Xavier', 'Alcantara', 'BS Accountancy', 1, 'alcantara.xavier@pnc.edu.ph', 2001),
(364, '2400054', 'Hannah', 'Balderas', 'BS Business Administration', 2, 'balderas.hannah@pnc.edu.ph', 2001),
(365, '2400055', 'Angelica', 'Camacho', 'BS Accountancy', 3, 'camacho.angelica@pnc.edu.ph', 2001),
(366, '2400056', 'Precious', 'David', 'BS Business Administration', 4, 'david.precious@pnc.edu.ph', 2001),
(367, '2400057', 'Aldrin', 'Dimaculangan', 'BS Accountancy', 1, 'dimaculangan.aldrin@pnc.edu.ph', 2001),
(368, '2400058', 'Benedict', 'Fajardo', 'BS Business Administration', 2, 'fajardo.benedict@pnc.edu.ph', 2001),
(369, '2400059', 'Jerome', 'Jacinto', 'BS Accountancy', 3, 'jacinto.jerome@pnc.edu.ph', 2001),
(370, '2400060', 'Patrick', 'Magat', 'BS Business Administration', 4, 'magat.patrick@pnc.edu.ph', 2001),
(371, '2400061', 'Kian', 'Mendiola', 'BS Accountancy', 1, 'mendiola.kian@pnc.edu.ph', 2001),
(372, '2400062', 'Kimberly', 'Pangan', 'BS Business Administration', 2, 'pangan.kimberly@pnc.edu.ph', 2001),
(373, '2400063', 'Denise', 'San Pedro', 'BS Accountancy', 3, 'sanpedro.denise@pnc.edu.ph', 2001),
(374, '2400064', 'Therese', 'Valencia', 'BS Business Administration', 4, 'valencia.therese@pnc.edu.ph', 2001),
(375, '2400065', 'Ferdinand', 'Agbayani', 'BS Accountancy', 1, 'agbayani.ferdinand@pnc.edu.ph', 2001),
(376, '2400066', 'Emmanuel', 'Hidalgo', 'BS Business Administration', 2, 'hidalgo.emmanuel@pnc.edu.ph', 2001),
(377, '2400067', 'Kevin', 'Abad', 'BS Accountancy', 3, 'abad.kevin@pnc.edu.ph', 2001),
(378, '2400068', 'Raymond', 'Bagsit', 'BS Business Administration', 4, 'bagsit.raymond@pnc.edu.ph', 2001),
(379, '2400069', 'Angela', 'Cabanilla', 'BS Accountancy', 1, 'cabanilla.angela@pnc.edu.ph', 2001),
(380, '2400070', 'Olivia', 'Corpuz', 'BS Business Administration', 2, 'corpuz.olivia@pnc.edu.ph', 2001),
(381, '2400071', 'Gabrielle', 'Del Mundo', 'BS Accountancy', 3, 'delmundo.gabrielle@pnc.edu.ph', 2001),
(382, '2400072', 'Wilma', 'Estrella', 'BS Business Administration', 4, 'estrella.wilma@pnc.edu.ph', 2001),
(383, '2400073', 'Antonio', 'Ignacio', 'BS Accountancy', 1, 'ignacio.antonio@pnc.edu.ph', 2001),
(384, '2400074', 'Gabriel', 'Leano', 'BS Business Administration', 2, 'leano.gabriel@pnc.edu.ph', 2001),
(385, '2400075', 'Martin', 'Marcelo', 'BS Accountancy', 3, 'marcelo.martin@pnc.edu.ph', 2001),
(386, '2400076', 'Timothy', 'Padua', 'BS Business Administration', 4, 'padua.timothy@pnc.edu.ph', 2001),
(387, '2400077', 'Diana', 'Robles', 'BS Accountancy', 1, 'robles.diana@pnc.edu.ph', 2001),
(388, '2400078', 'Trisha', 'Trinidad', 'BS Business Administration', 2, 'trinidad.trisha@pnc.edu.ph', 2001),
(389, '2400079', 'Katrina', 'Yulo', 'BS Accountancy', 3, 'yulo.katrina@pnc.edu.ph', 2001),
(390, '2400080', 'Kristine', 'Fajardo', 'BS Business Administration', 4, 'fajardo.kristine@pnc.edu.ph', 2001),
(391, '2400081', 'Manuel', 'Montano', 'BS Accountancy', 1, 'montano.manuel@pnc.edu.ph', 2001),
(392, '2400082', 'Harold', 'Aquino', 'BS Business Administration', 2, 'aquino.harold@pnc.edu.ph', 2001),
(393, '2400083', 'Nico', 'Bonifacio', 'BS Accountancy', 3, 'bonifacio.nico@pnc.edu.ph', 2001),
(394, '2400084', 'Warren', 'Catapang', 'BS Business Administration', 4, 'catapang.warren@pnc.edu.ph', 2001),
(395, '2400085', 'Grace', 'De Leon', 'BS Accountancy', 1, 'deleon.grace@pnc.edu.ph', 2001),
(396, '2400086', 'Zoe', 'Domingo', 'BS Business Administration', 2, 'domingo.zoe@pnc.edu.ph', 2001),
(397, '2400087', 'Nadine', 'Gatchalian', 'BS Accountancy', 3, 'gatchalian.nadine@pnc.edu.ph', 2001),
(398, '2400088', 'Novelyn', 'Laurel', 'BS Business Administration', 4, 'laurel.novelyn@pnc.edu.ph', 2001),
(399, '2400089', 'Angelo', 'Manalo', 'BS Accountancy', 1, 'manalo.angelo@pnc.edu.ph', 2001),
(400, '2400090', 'Ivan', 'Ocampo', 'BS Business Administration', 2, 'ocampo.ivan@pnc.edu.ph', 2001),
(401, '2400091', 'Owen', 'Quiambao', 'BS Accountancy', 3, 'quiambao.owen@pnc.edu.ph', 2001),
(402, '2400092', 'Renz', 'Tagle', 'BS Business Administration', 4, 'tagle.renz@pnc.edu.ph', 2001),
(403, '2400093', 'Joy', 'Villaflor', 'BS Accountancy', 1, 'villaflor.joy@pnc.edu.ph', 2001),
(404, '2400094', 'Carmela', 'Diokno', 'BS Business Administration', 2, 'diokno.carmela@pnc.edu.ph', 2001),
(405, '2400095', 'Shaira', 'Kalaw', 'BS Accountancy', 3, 'kalaw.shaira@pnc.edu.ph', 2001);

-- CBAA · 5. SERVICES (queue only)
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(8, 'Practicum/OJT Endorsement', 'Endorsement processing for business practicum and on-the-job training placement', 2001, FALSE, 3),
(9, 'Accounting Ledger Verification', 'Verification of accounting subject records and grades for accountancy majors', 2001, FALSE, 3),
(10, 'Business Plan Defense Scheduling', 'Schedule a slot for the capstone business plan or feasibility study defense', 2001, FALSE, 3),
(11, 'Mock Interview & Career Counseling', 'Career preparation session for graduating business students', 2001, FALSE, 3);

-- CBAA · 5a-REQ. SERVICE REQUIREMENTS
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Practicum/OJT Endorsement (service_id 8)
(8, 'Endorsement Request Form', 'Filled out in full and signed by the student', TRUE),
(8, 'Certificate of Registration', 'Current semester COR', TRUE),
(8, 'Resume/CV', 'Updated resume for the host company', FALSE),
-- Accounting Ledger Verification (service_id 9)
(9, 'Valid Student ID', 'Current school year student ID', TRUE),
(9, 'Grade Slip or Report Card', 'If already available; not required but helpful', FALSE),
(9, 'Subject Load Form', 'Current semester subject load', TRUE),
-- Business Plan Defense Scheduling (service_id 10)
(10, 'Final Business Plan Draft', 'Complete draft cleared by the thesis adviser', TRUE),
(10, 'Adviser''s Endorsement', 'Signed endorsement from the capstone adviser', TRUE),
(10, 'Panel Availability Form', 'Preferred defense dates and panel members', FALSE),
-- Mock Interview & Career Counseling (service_id 11)
(11, 'Valid Student ID', 'Current school year student ID', TRUE),
(11, 'Updated Resume/CV', 'For review during the session', TRUE);

-- CBAA · 5a-STEPS. SERVICE PROCEDURE STEPS
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Practicum/OJT Endorsement (service_id 8)
(8, 1, 'Submit request form', 'Fill out and submit the endorsement request form at the CBAA office'),
(8, 2, 'Present COR and requirements', 'Show your current COR and other listed requirements to staff'),
(8, 3, 'Wait for adviser approval', 'Your practicum adviser reviews and approves the endorsement'),
(8, 4, 'Claim endorsement letter', 'Return to claim your signed endorsement letter for the host company'),
-- Accounting Ledger Verification (service_id 9)
(9, 1, 'Join the queue', 'Take a number at the CBAA office for ledger verification'),
(9, 2, 'Present your ID and COR', 'Show your valid student ID and Certificate of Registration'),
(9, 3, 'State your concern', 'Explain which ledger entries or grades need verification'),
(9, 4, 'Wait for verification', 'Staff cross-checks the entries against official accounting records'),
(9, 5, 'Receive confirmation', 'Get a signed verification slip or correction notice'),
-- Business Plan Defense Scheduling (service_id 10)
(10, 1, 'Submit final draft', 'Submit the adviser-endorsed business plan draft to the office'),
(10, 2, 'Select preferred schedule', 'Indicate preferred defense dates on the scheduling form'),
(10, 3, 'Wait for panel confirmation', 'The office coordinates panel availability and confirms a slot'),
(10, 4, 'Receive schedule notice', 'Get the confirmed date, time, and venue for your defense'),
-- Mock Interview & Career Counseling (service_id 11)
(11, 1, 'Book a slot', 'Sign up for an available mock interview or counseling slot'),
(11, 2, 'Submit your resume', 'Send your resume ahead of time for the counselor to review'),
(11, 3, 'Attend the session', 'Participate in the scheduled mock interview or counseling session'),
(11, 4, 'Receive feedback', 'Get written feedback and improvement notes after the session');

-- CBAA · 5c. DOCUMENT SERVICES
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(6, 'Certificate of Good Standing', 'Certification that the student is in good academic and disciplinary standing', 2001, FALSE, 'students', 'active', '2-3 business days'),
(7, 'Practicum Completion Certificate', 'Certification of completed practicum/OJT hours for business students', 2001, FALSE, 'students', 'active', '3-5 business days');

-- CBAA · 5c-REQ. DOCUMENT REQUIREMENTS
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of Good Standing (service_id 6)
(6, 'Valid Student ID', 'Current school year student ID', TRUE),
(6, 'Completed Request Form', 'Certificate of Good Standing request form', TRUE),
-- Practicum Completion Certificate (service_id 7)
(7, 'Practicum Evaluation Form', 'Signed by the host company supervisor', TRUE),
(7, 'Certificate of Attendance', 'Issued by the host company', TRUE),
(7, 'Official Receipt', 'Payment receipt from the cashier', TRUE);

-- ================================================================
-- COED -- College of Education (department_id 3001)
-- user_id range: 500-605
-- ================================================================

-- COED · 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(500, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- COED · 1b. Faculty (5)
INSERT INTO users (user_id, password, role, status) VALUES
(501, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(502, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(503, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(504, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(505, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- COED · 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
(506, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(507, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(508, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(509, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(510, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(511, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(512, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(513, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(514, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(515, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(516, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(517, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(518, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(519, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(520, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(521, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(522, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(523, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(524, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(525, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(526, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(527, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(528, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(529, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(530, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(531, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(532, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(533, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(534, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(535, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(536, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(537, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(538, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(539, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(540, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(541, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(542, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(543, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(544, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(545, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(546, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(547, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(548, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(549, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(550, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(551, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(552, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(553, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(554, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(555, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(556, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(557, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(558, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(559, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(560, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(561, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(562, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(563, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(564, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(565, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(566, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(567, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(568, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(569, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(570, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(571, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(572, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(573, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(574, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(575, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(576, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(577, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(578, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(579, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(580, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(581, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(582, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(583, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(584, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(585, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(586, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(587, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(588, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(589, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(590, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(591, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(592, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(593, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(594, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(595, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(596, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(597, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(598, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(599, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(600, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(601, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(602, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(603, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(604, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(605, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- COED · 2. ADMINISTRATOR (child profile)
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(500, 'ADM-2026-003', 'Bianca', 'Bartolome', 'COED Office Administrator', 'bartolome.bianca@pnc.edu.ph', 3001);

-- COED · 3. FACULTY (child profiles) -- Employee ID format: EMP-2026-XXX
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(501, 'EMP-2026-012', 'Wilma', 'Fernandez', 'Educational Psychology', 'fernandez.wilma@pnc.edu.ph', 3001),
(502, 'EMP-2026-013', 'Antonio', 'Katigbak', 'Curriculum and Instruction', 'katigbak.antonio@pnc.edu.ph', 3001),
(503, 'EMP-2026-014', 'Gabriel', 'Magsaysay', 'Mathematics Education', 'magsaysay.gabriel@pnc.edu.ph', 3001),
(504, 'EMP-2026-015', 'Martin', 'Mercado', 'English Language Teaching', 'mercado.martin@pnc.edu.ph', 3001),
(505, 'EMP-2026-016', 'Timothy', 'Panganiban', 'Special Education', 'panganiban.timothy@pnc.edu.ph', 3001);

-- COED · 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(506, '2500501', 'Dexter', 'Almario', 'Bachelor of Elementary Education', 1, 'almario.dexter@pnc.edu.ph', 3001),
(507, '2500502', 'Elias', 'Bartolome', 'Bachelor of Secondary Education', 2, 'bartolome.elias@pnc.edu.ph', 3001),
(508, '2500503', 'Keith', 'Capistrano', 'Bachelor of Elementary Education', 3, 'capistrano.keith@pnc.edu.ph', 3001),
(509, '2500504', 'Quincy', 'De Guzman', 'Bachelor of Secondary Education', 4, 'deguzman.quincy@pnc.edu.ph', 3001),
(510, '2500505', 'Maria', 'Dimapilis', 'Bachelor of Elementary Education', 1, 'dimapilis.maria@pnc.edu.ph', 3001);

-- COED · 4b. Generated students (student_numbers 2500001-2500095)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(511, '2500001', 'Mikaela', 'Fernandez', 'Bachelor of Elementary Education', 1, 'fernandez.mikaela@pnc.edu.ph', 3001),
(512, '2500002', 'Fatima', 'Katigbak', 'Bachelor of Secondary Education', 2, 'katigbak.fatima@pnc.edu.ph', 3001),
(513, '2500003', 'Venus', 'Magsaysay', 'Bachelor of Elementary Education', 3, 'magsaysay.venus@pnc.edu.ph', 3001),
(514, '2500004', 'Jose', 'Mercado', 'Bachelor of Secondary Education', 4, 'mercado.jose@pnc.edu.ph', 3001),
(515, '2500005', 'Francis', 'Panganiban', 'Bachelor of Elementary Education', 1, 'panganiban.francis@pnc.edu.ph', 3001),
(516, '2500006', 'Leo', 'Santiago', 'Bachelor of Secondary Education', 2, 'santiago.leo@pnc.edu.ph', 3001),
(517, '2500007', 'Samuel', 'Valenzuela', 'Bachelor of Elementary Education', 3, 'valenzuela.samuel@pnc.edu.ph', 3001),
(518, '2500008', 'Camille', 'Bagsic', 'Bachelor of Secondary Education', 4, 'bagsic.camille@pnc.edu.ph', 3001),
(519, '2500009', 'Rachel', 'Inocencio', 'Bachelor of Elementary Education', 1, 'inocencio.rachel@pnc.edu.ph', 3001),
(520, '2500010', 'Imelda', 'Abrigo', 'Bachelor of Secondary Education', 2, 'abrigo.imelda@pnc.edu.ph', 3001),
(521, '2500011', 'Jhoanna', 'Balagtas', 'Bachelor of Elementary Education', 3, 'balagtas.jhoanna@pnc.edu.ph', 3001),
(522, '2500012', 'Ricardo', 'Calderon', 'Bachelor of Secondary Education', 4, 'calderon.ricardo@pnc.edu.ph', 3001),
(523, '2500013', 'Gilbert', 'Dalisay', 'Bachelor of Elementary Education', 1, 'dalisay.gilbert@pnc.edu.ph', 3001),
(524, '2500014', 'Nathaniel', 'Del Rosario', 'Bachelor of Secondary Education', 2, 'delrosario.nathaniel@pnc.edu.ph', 3001),
(525, '2500015', 'Vincent', 'Evangelista', 'Bachelor of Elementary Education', 3, 'evangelista.vincent@pnc.edu.ph', 3001),
(526, '2500016', 'Faith', 'Isip', 'Bachelor of Secondary Education', 4, 'isip.faith@pnc.edu.ph', 3001),
(527, '2500017', 'Ysabel', 'Macapagal', 'Bachelor of Elementary Education', 1, 'macapagal.ysabel@pnc.edu.ph', 3001),
(528, '2500018', 'Maricel', 'Mariano', 'Bachelor of Secondary Education', 2, 'mariano.maricel@pnc.edu.ph', 3001),
(529, '2500019', 'Marinel', 'Palad', 'Bachelor of Elementary Education', 3, 'palad.marinel@pnc.edu.ph', 3001),
(530, '2500020', 'Fernando', 'Salonga', 'Bachelor of Secondary Education', 4, 'salonga.fernando@pnc.edu.ph', 3001),
(531, '2500021', 'Isaac', 'Umali', 'Bachelor of Elementary Education', 1, 'umali.isaac@pnc.edu.ph', 3001),
(532, '2500022', 'Oliver', 'Zamora', 'Bachelor of Secondary Education', 2, 'zamora.oliver@pnc.edu.ph', 3001),
(533, '2500023', 'Zachary', 'Gascon', 'Bachelor of Elementary Education', 3, 'gascon.zachary@pnc.edu.ph', 3001),
(534, '2500024', 'Irish', 'Nazareno', 'Bachelor of Secondary Education', 4, 'nazareno.irish@pnc.edu.ph', 3001),
(535, '2500025', 'Bea', 'Arceo', 'Bachelor of Elementary Education', 1, 'arceo.bea@pnc.edu.ph', 3001),
(536, '2500026', 'Rica', 'Buenavista', 'Bachelor of Secondary Education', 2, 'buenavista.rica@pnc.edu.ph', 3001),
(537, '2500027', 'Cyrus', 'Cayabyab', 'Bachelor of Elementary Education', 3, 'cayabyab.cyrus@pnc.edu.ph', 3001),
(538, '2500028', 'Cesar', 'De Vera', 'Bachelor of Secondary Education', 4, 'devera.cesar@pnc.edu.ph', 3001),
(539, '2500029', 'Julius', 'Espino', 'Bachelor of Elementary Education', 1, 'espino.julius@pnc.edu.ph', 3001),
(540, '2500030', 'Peter', 'Gonzales', 'Bachelor of Secondary Education', 2, 'gonzales.peter@pnc.edu.ph', 3001),
(541, '2500031', 'Josh', 'Lazaro', 'Bachelor of Elementary Education', 3, 'lazaro.josh@pnc.edu.ph', 3001),
(542, '2500032', 'Lorraine', 'Marasigan', 'Bachelor of Secondary Education', 4, 'marasigan.lorraine@pnc.edu.ph', 3001),
(543, '2500033', 'Elaine', 'Ongsiako', 'Bachelor of Elementary Education', 1, 'ongsiako.elaine@pnc.edu.ph', 3001),
(544, '2500034', 'Uma', 'Quimpo', 'Bachelor of Secondary Education', 2, 'quimpo.uma@pnc.edu.ph', 3001),
(545, '2500035', 'Juan', 'Tolentino', 'Bachelor of Elementary Education', 3, 'tolentino.juan@pnc.edu.ph', 3001),
(546, '2500036', 'Felix', 'Yabut', 'Bachelor of Secondary Education', 4, 'yabut.felix@pnc.edu.ph', 3001),
(547, '2500037', 'Lawrence', 'Escudero', 'Bachelor of Elementary Education', 1, 'escudero.lawrence@pnc.edu.ph', 3001),
(548, '2500038', 'Rex', 'Lapid', 'Bachelor of Secondary Education', 2, 'lapid.rex@pnc.edu.ph', 3001),
(549, '2500039', 'Bianca', 'Ancheta', 'Bachelor of Elementary Education', 3, 'ancheta.bianca@pnc.edu.ph', 3001),
(550, '2500040', 'Queenie', 'Bernardo', 'Bachelor of Secondary Education', 4, 'bernardo.queenie@pnc.edu.ph', 3001),
(551, '2500041', 'Honey', 'Carpio', 'Bachelor of Elementary Education', 1, 'carpio.honey@pnc.edu.ph', 3001),
(552, '2500042', 'Ysabelle', 'De Jesus', 'Bachelor of Secondary Education', 2, 'dejesus.ysabelle@pnc.edu.ph', 3001),
(553, '2500043', 'Eduardo', 'Dizon', 'Bachelor of Elementary Education', 3, 'dizon.eduardo@pnc.edu.ph', 3001),
(554, '2500044', 'Gerald', 'Galang', 'Bachelor of Secondary Education', 4, 'galang.gerald@pnc.edu.ph', 3001),
(555, '2500045', 'Melvin', 'Lacson', 'Bachelor of Elementary Education', 1, 'lacson.melvin@pnc.edu.ph', 3001),
(556, '2500046', 'Uriel', 'Malabanan', 'Bachelor of Secondary Education', 2, 'malabanan.uriel@pnc.edu.ph', 3001),
(557, '2500047', 'Erika', 'Nepomuceno', 'Bachelor of Elementary Education', 3, 'nepomuceno.erika@pnc.edu.ph', 3001),
(558, '2500048', 'Winnie', 'Pimentel', 'Bachelor of Secondary Education', 4, 'pimentel.winnie@pnc.edu.ph', 3001),
(559, '2500049', 'Liezel', 'Sarmiento', 'Bachelor of Elementary Education', 1, 'sarmiento.liezel@pnc.edu.ph', 3001),
(560, '2500050', 'Loraine', 'Ventura', 'Bachelor of Secondary Education', 2, 'ventura.loraine@pnc.edu.ph', 3001),
(561, '2500051', 'Roberto', 'Cariaga', 'Bachelor of Elementary Education', 3, 'cariaga.roberto@pnc.edu.ph', 3001),
(562, '2500052', 'Henry', 'Javier', 'Bachelor of Secondary Education', 4, 'javier.henry@pnc.edu.ph', 3001),
(563, '2500053', 'Noel', 'Alcantara', 'Bachelor of Elementary Education', 1, 'alcantara.noel@pnc.edu.ph', 3001),
(564, '2500054', 'Xavier', 'Balderas', 'Bachelor of Secondary Education', 2, 'balderas.xavier@pnc.edu.ph', 3001),
(565, '2500055', 'Hannah', 'Camacho', 'Bachelor of Elementary Education', 3, 'camacho.hannah@pnc.edu.ph', 3001),
(566, '2500056', 'Angelica', 'David', 'Bachelor of Secondary Education', 4, 'david.angelica@pnc.edu.ph', 3001),
(567, '2500057', 'Precious', 'Dimaculangan', 'Bachelor of Elementary Education', 1, 'dimaculangan.precious@pnc.edu.ph', 3001),
(568, '2500058', 'Aldrin', 'Fajardo', 'Bachelor of Secondary Education', 2, 'fajardo.aldrin@pnc.edu.ph', 3001),
(569, '2500059', 'Benedict', 'Jacinto', 'Bachelor of Elementary Education', 3, 'jacinto.benedict@pnc.edu.ph', 3001),
(570, '2500060', 'Jerome', 'Magat', 'Bachelor of Secondary Education', 4, 'magat.jerome@pnc.edu.ph', 3001),
(571, '2500061', 'Patrick', 'Mendiola', 'Bachelor of Elementary Education', 1, 'mendiola.patrick@pnc.edu.ph', 3001),
(572, '2500062', 'Kian', 'Pangan', 'Bachelor of Secondary Education', 2, 'pangan.kian@pnc.edu.ph', 3001),
(573, '2500063', 'Kimberly', 'San Pedro', 'Bachelor of Elementary Education', 3, 'sanpedro.kimberly@pnc.edu.ph', 3001),
(574, '2500064', 'Denise', 'Valencia', 'Bachelor of Secondary Education', 4, 'valencia.denise@pnc.edu.ph', 3001),
(575, '2500065', 'Therese', 'Agbayani', 'Bachelor of Elementary Education', 1, 'agbayani.therese@pnc.edu.ph', 3001),
(576, '2500066', 'Ferdinand', 'Hidalgo', 'Bachelor of Secondary Education', 2, 'hidalgo.ferdinand@pnc.edu.ph', 3001),
(577, '2500067', 'Emmanuel', 'Abad', 'Bachelor of Elementary Education', 3, 'abad.emmanuel@pnc.edu.ph', 3001),
(578, '2500068', 'Kevin', 'Bagsit', 'Bachelor of Secondary Education', 4, 'bagsit.kevin@pnc.edu.ph', 3001),
(579, '2500069', 'Raymond', 'Cabanilla', 'Bachelor of Elementary Education', 1, 'cabanilla.raymond@pnc.edu.ph', 3001),
(580, '2500070', 'Angela', 'Corpuz', 'Bachelor of Secondary Education', 2, 'corpuz.angela@pnc.edu.ph', 3001),
(581, '2500071', 'Olivia', 'Del Mundo', 'Bachelor of Elementary Education', 3, 'delmundo.olivia@pnc.edu.ph', 3001),
(582, '2500072', 'Gabrielle', 'Estrella', 'Bachelor of Secondary Education', 4, 'estrella.gabrielle@pnc.edu.ph', 3001),
(583, '2500073', 'Wilma', 'Ignacio', 'Bachelor of Elementary Education', 1, 'ignacio.wilma@pnc.edu.ph', 3001),
(584, '2500074', 'Antonio', 'Leano', 'Bachelor of Secondary Education', 2, 'leano.antonio@pnc.edu.ph', 3001),
(585, '2500075', 'Gabriel', 'Marcelo', 'Bachelor of Elementary Education', 3, 'marcelo.gabriel@pnc.edu.ph', 3001),
(586, '2500076', 'Martin', 'Padua', 'Bachelor of Secondary Education', 4, 'padua.martin@pnc.edu.ph', 3001),
(587, '2500077', 'Timothy', 'Robles', 'Bachelor of Elementary Education', 1, 'robles.timothy@pnc.edu.ph', 3001),
(588, '2500078', 'Diana', 'Trinidad', 'Bachelor of Secondary Education', 2, 'trinidad.diana@pnc.edu.ph', 3001),
(589, '2500079', 'Trisha', 'Yulo', 'Bachelor of Elementary Education', 3, 'yulo.trisha@pnc.edu.ph', 3001),
(590, '2500080', 'Katrina', 'Fajardo', 'Bachelor of Secondary Education', 4, 'fajardo.katrina@pnc.edu.ph', 3001),
(591, '2500081', 'Kristine', 'Montano', 'Bachelor of Elementary Education', 1, 'montano.kristine@pnc.edu.ph', 3001),
(592, '2500082', 'Manuel', 'Aquino', 'Bachelor of Secondary Education', 2, 'aquino.manuel@pnc.edu.ph', 3001),
(593, '2500083', 'Harold', 'Bonifacio', 'Bachelor of Elementary Education', 3, 'bonifacio.harold@pnc.edu.ph', 3001),
(594, '2500084', 'Nico', 'Catapang', 'Bachelor of Secondary Education', 4, 'catapang.nico@pnc.edu.ph', 3001),
(595, '2500085', 'Warren', 'De Leon', 'Bachelor of Elementary Education', 1, 'deleon.warren@pnc.edu.ph', 3001),
(596, '2500086', 'Grace', 'Domingo', 'Bachelor of Secondary Education', 2, 'domingo.grace@pnc.edu.ph', 3001),
(597, '2500087', 'Zoe', 'Gatchalian', 'Bachelor of Elementary Education', 3, 'gatchalian.zoe@pnc.edu.ph', 3001),
(598, '2500088', 'Nadine', 'Laurel', 'Bachelor of Secondary Education', 4, 'laurel.nadine@pnc.edu.ph', 3001),
(599, '2500089', 'Novelyn', 'Manalo', 'Bachelor of Elementary Education', 1, 'manalo.novelyn@pnc.edu.ph', 3001),
(600, '2500090', 'Angelo', 'Ocampo', 'Bachelor of Secondary Education', 2, 'ocampo.angelo@pnc.edu.ph', 3001),
(601, '2500091', 'Ivan', 'Quiambao', 'Bachelor of Elementary Education', 3, 'quiambao.ivan@pnc.edu.ph', 3001),
(602, '2500092', 'Owen', 'Tagle', 'Bachelor of Secondary Education', 4, 'tagle.owen@pnc.edu.ph', 3001),
(603, '2500093', 'Renz', 'Villaflor', 'Bachelor of Elementary Education', 1, 'villaflor.renz@pnc.edu.ph', 3001),
(604, '2500094', 'Joy', 'Diokno', 'Bachelor of Secondary Education', 2, 'diokno.joy@pnc.edu.ph', 3001),
(605, '2500095', 'Carmela', 'Kalaw', 'Bachelor of Elementary Education', 3, 'kalaw.carmela@pnc.edu.ph', 3001);

-- COED · 5. SERVICES (queue only)
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(12, 'Practice Teaching Placement', 'Placement processing for student teaching/practicum in partner schools', 3001, FALSE, 4),
(13, 'LET Review Enrollment', 'Enrollment in the college''s Licensure Exam for Teachers (LET) review program', 3001, FALSE, 4),
(14, 'Teaching Demo Scheduling', 'Schedule a slot for a required teaching demonstration or micro-teaching activity', 3001, FALSE, 4),
(15, 'Learning Resource Borrowing', 'Borrow instructional materials, manipulatives, and teaching kits for practicum use', 3001, FALSE, 4);

-- COED · 5a-REQ. SERVICE REQUIREMENTS
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Practice Teaching Placement (service_id 12)
(12, 'Practice Teaching Application Form', 'Filled out in full', TRUE),
(12, 'Certificate of Registration', 'Current semester COR', TRUE),
(12, 'Good Moral Certificate', 'Issued within the current school year', TRUE),
-- LET Review Enrollment (service_id 13)
(13, 'Valid Student ID or Alumni ID', 'Current ID or graduated alumni ID', TRUE),
(13, 'Transcript of Records or Certification', 'Proof of completed education units', TRUE),
(13, 'Official Receipt', 'Payment receipt for the review program fee', TRUE),
-- Teaching Demo Scheduling (service_id 14)
(14, 'Lesson Plan', 'Complete lesson plan for the demo topic', TRUE),
(14, 'Instructional Materials', 'Visual aids or materials to be used', FALSE),
-- Learning Resource Borrowing (service_id 15)
(15, 'Valid Student ID', 'Current school year student ID', TRUE),
(15, 'Borrower''s Slip', 'Filled out with the materials needed and return date', TRUE);

-- COED · 5a-STEPS. SERVICE PROCEDURE STEPS
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Practice Teaching Placement (service_id 12)
(12, 1, 'Submit application form', 'Fill out and submit the practice teaching application'),
(12, 2, 'Present requirements', 'Show your COR, Good Moral Certificate, and other listed documents'),
(12, 3, 'Wait for school assignment', 'The office coordinates with partner schools for placement'),
(12, 4, 'Receive placement notice', 'Get your assigned cooperating school and supervising teacher'),
(12, 5, 'Attend orientation', 'Attend the pre-deployment orientation before reporting to the school'),
-- LET Review Enrollment (service_id 13)
(13, 1, 'Fill out enrollment form', 'Complete the LET review program enrollment form'),
(13, 2, 'Pay the review fee', 'Proceed to the cashier and settle the review program fee'),
(13, 3, 'Submit requirements', 'Submit your ID, TOR/certification, and receipt to the office'),
(13, 4, 'Attend orientation', 'Attend the review program orientation and get your schedule'),
-- Teaching Demo Scheduling (service_id 14)
(14, 1, 'Submit lesson plan', 'Submit your lesson plan for the teaching demo to the office'),
(14, 2, 'Select a schedule', 'Choose from the available teaching demo slots'),
(14, 3, 'Wait for confirmation', 'The office confirms your slot, venue, and evaluator'),
(14, 4, 'Conduct the demo', 'Deliver your teaching demonstration on the scheduled date'),
-- Learning Resource Borrowing (service_id 15)
(15, 1, 'Fill out borrower''s slip', 'List the materials needed and the intended return date'),
(15, 2, 'Present your student ID', 'Show your ID for verification at the resource room'),
(15, 3, 'Inspect and receive materials', 'Check the materials for completeness before taking them'),
(15, 4, 'Return on the due date', 'Return all borrowed materials in good condition on time');

-- COED · 5c. DOCUMENT SERVICES
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(8, 'Certificate of Practice Teaching Completion', 'Certification that the student has completed the required practice teaching hours', 3001, FALSE, 'students', 'active', '3-5 business days'),
(9, 'Certification of Education Units Earned', 'Certification of professional education units earned, commonly needed for LET application', 3001, FALSE, 'students', 'active', '2-3 business days');

-- COED · 5c-REQ. DOCUMENT REQUIREMENTS
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of Practice Teaching Completion (service_id 8)
(8, 'Practice Teaching Evaluation Form', 'Signed by the cooperating teacher and supervisor', TRUE),
(8, 'Attendance Record', 'Certified attendance log from the partner school', TRUE),
-- Certification of Education Units Earned (service_id 9)
(9, 'Completed Request Form', 'Certification request form filled out in full', TRUE),
(9, 'Official Receipt', 'Payment receipt from the cashier', TRUE);

-- ================================================================
-- COE -- College of Engineering (department_id 4001)
-- user_id range: 700-805
-- ================================================================

-- COE · 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(700, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- COE · 1b. Faculty (5)
INSERT INTO users (user_id, password, role, status) VALUES
(701, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(702, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(703, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(704, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(705, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- COE · 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
(706, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(707, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(708, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(709, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(710, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(711, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(712, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(713, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(714, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(715, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(716, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(717, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(718, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(719, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(720, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(721, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(722, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(723, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(724, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(725, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(726, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(727, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(728, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(729, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(730, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(731, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(732, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(733, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(734, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(735, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(736, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(737, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(738, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(739, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(740, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(741, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(742, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(743, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(744, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(745, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(746, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(747, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(748, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(749, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(750, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(751, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(752, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(753, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(754, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(755, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(756, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(757, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(758, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(759, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(760, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(761, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(762, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(763, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(764, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(765, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(766, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(767, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(768, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(769, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(770, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(771, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(772, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(773, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(774, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(775, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(776, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(777, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(778, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(779, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(780, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(781, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(782, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(783, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(784, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(785, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(786, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(787, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(788, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(789, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(790, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(791, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(792, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(793, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(794, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(795, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(796, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(797, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(798, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(799, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(800, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(801, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(802, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(803, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(804, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(805, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- COE · 2. ADMINISTRATOR (child profile)
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(700, 'ADM-2026-004', 'Queenie', 'Capistrano', 'COE Office Administrator', 'capistrano.queenie@pnc.edu.ph', 4001);

-- COE · 3. FACULTY (child profiles) -- Employee ID format: EMP-2026-XXX
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(701, 'EMP-2026-017', 'Diana', 'Santiago', 'Structural Engineering', 'santiago.diana@pnc.edu.ph', 4001),
(702, 'EMP-2026-018', 'Trisha', 'Valenzuela', 'Power Systems Engineering', 'valenzuela.trisha@pnc.edu.ph', 4001),
(703, 'EMP-2026-019', 'Katrina', 'Bagsic', 'Thermodynamics and Machine Design', 'bagsic.katrina@pnc.edu.ph', 4001),
(704, 'EMP-2026-020', 'Kristine', 'Inocencio', 'Engineering Management', 'inocencio.kristine@pnc.edu.ph', 4001),
(705, 'EMP-2026-021', 'Manuel', 'Abrigo', 'Geotechnical Engineering', 'abrigo.manuel@pnc.edu.ph', 4001);

-- COE · 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(706, '2600501', 'Shaira', 'Almario', 'BS Civil Engineering', 1, 'almario.shaira@pnc.edu.ph', 4001),
(707, '2600502', 'Dexter', 'Bartolome', 'BS Electrical Engineering', 2, 'bartolome.dexter@pnc.edu.ph', 4001),
(708, '2600503', 'Elias', 'Capistrano', 'BS Mechanical Engineering', 3, 'capistrano.elias@pnc.edu.ph', 4001),
(709, '2600504', 'Keith', 'De Guzman', 'BS Civil Engineering', 4, 'deguzman.keith@pnc.edu.ph', 4001),
(710, '2600505', 'Quincy', 'Dimapilis', 'BS Electrical Engineering', 1, 'dimapilis.quincy@pnc.edu.ph', 4001);

-- COE · 4b. Generated students (student_numbers 2600001-2600095)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(711, '2600001', 'Maria', 'Fernandez', 'BS Civil Engineering', 1, 'fernandez.maria@pnc.edu.ph', 4001),
(712, '2600002', 'Mikaela', 'Katigbak', 'BS Electrical Engineering', 2, 'katigbak.mikaela@pnc.edu.ph', 4001),
(713, '2600003', 'Fatima', 'Magsaysay', 'BS Mechanical Engineering', 3, 'magsaysay.fatima@pnc.edu.ph', 4001),
(714, '2600004', 'Venus', 'Mercado', 'BS Civil Engineering', 4, 'mercado.venus@pnc.edu.ph', 4001),
(715, '2600005', 'Jose', 'Panganiban', 'BS Electrical Engineering', 1, 'panganiban.jose@pnc.edu.ph', 4001),
(716, '2600006', 'Francis', 'Santiago', 'BS Mechanical Engineering', 2, 'santiago.francis@pnc.edu.ph', 4001),
(717, '2600007', 'Leo', 'Valenzuela', 'BS Civil Engineering', 3, 'valenzuela.leo@pnc.edu.ph', 4001),
(718, '2600008', 'Samuel', 'Bagsic', 'BS Electrical Engineering', 4, 'bagsic.samuel@pnc.edu.ph', 4001),
(719, '2600009', 'Camille', 'Inocencio', 'BS Mechanical Engineering', 1, 'inocencio.camille@pnc.edu.ph', 4001),
(720, '2600010', 'Rachel', 'Abrigo', 'BS Civil Engineering', 2, 'abrigo.rachel@pnc.edu.ph', 4001),
(721, '2600011', 'Imelda', 'Balagtas', 'BS Electrical Engineering', 3, 'balagtas.imelda@pnc.edu.ph', 4001),
(722, '2600012', 'Jhoanna', 'Calderon', 'BS Mechanical Engineering', 4, 'calderon.jhoanna@pnc.edu.ph', 4001),
(723, '2600013', 'Ricardo', 'Dalisay', 'BS Civil Engineering', 1, 'dalisay.ricardo@pnc.edu.ph', 4001),
(724, '2600014', 'Gilbert', 'Del Rosario', 'BS Electrical Engineering', 2, 'delrosario.gilbert@pnc.edu.ph', 4001),
(725, '2600015', 'Nathaniel', 'Evangelista', 'BS Mechanical Engineering', 3, 'evangelista.nathaniel@pnc.edu.ph', 4001),
(726, '2600016', 'Vincent', 'Isip', 'BS Civil Engineering', 4, 'isip.vincent@pnc.edu.ph', 4001),
(727, '2600017', 'Faith', 'Macapagal', 'BS Electrical Engineering', 1, 'macapagal.faith@pnc.edu.ph', 4001),
(728, '2600018', 'Ysabel', 'Mariano', 'BS Mechanical Engineering', 2, 'mariano.ysabel@pnc.edu.ph', 4001),
(729, '2600019', 'Maricel', 'Palad', 'BS Civil Engineering', 3, 'palad.maricel@pnc.edu.ph', 4001),
(730, '2600020', 'Marinel', 'Salonga', 'BS Electrical Engineering', 4, 'salonga.marinel@pnc.edu.ph', 4001),
(731, '2600021', 'Fernando', 'Umali', 'BS Mechanical Engineering', 1, 'umali.fernando@pnc.edu.ph', 4001),
(732, '2600022', 'Isaac', 'Zamora', 'BS Civil Engineering', 2, 'zamora.isaac@pnc.edu.ph', 4001),
(733, '2600023', 'Oliver', 'Gascon', 'BS Electrical Engineering', 3, 'gascon.oliver@pnc.edu.ph', 4001),
(734, '2600024', 'Zachary', 'Nazareno', 'BS Mechanical Engineering', 4, 'nazareno.zachary@pnc.edu.ph', 4001),
(735, '2600025', 'Irish', 'Arceo', 'BS Civil Engineering', 1, 'arceo.irish@pnc.edu.ph', 4001),
(736, '2600026', 'Bea', 'Buenavista', 'BS Electrical Engineering', 2, 'buenavista.bea@pnc.edu.ph', 4001),
(737, '2600027', 'Rica', 'Cayabyab', 'BS Mechanical Engineering', 3, 'cayabyab.rica@pnc.edu.ph', 4001),
(738, '2600028', 'Cyrus', 'De Vera', 'BS Civil Engineering', 4, 'devera.cyrus@pnc.edu.ph', 4001),
(739, '2600029', 'Cesar', 'Espino', 'BS Electrical Engineering', 1, 'espino.cesar@pnc.edu.ph', 4001),
(740, '2600030', 'Julius', 'Gonzales', 'BS Mechanical Engineering', 2, 'gonzales.julius@pnc.edu.ph', 4001),
(741, '2600031', 'Peter', 'Lazaro', 'BS Civil Engineering', 3, 'lazaro.peter@pnc.edu.ph', 4001),
(742, '2600032', 'Josh', 'Marasigan', 'BS Electrical Engineering', 4, 'marasigan.josh@pnc.edu.ph', 4001),
(743, '2600033', 'Lorraine', 'Ongsiako', 'BS Mechanical Engineering', 1, 'ongsiako.lorraine@pnc.edu.ph', 4001),
(744, '2600034', 'Elaine', 'Quimpo', 'BS Civil Engineering', 2, 'quimpo.elaine@pnc.edu.ph', 4001),
(745, '2600035', 'Uma', 'Tolentino', 'BS Electrical Engineering', 3, 'tolentino.uma@pnc.edu.ph', 4001),
(746, '2600036', 'Juan', 'Yabut', 'BS Mechanical Engineering', 4, 'yabut.juan@pnc.edu.ph', 4001),
(747, '2600037', 'Felix', 'Escudero', 'BS Civil Engineering', 1, 'escudero.felix@pnc.edu.ph', 4001),
(748, '2600038', 'Lawrence', 'Lapid', 'BS Electrical Engineering', 2, 'lapid.lawrence@pnc.edu.ph', 4001),
(749, '2600039', 'Rex', 'Ancheta', 'BS Mechanical Engineering', 3, 'ancheta.rex@pnc.edu.ph', 4001),
(750, '2600040', 'Bianca', 'Bernardo', 'BS Civil Engineering', 4, 'bernardo.bianca@pnc.edu.ph', 4001),
(751, '2600041', 'Queenie', 'Carpio', 'BS Electrical Engineering', 1, 'carpio.queenie@pnc.edu.ph', 4001),
(752, '2600042', 'Honey', 'De Jesus', 'BS Mechanical Engineering', 2, 'dejesus.honey@pnc.edu.ph', 4001),
(753, '2600043', 'Ysabelle', 'Dizon', 'BS Civil Engineering', 3, 'dizon.ysabelle@pnc.edu.ph', 4001),
(754, '2600044', 'Eduardo', 'Galang', 'BS Electrical Engineering', 4, 'galang.eduardo@pnc.edu.ph', 4001),
(755, '2600045', 'Gerald', 'Lacson', 'BS Mechanical Engineering', 1, 'lacson.gerald@pnc.edu.ph', 4001),
(756, '2600046', 'Melvin', 'Malabanan', 'BS Civil Engineering', 2, 'malabanan.melvin@pnc.edu.ph', 4001),
(757, '2600047', 'Uriel', 'Nepomuceno', 'BS Electrical Engineering', 3, 'nepomuceno.uriel@pnc.edu.ph', 4001),
(758, '2600048', 'Erika', 'Pimentel', 'BS Mechanical Engineering', 4, 'pimentel.erika@pnc.edu.ph', 4001),
(759, '2600049', 'Winnie', 'Sarmiento', 'BS Civil Engineering', 1, 'sarmiento.winnie@pnc.edu.ph', 4001),
(760, '2600050', 'Liezel', 'Ventura', 'BS Electrical Engineering', 2, 'ventura.liezel@pnc.edu.ph', 4001),
(761, '2600051', 'Loraine', 'Cariaga', 'BS Mechanical Engineering', 3, 'cariaga.loraine@pnc.edu.ph', 4001),
(762, '2600052', 'Roberto', 'Javier', 'BS Civil Engineering', 4, 'javier.roberto@pnc.edu.ph', 4001),
(763, '2600053', 'Henry', 'Alcantara', 'BS Electrical Engineering', 1, 'alcantara.henry@pnc.edu.ph', 4001),
(764, '2600054', 'Noel', 'Balderas', 'BS Mechanical Engineering', 2, 'balderas.noel@pnc.edu.ph', 4001),
(765, '2600055', 'Xavier', 'Camacho', 'BS Civil Engineering', 3, 'camacho.xavier@pnc.edu.ph', 4001),
(766, '2600056', 'Hannah', 'David', 'BS Electrical Engineering', 4, 'david.hannah@pnc.edu.ph', 4001),
(767, '2600057', 'Angelica', 'Dimaculangan', 'BS Mechanical Engineering', 1, 'dimaculangan.angelica@pnc.edu.ph', 4001),
(768, '2600058', 'Precious', 'Fajardo', 'BS Civil Engineering', 2, 'fajardo.precious@pnc.edu.ph', 4001),
(769, '2600059', 'Aldrin', 'Jacinto', 'BS Electrical Engineering', 3, 'jacinto.aldrin@pnc.edu.ph', 4001),
(770, '2600060', 'Benedict', 'Magat', 'BS Mechanical Engineering', 4, 'magat.benedict@pnc.edu.ph', 4001),
(771, '2600061', 'Jerome', 'Mendiola', 'BS Civil Engineering', 1, 'mendiola.jerome@pnc.edu.ph', 4001),
(772, '2600062', 'Patrick', 'Pangan', 'BS Electrical Engineering', 2, 'pangan.patrick@pnc.edu.ph', 4001),
(773, '2600063', 'Kian', 'San Pedro', 'BS Mechanical Engineering', 3, 'sanpedro.kian@pnc.edu.ph', 4001),
(774, '2600064', 'Kimberly', 'Valencia', 'BS Civil Engineering', 4, 'valencia.kimberly@pnc.edu.ph', 4001),
(775, '2600065', 'Denise', 'Agbayani', 'BS Electrical Engineering', 1, 'agbayani.denise@pnc.edu.ph', 4001),
(776, '2600066', 'Therese', 'Hidalgo', 'BS Mechanical Engineering', 2, 'hidalgo.therese@pnc.edu.ph', 4001),
(777, '2600067', 'Ferdinand', 'Abad', 'BS Civil Engineering', 3, 'abad.ferdinand@pnc.edu.ph', 4001),
(778, '2600068', 'Emmanuel', 'Bagsit', 'BS Electrical Engineering', 4, 'bagsit.emmanuel@pnc.edu.ph', 4001),
(779, '2600069', 'Kevin', 'Cabanilla', 'BS Mechanical Engineering', 1, 'cabanilla.kevin@pnc.edu.ph', 4001),
(780, '2600070', 'Raymond', 'Corpuz', 'BS Civil Engineering', 2, 'corpuz.raymond@pnc.edu.ph', 4001),
(781, '2600071', 'Angela', 'Del Mundo', 'BS Electrical Engineering', 3, 'delmundo.angela@pnc.edu.ph', 4001),
(782, '2600072', 'Olivia', 'Estrella', 'BS Mechanical Engineering', 4, 'estrella.olivia@pnc.edu.ph', 4001),
(783, '2600073', 'Gabrielle', 'Ignacio', 'BS Civil Engineering', 1, 'ignacio.gabrielle@pnc.edu.ph', 4001),
(784, '2600074', 'Wilma', 'Leano', 'BS Electrical Engineering', 2, 'leano.wilma@pnc.edu.ph', 4001),
(785, '2600075', 'Antonio', 'Marcelo', 'BS Mechanical Engineering', 3, 'marcelo.antonio@pnc.edu.ph', 4001),
(786, '2600076', 'Gabriel', 'Padua', 'BS Civil Engineering', 4, 'padua.gabriel@pnc.edu.ph', 4001),
(787, '2600077', 'Martin', 'Robles', 'BS Electrical Engineering', 1, 'robles.martin@pnc.edu.ph', 4001),
(788, '2600078', 'Timothy', 'Trinidad', 'BS Mechanical Engineering', 2, 'trinidad.timothy@pnc.edu.ph', 4001),
(789, '2600079', 'Diana', 'Yulo', 'BS Civil Engineering', 3, 'yulo.diana@pnc.edu.ph', 4001),
(790, '2600080', 'Trisha', 'Fajardo', 'BS Electrical Engineering', 4, 'fajardo.trisha@pnc.edu.ph', 4001),
(791, '2600081', 'Katrina', 'Montano', 'BS Mechanical Engineering', 1, 'montano.katrina@pnc.edu.ph', 4001),
(792, '2600082', 'Kristine', 'Aquino', 'BS Civil Engineering', 2, 'aquino.kristine@pnc.edu.ph', 4001),
(793, '2600083', 'Manuel', 'Bonifacio', 'BS Electrical Engineering', 3, 'bonifacio.manuel@pnc.edu.ph', 4001),
(794, '2600084', 'Harold', 'Catapang', 'BS Mechanical Engineering', 4, 'catapang.harold@pnc.edu.ph', 4001),
(795, '2600085', 'Nico', 'De Leon', 'BS Civil Engineering', 1, 'deleon.nico@pnc.edu.ph', 4001),
(796, '2600086', 'Warren', 'Domingo', 'BS Electrical Engineering', 2, 'domingo.warren@pnc.edu.ph', 4001),
(797, '2600087', 'Grace', 'Gatchalian', 'BS Mechanical Engineering', 3, 'gatchalian.grace@pnc.edu.ph', 4001),
(798, '2600088', 'Zoe', 'Laurel', 'BS Civil Engineering', 4, 'laurel.zoe@pnc.edu.ph', 4001),
(799, '2600089', 'Nadine', 'Manalo', 'BS Electrical Engineering', 1, 'manalo.nadine@pnc.edu.ph', 4001),
(800, '2600090', 'Novelyn', 'Ocampo', 'BS Mechanical Engineering', 2, 'ocampo.novelyn@pnc.edu.ph', 4001),
(801, '2600091', 'Angelo', 'Quiambao', 'BS Civil Engineering', 3, 'quiambao.angelo@pnc.edu.ph', 4001),
(802, '2600092', 'Ivan', 'Tagle', 'BS Electrical Engineering', 4, 'tagle.ivan@pnc.edu.ph', 4001),
(803, '2600093', 'Owen', 'Villaflor', 'BS Mechanical Engineering', 1, 'villaflor.owen@pnc.edu.ph', 4001),
(804, '2600094', 'Renz', 'Diokno', 'BS Civil Engineering', 2, 'diokno.renz@pnc.edu.ph', 4001),
(805, '2600095', 'Joy', 'Kalaw', 'BS Electrical Engineering', 3, 'kalaw.joy@pnc.edu.ph', 4001);

-- COE · 5. SERVICES (queue only)
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(16, 'Lab Equipment Request', 'Request and reservation of laboratory equipment for engineering coursework', 4001, FALSE, 5),
(17, 'Engineering Drawing/Plan Submission', 'Submission and logging of engineering plates, plans, or design drawings for evaluation', 4001, FALSE, 5),
(18, 'OJT Endorsement', 'Endorsement processing for on-the-job training placement with partner companies', 4001, FALSE, 5),
(19, 'Board Exam Review Enrollment', 'Enrollment in the college''s engineering licensure exam review program', 4001, FALSE, 5);

-- COE · 5a-REQ. SERVICE REQUIREMENTS
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Lab Equipment Request (service_id 16)
(16, 'Equipment Request Slip', 'Filled out with equipment needed and schedule', TRUE),
(16, 'Valid Student ID', 'Current school year student ID', TRUE),
(16, 'Instructor''s Approval', 'Signature of the handling instructor', TRUE),
-- Engineering Drawing/Plan Submission (service_id 17)
(17, 'Completed Plate/Plan', 'Final engineering drawing or plan', TRUE),
(17, 'Submission Form', 'Filled out with subject, section, and instructor', TRUE),
-- OJT Endorsement (service_id 18)
(18, 'Endorsement Request Form', 'Filled out in full and signed by the student', TRUE),
(18, 'Certificate of Registration', 'Current semester COR', TRUE),
(18, 'Resume/CV', 'Updated resume for the host company', FALSE),
-- Board Exam Review Enrollment (service_id 19)
(19, 'Valid Student ID or Alumni ID', 'Current ID or graduated alumni ID', TRUE),
(19, 'Transcript of Records or Certification', 'Proof of completed engineering units', TRUE),
(19, 'Official Receipt', 'Payment receipt for the review program fee', TRUE);

-- COE · 5a-STEPS. SERVICE PROCEDURE STEPS
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Lab Equipment Request (service_id 16)
(16, 1, 'Fill out request slip', 'List the equipment needed and the intended usage schedule'),
(16, 2, 'Secure instructor''s approval', 'Have the handling instructor sign the request slip'),
(16, 3, 'Submit to the lab custodian', 'Present the approved slip and your student ID'),
(16, 4, 'Inspect and receive equipment', 'Check equipment condition before taking it out'),
(16, 5, 'Return equipment', 'Return all borrowed equipment on the agreed date and condition'),
-- Engineering Drawing/Plan Submission (service_id 17)
(17, 1, 'Fill out the submission form', 'Complete the plan/plate submission form'),
(17, 2, 'Present your drawing', 'Submit the completed engineering drawing or plan to the office'),
(17, 3, 'Get a receiving stamp', 'Staff logs and stamps your submission for tracking'),
(17, 4, 'Wait for evaluation results', 'Your instructor evaluates and returns the plan through the office'),
-- OJT Endorsement (service_id 18)
(18, 1, 'Submit request form', 'Fill out and submit the OJT endorsement request form'),
(18, 2, 'Present COR and requirements', 'Show your current COR and other listed requirements'),
(18, 3, 'Wait for adviser approval', 'Your OJT coordinator reviews and approves the endorsement'),
(18, 4, 'Claim endorsement letter', 'Return to claim your signed endorsement letter'),
-- Board Exam Review Enrollment (service_id 19)
(19, 1, 'Fill out enrollment form', 'Complete the board exam review enrollment form'),
(19, 2, 'Pay the review fee', 'Proceed to the cashier and settle the review program fee'),
(19, 3, 'Submit requirements', 'Submit your ID, TOR/certification, and receipt to the office'),
(19, 4, 'Attend orientation', 'Attend the review program orientation and get your schedule');

-- COE · 5c. DOCUMENT SERVICES
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(10, 'Certificate of OJT Completion', 'Certification that the student has completed the required OJT hours', 4001, FALSE, 'students', 'active', '3-5 business days'),
(11, 'Certified True Copy of Engineering Plan', 'Certified reproduction of a previously submitted and evaluated engineering plan', 4001, FALSE, 'students', 'active', '2-3 business days');

-- COE · 5c-REQ. DOCUMENT REQUIREMENTS
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of OJT Completion (service_id 10)
(10, 'OJT Evaluation Form', 'Signed by the host company supervisor', TRUE),
(10, 'Certificate of Attendance', 'Issued by the host company', TRUE),
(10, 'Official Receipt', 'Payment receipt from the cashier', TRUE),
-- Certified True Copy of Engineering Plan (service_id 11)
(11, 'Completed Request Form', 'Request form filled out in full', TRUE),
(11, 'Official Receipt', 'Payment receipt from the cashier', TRUE);

-- ================================================================
-- CAS -- College of Arts and Sciences (department_id 5001)
-- user_id range: 900-1005
-- ================================================================

-- CAS · 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(900, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- CAS · 1b. Faculty (5)
INSERT INTO users (user_id, password, role, status) VALUES
(901, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(902, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(903, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(904, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(905, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- CAS · 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
(906, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(907, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(908, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(909, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(910, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(911, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(912, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(913, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(914, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(915, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(916, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(917, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(918, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(919, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(920, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(921, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(922, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(923, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(924, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(925, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(926, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(927, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(928, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(929, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(930, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(931, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(932, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(933, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(934, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(935, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(936, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(937, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(938, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(939, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(940, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(941, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(942, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(943, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(944, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(945, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(946, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(947, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(948, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(949, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(950, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(951, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(952, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(953, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(954, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(955, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(956, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(957, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(958, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(959, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(960, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(961, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(962, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(963, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(964, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(965, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(966, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(967, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(968, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(969, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(970, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(971, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(972, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(973, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(974, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(975, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(976, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(977, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(978, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(979, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(980, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(981, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(982, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(983, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(984, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(985, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(986, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(987, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(988, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(989, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(990, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(991, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(992, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(993, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(994, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(995, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(996, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(997, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(998, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(999, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1000, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1001, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1002, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1003, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1004, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1005, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- CAS · 2. ADMINISTRATOR (child profile)
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(900, 'ADM-2026-005', 'Honey', 'De Guzman', 'CAS Office Administrator', 'deguzman.honey@pnc.edu.ph', 5001);

-- CAS · 3. FACULTY (child profiles) -- Employee ID format: EMP-2026-XXX
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(901, 'EMP-2026-022', 'Harold', 'Balagtas', 'Clinical Psychology', 'balagtas.harold@pnc.edu.ph', 5001),
(902, 'EMP-2026-023', 'Nico', 'Calderon', 'Mass Communication', 'calderon.nico@pnc.edu.ph', 5001),
(903, 'EMP-2026-024', 'Warren', 'Dalisay', 'Political Science and Governance', 'dalisay.warren@pnc.edu.ph', 5001),
(904, 'EMP-2026-025', 'Grace', 'Del Rosario', 'Behavioral Sciences', 'delrosario.grace@pnc.edu.ph', 5001),
(905, 'EMP-2026-026', 'Zoe', 'Evangelista', 'Media and Journalism', 'evangelista.zoe@pnc.edu.ph', 5001);

-- CAS · 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(906, '2700501', 'Carmela', 'Almario', 'BA Communication', 1, 'almario.carmela@pnc.edu.ph', 5001),
(907, '2700502', 'Shaira', 'Bartolome', 'BS Psychology', 2, 'bartolome.shaira@pnc.edu.ph', 5001),
(908, '2700503', 'Dexter', 'Capistrano', 'BA Political Science', 3, 'capistrano.dexter@pnc.edu.ph', 5001),
(909, '2700504', 'Elias', 'De Guzman', 'BA Communication', 4, 'deguzman.elias@pnc.edu.ph', 5001),
(910, '2700505', 'Keith', 'Dimapilis', 'BS Psychology', 1, 'dimapilis.keith@pnc.edu.ph', 5001);

-- CAS · 4b. Generated students (student_numbers 2700001-2700095)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(911, '2700001', 'Quincy', 'Fernandez', 'BA Communication', 1, 'fernandez.quincy@pnc.edu.ph', 5001),
(912, '2700002', 'Maria', 'Katigbak', 'BS Psychology', 2, 'katigbak.maria@pnc.edu.ph', 5001),
(913, '2700003', 'Mikaela', 'Magsaysay', 'BA Political Science', 3, 'magsaysay.mikaela@pnc.edu.ph', 5001),
(914, '2700004', 'Fatima', 'Mercado', 'BA Communication', 4, 'mercado.fatima@pnc.edu.ph', 5001),
(915, '2700005', 'Venus', 'Panganiban', 'BS Psychology', 1, 'panganiban.venus@pnc.edu.ph', 5001),
(916, '2700006', 'Jose', 'Santiago', 'BA Political Science', 2, 'santiago.jose@pnc.edu.ph', 5001),
(917, '2700007', 'Francis', 'Valenzuela', 'BA Communication', 3, 'valenzuela.francis@pnc.edu.ph', 5001),
(918, '2700008', 'Leo', 'Bagsic', 'BS Psychology', 4, 'bagsic.leo@pnc.edu.ph', 5001),
(919, '2700009', 'Samuel', 'Inocencio', 'BA Political Science', 1, 'inocencio.samuel@pnc.edu.ph', 5001),
(920, '2700010', 'Camille', 'Abrigo', 'BA Communication', 2, 'abrigo.camille@pnc.edu.ph', 5001),
(921, '2700011', 'Rachel', 'Balagtas', 'BS Psychology', 3, 'balagtas.rachel@pnc.edu.ph', 5001),
(922, '2700012', 'Imelda', 'Calderon', 'BA Political Science', 4, 'calderon.imelda@pnc.edu.ph', 5001),
(923, '2700013', 'Jhoanna', 'Dalisay', 'BA Communication', 1, 'dalisay.jhoanna@pnc.edu.ph', 5001),
(924, '2700014', 'Ricardo', 'Del Rosario', 'BS Psychology', 2, 'delrosario.ricardo@pnc.edu.ph', 5001),
(925, '2700015', 'Gilbert', 'Evangelista', 'BA Political Science', 3, 'evangelista.gilbert@pnc.edu.ph', 5001),
(926, '2700016', 'Nathaniel', 'Isip', 'BA Communication', 4, 'isip.nathaniel@pnc.edu.ph', 5001),
(927, '2700017', 'Vincent', 'Macapagal', 'BS Psychology', 1, 'macapagal.vincent@pnc.edu.ph', 5001),
(928, '2700018', 'Faith', 'Mariano', 'BA Political Science', 2, 'mariano.faith@pnc.edu.ph', 5001),
(929, '2700019', 'Ysabel', 'Palad', 'BA Communication', 3, 'palad.ysabel@pnc.edu.ph', 5001),
(930, '2700020', 'Maricel', 'Salonga', 'BS Psychology', 4, 'salonga.maricel@pnc.edu.ph', 5001),
(931, '2700021', 'Marinel', 'Umali', 'BA Political Science', 1, 'umali.marinel@pnc.edu.ph', 5001),
(932, '2700022', 'Fernando', 'Zamora', 'BA Communication', 2, 'zamora.fernando@pnc.edu.ph', 5001),
(933, '2700023', 'Isaac', 'Gascon', 'BS Psychology', 3, 'gascon.isaac@pnc.edu.ph', 5001),
(934, '2700024', 'Oliver', 'Nazareno', 'BA Political Science', 4, 'nazareno.oliver@pnc.edu.ph', 5001),
(935, '2700025', 'Zachary', 'Arceo', 'BA Communication', 1, 'arceo.zachary@pnc.edu.ph', 5001),
(936, '2700026', 'Irish', 'Buenavista', 'BS Psychology', 2, 'buenavista.irish@pnc.edu.ph', 5001),
(937, '2700027', 'Bea', 'Cayabyab', 'BA Political Science', 3, 'cayabyab.bea@pnc.edu.ph', 5001),
(938, '2700028', 'Rica', 'De Vera', 'BA Communication', 4, 'devera.rica@pnc.edu.ph', 5001),
(939, '2700029', 'Cyrus', 'Espino', 'BS Psychology', 1, 'espino.cyrus@pnc.edu.ph', 5001),
(940, '2700030', 'Cesar', 'Gonzales', 'BA Political Science', 2, 'gonzales.cesar@pnc.edu.ph', 5001),
(941, '2700031', 'Julius', 'Lazaro', 'BA Communication', 3, 'lazaro.julius@pnc.edu.ph', 5001),
(942, '2700032', 'Peter', 'Marasigan', 'BS Psychology', 4, 'marasigan.peter@pnc.edu.ph', 5001),
(943, '2700033', 'Josh', 'Ongsiako', 'BA Political Science', 1, 'ongsiako.josh@pnc.edu.ph', 5001),
(944, '2700034', 'Lorraine', 'Quimpo', 'BA Communication', 2, 'quimpo.lorraine@pnc.edu.ph', 5001),
(945, '2700035', 'Elaine', 'Tolentino', 'BS Psychology', 3, 'tolentino.elaine@pnc.edu.ph', 5001),
(946, '2700036', 'Uma', 'Yabut', 'BA Political Science', 4, 'yabut.uma@pnc.edu.ph', 5001),
(947, '2700037', 'Juan', 'Escudero', 'BA Communication', 1, 'escudero.juan@pnc.edu.ph', 5001),
(948, '2700038', 'Felix', 'Lapid', 'BS Psychology', 2, 'lapid.felix@pnc.edu.ph', 5001),
(949, '2700039', 'Lawrence', 'Ancheta', 'BA Political Science', 3, 'ancheta.lawrence@pnc.edu.ph', 5001),
(950, '2700040', 'Rex', 'Bernardo', 'BA Communication', 4, 'bernardo.rex@pnc.edu.ph', 5001),
(951, '2700041', 'Bianca', 'Carpio', 'BS Psychology', 1, 'carpio.bianca@pnc.edu.ph', 5001),
(952, '2700042', 'Queenie', 'De Jesus', 'BA Political Science', 2, 'dejesus.queenie@pnc.edu.ph', 5001),
(953, '2700043', 'Honey', 'Dizon', 'BA Communication', 3, 'dizon.honey@pnc.edu.ph', 5001),
(954, '2700044', 'Ysabelle', 'Galang', 'BS Psychology', 4, 'galang.ysabelle@pnc.edu.ph', 5001),
(955, '2700045', 'Eduardo', 'Lacson', 'BA Political Science', 1, 'lacson.eduardo@pnc.edu.ph', 5001),
(956, '2700046', 'Gerald', 'Malabanan', 'BA Communication', 2, 'malabanan.gerald@pnc.edu.ph', 5001),
(957, '2700047', 'Melvin', 'Nepomuceno', 'BS Psychology', 3, 'nepomuceno.melvin@pnc.edu.ph', 5001),
(958, '2700048', 'Uriel', 'Pimentel', 'BA Political Science', 4, 'pimentel.uriel@pnc.edu.ph', 5001),
(959, '2700049', 'Erika', 'Sarmiento', 'BA Communication', 1, 'sarmiento.erika@pnc.edu.ph', 5001),
(960, '2700050', 'Winnie', 'Ventura', 'BS Psychology', 2, 'ventura.winnie@pnc.edu.ph', 5001),
(961, '2700051', 'Liezel', 'Cariaga', 'BA Political Science', 3, 'cariaga.liezel@pnc.edu.ph', 5001),
(962, '2700052', 'Loraine', 'Javier', 'BA Communication', 4, 'javier.loraine@pnc.edu.ph', 5001),
(963, '2700053', 'Roberto', 'Alcantara', 'BS Psychology', 1, 'alcantara.roberto@pnc.edu.ph', 5001),
(964, '2700054', 'Henry', 'Balderas', 'BA Political Science', 2, 'balderas.henry@pnc.edu.ph', 5001),
(965, '2700055', 'Noel', 'Camacho', 'BA Communication', 3, 'camacho.noel@pnc.edu.ph', 5001),
(966, '2700056', 'Xavier', 'David', 'BS Psychology', 4, 'david.xavier@pnc.edu.ph', 5001),
(967, '2700057', 'Hannah', 'Dimaculangan', 'BA Political Science', 1, 'dimaculangan.hannah@pnc.edu.ph', 5001),
(968, '2700058', 'Angelica', 'Fajardo', 'BA Communication', 2, 'fajardo.angelica@pnc.edu.ph', 5001),
(969, '2700059', 'Precious', 'Jacinto', 'BS Psychology', 3, 'jacinto.precious@pnc.edu.ph', 5001),
(970, '2700060', 'Aldrin', 'Magat', 'BA Political Science', 4, 'magat.aldrin@pnc.edu.ph', 5001),
(971, '2700061', 'Benedict', 'Mendiola', 'BA Communication', 1, 'mendiola.benedict@pnc.edu.ph', 5001),
(972, '2700062', 'Jerome', 'Pangan', 'BS Psychology', 2, 'pangan.jerome@pnc.edu.ph', 5001),
(973, '2700063', 'Patrick', 'San Pedro', 'BA Political Science', 3, 'sanpedro.patrick@pnc.edu.ph', 5001),
(974, '2700064', 'Kian', 'Valencia', 'BA Communication', 4, 'valencia.kian@pnc.edu.ph', 5001),
(975, '2700065', 'Kimberly', 'Agbayani', 'BS Psychology', 1, 'agbayani.kimberly@pnc.edu.ph', 5001),
(976, '2700066', 'Denise', 'Hidalgo', 'BA Political Science', 2, 'hidalgo.denise@pnc.edu.ph', 5001),
(977, '2700067', 'Therese', 'Abad', 'BA Communication', 3, 'abad.therese@pnc.edu.ph', 5001),
(978, '2700068', 'Ferdinand', 'Bagsit', 'BS Psychology', 4, 'bagsit.ferdinand@pnc.edu.ph', 5001),
(979, '2700069', 'Emmanuel', 'Cabanilla', 'BA Political Science', 1, 'cabanilla.emmanuel@pnc.edu.ph', 5001),
(980, '2700070', 'Kevin', 'Corpuz', 'BA Communication', 2, 'corpuz.kevin@pnc.edu.ph', 5001),
(981, '2700071', 'Raymond', 'Del Mundo', 'BS Psychology', 3, 'delmundo.raymond@pnc.edu.ph', 5001),
(982, '2700072', 'Angela', 'Estrella', 'BA Political Science', 4, 'estrella.angela@pnc.edu.ph', 5001),
(983, '2700073', 'Olivia', 'Ignacio', 'BA Communication', 1, 'ignacio.olivia@pnc.edu.ph', 5001),
(984, '2700074', 'Gabrielle', 'Leano', 'BS Psychology', 2, 'leano.gabrielle@pnc.edu.ph', 5001),
(985, '2700075', 'Wilma', 'Marcelo', 'BA Political Science', 3, 'marcelo.wilma@pnc.edu.ph', 5001),
(986, '2700076', 'Antonio', 'Padua', 'BA Communication', 4, 'padua.antonio@pnc.edu.ph', 5001),
(987, '2700077', 'Gabriel', 'Robles', 'BS Psychology', 1, 'robles.gabriel@pnc.edu.ph', 5001),
(988, '2700078', 'Martin', 'Trinidad', 'BA Political Science', 2, 'trinidad.martin@pnc.edu.ph', 5001),
(989, '2700079', 'Timothy', 'Yulo', 'BA Communication', 3, 'yulo.timothy@pnc.edu.ph', 5001),
(990, '2700080', 'Diana', 'Fajardo', 'BS Psychology', 4, 'fajardo.diana@pnc.edu.ph', 5001),
(991, '2700081', 'Trisha', 'Montano', 'BA Political Science', 1, 'montano.trisha@pnc.edu.ph', 5001),
(992, '2700082', 'Katrina', 'Aquino', 'BA Communication', 2, 'aquino.katrina@pnc.edu.ph', 5001),
(993, '2700083', 'Kristine', 'Bonifacio', 'BS Psychology', 3, 'bonifacio.kristine@pnc.edu.ph', 5001),
(994, '2700084', 'Manuel', 'Catapang', 'BA Political Science', 4, 'catapang.manuel@pnc.edu.ph', 5001),
(995, '2700085', 'Harold', 'De Leon', 'BA Communication', 1, 'deleon.harold@pnc.edu.ph', 5001),
(996, '2700086', 'Nico', 'Domingo', 'BS Psychology', 2, 'domingo.nico@pnc.edu.ph', 5001),
(997, '2700087', 'Warren', 'Gatchalian', 'BA Political Science', 3, 'gatchalian.warren@pnc.edu.ph', 5001),
(998, '2700088', 'Grace', 'Laurel', 'BA Communication', 4, 'laurel.grace@pnc.edu.ph', 5001),
(999, '2700089', 'Zoe', 'Manalo', 'BS Psychology', 1, 'manalo.zoe@pnc.edu.ph', 5001),
(1000, '2700090', 'Nadine', 'Ocampo', 'BA Political Science', 2, 'ocampo.nadine@pnc.edu.ph', 5001),
(1001, '2700091', 'Novelyn', 'Quiambao', 'BA Communication', 3, 'quiambao.novelyn@pnc.edu.ph', 5001),
(1002, '2700092', 'Angelo', 'Tagle', 'BS Psychology', 4, 'tagle.angelo@pnc.edu.ph', 5001),
(1003, '2700093', 'Ivan', 'Villaflor', 'BA Political Science', 1, 'villaflor.ivan@pnc.edu.ph', 5001),
(1004, '2700094', 'Owen', 'Diokno', 'BA Communication', 2, 'diokno.owen@pnc.edu.ph', 5001),
(1005, '2700095', 'Renz', 'Kalaw', 'BS Psychology', 3, 'kalaw.renz@pnc.edu.ph', 5001);

-- CAS · 5. SERVICES (queue only)
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(20, 'Psychological Testing/Assessment Request', 'Request for a standardized psychological test administered by the psychology unit', 5001, FALSE, 6),
(21, 'Thesis/Research Adviser Assignment', 'Request for assignment of a thesis or research adviser for capstone research', 5001, FALSE, 6),
(22, 'Media Equipment Borrowing', 'Borrow cameras, recorders, and other media equipment for Communication coursework', 5001, FALSE, 6),
(23, 'Practicum/Internship Endorsement', 'Endorsement processing for internship placement relevant to Communication, Psychology, or Political Science', 5001, FALSE, 6);

-- CAS · 5a-REQ. SERVICE REQUIREMENTS
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Psychological Testing/Assessment Request (service_id 20)
(20, 'Valid Student ID', 'Current school year student ID', TRUE),
(20, 'Request/Referral Form', 'Filled out with the reason for testing', TRUE),
(20, 'Official Receipt', 'Payment receipt from the cashier, if applicable', FALSE),
-- Thesis/Research Adviser Assignment (service_id 21)
(21, 'Adviser Request Form', 'Filled out with preferred research area', TRUE),
(21, 'Research Concept Paper', 'Brief outline of the proposed study', FALSE),
-- Media Equipment Borrowing (service_id 22)
(22, 'Valid Student ID', 'Current school year student ID', TRUE),
(22, 'Borrower''s Slip', 'Filled out with equipment needed and return date', TRUE),
(22, 'Instructor''s Approval', 'Signature of the handling instructor', TRUE),
-- Practicum/Internship Endorsement (service_id 23)
(23, 'Endorsement Request Form', 'Filled out in full and signed by the student', TRUE),
(23, 'Certificate of Registration', 'Current semester COR', TRUE),
(23, 'Resume/CV', 'Updated resume for the host organization', FALSE);

-- CAS · 5a-STEPS. SERVICE PROCEDURE STEPS
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Psychological Testing/Assessment Request (service_id 20)
(20, 1, 'Submit request form', 'Fill out and submit the assessment request form'),
(20, 2, 'Schedule a testing slot', 'Pick an available testing date and time'),
(20, 3, 'Take the assessment', 'Attend and complete the scheduled psychological test'),
(20, 4, 'Wait for results', 'The examiner scores and interprets the results'),
(20, 5, 'Claim the result summary', 'Return with your student ID to claim your result summary'),
-- Thesis/Research Adviser Assignment (service_id 21)
(21, 1, 'Submit request form', 'Fill out and submit the adviser request form'),
(21, 2, 'Indicate preferred research area', 'Note your topic interest to help match an adviser'),
(21, 3, 'Wait for assignment', 'The department matches you with an available qualified adviser'),
(21, 4, 'Receive assignment notice', 'Get notified of your assigned adviser and initial meeting schedule'),
-- Media Equipment Borrowing (service_id 22)
(22, 1, 'Fill out borrower''s slip', 'List the equipment needed and the intended return date'),
(22, 2, 'Secure instructor''s approval', 'Have the handling instructor sign the borrower''s slip'),
(22, 3, 'Inspect and receive equipment', 'Check equipment condition before taking it out'),
(22, 4, 'Return on the due date', 'Return all borrowed equipment in good condition on time'),
-- Practicum/Internship Endorsement (service_id 23)
(23, 1, 'Submit request form', 'Fill out and submit the endorsement request form'),
(23, 2, 'Present COR and requirements', 'Show your current COR and other listed requirements'),
(23, 3, 'Wait for adviser approval', 'Your practicum adviser reviews and approves the endorsement'),
(23, 4, 'Claim endorsement letter', 'Return to claim your signed endorsement letter for the host organization');

-- CAS · 5c. DOCUMENT SERVICES
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(12, 'Certificate of Research Adviser Endorsement', 'Certification confirming a student''s assigned thesis/research adviser', 5001, FALSE, 'students', 'active', '2-3 business days'),
(13, 'Certificate of Psychological Assessment Completion', 'Certification that a student has completed a required psychological assessment', 5001, FALSE, 'students', 'active', '3-5 business days');

-- CAS · 5c-REQ. DOCUMENT REQUIREMENTS
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of Research Adviser Endorsement (service_id 12)
(12, 'Completed Request Form', 'Request form filled out in full', TRUE),
(12, 'Valid Student ID', 'Current school year student ID', TRUE),
-- Certificate of Psychological Assessment Completion (service_id 13)
(13, 'Assessment Result Summary', 'Issued after the completed testing session', TRUE),
(13, 'Official Receipt', 'Payment receipt from the cashier', TRUE);

-- ================================================================
-- CHAS -- College of Health and Allied Sciences (department_id 6001)
-- user_id range: 1100-1205
-- ================================================================

-- CHAS · 1a. Administrator (1)
INSERT INTO users (user_id, password, role, status) VALUES
(1100, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'admin', 'active');

-- CHAS · 1b. Faculty (5)
INSERT INTO users (user_id, password, role, status) VALUES
(1101, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(1102, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(1103, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(1104, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active'),
(1105, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'faculty', 'active');

-- CHAS · 1c. Students (100): 5 named + 95 generated
INSERT INTO users (user_id, password, role, status) VALUES
(1106, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1107, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1108, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1109, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1110, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1111, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1112, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1113, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1114, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1115, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1116, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1117, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1118, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1119, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1120, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1121, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1122, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1123, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1124, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1125, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1126, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1127, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1128, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1129, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1130, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1131, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1132, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1133, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1134, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1135, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1136, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1137, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1138, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1139, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1140, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1141, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1142, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1143, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1144, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1145, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1146, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1147, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1148, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1149, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1150, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1151, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1152, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1153, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1154, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1155, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1156, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1157, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1158, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1159, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1160, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1161, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1162, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1163, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1164, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1165, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1166, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1167, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1168, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1169, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1170, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1171, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1172, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1173, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1174, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1175, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1176, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1177, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1178, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1179, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1180, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1181, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1182, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1183, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1184, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1185, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1186, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1187, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1188, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1189, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1190, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1191, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1192, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1193, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1194, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1195, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1196, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1197, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1198, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1199, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1200, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1201, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1202, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1203, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1204, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active'),
(1205, '$2b$10$GMNxFjm2.l.Z/FF5bycqt.0M4NhO729ylMoq5h9zM9bSQtxq0R3bK', 'student', 'active');

-- CHAS · 2. ADMINISTRATOR (child profile)
INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id) VALUES
(1100, 'ADM-2026-006', 'Ysabelle', 'Dimapilis', 'CHAS Office Administrator', 'dimapilis.ysabelle@pnc.edu.ph', 6001);

-- CHAS · 3. FACULTY (child profiles) -- Employee ID format: EMP-2026-XXX
INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id) VALUES
(1101, 'EMP-2026-027', 'Nadine', 'Isip', 'Medical-Surgical Nursing', 'isip.nadine@pnc.edu.ph', 6001),
(1102, 'EMP-2026-028', 'Novelyn', 'Macapagal', 'Pharmacology', 'macapagal.novelyn@pnc.edu.ph', 6001),
(1103, 'EMP-2026-029', 'Angelo', 'Mariano', 'Clinical Laboratory Science', 'mariano.angelo@pnc.edu.ph', 6001),
(1104, 'EMP-2026-030', 'Ivan', 'Palad', 'Community Health Nursing', 'palad.ivan@pnc.edu.ph', 6001),
(1105, 'EMP-2026-031', 'Owen', 'Salonga', 'Pharmaceutical Chemistry', 'salonga.owen@pnc.edu.ph', 6001);

-- CHAS · 4a. Named students
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(1106, '2800501', 'Joy', 'Almario', 'BS Nursing', 1, 'almario.joy@pnc.edu.ph', 6001),
(1107, '2800502', 'Carmela', 'Bartolome', 'BS Pharmacy', 2, 'bartolome.carmela@pnc.edu.ph', 6001),
(1108, '2800503', 'Shaira', 'Capistrano', 'BS Medical Technology', 3, 'capistrano.shaira@pnc.edu.ph', 6001),
(1109, '2800504', 'Dexter', 'De Guzman', 'BS Nursing', 4, 'deguzman.dexter@pnc.edu.ph', 6001),
(1110, '2800505', 'Elias', 'Dimapilis', 'BS Pharmacy', 1, 'dimapilis.elias@pnc.edu.ph', 6001);

-- CHAS · 4b. Generated students (student_numbers 2800001-2800095)
INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id) VALUES
(1111, '2800001', 'Keith', 'Fernandez', 'BS Nursing', 1, 'fernandez.keith@pnc.edu.ph', 6001),
(1112, '2800002', 'Quincy', 'Katigbak', 'BS Pharmacy', 2, 'katigbak.quincy@pnc.edu.ph', 6001),
(1113, '2800003', 'Maria', 'Magsaysay', 'BS Medical Technology', 3, 'magsaysay.maria@pnc.edu.ph', 6001),
(1114, '2800004', 'Mikaela', 'Mercado', 'BS Nursing', 4, 'mercado.mikaela@pnc.edu.ph', 6001),
(1115, '2800005', 'Fatima', 'Panganiban', 'BS Pharmacy', 1, 'panganiban.fatima@pnc.edu.ph', 6001),
(1116, '2800006', 'Venus', 'Santiago', 'BS Medical Technology', 2, 'santiago.venus@pnc.edu.ph', 6001),
(1117, '2800007', 'Jose', 'Valenzuela', 'BS Nursing', 3, 'valenzuela.jose@pnc.edu.ph', 6001),
(1118, '2800008', 'Francis', 'Bagsic', 'BS Pharmacy', 4, 'bagsic.francis@pnc.edu.ph', 6001),
(1119, '2800009', 'Leo', 'Inocencio', 'BS Medical Technology', 1, 'inocencio.leo@pnc.edu.ph', 6001),
(1120, '2800010', 'Samuel', 'Abrigo', 'BS Nursing', 2, 'abrigo.samuel@pnc.edu.ph', 6001),
(1121, '2800011', 'Camille', 'Balagtas', 'BS Pharmacy', 3, 'balagtas.camille@pnc.edu.ph', 6001),
(1122, '2800012', 'Rachel', 'Calderon', 'BS Medical Technology', 4, 'calderon.rachel@pnc.edu.ph', 6001),
(1123, '2800013', 'Imelda', 'Dalisay', 'BS Nursing', 1, 'dalisay.imelda@pnc.edu.ph', 6001),
(1124, '2800014', 'Jhoanna', 'Del Rosario', 'BS Pharmacy', 2, 'delrosario.jhoanna@pnc.edu.ph', 6001),
(1125, '2800015', 'Ricardo', 'Evangelista', 'BS Medical Technology', 3, 'evangelista.ricardo@pnc.edu.ph', 6001),
(1126, '2800016', 'Gilbert', 'Isip', 'BS Nursing', 4, 'isip.gilbert@pnc.edu.ph', 6001),
(1127, '2800017', 'Nathaniel', 'Macapagal', 'BS Pharmacy', 1, 'macapagal.nathaniel@pnc.edu.ph', 6001),
(1128, '2800018', 'Vincent', 'Mariano', 'BS Medical Technology', 2, 'mariano.vincent@pnc.edu.ph', 6001),
(1129, '2800019', 'Faith', 'Palad', 'BS Nursing', 3, 'palad.faith@pnc.edu.ph', 6001),
(1130, '2800020', 'Ysabel', 'Salonga', 'BS Pharmacy', 4, 'salonga.ysabel@pnc.edu.ph', 6001),
(1131, '2800021', 'Maricel', 'Umali', 'BS Medical Technology', 1, 'umali.maricel@pnc.edu.ph', 6001),
(1132, '2800022', 'Marinel', 'Zamora', 'BS Nursing', 2, 'zamora.marinel@pnc.edu.ph', 6001),
(1133, '2800023', 'Fernando', 'Gascon', 'BS Pharmacy', 3, 'gascon.fernando@pnc.edu.ph', 6001),
(1134, '2800024', 'Isaac', 'Nazareno', 'BS Medical Technology', 4, 'nazareno.isaac@pnc.edu.ph', 6001),
(1135, '2800025', 'Oliver', 'Arceo', 'BS Nursing', 1, 'arceo.oliver@pnc.edu.ph', 6001),
(1136, '2800026', 'Zachary', 'Buenavista', 'BS Pharmacy', 2, 'buenavista.zachary@pnc.edu.ph', 6001),
(1137, '2800027', 'Irish', 'Cayabyab', 'BS Medical Technology', 3, 'cayabyab.irish@pnc.edu.ph', 6001),
(1138, '2800028', 'Bea', 'De Vera', 'BS Nursing', 4, 'devera.bea@pnc.edu.ph', 6001),
(1139, '2800029', 'Rica', 'Espino', 'BS Pharmacy', 1, 'espino.rica@pnc.edu.ph', 6001),
(1140, '2800030', 'Cyrus', 'Gonzales', 'BS Medical Technology', 2, 'gonzales.cyrus@pnc.edu.ph', 6001),
(1141, '2800031', 'Cesar', 'Lazaro', 'BS Nursing', 3, 'lazaro.cesar@pnc.edu.ph', 6001),
(1142, '2800032', 'Julius', 'Marasigan', 'BS Pharmacy', 4, 'marasigan.julius@pnc.edu.ph', 6001),
(1143, '2800033', 'Peter', 'Ongsiako', 'BS Medical Technology', 1, 'ongsiako.peter@pnc.edu.ph', 6001),
(1144, '2800034', 'Josh', 'Quimpo', 'BS Nursing', 2, 'quimpo.josh@pnc.edu.ph', 6001),
(1145, '2800035', 'Lorraine', 'Tolentino', 'BS Pharmacy', 3, 'tolentino.lorraine@pnc.edu.ph', 6001),
(1146, '2800036', 'Elaine', 'Yabut', 'BS Medical Technology', 4, 'yabut.elaine@pnc.edu.ph', 6001),
(1147, '2800037', 'Uma', 'Escudero', 'BS Nursing', 1, 'escudero.uma@pnc.edu.ph', 6001),
(1148, '2800038', 'Juan', 'Lapid', 'BS Pharmacy', 2, 'lapid.juan@pnc.edu.ph', 6001),
(1149, '2800039', 'Felix', 'Ancheta', 'BS Medical Technology', 3, 'ancheta.felix@pnc.edu.ph', 6001),
(1150, '2800040', 'Lawrence', 'Bernardo', 'BS Nursing', 4, 'bernardo.lawrence@pnc.edu.ph', 6001),
(1151, '2800041', 'Rex', 'Carpio', 'BS Pharmacy', 1, 'carpio.rex@pnc.edu.ph', 6001),
(1152, '2800042', 'Bianca', 'De Jesus', 'BS Medical Technology', 2, 'dejesus.bianca@pnc.edu.ph', 6001),
(1153, '2800043', 'Queenie', 'Dizon', 'BS Nursing', 3, 'dizon.queenie@pnc.edu.ph', 6001),
(1154, '2800044', 'Honey', 'Galang', 'BS Pharmacy', 4, 'galang.honey@pnc.edu.ph', 6001),
(1155, '2800045', 'Ysabelle', 'Lacson', 'BS Medical Technology', 1, 'lacson.ysabelle@pnc.edu.ph', 6001),
(1156, '2800046', 'Eduardo', 'Malabanan', 'BS Nursing', 2, 'malabanan.eduardo@pnc.edu.ph', 6001),
(1157, '2800047', 'Gerald', 'Nepomuceno', 'BS Pharmacy', 3, 'nepomuceno.gerald@pnc.edu.ph', 6001),
(1158, '2800048', 'Melvin', 'Pimentel', 'BS Medical Technology', 4, 'pimentel.melvin@pnc.edu.ph', 6001),
(1159, '2800049', 'Uriel', 'Sarmiento', 'BS Nursing', 1, 'sarmiento.uriel@pnc.edu.ph', 6001),
(1160, '2800050', 'Erika', 'Ventura', 'BS Pharmacy', 2, 'ventura.erika@pnc.edu.ph', 6001),
(1161, '2800051', 'Winnie', 'Cariaga', 'BS Medical Technology', 3, 'cariaga.winnie@pnc.edu.ph', 6001),
(1162, '2800052', 'Liezel', 'Javier', 'BS Nursing', 4, 'javier.liezel@pnc.edu.ph', 6001),
(1163, '2800053', 'Loraine', 'Alcantara', 'BS Pharmacy', 1, 'alcantara.loraine@pnc.edu.ph', 6001),
(1164, '2800054', 'Roberto', 'Balderas', 'BS Medical Technology', 2, 'balderas.roberto@pnc.edu.ph', 6001),
(1165, '2800055', 'Henry', 'Camacho', 'BS Nursing', 3, 'camacho.henry@pnc.edu.ph', 6001),
(1166, '2800056', 'Noel', 'David', 'BS Pharmacy', 4, 'david.noel@pnc.edu.ph', 6001),
(1167, '2800057', 'Xavier', 'Dimaculangan', 'BS Medical Technology', 1, 'dimaculangan.xavier@pnc.edu.ph', 6001),
(1168, '2800058', 'Hannah', 'Fajardo', 'BS Nursing', 2, 'fajardo.hannah@pnc.edu.ph', 6001),
(1169, '2800059', 'Angelica', 'Jacinto', 'BS Pharmacy', 3, 'jacinto.angelica@pnc.edu.ph', 6001),
(1170, '2800060', 'Precious', 'Magat', 'BS Medical Technology', 4, 'magat.precious@pnc.edu.ph', 6001),
(1171, '2800061', 'Aldrin', 'Mendiola', 'BS Nursing', 1, 'mendiola.aldrin@pnc.edu.ph', 6001),
(1172, '2800062', 'Benedict', 'Pangan', 'BS Pharmacy', 2, 'pangan.benedict@pnc.edu.ph', 6001),
(1173, '2800063', 'Jerome', 'San Pedro', 'BS Medical Technology', 3, 'sanpedro.jerome@pnc.edu.ph', 6001),
(1174, '2800064', 'Patrick', 'Valencia', 'BS Nursing', 4, 'valencia.patrick@pnc.edu.ph', 6001),
(1175, '2800065', 'Kian', 'Agbayani', 'BS Pharmacy', 1, 'agbayani.kian@pnc.edu.ph', 6001),
(1176, '2800066', 'Kimberly', 'Hidalgo', 'BS Medical Technology', 2, 'hidalgo.kimberly@pnc.edu.ph', 6001),
(1177, '2800067', 'Denise', 'Abad', 'BS Nursing', 3, 'abad.denise@pnc.edu.ph', 6001),
(1178, '2800068', 'Therese', 'Bagsit', 'BS Pharmacy', 4, 'bagsit.therese@pnc.edu.ph', 6001),
(1179, '2800069', 'Ferdinand', 'Cabanilla', 'BS Medical Technology', 1, 'cabanilla.ferdinand@pnc.edu.ph', 6001),
(1180, '2800070', 'Emmanuel', 'Corpuz', 'BS Nursing', 2, 'corpuz.emmanuel@pnc.edu.ph', 6001),
(1181, '2800071', 'Kevin', 'Del Mundo', 'BS Pharmacy', 3, 'delmundo.kevin@pnc.edu.ph', 6001),
(1182, '2800072', 'Raymond', 'Estrella', 'BS Medical Technology', 4, 'estrella.raymond@pnc.edu.ph', 6001),
(1183, '2800073', 'Angela', 'Ignacio', 'BS Nursing', 1, 'ignacio.angela@pnc.edu.ph', 6001),
(1184, '2800074', 'Olivia', 'Leano', 'BS Pharmacy', 2, 'leano.olivia@pnc.edu.ph', 6001),
(1185, '2800075', 'Gabrielle', 'Marcelo', 'BS Medical Technology', 3, 'marcelo.gabrielle@pnc.edu.ph', 6001),
(1186, '2800076', 'Wilma', 'Padua', 'BS Nursing', 4, 'padua.wilma@pnc.edu.ph', 6001),
(1187, '2800077', 'Antonio', 'Robles', 'BS Pharmacy', 1, 'robles.antonio@pnc.edu.ph', 6001),
(1188, '2800078', 'Gabriel', 'Trinidad', 'BS Medical Technology', 2, 'trinidad.gabriel@pnc.edu.ph', 6001),
(1189, '2800079', 'Martin', 'Yulo', 'BS Nursing', 3, 'yulo.martin@pnc.edu.ph', 6001),
(1190, '2800080', 'Timothy', 'Fajardo', 'BS Pharmacy', 4, 'fajardo.timothy@pnc.edu.ph', 6001),
(1191, '2800081', 'Diana', 'Montano', 'BS Medical Technology', 1, 'montano.diana@pnc.edu.ph', 6001),
(1192, '2800082', 'Trisha', 'Aquino', 'BS Nursing', 2, 'aquino.trisha@pnc.edu.ph', 6001),
(1193, '2800083', 'Katrina', 'Bonifacio', 'BS Pharmacy', 3, 'bonifacio.katrina@pnc.edu.ph', 6001),
(1194, '2800084', 'Kristine', 'Catapang', 'BS Medical Technology', 4, 'catapang.kristine@pnc.edu.ph', 6001),
(1195, '2800085', 'Manuel', 'De Leon', 'BS Nursing', 1, 'deleon.manuel@pnc.edu.ph', 6001),
(1196, '2800086', 'Harold', 'Domingo', 'BS Pharmacy', 2, 'domingo.harold@pnc.edu.ph', 6001),
(1197, '2800087', 'Nico', 'Gatchalian', 'BS Medical Technology', 3, 'gatchalian.nico@pnc.edu.ph', 6001),
(1198, '2800088', 'Warren', 'Laurel', 'BS Nursing', 4, 'laurel.warren@pnc.edu.ph', 6001),
(1199, '2800089', 'Grace', 'Manalo', 'BS Pharmacy', 1, 'manalo.grace@pnc.edu.ph', 6001),
(1200, '2800090', 'Zoe', 'Ocampo', 'BS Medical Technology', 2, 'ocampo.zoe@pnc.edu.ph', 6001),
(1201, '2800091', 'Nadine', 'Quiambao', 'BS Nursing', 3, 'quiambao.nadine@pnc.edu.ph', 6001),
(1202, '2800092', 'Novelyn', 'Tagle', 'BS Pharmacy', 4, 'tagle.novelyn@pnc.edu.ph', 6001),
(1203, '2800093', 'Angelo', 'Villaflor', 'BS Medical Technology', 1, 'villaflor.angelo@pnc.edu.ph', 6001),
(1204, '2800094', 'Ivan', 'Diokno', 'BS Nursing', 2, 'diokno.ivan@pnc.edu.ph', 6001),
(1205, '2800095', 'Owen', 'Kalaw', 'BS Pharmacy', 3, 'kalaw.owen@pnc.edu.ph', 6001);

-- CHAS · 5. SERVICES (queue only)
INSERT INTO services (service_id, service_name, description, department_id, is_cross_college, location_id) VALUES
(24, 'Clinical/RLE Placement', 'Placement processing for Related Learning Experience (RLE) in partner hospitals and clinics', 6001, FALSE, 7),
(25, 'Health Certificate/Medical Clearance Request', 'Request for a medical clearance required for clinical duty, practicum, or events', 6001, FALSE, 7),
(26, 'Laboratory Equipment/Supplies Request', 'Request laboratory equipment and consumable supplies for nursing, pharmacy, or medtech coursework', 6001, FALSE, 7),
(27, 'Board Exam Review Enrollment', 'Enrollment in the college''s licensure exam review program for Nursing, Pharmacy, or MedTech', 6001, FALSE, 7);

-- CHAS · 5a-REQ. SERVICE REQUIREMENTS
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Clinical/RLE Placement (service_id 24)
(24, 'RLE Application Form', 'Filled out in full', TRUE),
(24, 'Medical Clearance', 'Proof of fitness for clinical duty', TRUE),
(24, 'Immunization Record', 'Updated immunization/vaccination record', TRUE),
-- Health Certificate/Medical Clearance Request (service_id 25)
(25, 'Valid Student ID', 'Current school year student ID', TRUE),
(25, 'Completed Health Form', 'Health history form filled out in full', TRUE),
(25, 'Official Receipt', 'Payment receipt from the cashier, if applicable', FALSE),
-- Laboratory Equipment/Supplies Request (service_id 26)
(26, 'Equipment/Supplies Request Slip', 'Filled out with items needed and schedule', TRUE),
(26, 'Instructor''s Approval', 'Signature of the handling instructor', TRUE),
-- Board Exam Review Enrollment (service_id 27)
(27, 'Valid Student ID or Alumni ID', 'Current ID or graduated alumni ID', TRUE),
(27, 'Transcript of Records or Certification', 'Proof of completed units', TRUE),
(27, 'Official Receipt', 'Payment receipt for the review program fee', TRUE);

-- CHAS · 5a-STEPS. SERVICE PROCEDURE STEPS
INSERT INTO service_procedure_steps (service_id, step_number, step_title, description) VALUES
-- Clinical/RLE Placement (service_id 24)
(24, 1, 'Submit application form', 'Fill out and submit the RLE application form'),
(24, 2, 'Present requirements', 'Show your medical clearance and immunization record'),
(24, 3, 'Wait for facility assignment', 'The office coordinates with partner hospitals/clinics for placement'),
(24, 4, 'Receive placement notice', 'Get your assigned facility, unit, and clinical instructor'),
(24, 5, 'Attend orientation', 'Attend the pre-deployment orientation before reporting to the facility'),
-- Health Certificate/Medical Clearance Request (service_id 25)
(25, 1, 'Fill out health form', 'Complete the health history and clearance request form'),
(25, 2, 'Undergo basic health check', 'Have your vitals checked by the clinic staff'),
(25, 3, 'Wait for clearance review', 'The clinic reviews your health history and check-up results'),
(25, 4, 'Claim your clearance', 'Return with your student ID to claim your medical clearance'),
-- Laboratory Equipment/Supplies Request (service_id 26)
(26, 1, 'Fill out request slip', 'List the equipment or supplies needed and the schedule'),
(26, 2, 'Secure instructor''s approval', 'Have the handling instructor sign the request slip'),
(26, 3, 'Submit to the lab custodian', 'Present the approved slip and your student ID'),
(26, 4, 'Receive items', 'Check items for completeness before taking them for use'),
-- Board Exam Review Enrollment (service_id 27)
(27, 1, 'Fill out enrollment form', 'Complete the board exam review enrollment form'),
(27, 2, 'Pay the review fee', 'Proceed to the cashier and settle the review program fee'),
(27, 3, 'Submit requirements', 'Submit your ID, TOR/certification, and receipt to the office'),
(27, 4, 'Attend orientation', 'Attend the review program orientation and get your schedule');

-- CHAS · 5c. DOCUMENT SERVICES
INSERT INTO document_services (service_id, service_name, description, department_id, is_cross_college, recipient_type, status, processing_time) VALUES
(14, 'Certificate of RLE/Clinical Completion', 'Certification that the student has completed the required RLE/clinical duty hours', 6001, FALSE, 'students', 'active', '3-5 business days'),
(15, 'Medical Clearance Certificate', 'Official certificate confirming fitness for clinical duty, practicum, or events', 6001, FALSE, 'students', 'active', '1-2 business days');

-- CHAS · 5c-REQ. DOCUMENT REQUIREMENTS
INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory) VALUES
-- Certificate of RLE/Clinical Completion (service_id 14)
(14, 'RLE Evaluation Form', 'Signed by the clinical instructor and facility supervisor', TRUE),
(14, 'Attendance Record', 'Certified duty attendance log from the partner facility', TRUE),
-- Medical Clearance Certificate (service_id 15)
(15, 'Completed Health Form', 'Health history form filled out in full', TRUE),
(15, 'Official Receipt', 'Payment receipt from the cashier', TRUE);
