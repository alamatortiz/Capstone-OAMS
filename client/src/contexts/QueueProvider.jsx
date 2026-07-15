import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { connectSocket, disconnectSocket } from "../utils/socket";
import QueueContext from "./QueueContextBase";

// Live updates are pushed over WebSocket; this is only a safety-net poll
// in case a socket event is missed or the connection drops silently.
const FALLBACK_POLL_INTERVAL_MS = 45000;

// Available slots get their own, shorter poll: a student merely *browsing*
// a cross-college service (not yet joined) isn't in that service's owning
// department's socket room, so they'd otherwise only see capacity/pause
// changes via the slower 45s fallback above.
const AVAILABLE_SLOTS_POLL_INTERVAL_MS = 15000;

export function QueueProvider({ children }) {
  const { user, token } = useAuth();

  const [queues, setQueues] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Separate from `error` (which gates the Active/Available tabs) so a
  // history/metrics fetch failure doesn't incorrectly hide unrelated,
  // successfully-loaded queue data.
  const [historyError, setHistoryError] = useState(null);
  const [metricsError, setMetricsError] = useState(null);

  // Snapshot of queues from the previous poll, keyed by queueId. Used to
  // detect transitions (waiting -> serving, slot paused/resumed, etc.) so
  // we can notify the student even if they're not looking at the queue
  // status page right now.
  const prevQueuesRef = useRef(new Map());
  const hasLoadedOnceRef = useRef(false);
  const queuesRef = useRef([]);
  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);

  // ── Fetch queue history ───────────────────────────────────────────────────
  const fetchQueueHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/history");
      const history = data.history ?? [];
      setQueueHistory(history);
      setHistoryError(null);
      return history;
    } catch (err) {
      console.error("fetchQueueHistory error:", err);
      setHistoryError("Failed to load your queue history.");
      return [];
    }
  }, []);

  // ── Detect status changes since the last poll and notify the student ──────
  const notifyQueueTransitions = useCallback(async (nextQueues) => {
    const prevMap = prevQueuesRef.current;

    for (const q of nextQueues) {
      const prev = prevMap.get(q.queueId);
      if (!prev) continue;

      if (prev.status === "waiting" && q.status === "serving") {
        toast.success(
          `It's your turn for ${q.serviceName}! Please proceed to the designated location.`,
          { duration: 8000 },
        );
      }
      if (prev.status === "serving" && q.status === "waiting") {
        toast.warning(
          `Your call for ${q.serviceName} was reverted because the queue was paused. You're still in line.`,
        );
      }
      if (prev.slotStatus !== "paused" && q.slotStatus === "paused") {
        toast.warning(
          q.slotPauseReason
            ? `The queue for ${q.serviceName} has been paused by the admin. Reason: ${q.slotPauseReason}`
            : `The queue for ${q.serviceName} has been paused by the admin. Please wait.`,
        );
      }
      if (prev.slotStatus === "paused" && q.slotStatus === "open") {
        toast.success(`The queue for ${q.serviceName} has resumed.`);
      }
      if (prev.slotStatus !== "full" && q.slotStatus === "full") {
        toast.message(
          `The queue for ${q.serviceName} is now full. New students can no longer join, but you'll still be served.`,
        );
      }
      if (prev.slotStatus !== "expired" && q.slotStatus === "expired") {
        toast.message(
          `The queue for ${q.serviceName} is closed for new joins (hours ended), but you'll still be served.`,
        );
      }
    }

    // A queue that was "serving" and is no longer in the active list was
    // either served by the admin or auto-voided as a no-show — check its
    // resolved status in history so we don't tell a no-show student "thank
    // you, you've been served."
    const nextIds = new Set(nextQueues.map((q) => q.queueId));
    const vanishedServing = [...prevMap.entries()].filter(
      ([queueId, prev]) => prev.status === "serving" && !nextIds.has(queueId),
    );
    if (vanishedServing.length > 0) {
      const history = await fetchQueueHistory();
      for (const [queueId, prev] of vanishedServing) {
        const resolved = history.find((h) => h.id === queueId);
        if (resolved?.status === "no_show") {
          toast.warning(
            `You were marked as a no-show for ${prev.serviceName} and your line was voided.`,
          );
        } else if (resolved?.status === "cancelled") {
          // The student left voluntarily -- leaveQueue() already shows its
          // own "You have left the queue" toast, so stay silent here rather
          // than contradicting it with a false "you've been served."
        } else {
          toast.success(`You've been served for ${prev.serviceName}. Thank you!`);
        }
      }
    }

    prevMap.clear();
    for (const q of nextQueues) prevMap.set(q.queueId, q);
  }, [fetchQueueHistory]);

  // ── Fetch active queues ───────────────────────────────────────────────────
  const fetchActiveQueues = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get("/student/queues/active");
      const next = data.queues ?? [];
      if (hasLoadedOnceRef.current) {
        notifyQueueTransitions(next);
      } else {
        prevQueuesRef.current = new Map(next.map((q) => [q.queueId, q]));
        hasLoadedOnceRef.current = true;
      }
      setQueues(next);
    } catch (err) {
      console.error("fetchActiveQueues error:", err);
      setError("Failed to load your active queues.");
    }
  }, [notifyQueueTransitions]);

  // ── Fetch available slots ─────────────────────────────────────────────────
  const fetchAvailableSlots = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get("/student/queues/available");
      setAvailableSlots(data.slots ?? []);
    } catch (err) {
      console.error("fetchAvailableSlots error:", err);
      setError("Failed to load available queues.");
    }
  }, []);

  // ── Fetch metrics ─────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/metrics");
      setMetrics(data);
      setMetricsError(null);
    } catch (err) {
      console.error("fetchMetrics error:", err);
      setMetricsError("Failed to load your queue analytics.");
    }
  }, []);

  // ── Reset on user change ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setQueues([]);
      setAvailableSlots([]);
      setQueueHistory([]);
      setMetrics(null);
      setError(null);
      setHistoryError(null);
      setMetricsError(null);
      prevQueuesRef.current = new Map();
      hasLoadedOnceRef.current = false;

      if (!user?.userId || user.role !== "student") {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([
        fetchActiveQueues(),
        fetchAvailableSlots(),
        fetchQueueHistory(),
        fetchMetrics(),
      ]);
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  // ── Re-fetch on tab focus ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchActiveQueues();
        fetchAvailableSlots();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user?.userId, fetchActiveQueues, fetchAvailableSlots]);

  // ── Fallback poll (safety net only — sockets drive live updates) ──────────
  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchActiveQueues();
      }
    }, FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.userId, fetchActiveQueues]);

  // ── Available-slots poll (shorter interval — see constant comment above) ──
  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAvailableSlots();
      }
    }, AVAILABLE_SLOTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.userId, fetchAvailableSlots]);

  // ── WebSocket: live queue updates ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId || user.role !== "student" || !token) return;

    const socket = connectSocket(token);
    if (!socket) return;

    const refetch = () => {
      fetchActiveQueues();
      fetchAvailableSlots();
    };

    const events = [
      "queue:called",
      "queue:served",
      "queue:no-show",
      "queue:slot-status",
      "queue:student-joined",
      "queue:student-left",
    ];
    events.forEach((event) => socket.on(event, refetch));

    // The admin stopped a queue that this student was still in — their
    // entry was force-cancelled server-side. Tell them directly (with the
    // reason) instead of relying on the generic diff logic, which only
    // ever notices "serving" entries vanishing, not "waiting" ones.
    const onQueueStopped = (payload) => {
      const stoppedQueue = queuesRef.current.find(
        (q) => q.queueId === payload.queueId,
      );
      toast.error(
        `Your queue${stoppedQueue ? ` for ${stoppedQueue.serviceName}` : ""} was stopped by the admin. Reason: ${payload.reason}`,
        { duration: 10000 },
      );
      refetch();
    };
    socket.on("queue:queue-stopped", onQueueStopped);

    // Reconcile any events missed while disconnected.
    const onReconnect = () => {
      socket.emit("queue:rejoin-rooms");
      refetch();
    };
    socket.on("connect", onReconnect);

    return () => {
      events.forEach((event) => socket.off(event, refetch));
      socket.off("queue:queue-stopped", onQueueStopped);
      socket.off("connect", onReconnect);
    };
  }, [user?.userId, user?.role, token, fetchActiveQueues, fetchAvailableSlots]);

  // ── Disconnect socket on logout ───────────────────────────────────────────
  useEffect(() => {
    if (!token) disconnectSocket();
  }, [token]);

  // ── Join a queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(
    async (slotId, notes) => {
      try {
        const { data } = await api.post("/student/queues/join", { slotId, notes });
        setQueues((prev) => [...prev, data.queue]);
        await fetchAvailableSlots();
        await fetchActiveQueues();
        return data.queue;
      } catch (err) {
        const msg =
          err?.response?.data?.error ??
          "Failed to join the queue. Please try again.";
        throw new Error(msg);
      }
    },
    [fetchAvailableSlots, fetchActiveQueues],
  );

  // ── Leave a queue ─────────────────────────────────────────────────────────
  const leaveQueue = useCallback(
    async (queueId) => {
      try {
        await api.post(`/student/queues/${queueId}/leave`);
        setQueues((prev) => prev.filter((q) => q.queueId !== queueId));
        await fetchAvailableSlots();
        await fetchQueueHistory();
      } catch (err) {
        const msg =
          err?.response?.data?.error ??
          "Failed to leave the queue. Please try again.";
        throw new Error(msg);
      }
    },
    [fetchAvailableSlots, fetchQueueHistory],
  );

  // ── Update queue notes (concern) ──────────────────────────────────────────
  const updateQueueNotes = useCallback(async (queueId, notes) => {
    try {
      await api.patch(`/student/queues/${queueId}/notes`, { notes });
      setQueues((prev) =>
        prev.map((q) => (q.queueId === queueId ? { ...q, notes } : q)),
      );
    } catch (err) {
      const msg = err?.response?.data?.error ?? "Failed to update notes.";
      throw new Error(msg);
    }
  }, []);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const isAlreadyInQueue = useCallback(
    (slotId) => queues.some((q) => q.slotId === slotId),
    [queues],
  );

  const getActiveQueues = useCallback(() => queues, [queues]);

  const value = useMemo(
    () => ({
      queues,
      availableSlots,
      queueHistory,
      metrics,
      isLoading,
      error,
      historyError,
      metricsError,
      fetchActiveQueues,
      fetchAvailableSlots,
      fetchQueueHistory,
      fetchMetrics,
      joinQueue,
      leaveQueue,
      updateQueueNotes,
      isAlreadyInQueue,
      getActiveQueues,
    }),
    [
      queues,
      availableSlots,
      queueHistory,
      metrics,
      isLoading,
      error,
      historyError,
      metricsError,
      fetchActiveQueues,
      fetchAvailableSlots,
      fetchQueueHistory,
      fetchMetrics,
      joinQueue,
      leaveQueue,
      updateQueueNotes,
      isAlreadyInQueue,
      getActiveQueues,
    ],
  );

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}
