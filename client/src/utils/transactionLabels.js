// Human-readable labels shared by the admin/professor/student transaction
// pages (on-screen badges AND CSV/PDF exports) so all three roles say the
// same thing for the same status/type.

const READY_ALIASES = new Set(["ready", "generated", "released"]);

export function transactionStatusLabel(status) {
  if (!status) return "Unknown";
  if (READY_ALIASES.has(status)) return "Ready for Pickup";
  if (status === "no_show") return "No Show";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const TYPE_LABELS = {
  queue: "Queue",
  appointment: "Appointment",
  document: "Document Request",
  submission: "Document Submission",
  admin_action: "Admin Action",
};

export function transactionTypeLabel(type) {
  return TYPE_LABELS[type] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Unknown");
}
