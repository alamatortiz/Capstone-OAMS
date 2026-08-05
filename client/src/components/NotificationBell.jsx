import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
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

// Exported so the full Notifications screen (one per role) can watch the
// same events for its own live refetch, instead of a 4th copy that could
// silently drift out of sync with this one.
export const NOTIFICATION_EVENTS = [
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

// The bell and the full Notifications page each keep their own independent
// `notifications` state, so marking read/all-read in one previously left the
// other stale until the next socket event or poll. This same-tab event lets
// either side tell all the others to refetch immediately after a mutation.
export const NOTIFICATIONS_SYNC_EVENT = "oams:notifications-sync";
export const broadcastNotificationsChanged = () =>
  window.dispatchEvent(new Event(NOTIFICATIONS_SYNC_EVENT));

// Bell icon + unread-count badge + dropdown, backed by the `notifications`
// table. `endpointBase` picks the role-scoped API prefix ("student",
// "faculty", or "admin"). `viewAllPath` is kept separate from `endpointBase`
// rather than derived from it, because the faculty role's API prefix
// ("faculty") doesn't match its frontend route prefix ("/professor/...") --
// deriving one from the other would silently produce a dead link. `onOpen`
// is called whenever the dropdown transitions closed -> open; the mobile
// header instance uses it to close the off-canvas nav drawer, since both are
// fixed-position overlays anchored near the same corner and the drawer would
// otherwise render on top of (hiding) part of the dropdown's own content.
// `typePaths` maps each notification `type` to the role's own screen for
// that category (e.g. queue -> queue status, document -> document status),
// so clicking a notification lands where the event actually happened instead
// of just marking it read. Passed in per-role (like `viewAllPath`) rather
// than derived from `endpointBase`, since not every role has a page for
// every type (e.g. professor has no announcements screen at all).
export default function NotificationBell({ endpointBase, viewAllPath, onOpen, typePaths }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);

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

    NOTIFICATION_EVENTS.forEach((event) => socket.on(event, fetchNotifications));
    return () => {
      NOTIFICATION_EVENTS.forEach((event) => socket.off(event, fetchNotifications));
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
    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, fetchNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, fetchNotifications);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      const insideWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideWrapper && !insideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // The dropdown is portaled straight to <body> (see the render below)
  // instead of rendering as a normal descendant of the bell -- the desktop
  // sidebar (`.dashboard-sidebar`) sets `overflow-x: hidden` to keep its own
  // nav scroll area clean, and since that's an ancestor, any content that
  // visually extended past the sidebar's ~14rem width got hard-clipped
  // there no matter what `left`/`right` position it was given (verified:
  // the dropdown was cut off flush with the sidebar's own edge). A portal
  // escapes that clipping ancestor entirely, so position is computed here
  // in plain viewport coordinates and applied via `position: fixed`.
  useLayoutEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return;
    }
    const dropdown = dropdownRef.current;
    const wrapper = wrapperRef.current;
    if (!dropdown || !wrapper) return;

    const margin = 12;
    const gap = 8;
    const wrapperRect = wrapper.getBoundingClientRect();
    const dropdownWidth = dropdown.offsetWidth;
    const idealLeft = wrapperRect.right - dropdownWidth;
    const maxLeft = window.innerWidth - dropdownWidth - margin;
    const clampedLeft = Math.max(margin, Math.min(idealLeft, maxLeft));

    setDropdownStyle({
      position: "fixed",
      top: `${wrapperRect.bottom + gap}px`,
      left: `${clampedLeft}px`,
      right: "auto",
    });
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.patch(`/${endpointBase}/notifications/${id}/read`);
      broadcastNotificationsChanged();
    } catch {
      // Revert the optimistic update -- without this, a silently-failed
      // PATCH left the item looking read indefinitely, since nothing else
      // was guaranteed to re-fetch and correct it.
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)),
      );
    }
  };

  const goToNotification = (n) => {
    if (!n.is_read) markRead(n.notification_id);
    setOpen(false);
    navigate(typePaths?.[n.type] ?? viewAllPath);
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch(`/${endpointBase}/notifications/read-all`);
      broadcastNotificationsChanged();
    } catch {
      setNotifications(previous);
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={wrapperRef}>
      <button
        className="notif-bell-btn"
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            if (next) onOpen?.();
            return next;
          })
        }
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open &&
        createPortal(
          <div
            className="notif-bell-dropdown"
            ref={dropdownRef}
            style={dropdownStyle ?? { position: "fixed", visibility: "hidden" }}
          >
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
                    onClick={() => goToNotification(n)}
                  >
                    <p className="notif-bell-message">{n.message}</p>
                    <span className="notif-bell-time">
                      {formatManilaDateTime(n.created_at)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <Link
              to={viewAllPath}
              className="notif-bell-view-all"
              onClick={() => setOpen(false)}
            >
              View All
            </Link>
          </div>,
          document.body,
        )}
    </div>
  );
}
