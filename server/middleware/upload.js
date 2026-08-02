const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "announcements");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_EXT = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
};

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per file, enforced natively by multer below
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB combined across up to MAX_FILES -- mostly a side effect of MAX_FILE_BYTES x MAX_FILES, but still a real backstop for PUT requests adding to an announcement whose existing attachments predate this cap

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Never derive the on-disk name from the client-supplied original
    // filename - prevents path traversal / double-extension tricks.
    const ext = MIME_EXT[file.mimetype] || "";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  // fileSize is a native, per-file limit -- multer rejects (and cleans up)
  // any single file over MAX_FILE_BYTES before the route handler runs. The
  // combined-total-across-files rule (multer has no native option for that)
  // is enforced separately in the route handlers via validateBudget().
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      return cb(new Error("That file type isn't supported"));
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR, MIME_EXT, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES };
