const pool = require("../db");
const fs = require("fs");
const path = require("path");
const { documentSubmissionUpload } = require("../middleware/upload");
// Pure arithmetic against MAX_FILES/MAX_TOTAL_BYTES, no announcement-specific
// dependency -- re-exported directly rather than duplicated, to avoid drift.
const { validateBudget } = require("./announcementAttachments");

const UPLOAD_DIR = documentSubmissionUpload.UPLOAD_DIR;

// Fetches files for a set of submission IDs on one direction, grouped by
// submission_id. direction disambiguates the two attachment channels that
// share this one table: 'student_upload' (what the student sent) vs
// 'admin_return' (what the office sent back, e.g. an encoded file).
async function getFilesMap(submissionIds, direction) {
  if (!submissionIds || submissionIds.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT file_id, submission_id, filename, mime_type, file_size
     FROM document_submission_files
     WHERE submission_id IN (?) AND direction = ?
     ORDER BY uploaded_at ASC`,
    [submissionIds, direction],
  );
  const map = {};
  rows.forEach((r) => {
    if (!map[r.submission_id]) map[r.submission_id] = [];
    map[r.submission_id].push({
      id: String(r.file_id),
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.file_size,
    });
  });
  return map;
}

async function getFiles(submissionId, direction) {
  const map = await getFilesMap([submissionId], direction);
  return map[submissionId] || [];
}

// Inserts one row per uploaded file (req.files, from multer's upload.array).
// Caller must run validateBudget() first, scoped to the same direction.
// Accepts an optional transaction connection so this can run atomically
// alongside the submission's own INSERT/UPDATE; defaults to the plain pool.
async function insertFiles(submissionId, direction, files, uploadedBy, executor = pool) {
  if (!files || files.length === 0) return;
  const values = files.map((f) => [submissionId, direction, f.originalname, f.filename, f.mimetype, f.size, uploadedBy]);
  await executor.query(
    `INSERT INTO document_submission_files (submission_id, direction, filename, file_path, mime_type, file_size, uploaded_by) VALUES ?`,
    [values],
  );
}

// Deletes files multer already wrote to disk -- used when a request is
// rejected after upload.array() ran (validation failure, DB error, etc.).
function deleteFiles(files) {
  (files || []).forEach((f) => {
    fs.unlink(path.join(UPLOAD_DIR, f.filename), (err) => {
      if (err && err.code !== "ENOENT") console.error("Document submission file cleanup error:", err);
    });
  });
}

// Exact-boundary check that a resolved path is inside UPLOAD_DIR (not just
// prefix-matching). Defense-in-depth only -- file_path is always a
// server-generated UUID.
function isPathInsideUploadDir(resolvedPath) {
  return resolvedPath === UPLOAD_DIR || resolvedPath.startsWith(UPLOAD_DIR + path.sep);
}

// Serves one submission file to the student who owns the submission -- either
// direction, since a student can view both their own uploads and the
// office's return files on their own submission.
async function serveStudentDocumentSubmissionFile(res, { submissionId, fileId, studentId }) {
  const [[row]] = await pool.query(
    `SELECT ds.student_id, dsf.file_path, dsf.mime_type
     FROM document_submission_files dsf
     JOIN document_submissions ds ON ds.submission_id = dsf.submission_id
     WHERE dsf.file_id = ? AND dsf.submission_id = ?`,
    [fileId, submissionId],
  );
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  if (row.student_id !== studentId) {
    return res.status(403).json({ error: "You can only view files on your own document submissions" });
  }

  const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
  if (!isPathInsideUploadDir(resolvedPath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  res.type(row.mime_type || "application/octet-stream");
  res.sendFile(resolvedPath);
}

// Serves one submission file to the faculty member who owns the submission --
// exact mirror of serveStudentDocumentSubmissionFile, for the faculty
// "Send a Document" flow (document_submissions.submitter_type = 'faculty').
async function serveFacultyDocumentSubmissionFile(res, { submissionId, fileId, facultyId }) {
  const [[row]] = await pool.query(
    `SELECT ds.faculty_id, dsf.file_path, dsf.mime_type
     FROM document_submission_files dsf
     JOIN document_submissions ds ON ds.submission_id = dsf.submission_id
     WHERE dsf.file_id = ? AND dsf.submission_id = ?`,
    [fileId, submissionId],
  );
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  if (row.faculty_id !== facultyId) {
    return res.status(403).json({ error: "You can only view files on your own document submissions" });
  }

  const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
  if (!isPathInsideUploadDir(resolvedPath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  res.type(row.mime_type || "application/octet-stream");
  res.sendFile(resolvedPath);
}

// Serves one submission file to an admin of the submission's own department --
// either direction, so admins can review what the student sent and confirm
// what they've returned.
async function serveAdminDocumentSubmissionFile(res, { submissionId, fileId, adminDeptId }) {
  const [[row]] = await pool.query(
    `SELECT ds.department_id, dsf.file_path, dsf.mime_type
     FROM document_submission_files dsf
     JOIN document_submissions ds ON ds.submission_id = dsf.submission_id
     WHERE dsf.file_id = ? AND dsf.submission_id = ?`,
    [fileId, submissionId],
  );
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  if (row.department_id !== adminDeptId) {
    return res.status(403).json({ error: "You can only view files for your own department's document submissions" });
  }

  const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
  if (!isPathInsideUploadDir(resolvedPath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  res.type(row.mime_type || "application/octet-stream");
  res.sendFile(resolvedPath);
}

module.exports = {
  getFilesMap,
  getFiles,
  insertFiles,
  validateBudget,
  deleteFiles,
  serveStudentDocumentSubmissionFile,
  serveFacultyDocumentSubmissionFile,
  serveAdminDocumentSubmissionFile,
};
