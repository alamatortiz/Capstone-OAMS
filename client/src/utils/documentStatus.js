// The document lifeline is Pending -> Processing -> Ready -> Claimed (+ Rejected,
// Cancelled). The old DB values "generated" (shown as "Ready") and "released"
// were collapsed into "ready" -- both are folded here as defensive aliases so a
// row that predates the collapse (an un-migrated backend) still renders cleanly.
export function normalizeDocStatus(status) {
  if (status === "generated" || status === "released") return "ready";
  return status;
}

const HUB_LABELS = {
  pending: "pending",
  processing: "processing",
  ready: "ready",
  claimed: "claimed",
  rejected: "rejected",
  cancelled: "cancelled",
};

const HUB_CLASSES = {
  pending: "doc-badge-pending",
  processing: "doc-badge-processing",
  ready: "doc-badge-ready",
  claimed: "doc-badge-claimed",
  rejected: "doc-badge-rejected",
  cancelled: "doc-badge-cancelled",
};

const DETAIL_LABELS = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  claimed: "Claimed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const DETAIL_CLASSES = {
  pending: "dss-badge-pending",
  processing: "dss-badge-processing",
  ready: "dss-badge-ready",
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
