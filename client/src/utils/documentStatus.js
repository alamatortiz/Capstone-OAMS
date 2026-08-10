// The faculty document-requests endpoint returns the raw DB enum value
// "generated" where the student/admin endpoints already normalize it to
// "ready". This is the one place that alias is resolved on the frontend.
export function normalizeDocStatus(status) {
  return status === "generated" ? "ready" : status;
}

const HUB_LABELS = {
  pending: "pending",
  processing: "processing",
  ready: "ready",
  released: "released",
  claimed: "claimed",
  rejected: "rejected",
  cancelled: "cancelled",
};

const HUB_CLASSES = {
  pending: "doc-badge-pending",
  processing: "doc-badge-processing",
  ready: "doc-badge-ready",
  released: "doc-badge-released",
  claimed: "doc-badge-claimed",
  rejected: "doc-badge-rejected",
  cancelled: "doc-badge-cancelled",
};

const DETAIL_LABELS = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  released: "Released",
  claimed: "Claimed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const DETAIL_CLASSES = {
  pending: "dss-badge-pending",
  processing: "dss-badge-processing",
  ready: "dss-badge-ready",
  released: "dss-badge-released",
  claimed: "dss-badge-claimed",
  rejected: "dss-badge-rejected",
  cancelled: "dss-badge-cancelled",
};

export function getDocStatusHubMeta(status) {
  const key = normalizeDocStatus(status);
  return {
    label: HUB_LABELS[key] ?? key,
    cls: HUB_CLASSES[key] ?? "doc-badge-pending",
  };
}

export function getDocStatusDetailMeta(status) {
  const key = normalizeDocStatus(status);
  return {
    label: DETAIL_LABELS[key] ?? key,
    cls: DETAIL_CLASSES[key] ?? "dss-badge-pending",
  };
}
