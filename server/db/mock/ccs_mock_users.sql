-- =========================================================================
-- OAMS CCS Pilot Module - Mock Users Dataset
-- Path: server/db/mock/01_ccs_mock_users.sql
-- Description: Sets up CCS department, admin, 10 faculty, and 100 students
--              using programmatic stored procedures to guarantee accuracy.
-- =========================================================================

USE oams_db;

-- 1. Ensure CCS Department exists
INSERT INTO departments (department_id, department_name, office_location)
VALUES (1, 'College of Computing Studies', 'CCS Building - 2nd Floor')
ON DUPLICATE KEY UPDATE 
    department_name = VALUES(department_name),
    office_location = VALUES(office_location);

-- 2. Insert 1 CCS Administrator
-- School ID: '1000001'
-- Password: 'password123'
INSERT INTO users (school_id, password, role, status)
VALUES ('1000001', 'password123', 'admin', 'active')
ON DUPLICATE KEY UPDATE school_id = school_id;

-- Store the user_id of the administrator for the profile insertion
SET @admin_user_id = (SELECT user_id FROM users WHERE school_id = '1000001');

INSERT INTO administrators (admin_id, employee_id, first_name, last_name, position, email, department_id)
VALUES (@admin_user_id, '1000001', 'CCS', 'Office Head', 'CCS Office Head', 'ccs_head@ucabuyao.edu.ph', 1)
ON DUPLICATE KEY UPDATE position = VALUES(position);


-- 3. Stored Procedure to Insert 10 Faculty Members
-- School IDs: '2000001' to '2000010'
-- Password: 'password123'
DROP PROCEDURE IF EXISTS InsertMockFaculty;

DELIMITER $$

CREATE PROCEDURE InsertMockFaculty()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE current_school_id VARCHAR(50);
    DECLARE last_user_id INT;
    
    WHILE i <= 10 DO
        SET current_school_id = CONCAT('20000', LPAD(i, 2, '0'));
        
        -- Insert into parent users table
        INSERT INTO users (school_id, password, role, status)
        VALUES (current_school_id, 'password123', 'faculty', 'active')
        ON DUPLICATE KEY UPDATE school_id = school_id;
        
        -- Get the newly created or existing user_id
        SET last_user_id = (SELECT user_id FROM users WHERE school_id = current_school_id);
        
        -- Insert into faculty child profile table
        INSERT INTO faculty (faculty_id, employee_id, first_name, last_name, specialization, email, department_id)
        VALUES (
            last_user_id,
            current_school_id,
            CONCAT('FacultyFirst', i),
            CONCAT('FacultyLast', i),
            IF(i % 2 = 0, 'Software Engineering', 'Data Science & AI'),
            CONCAT('faculty_', i, '@ucabuyao.edu.ph'),
            1
        )
        ON DUPLICATE KEY UPDATE specialization = VALUES(specialization);
        
        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

CALL InsertMockFaculty();
DROP PROCEDURE IF EXISTS InsertMockFaculty;


-- 4. Stored Procedure to Insert 100 Students
-- School IDs: '2300001' to '2300100'
-- Password: 'password123'
DROP PROCEDURE IF EXISTS InsertMockStudents;

DELIMITER $$

CREATE PROCEDURE InsertMockStudents()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE current_school_id VARCHAR(50);
    DECLARE last_user_id INT;
    DECLARE student_course VARCHAR(100);
    DECLARE student_year INT;
    
    WHILE i <= 100 DO
        SET current_school_id = CONCAT('2300', LPAD(i, 3, '0'));
        
        -- Alternate course and year level
        IF i % 2 = 0 THEN
            SET student_course = 'BS Computer Science';
        ELSE
            SET student_course = 'BS Information Technology';
        END IF;
        
        SET student_year = (i % 4) + 1; -- Rotates year levels 1, 2, 3, 4
        
        -- Insert into parent users table
        INSERT INTO users (school_id, password, role, status)
        VALUES (current_school_id, 'password123', 'student', 'active')
        ON DUPLICATE KEY UPDATE school_id = school_id;
        
        -- Get user_id
        SET last_user_id = (SELECT user_id FROM users WHERE school_id = current_school_id);
        
        -- Insert into students child profile table
        INSERT INTO students (student_id, student_number, first_name, last_name, course, year_level, email, department_id)
        VALUES (
            last_user_id,
            current_school_id,
            CONCAT('StudentFirst', i),
            CONCAT('StudentLast', i),
            student_course,
            student_year,
            CONCAT('student_', i, '@ucabuyao.edu.ph'),
            1
        )
        ON DUPLICATE KEY UPDATE course = VALUES(course), year_level = VALUES(year_level);
        
        SET i = i + 1;
    END WHILE;
END$$

DELIMITER ;

CALL InsertMockStudents();
DROP PROCEDURE IF EXISTS InsertMockStudents;
