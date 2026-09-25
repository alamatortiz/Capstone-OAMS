-- ─────────────────────────────────────────────────────────────
-- Department secretary's six queue services, for every college.
-- Idempotent: safe to re-run (guarded by NOT EXISTS / INSERT IGNORE), so the
-- same file works for a fresh database (docker initdb) and the running one.
-- Each college's copy is hosted at that college's own "<ABBR> Office" location.
-- ─────────────────────────────────────────────────────────────

CREATE TEMPORARY TABLE tmp_svc (
  service_name VARCHAR(100) NOT NULL,
  description  TEXT
);
INSERT INTO tmp_svc (service_name, description) VALUES
('Enrollment',                          'Enrollment and subject loading handled by the department secretary'),
('Add Matriculation & Cancellation',    'Add subjects to, or cancel subjects from, your matriculation'),
('Dropping of Subject',                 'Officially drop a subject from your enrolled load'),
('Consultation - Research',             'Consult about your research or thesis'),
('Consultation - Adviser (Section)',    'Consult your section adviser'),
('Clearance Signing',                   'Have your clearance form signed by the department');

CREATE TEMPORARY TABLE tmp_req (
  service_name     VARCHAR(100) NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  description      TEXT,
  is_mandatory     BOOLEAN
);
INSERT INTO tmp_req (service_name, requirement_name, description, is_mandatory) VALUES
('Enrollment', 'Advising Form',            'Signed by your program adviser',                      TRUE),
('Enrollment', 'Previous COR',             'Certificate of Registration from the prior semester', TRUE),
('Enrollment', 'Valid Student ID',         'Current school year student ID',                      TRUE),
('Add Matriculation & Cancellation', 'Change of Matriculation Form', 'Filled out with the subjects to add or cancel', TRUE),
('Add Matriculation & Cancellation', 'Adviser''s Signature',         'Your adviser must sign the form',             TRUE),
('Add Matriculation & Cancellation', 'Valid Student ID',             'Current school year student ID',              TRUE),
('Dropping of Subject', 'Dropping Form',        'Filled out with the subject to drop',      TRUE),
('Dropping of Subject', 'Adviser''s Signature', 'Your adviser must sign the form',          TRUE),
('Dropping of Subject', 'Valid Student ID',     'Current school year student ID',           TRUE),
('Consultation - Research', 'Research Title or Proposal Draft', 'Bring your current draft, if any', FALSE),
('Consultation - Research', 'Valid Student ID',                 'Current school year student ID',   TRUE),
('Consultation - Adviser (Section)', 'Valid Student ID', 'Current school year student ID', TRUE),
('Clearance Signing', 'Clearance Form',            'Obtained from your department office',                       TRUE),
('Clearance Signing', 'Valid Student ID',          'Current school year student ID',                             TRUE),
('Clearance Signing', 'No Outstanding Obligations','All library, laboratory, and financial obligations settled', TRUE);

CREATE TEMPORARY TABLE tmp_step (
  service_name VARCHAR(100) NOT NULL,
  step_number  INT          NOT NULL,
  step_title   VARCHAR(255) NOT NULL,
  description  TEXT
);
INSERT INTO tmp_step (service_name, step_number, step_title, description) VALUES
('Enrollment', 1, 'Get advising form signed',   'Have your advising form signed by your program adviser first'),
('Enrollment', 2, 'Present documents',          'Bring your signed advising form, previous COR, and student ID to the secretary'),
('Enrollment', 3, 'Wait for validation',        'The secretary validates your details and loads your subjects'),
('Enrollment', 4, 'Receive your COR',           'Claim your Certificate of Registration once enrollment is confirmed'),
('Add Matriculation & Cancellation', 1, 'Fill out the form',       'Complete the Change of Matriculation form with the subjects to add or cancel'),
('Add Matriculation & Cancellation', 2, 'Get your adviser''s signature', 'Have your adviser review and sign the form'),
('Add Matriculation & Cancellation', 3, 'Submit to the secretary', 'Hand over the signed form and your student ID'),
('Add Matriculation & Cancellation', 4, 'Receive the update',      'Your matriculation is updated and confirmed'),
('Dropping of Subject', 1, 'Fill out the dropping form',           'Indicate the subject you want to drop'),
('Dropping of Subject', 2, 'Get your adviser''s signature',        'Have your adviser review and sign the form'),
('Dropping of Subject', 3, 'Submit to the secretary',              'Hand over the signed form and your student ID'),
('Dropping of Subject', 4, 'Dropped subject recorded',             'The secretary records the drop and confirms it'),
('Consultation - Research', 1, 'State your topic',                 'Explain your research topic or concern to the secretary'),
('Consultation - Research', 2, 'Meet your research adviser',       'Be directed to your research adviser when your number is called'),
('Consultation - Research', 3, 'Receive guidance',                 'Discuss your concern and note the advice given'),
('Consultation - Adviser (Section)', 1, 'State your concern',      'Explain your concern to the secretary'),
('Consultation - Adviser (Section)', 2, 'Meet your section adviser','Be directed to your section adviser when your number is called'),
('Consultation - Adviser (Section)', 3, 'Receive guidance',        'Discuss your concern and note the advice given'),
('Clearance Signing', 1, 'Present your clearance form', 'Bring the clearance form and your student ID to the secretary'),
('Clearance Signing', 2, 'Obligations checked',         'The secretary verifies you have no outstanding obligations'),
('Clearance Signing', 3, 'Form signed and stamped',     'Receive your signed and stamped clearance form');

-- 1) The six services, once per college (skipped if that college already has the name).
INSERT INTO services (service_name, description, department_id, is_cross_college, location_id)
SELECT t.service_name, t.description, d.department_id, FALSE, loc.location_id
FROM tmp_svc t
CROSS JOIN departments d
LEFT JOIN locations loc
  ON loc.department_id = d.department_id
 AND loc.location_name = CONCAT(d.department_abbreviation, ' Office')
WHERE NOT EXISTS (
  SELECT 1 FROM services s
  WHERE s.service_name = t.service_name AND s.department_id = d.department_id
);

-- 2) Requirements for every college's copy (skipped if already present).
INSERT INTO service_requirements (service_id, requirement_name, description, is_mandatory)
SELECT s.service_id, r.requirement_name, r.description, r.is_mandatory
FROM tmp_req r
JOIN services s ON s.service_name = r.service_name
WHERE NOT EXISTS (
  SELECT 1 FROM service_requirements sr
  WHERE sr.service_id = s.service_id AND sr.requirement_name = r.requirement_name
);

-- 3) Procedure steps (uq_service_step makes re-runs no-ops).
INSERT IGNORE INTO service_procedure_steps (service_id, step_number, step_title, description)
SELECT s.service_id, p.step_number, p.step_title, p.description
FROM tmp_step p
JOIN services s ON s.service_name = p.service_name;

DROP TEMPORARY TABLE tmp_svc;
DROP TEMPORARY TABLE tmp_req;
DROP TEMPORARY TABLE tmp_step;
