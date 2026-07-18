import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../utils/socket";
import api from "../utils/api";
import { formatManilaDateTime } from "../utils/dateTime";
import "./NotificationBell.css";

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const WATCHED_EVENTS = [
  "queue:called",
  "queue:served",
  "queue:uncalled",
  "queue:queue-stopped",
  "appointment:status-updated",
  "appointment:slot-updated",
  "document:status-updated",
];

// Live updates are pushed over WebSocket; this is only a safety-net poll in
// case a socket event is missed or the connection drops silently. Mirrors
// QueueProvider's identical fallback (this component previously had none,
// so a blocked/dropped WebSocket meant the bell would never update again
// without a manual reload).
const FALLBACK_POLL_INTERVAL_MS = 45000;

// Bell icon + unread-count badge + dropdown, backed by the `notifications`
// table. `endpointBase` picks the role-scoped API prefix ("student" or
// "faculty" -- the two roles that actually receive targeted notification
// events server-side; admin has no personal notifications yet).
export default function NotificationBell({ endpointBase }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wrapperRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get(`/${endpointBase}/notifications`);
      setNotifications(res.data.notifications);
    } catch {
      // Silent -- a failed notification fetch shouldn't disrupt the page.
    }
  }, [endpointBase]);

  useEffect(() => {
    const init = async () => {
      await fetchNotifications();
    };
    init();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    if (!socket) return undefined;

    WATCHED_EVENTS.forEach((event) => socket.on(event, fetchNotifications));
    return () => {
      WATCHED_EVENTS.forEach((event) => socket.off(event, fetchNotifications));
    };
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.patch(`/${endpointBase}/notifications/${id}/read`);
    } catch {
      // Revert the optimistic update -- without this, a silently-failed
      // PATCH left the item looking read indefinitely, since nothing else
      // was guaranteed to re-fetch and correct it.
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)),
      );
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch(`/${endpointBase}/notifications/read-all`);
    } catch {
      setNotifications(previous);
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={wrapperRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-bell-dropdown">
          <div className="notif-bell-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notif-bell-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-bell-list">
            {notifications.length === 0 ? (
              <div className="notif-bell-empty">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.notification_id}
                  className={`notif-bell-item ${n.is_read ? "" : "notif-bell-item--unread"}`}
                  onClick={() => !n.is_read && markRead(n.notification_id)}
                >
                  <p className="notif-bell-message">{n.message}</p>
                  <span className="notif-bell-time">
                    {formatManilaDateTime(n.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
