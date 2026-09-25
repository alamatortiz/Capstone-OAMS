-- ─────────────────────────────────────────────────────────────
-- Department secretary's documents, for every college:
--   students: Certificate of Enrollment, Change of Matriculation Form
--   faculty:  Class List
-- Idempotent (NOT EXISTS guards), so it works for a fresh database and the
-- running one. Each college hosts its own copy; none are cross-college.
-- ─────────────────────────────────────────────────────────────

CREATE TEMPORARY TABLE tmp_doc (
  service_name    VARCHAR(100) NOT NULL,
  description     TEXT,
  recipient_type  VARCHAR(20)  NOT NULL,
  processing_time VARCHAR(100)
);
INSERT INTO tmp_doc (service_name, description, recipient_type, processing_time) VALUES
('Certificate of Enrollment',       'Request for Certificate of Enrollment',                                     'students', '1-2 business days'),
('Change of Matriculation Form',    'Request for a Change of Matriculation Form (add, drop, or cancel subjects)', 'students', '1-2 business days'),
('Class List',                      'Official list of students enrolled in your subject and section',            'faculty',  '1 business day');

CREATE TEMPORARY TABLE tmp_doc_req (
  service_name     VARCHAR(100) NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  description      TEXT,
  is_mandatory     BOOLEAN
);
INSERT INTO tmp_doc_req (service_name, requirement_name, description, is_mandatory) VALUES
('Certificate of Enrollment',    'Valid Student ID',                 'Current school year student ID',                     TRUE),
('Certificate of Enrollment',    'Current Registration Form',        'Certificate of Registration for the current semester', TRUE),
('Change of Matriculation Form', 'Valid Student ID',                 'Current school year student ID',                     TRUE),
('Change of Matriculation Form', 'Current Registration Form',        'Certificate of Registration for the current semester', TRUE),
('Change of Matriculation Form', 'Adviser''s Signature',             'Your adviser must approve the change',               TRUE),
('Class List',                   'Valid Employee ID',                'Current school year faculty/employee ID',            TRUE),
('Class List',                   'Subject and Section',              'Subject code and section you need the list for',     TRUE);

INSERT INTO document_services (service_name, description, department_id, is_cross_college, recipient_type, status, processing_time)
SELECT t.service_name, t.description, d.department_id, FALSE, t.recipient_type, 'active', t.processing_time
FROM tmp_doc t
CROSS JOIN departments d
WHERE NOT EXISTS (
  SELECT 1 FROM document_services ds
  WHERE ds.service_name = t.service_name AND ds.department_id = d.department_id
);

INSERT INTO document_requirements (service_id, requirement_name, description, is_mandatory)
SELECT ds.service_id, r.requirement_name, r.description, r.is_mandatory
FROM tmp_doc_req r
JOIN document_services ds ON ds.service_name = r.service_name
WHERE NOT EXISTS (
  SELECT 1 FROM document_requirements dr
  WHERE dr.service_id = ds.service_id AND dr.requirement_name = r.requirement_name
);

DROP TEMPORARY TABLE tmp_doc;
DROP TEMPORARY TABLE tmp_doc_req;
