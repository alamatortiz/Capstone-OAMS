// Shared status vocabulary for document_requests / faculty_document_requests.
// Both tables are driven by the same admin endpoints - keeping the maps here
// stops the two copies from silently drifting apart.

// API/admin-facing status word -> DB ENUM value. Used to validate PATCH .../status
// bodies. The lifeline is Pending -> Processing -> Ready -> Claimed (+ Rejected,
// Cancelled) -- the old 'generated'/'released' pair was collapsed into 'ready'.
const DB_STATUS_MAP = {
  pending: "pending",
  processing: "processing",
  ready: "ready",
  claimed: "claimed",
  rejected: "rejected",
};

// DB ENUM value -> API/admin-facing status word. Used by GET list endpoints.
// 'generated'/'released' are kept as defensive aliases -> 'ready' so any row
// that predates the collapse (an un-migrated volume) still renders as "Ready"
// instead of falling through raw. They can never be *set* -- DB_STATUS_MAP drops them.
const STATUS_LABEL_MAP = {
  pending: "pending",
  processing: "processing",
  ready: "ready",
  generated: "ready",
  released: "ready",
  claimed: "claimed",
  rejected: "rejected",
  cancelled: "cancelled",
};

// Statuses a scanned document is still considered authentic/issuable under.
const VALID_SCAN_STATUSES = ["ready", "claimed"];

// A target status that can only be reached from one specific prior status.
const REQUIRED_PRIOR_STATUS = {
  claimed: "ready",
};

// document_submissions now share the same lifeline as document_requests:
// Pending -> Processing -> Ready -> Claimed. 'ready' = the office has processed
// the submission (and attached any return files); the submitter then self-marks
// it Claimed. STATUS_LABEL_MAP above already covers this vocabulary.
const SUBMISSION_DB_STATUS_MAP = {
  pending: "pending",
  processing: "processing",
  ready: "ready",
  claimed: "claimed",
  rejected: "rejected",
};

const SUBMISSION_REQUIRED_PRIOR_STATUS = {
  ready: "processing",
  claimed: "ready",
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
  // Faculty's own "Send a Document" submissions -- same document_submissions
  // table as `submission` above (submitter_type = 'faculty' rows), just
  // keyed by faculty_id instead of student_id.
  facultySubmission: {
    ownerColumn: "faculty_id",
    selectSql: `SELECT faculty_id, status, department_id
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
// This is the ONLY path that ever cancels a document request/submission
// besides an explicit admin status PATCH -- deliberately owner-initiated
// only, with no `needed_by`/date check of any kind. Do not add one: a
// request must never be auto-cancelled just because its needed-by date
// arrived or passed -- that's informational for the requester/admin only.
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

// Table/owner-column pair for the owner-initiated "mark my document as claimed"
// flow -- the document counterpart to a student marking an appointment as done
// (see the /appointments/:id/complete route). Same four requester roles as
// CANCEL_CONFIG. `owner_id`/`label` are aliased so selfClaimDocument below can
// stay table-agnostic. Never build these by splicing caller input into SQL.
const CLAIM_CONFIG = {
  student: {
    selectSql: `SELECT dr.student_id AS owner_id, dr.status, dr.tracking_number,
                       s.department_id, s.service_name AS label
                FROM document_requests dr
                JOIN document_services s ON dr.service_id = s.service_id
                WHERE dr.request_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE document_requests SET status = 'claimed', claimed_at = NOW()
                WHERE request_id = ? AND status = 'ready'`,
  },
  faculty: {
    selectSql: `SELECT fdr.faculty_id AS owner_id, fdr.status, fdr.tracking_number,
                       s.department_id, s.service_name AS label
                FROM faculty_document_requests fdr
                JOIN document_services s ON fdr.service_id = s.service_id
                WHERE fdr.request_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE faculty_document_requests SET status = 'claimed', claimed_at = NOW()
                WHERE request_id = ? AND status = 'ready'`,
  },
  submission: {
    selectSql: `SELECT student_id AS owner_id, status, tracking_number,
                       department_id, title AS label
                FROM document_submissions
                WHERE submission_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE document_submissions SET status = 'claimed', claimed_at = NOW()
                WHERE submission_id = ? AND status = 'ready'`,
  },
  facultySubmission: {
    selectSql: `SELECT faculty_id AS owner_id, status, tracking_number,
                       department_id, title AS label
                FROM document_submissions
                WHERE submission_id = ?
                FOR UPDATE`,
    updateSql: `UPDATE document_submissions SET status = 'claimed', claimed_at = NOW()
                WHERE submission_id = ? AND status = 'ready'`,
  },
};

// Owner-initiated Ready -> Claimed. Runs the lock/ownership/status checks and
// the UPDATE inside the caller's own connection; this function owns the
// transaction (beginTransaction/commit/rollback). Returns a plain result
// object -- callers map `.ok`/`.status`/`.message` onto their own response
// convention and use `.departmentId`/`.ownerId` for socket emits. Only
// succeeds from 'ready'; 'claimed' is treated as an idempotent success.
async function selfClaimDocument(conn, { role, ownerId, requestId }) {
  const cfg = CLAIM_CONFIG[role];
  if (!cfg) return { ok: false, status: 400, message: "Unknown document type" };

  await conn.beginTransaction();

  const [[row]] = await conn.query(cfg.selectSql, [requestId]);

  if (!row) {
    await conn.rollback();
    return { ok: false, status: 404, message: "Document not found" };
  }
  if (row.owner_id !== ownerId) {
    await conn.rollback();
    return { ok: false, status: 403, message: "You can only claim your own documents" };
  }
  if (row.status === "claimed") {
    await conn.rollback();
    return {
      ok: true,
      already: true,
      departmentId: row.department_id,
      ownerId: row.owner_id,
      trackingNumber: row.tracking_number,
      label: row.label,
    };
  }
  if (row.status !== "ready") {
    await conn.rollback();
    return {
      ok: false,
      status: 409,
      message: "This document isn't ready to be claimed yet",
    };
  }

  const [result] = await conn.query(cfg.updateSql, [requestId]);
  if (result.affectedRows === 0) {
    // Lost a race with another claim/status change between the lock and the UPDATE.
    await conn.rollback();
    return { ok: false, status: 409, message: "This document isn't ready to be claimed yet" };
  }
  await conn.commit();

  return {
    ok: true,
    departmentId: row.department_id,
    ownerId: row.owner_id,
    trackingNumber: row.tracking_number,
    label: row.label,
  };
}

// Builds the frozen catalogue copy stored on document_requests.service_snapshot
// / faculty_document_requests.service_snapshot at submit time. `db` is any
// query executor (pool or an in-flight transaction connection). Returns a plain
// object -- callers JSON.stringify it (or pass it straight through, mysql2
// serialises objects for a JSON column).
async function buildDocumentServiceSnapshot(db, serviceId) {
  const [[svc]] = await db.query(
    `SELECT service_name, description, processing_time, recipient_type,
            requires_coding, is_cross_college
     FROM document_services WHERE service_id = ?`,
    [serviceId],
  );
  if (!svc) return null;
  const [reqs] = await db.query(
    `SELECT requirement_name, description, is_mandatory
     FROM document_requirements WHERE service_id = ? ORDER BY requirement_id ASC`,
    [serviceId],
  );
  return {
    name: svc.service_name,
    description: svc.description ?? null,
    processingTime: svc.processing_time ?? null,
    recipientType: svc.recipient_type,
    requiresCoding: !!svc.requires_coding,
    isCrossCollege: !!svc.is_cross_college,
    requirements: reqs.map((r) => ({
      name: r.requirement_name,
      description: r.description ?? null,
      isMandatory: !!r.is_mandatory,
    })),
  };
}

module.exports = {
  DB_STATUS_MAP,
  STATUS_LABEL_MAP,
  VALID_SCAN_STATUSES,
  REQUIRED_PRIOR_STATUS,
  SUBMISSION_DB_STATUS_MAP,
  SUBMISSION_REQUIRED_PRIOR_STATUS,
  cancelOwnDocumentRequest,
  selfClaimDocument,
  buildDocumentServiceSnapshot,
};
