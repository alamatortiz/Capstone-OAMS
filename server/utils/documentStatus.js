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

module.exports = {
  DB_STATUS_MAP,
  STATUS_LABEL_MAP,
  VALID_SCAN_STATUSES,
  REQUIRED_PRIOR_STATUS,
};
