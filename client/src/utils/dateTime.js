// Timestamp formatters that always render in Philippine time (Asia/Manila),
// regardless of the viewer's browser/OS timezone.

const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Returns the Manila calendar date (YYYY-MM-DD) for a given instant, defaulting
// to now. Use this instead of comparing `Date` objects/`toDateString()` for
// "is this today" checks — the browser's local "today" can differ from
// Manila's near the day boundary.
export function getManilaDateString(date = new Date()) {
  return MANILA_DATE_FORMATTER.format(date);
}

export function formatManilaDate(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

export function formatManilaTime(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

export function formatManilaDateTime(value, opts = {}) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  });
}

export function formatManilaTimeAgo(value) {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
