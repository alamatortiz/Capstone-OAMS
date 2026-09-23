import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  NOTIFICATION_EVENTS,
  NOTIFICATIONS_SYNC_EVENT,
  broadcastNotificationsChanged,
} from "../components/NotificationBell";
import api from "../utils/api";
import { useLiveRefetch } from "./useLiveRefetch";

// Shared logic for the student / professor / admin Notifications pages:
// filtered + paginated fetch (with an out-of-order response guard), live
// refresh (socket events + reconnect via useLiveRefetch, 45s fallback poll,
// bell-sync window event), optimistic mark-read / mark-all-read, and
// click-through navigation. Each page keeps its own markup/CSS.
//
// basePath: "/student" | "/professor" | "/admin"
// typePaths: notification type -> route; fallbackPath: unknown type -> route
export function useNotificationsPage({ basePath, typePaths, fallbackPath }) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only the latest request may apply its response (filter/page can change
  // before an earlier request resolves).
  const requestIdRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setError(null);
      const res = await api.get(`${basePath}/notifications`, {
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
  }, [basePath, filterType, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useLiveRefetch(NOTIFICATION_EVENTS, fetchNotifications);

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
      await api.patch(`${basePath}/notifications/${id}/read`);
      broadcastNotificationsChanged();
    } catch {
      setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: false } : n)));
    }
  };

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.patch(`${basePath}/notifications/read-all`);
      broadcastNotificationsChanged();
    } catch {
      setNotifications(previous);
    }
  };

  const goToNotification = (n) => {
    if (!n.is_read) markRead(n.notification_id);
    navigate(typePaths[n.type] ?? fallbackPath);
  };

  const changeFilterType = (value) => {
    setFilterType(value);
    setPage(1);
  };

  return {
    filterType,
    changeFilterType,
    page,
    setPage,
    notifications,
    totalPages,
    loading,
    error,
    unreadCount,
    markAllRead,
    goToNotification,
  };
}
