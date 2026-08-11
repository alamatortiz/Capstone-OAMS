import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Clock, FileText, Calendar, Megaphone } from "lucide-react";
import StudentPageShell from "../../components/StudentPageShell";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import Pagination from "../../components/Pagination";
import {
  NOTIFICATION_EVENTS,
  NOTIFICATIONS_SYNC_EVENT,
  broadcastNotificationsChanged,
} from "../../components/NotificationBell";
import api from "../../utils/api";
import { formatManilaDateTime } from "../../utils/dateTime";
import { useAuth } from "../../context/AuthContext";
import { connectSocket } from "../../utils/socket";

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
  const { token } = useAuth();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guards against out-of-order responses: e.g. changing the type filter and
  // then the page before the first request resolves would otherwise let the
  // stale response land after the fresh one and overwrite it. Each call
  // captures the current token; a response is only applied if its token is
  // still the latest by the time it resolves.
  const requestIdRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setError(null);
      const res = await api.get("/student/notifications", {
        params: { type: filterType !== "all" ? filterType : undefined, page },
      });
      if (requestId !== requestIdRef.current) return;
      setNotifications(res.data.notifications ?? []);
      setTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch notifications:", err);
      setError("Could not load your notifications.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [filterType, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;
    NOTIFICATION_EVENTS.forEach((event) => socket.on(event, fetchNotifications));
    return () => {
      NOTIFICATION_EVENTS.forEach((event) => socket.off(event, fetchNotifications));
    };
  }, [token, fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, fetchNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, fetchNotifications);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/student/notifications/${id}/read`);
      broadcastNotificationsChanged();
    } catch {
      setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)));
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch("/student/notifications/read-all");
      broadcastNotificationsChanged();
    } catch {
      setNotifications(previous);
    }
  };

  const goToNotification = (n) => {
    if (!n.is_read) markRead(n.notification_id);
    navigate(TYPE_PATHS[n.type] ?? "/student/dashboard");
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
          title="Notifications"
          subtitle="Stay updated on queue, document, appointment, and announcement activity"
        />

        <div className="filters-card">
          <div className="filters-header">
            <h3 className="filters-title">Notification Filter</h3>
            <p className="filters-description">Filter your notifications by category</p>
          </div>
          <div className="filters-row">
            <div className="filters-grid">
              <FilterSelect
                id="notif-type-select"
                label="Type"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
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
              <p>You're all caught up</p>
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
                    <span className="notif-item-time">
                      <Clock className="notif-item-time-icon" />
                      {formatManilaDateTime(n.created_at)}
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
