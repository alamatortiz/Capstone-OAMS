// Which Status values can actually occur for each Type/category filter value,
// derived from each source table's real status ENUM (server/oams_db.sql) --
// not guessed. "all" is always valid regardless of type. Kept as value lists
// (not full {value,label} option objects) so each page's own existing
// options array stays the single source of truth for label text -- this only
// says which of those options apply for a given type.
// "document" covers both document requests and document submissions, which
// share this same status lifecycle -- the Type filter merges them into one
// selectable option (adm-transactions.jsx / prof-transactions.jsx), so a
// separate "submission" key would never actually be looked up.
export const ADMIN_STATUSES_BY_TYPE = {
  queue: ["completed", "pending", "processing", "cancelled", "no_show"],
  appointment: ["completed", "approved", "pending", "rejected", "cancelled"],
  document: ["pending", "processing", "ready", "claimed", "rejected", "cancelled"],
  admin_action: ["created", "updated", "deleted", "viewed"],
};

export const PROFESSOR_STATUSES_BY_TYPE = {
  appointment: ["pending", "approved", "completed", "rejected", "cancelled"],
  document: ["pending", "processing", "ready", "claimed", "rejected", "cancelled"],
};

// Filters a page's full Status options list down to what's valid for the
// selected Type, always keeping the "All ..." option. Falls back to the full
// list for "all" (every status is valid) or any type not present in the map.
export function getStatusOptionsForType(fullOptions, statusesByType, type) {
  const allowed = statusesByType[type];
  if (!allowed) return fullOptions;
  return fullOptions.filter((opt) => opt.value === "all" || allowed.includes(opt.value));
}
