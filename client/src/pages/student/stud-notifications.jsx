import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, Clock, FileText, Calendar, Megaphone, BellRing } from "lucide-react";
import { toast } from "sonner";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import Pagination from "../../components/Pagination";
import { useNotificationsPage } from "../../hooks/useNotificationsPage";
import { formatManilaDate, formatManilaTime } from "../../utils/dateTime";
import { getPushToggleState, subscribeToPush, unsubscribeFromPush } from "../../utils/webPush";

import "./stud-notifications.css";

const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const TYPE_META = {
  queue: { label: "Queue", updateLabel: "Queue Update", icon: Clock, badgeClass: "notif-badge-queue", iconClass: "notif-icon-queue" },
  document: { label: "Document", updateLabel: "Document Update", icon: FileText, badgeClass: "notif-badge-document", iconClass: "notif-icon-document" },
  appointment: { label: "Appointment", updateLabel: "Appointment Update", icon: Calendar, badgeClass: "notif-badge-appointment", iconClass: "notif-icon-appointment" },
  announcement: { label: "Announcement", updateLabel: "Announcement Update", icon: Megaphone, badgeClass: "notif-badge-announcement", iconClass: "notif-icon-announcement" },
};

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "queue", label: "Queue" },
  { value: "document", label: "Document" },
  { value: "appointment", label: "Appointment" },
  { value: "announcement", label: "Announcement" },
];

// Mirrors StudentSidebar.jsx's NOTIFICATION_TYPE_PATHS -- kept as a separate
// copy rather than a shared import since this page has no other dependency
// on the sidebar module, same reasoning as this component not reusing
// NotificationBell's own JSX.
const TYPE_PATHS = {
  queue: "/student/queue-status",
  document: "/student/document-status",
  appointment: "/student/appointment-status",
  announcement: "/student/announcements",
};

export default function StudentNotifications() {
  const {
    filterType, changeFilterType, page, setPage, notifications, totalPages,
    loading, error, unreadCount, markAllRead, goToNotification,
  } = useNotificationsPage({ basePath: "/student", typePaths: TYPE_PATHS, fallbackPath: "/student/dashboard" });

  // Persistent push-notification toggle -- reflects the ACTUAL current
  // subscription (not just permission, which stays "granted" forever even
  // after toggling off), so it always shows the true on/off state whenever
  // this page is visited, rather than a one-time banner that disappears
  // once acted on.
  const [pushState, setPushState] = useState({ supported: true, permission: "default", subscribed: false });
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushState = useCallback(async () => {
    setPushState(await getPushToggleState());
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const handleTogglePush = async (nextOn) => {
    setPushBusy(true);
    try {
      if (nextOn) {
        const result = await subscribeToPush();
        if (result.ok) {
          toast.success("Notifications enabled for this browser.");
        } else if (result.reason === "denied") {
          toast.error("Notifications were blocked. You can re-enable them from your browser's site settings.");
        } else if (result.reason !== "dismissed") {
          toast.error("Could not enable notifications. Please try again.");
        }
      } else {
        await unsubscribeFromPush();
        toast.message("Notifications disabled for this browser.");
      }
    } finally {
      await refreshPushState();
      setPushBusy(false);
    }
  };

  return (
    <StudentPageShell outerClassName="stud-notifications-with-sidebar" mainClassName="stud-notifications-main">
      <div className="stud-notifications-container">
        <PageHeader
          breadcrumb={
            <Link to="/student/dashboard" className="breadcrumb-link">
              <ChevronLeft className="breadcrumb-icon" />
              Home
            </Link>
          }
          icon={<Bell />}
          iconClassName="notif-title-icon"
          title="Notifications"
          subtitle="Stay updated on queue, document, appointment, and announcement activity."
          headerClassName="notif-header"
          breadcrumbClassName="page-breadcrumb"
          titleSectionClassName="notif-title-section"
          titleClassName="notif-title"
          subtitleClassName="notif-subtitle"
        />

        {pushState.supported && (
          <div className="notif-push-banner">
            <BellRing className="notif-push-banner-icon" />
            <div className="notif-push-banner-text">
              <h3>Browser Notifications</h3>
              <p>
                {pushState.permission === "denied"
                  ? "Blocked in your browser's site settings — enable them there to turn this on."
                  : "Get notified even when this tab is closed."}
              </p>
            </div>
            <label className={`notif-push-toggle ${pushBusy ? "notif-push-toggle--busy" : ""}`}>
              <input
                type="checkbox"
                checked={pushState.subscribed}
                disabled={pushBusy || pushState.permission === "denied"}
                onChange={(e) => handleTogglePush(e.target.checked)}
                aria-label="Toggle browser notifications"
              />
              <span className="notif-push-toggle-track">
                <span className="notif-push-toggle-thumb" />
              </span>
            </label>
          </div>
        )}

        <div className="filters-card">
          <div className="filters-header">
            <h3 className="filters-title">Notification Filter</h3>
            <p className="filters-description">Filter your notifications by category.</p>
          </div>
          <div className="filters-row">
            <div className="filters-grid">
              <FilterSelect
                id="notif-type-select"
                label="Type"
                value={filterType}
                onChange={(e) => changeFilterType(e.target.value)}
                options={TYPE_OPTIONS}
                chevronIcon={<ChevronDownIcon className="filter-chevron" />}
              />
            </div>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all-btn" onClick={markAllRead}>
                Mark all read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        <div className="notifications-list">
          {loading ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>Loading notifications…</h3>
            </div>
          ) : error ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>Could not load notifications</h3>
              <p>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty-state">
              <Bell />
              <h3>No Notifications</h3>
              <p>You're all caught up.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.queue;
              const TypeIcon = meta.icon;
              return (
                <button
                  type="button"
                  key={n.notification_id}
                  className={`notif-item notif-item-${n.type} ${n.is_read ? "" : "notif-item--unread"}`}
                  onClick={() => goToNotification(n)}
                >
                  <span className={`notif-item-icon ${meta.iconClass}`}>
                    <TypeIcon />
                  </span>
                  <span className="notif-item-content">
                    <span className="notif-item-header">
                      <span className="notif-item-title">{meta.updateLabel}</span>
                      <span className="notif-item-badges">
                        <span className={`notif-badge ${meta.badgeClass}`}>{meta.label}</span>
                        {!n.is_read && <span className="notif-badge notif-badge-unread">Unread</span>}
                      </span>
                    </span>
                    <span className="notif-item-message">{n.message}</span>
                  </span>
                  <span className="notif-item-meta">
                    <span className="notif-item-date">
                      <Calendar className="notif-item-time-icon" />
                      {formatManilaDate(n.created_at)}
                    </span>
                    <span className="notif-item-time">
                      <Clock className="notif-item-time-icon" />
                      {formatManilaTime(n.created_at)}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </StudentPageShell>
  );
}
