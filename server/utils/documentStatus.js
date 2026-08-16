// Shared status vocabulary for document_requests / faculty_document_requests.
// Both tables are driven by the same admin endpoints - keeping the maps here
// stops the two copies from silently drifting apart.

// API/admin-facing status word -> DB ENUM value. Used to validate PATCH .../status bodies.
const DB_STATUS_MAP = {
  pending: "pending",
  processing: "processing",
  ready: "generated",
  released: "released",
  claimed: "claimed",
  rejected: "rejected",
};

// DB ENUM value -> API/admin-facing status word. Used by GET list endpoints.
const STATUS_LABEL_MAP = {
  pending: "pending",
  processing: "processing",
  generated: "ready",
  released: "released",
  claimed: "claimed",
  rejected: "rejected",
  cancelled: "cancelled",
};

// Statuses a scanned document is still considered authentic/issuable under.
const VALID_SCAN_STATUSES = ["generated", "released", "claimed"];

// A target status that can only be reached from one specific prior status.
const REQUIRED_PRIOR_STATUS = {
  claimed: "released",
};

// document_submissions' own, smaller status vocabulary (student -> office
// "Send a Document"). No 'generated'/'released' -- nothing is physically
// generated or picked up in this direction, so claimed is reached directly
// from processing. STATUS_LABEL_MAP above needs no submission-specific
// counterpart -- it already has identity entries for pending/processing/
// claimed/rejected/cancelled, the full submission vocabulary.
const SUBMISSION_DB_STATUS_MAP = {
  pending: "pending",
  processing: "processing",
  claimed: "claimed",
  rejected: "rejected",
};

const SUBMISSION_REQUIRED_PRIOR_STATUS = {
  claimed: "processing",
};

// Table/owner-column pair for each requester role. Kept as an internal,
// hardcoded config -- never build these queries by splicing a caller-supplied
// table/column name into SQL, even though today's two callers are trusted.
const CANCEL_CONFIG = {
  student: {
    ownerColumn: "student_id",
    selectSql: `SELECT dr.request_id, dr.student_id, dr.status, s.department_id
                FROM document_requests dr
                JOIN document_services s ON dr.service_id = s.service_id
                WHERE dr.request_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE document_requests SET status = 'cancelled' WHERE request_id = ?`,
  },
  faculty: {
    ownerColumn: "faculty_id",
    selectSql: `SELECT fdr.request_id, fdr.faculty_id, fdr.status, s.department_id
                FROM faculty_document_requests fdr
                JOIN document_services s ON fdr.service_id = s.service_id
                WHERE fdr.request_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE faculty_document_requests SET status = 'cancelled' WHERE request_id = ?`,
  },
  submission: {
    ownerColumn: "student_id",
    selectSql: `SELECT student_id, status, department_id
                FROM document_submissions
                WHERE submission_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE document_submissions SET status = 'cancelled' WHERE submission_id = ?`,
  },
};

// Shared soft-cancel flow for a "my own pending/processing document request"
// DELETE route (student cancelling document_requests, faculty cancelling
// faculty_document_requests). Runs the lock/ownership/status checks and the
// UPDATE inside the caller's own transaction connection; the caller commits
// nothing itself -- this function calls beginTransaction/commit/rollback.
// Returns a plain result object rather than writing to `res` directly,
// since the two routes use different outer response-JSON keys (`error` vs
// `message`) that are each an established, intentional per-role convention.
async function cancelOwnDocumentRequest(conn, { role, ownerId, requestId }) {
  const cfg = CANCEL_CONFIG[role];
  await conn.beginTransaction();

  const [[request]] = await conn.query(cfg.selectSql, [requestId]);

  if (!request) {
    await conn.rollback();
    return { ok: false, status: 404, message: "Document request not found" };
  }
  if (request[cfg.ownerColumn] !== ownerId) {
    await conn.rollback();
    return { ok: false, status: 403, message: "You can only cancel your own document requests" };
  }
  if (!["pending", "processing"].includes(request.status)) {
    await conn.rollback();
    return {
      ok: false,
      status: 409,
      message: `Cannot cancel a request that is already ${request.status}`,
    };
  }

  await conn.query(cfg.updateSql, [requestId]);
  await conn.commit();

  return { ok: true, departmentId: request.department_id };
}

module.exports = {
  DB_STATUS_MAP,
  STATUS_LABEL_MAP,
  VALID_SCAN_STATUSES,
  REQUIRED_PRIOR_STATUS,
  SUBMISSION_DB_STATUS_MAP,
  SUBMISSION_REQUIRED_PRIOR_STATUS,
  cancelOwnDocumentRequest,
};
