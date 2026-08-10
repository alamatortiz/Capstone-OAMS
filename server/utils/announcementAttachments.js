const pool = require("../db");
const fs = require("fs");
const path = require("path");
const { UPLOAD_DIR, MAX_FILES, MAX_TOTAL_BYTES } = require("../middleware/upload");

// Fetches attachments for a set of announcement IDs, grouped by announcement_id.
async function getAttachmentsMap(announcementIds) {
  if (!announcementIds || announcementIds.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT attachment_id, announcement_id, filename, mime_type, file_size
     FROM announcement_attachments
     WHERE announcement_id IN (?)
     ORDER BY uploaded_at ASC`,
    [announcementIds],
  );
  const map = {};
  rows.forEach((r) => {
    if (!map[r.announcement_id]) map[r.announcement_id] = [];
    map[r.announcement_id].push({
      id: String(r.attachment_id),
      filename: r.filename,
      mimeType: r.mime_type,
      size: r.file_size,
    });
  });
  return map;
}

async function getAttachments(announcementId) {
  const map = await getAttachmentsMap([announcementId]);
  return map[announcementId] || [];
}

// Inserts one row per uploaded file (req.files, from multer's upload.array).
// Caller must run validateBudget() first. Accepts an optional transaction
// connection so this can run atomically alongside the announcement's own
// INSERT/UPDATE; defaults to the plain pool for callers that don't need that.
async function insertAttachments(announcementId, files, executor = pool) {
  if (!files || files.length === 0) return;
  const values = files.map((f) => [announcementId, f.originalname, f.filename, f.mimetype, f.size]);
  await executor.query(
    `INSERT INTO announcement_attachments (announcement_id, filename, file_path, mime_type, file_size) VALUES ?`,
    [values],
  );
}

// Checks a prospective set of new files against the shared MAX_FILES /
// MAX_TOTAL_BYTES budget. existingCount/existingBytes let an edit account for
// attachments already on the announcement. Returns an error message string
// if the budget would be exceeded, or null if it's fine.
function validateBudget(newFiles, existingCount = 0, existingBytes = 0) {
  const totalCount = existingCount + newFiles.length;
  if (totalCount > MAX_FILES) {
    return `You can attach up to ${MAX_FILES} files total (this would result in ${totalCount})`;
  }
  const newBytes = newFiles.reduce((sum, f) => sum + f.size, 0);
  const totalBytes = existingBytes + newBytes;
  if (totalBytes > MAX_TOTAL_BYTES) {
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const maxMB = MAX_TOTAL_BYTES / (1024 * 1024);
    return `Combined attachment size would be ${totalMB}MB, which exceeds the ${maxMB}MB limit`;
  }
  return null;
}

// Deletes files multer already wrote to disk -- used when a request is
// rejected after upload.array() ran (validation failure, DB error, etc.).
function deleteFiles(files) {
  (files || []).forEach((f) => {
    fs.unlink(path.join(UPLOAD_DIR, f.filename), (err) => {
      if (err && err.code !== "ENOENT") console.error("Attachment cleanup error:", err);
    });
  });
}

// Exact-boundary check that a resolved path is inside UPLOAD_DIR (not just
// prefix-matching, which would also pass a sibling dir like "uploads-evil").
// Defense-in-depth only -- file_path is always a server-generated UUID.
function isPathInsideUploadDir(resolvedPath) {
  return resolvedPath === UPLOAD_DIR || resolvedPath.startsWith(UPLOAD_DIR + path.sep);
}

// Resolves and serves one announcement attachment inline (image/PDF/etc.),
// after checking it belongs to the caller's own department. Shared by the
// student, faculty, and admin "view attachment" routes, which differ only in
// how they look up the caller's department_id and their 403 message.
//
// `expectedAudience` ('students' | 'faculty') is optional -- student and
// faculty routes pass their own role so a caller can't reach an attachment
// belonging to an announcement meant for the other audience even if they
// know/guess its id, bypassing the list endpoint's filtering entirely. Admin
// omits it since admins manage announcements for both audiences.
async function serveAnnouncementAttachment(res, { announcementId, attachmentId, callerDeptId, expectedAudience, forbiddenMessage }) {
  const [[row]] = await pool.query(
    `SELECT a.department_id, a.audience, aa.file_path, aa.mime_type
     FROM announcement_attachments aa
     JOIN announcements a ON a.announcement_id = aa.announcement_id
     WHERE aa.attachment_id = ? AND aa.announcement_id = ?`,
    [attachmentId, announcementId],
  );
  if (!row) {
    return res.status(404).json({ error: "Attachment not found" });
  }
  if (row.department_id !== callerDeptId || (expectedAudience && row.audience !== expectedAudience)) {
    return res.status(403).json({ error: forbiddenMessage });
  }

  const resolvedPath = path.join(UPLOAD_DIR, row.file_path);
  if (!isPathInsideUploadDir(resolvedPath)) {
    return res.status(400).json({ error: "Invalid attachment path" });
  }

  res.type(row.mime_type || "application/octet-stream");
  res.sendFile(resolvedPath);
}

module.exports = {
  getAttachmentsMap,
  getAttachments,
  insertAttachments,
  validateBudget,
  deleteFiles,
  isPathInsideUploadDir,
  serveAnnouncementAttachment,
};
