-- One-off migration for an already-running database.
-- Fresh installs already get these tables from oams_db.sql's CREATE TABLE
-- statements; this file only exists to bring an existing database up to date.
--   mysql --host=<host> --port=<port> -u <user> -p --ssl-ca=ca.pem <db> < server/db/add_document_submissions.sql

CREATE TABLE document_submissions (
    submission_id   INT          AUTO_INCREMENT PRIMARY KEY,
    tracking_number VARCHAR(50)  NOT NULL UNIQUE,
    student_id      INT          NOT NULL,
    department_id   INT          NOT NULL,
    title           VARCHAR(255) NOT NULL,
    purpose         VARCHAR(255) NOT NULL,
    status          ENUM('pending','processing','claimed','rejected','cancelled') DEFAULT 'pending',
    needed_by       DATE         NULL,
    notes           TEXT         NULL,
    claimed_at      TIMESTAMP    NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id)    REFERENCES students(student_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX idx_document_submissions_tracking (tracking_number),
    INDEX idx_document_submissions_student (student_id),
    INDEX idx_document_submissions_dept (department_id)
);

CREATE TABLE document_submission_files (
    file_id         INT          AUTO_INCREMENT PRIMARY KEY,
    submission_id   INT          NOT NULL,
    direction       ENUM('student_upload','admin_return') NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    file_path       VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INT          NOT NULL,
    uploaded_by     INT          NOT NULL,
    uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES document_submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by)   REFERENCES users(user_id),
    INDEX idx_document_submission_files_submission (submission_id, direction)
);

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
