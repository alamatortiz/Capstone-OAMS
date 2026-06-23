import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import QueueContext from "./QueueContextBase";

// How often we poll the server for queue changes while the student is
// logged in. This is what makes admin actions (pause/resume/call-next/
// serve) show up on the student side without a manual refresh.
const POLL_INTERVAL_MS = 6000;

export function QueueProvider({ children }) {
  const { user } = useAuth();

  const [queues, setQueues] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Snapshot of queues from the previous poll, keyed by queueId. Used to
  // detect transitions (waiting -> serving, slot paused/resumed, etc.) so
  // we can notify the student even if they're not looking at the queue
  // status page right now.
  const prevQueuesRef = useRef(new Map());
  const hasLoadedOnceRef = useRef(false);

  // ── Detect status changes since the last poll and notify the student ──────
  const notifyQueueTransitions = useCallback((nextQueues) => {
    const prevMap = prevQueuesRef.current;

    for (const q of nextQueues) {
      const prev = prevMap.get(q.queueId);
      if (!prev) continue;

      if (prev.status === "waiting" && q.status === "serving") {
        toast.success(
          `It's your turn for ${q.serviceName}! Please proceed to the window.`,
          { duration: 8000 },
        );
      }
      if (prev.slotStatus !== "paused" && q.slotStatus === "paused") {
        toast.warning(
          `The queue for ${q.serviceName} has been paused by the admin. Please wait.`,
        );
      }
      if (prev.slotStatus === "paused" && q.slotStatus === "open") {
        toast.success(`The queue for ${q.serviceName} has resumed.`);
      }
    }

    // A queue that was "serving" and is no longer in the active list was
    // just marked as served by the admin.
    const nextIds = new Set(nextQueues.map((q) => q.queueId));
    for (const [queueId, prev] of prevMap.entries()) {
      if (prev.status === "serving" && !nextIds.has(queueId)) {
        toast.success(`You've been served for ${prev.serviceName}. Thank you!`);
      }
    }

    prevMap.clear();
    for (const q of nextQueues) prevMap.set(q.queueId, q);
  }, []);

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

  // ── Fetch queue history ───────────────────────────────────────────────────
  const fetchQueueHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/history");
      setQueueHistory(data.history ?? []);
    } catch (err) {
      console.error("fetchQueueHistory error:", err);
    }
  }, []);

  // ── Fetch metrics ─────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/metrics");
      setMetrics(data);
    } catch (err) {
      console.error("fetchMetrics error:", err);
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

  // ── Poll for live updates ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchActiveQueues();
        fetchAvailableSlots();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.userId, fetchActiveQueues, fetchAvailableSlots]);

  // ── Join a queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(
    async (slotId) => {
      try {
        const { data } = await api.post("/student/queues/join", { slotId });
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
