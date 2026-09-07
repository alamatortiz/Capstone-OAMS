const pool = require("../db");
const fs = require("fs");
const path = require("path");
const { documentRequestUpload } = require("../middleware/upload");
// Pure arithmetic against MAX_FILES/MAX_TOTAL_BYTES, no request-specific
// dependency -- re-exported directly rather than duplicated, to avoid drift.
const { validateBudget } = require("./announcementAttachments");

const UPLOAD_DIR = documentRequestUpload.UPLOAD_DIR;

// Soft-copy files the office attaches to a document REQUEST (office -> requester
// direction). Mirrors documentSubmissionAttachments.js's 'admin_return' channel,
// but keyed generically: `request_id` for student document_requests,
// `faculty_request_id` for faculty_document_requests. `opts.faculty` (boolean)
// picks the column. One direction only, so there's no `direction` argument.

const keyColumn = (faculty) => (faculty ? "faculty_request_id" : "request_id");

// Fetches files for a set of request IDs, grouped by that id.
async function getFilesMap(requestIds, { faculty = false } = {}) {
  if (!requestIds || requestIds.length === 0) return {};
  const col = keyColumn(faculty);
  const [rows] = await pool.query(
    `SELECT file_id, ${col} AS request_id, filename, mime_type, file_size
     FROM document_request_files
     WHERE ${col} IN (?)
     ORDER BY uploaded_at ASC`,
    [requestIds],
  );
  const map = {};
  rows.forEach((r) => {
    if (!map[r.request_id]) map[r.request_id] = [];
    map[r.request_id].push({
      id: String(r.file_id),
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.file_size,
    });
  });
  return map;
}

async function getFiles(requestId, opts = {}) {
  const map = await getFilesMap([requestId], opts);
  return map[requestId] || [];
}

// Inserts one row per uploaded file (req.files, from multer's upload.array).
// Caller must run validateBudget() first. Accepts an optional transaction
// connection so this can run atomically alongside the status UPDATE.
async function insertFiles(requestId, { faculty = false } = {}, files, uploadedBy, executor = pool) {
  if (!files || files.length === 0) return;
  const values = files.map((f) => [
    faculty ? null : requestId, // request_id
    faculty ? requestId : null, // faculty_request_id
    f.originalname,
    f.filename,
    f.mimetype,
    f.size,
    uploadedBy,
  ]);
  await executor.query(
    `INSERT INTO document_request_files
       (request_id, faculty_request_id, filename, file_path, mime_type, file_size, uploaded_by)
     VALUES ?`,
    [values],
  );
}

// Deletes files multer already wrote to disk -- used when a request is rejected
// after upload.array() ran (validation failure, DB error, etc.).
function deleteFiles(files) {
  (files || []).forEach((f) => {
    fs.unlink(path.join(UPLOAD_DIR, f.filename), (err) => {
      if (err && err.code !== "ENOENT") console.error("Document request file cleanup error:", err);
    });
  });
}

// Exact-boundary check that a resolved path is inside UPLOAD_DIR (not just
// prefix-matching). Defense-in-depth only -- file_path is always a
// server-generated UUID.
function isPathInsideUploadDir(resolvedPath) {
  return resolvedPath === UPLOAD_DIR || resolvedPath.startsWith(UPLOAD_DIR + path.sep);
}

async function sendFileRow(res, row) {
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
  if (!isPathInsideUploadDir(resolvedPath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }
  res.type(row.mime_type || "application/octet-stream");
  res.sendFile(resolvedPath);
}

// Serves one request file to the student/faculty member who owns the request.
async function serveRequestFile(res, { requestId, fileId, faculty = false, requesterId }) {
  const [[row]] = faculty
    ? await pool.query(
        `SELECT fdr.faculty_id AS owner_id, drf.file_path, drf.mime_type
         FROM document_request_files drf
         JOIN faculty_document_requests fdr ON fdr.request_id = drf.faculty_request_id
         WHERE drf.file_id = ? AND drf.faculty_request_id = ?`,
        [fileId, requestId],
      )
    : await pool.query(
        `SELECT dr.student_id AS owner_id, drf.file_path, drf.mime_type
         FROM document_request_files drf
         JOIN document_requests dr ON dr.request_id = drf.request_id
         WHERE drf.file_id = ? AND drf.request_id = ?`,
        [fileId, requestId],
      );
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  if (row.owner_id !== requesterId) {
    return res.status(403).json({ error: "You can only view files on your own document requests" });
  }
  return sendFileRow(res, row);
}

// Serves one request file to an admin of the request's own department.
async function serveAdminRequestFile(res, { requestId, fileId, faculty = false, adminDeptId }) {
  const [[row]] = faculty
    ? await pool.query(
        `SELECT s.department_id, drf.file_path, drf.mime_type
         FROM document_request_files drf
         JOIN faculty_document_requests fdr ON fdr.request_id = drf.faculty_request_id
         JOIN document_services s ON fdr.service_id = s.service_id
         WHERE drf.file_id = ? AND drf.faculty_request_id = ?`,
        [fileId, requestId],
      )
    : await pool.query(
        `SELECT s.department_id, drf.file_path, drf.mime_type
         FROM document_request_files drf
         JOIN document_requests dr ON dr.request_id = drf.request_id
         JOIN document_services s ON dr.service_id = s.service_id
         WHERE drf.file_id = ? AND drf.request_id = ?`,
        [fileId, requestId],
      );
  if (!row) {
    return res.status(404).json({ error: "File not found" });
  }
  if (row.department_id !== adminDeptId) {
    return res.status(403).json({ error: "You can only view files for your own department's document requests" });
  }
  return sendFileRow(res, row);
}

// How many admin_return files a request already has + their combined bytes --
// feeds validateBudget so a second attach can't blow past MAX_FILES / MAX_TOTAL_BYTES.
async function getExistingBudget(requestId, { faculty = false } = {}) {
  const col = keyColumn(faculty);
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(file_size), 0) AS bytes
     FROM document_request_files WHERE ${col} = ?`,
    [requestId],
  );
  return { count: row.cnt, bytes: Number(row.bytes) };
}

module.exports = {
  getFilesMap,
  getFiles,
  insertFiles,
  deleteFiles,
  validateBudget,
  getExistingBudget,
  serveRequestFile,
  serveAdminRequestFile,
};
