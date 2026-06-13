import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import QueueContext from "./QueueContextBase";

const DEFAULT_METRICS = {
  totalQueuesJoined: 0,
  totalQueuesCompleted: 0,
  totalQueuesCancelled: 0,
  averageWaitTime: "—",
  totalTimeInQueues: "0 min",
  mostUsedService: "—",
};

export function QueueProvider({ children }) {
  const { user } = useAuth();

  const [queues, setQueues] = useState([]); // active (waiting/serving)
  const [availableSlots, setAvailableSlots] = useState([]); // open slots today
  const [queueHistory, setQueueHistory] = useState([]); // completed/cancelled entries
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch active queues for the logged-in student ─────────────────────────
  const fetchActiveQueues = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get("/student/queues/active");
      setQueues(data.queues ?? []);
    } catch (err) {
      console.error("fetchActiveQueues error:", err);
      setError("Failed to load your active queues.");
    }
  }, []);

  // ── Fetch all open slots for today ────────────────────────────────────────
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

  // ── Fetch completed/cancelled queue history ───────────────────────────────
  const fetchQueueHistory = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/history");
      setQueueHistory(data.history ?? []);
    } catch (err) {
      console.error("fetchQueueHistory error:", err);
      // Non-fatal — history tab will just show empty state
    }
  }, []);

  // ── Fetch aggregate analytics ─────────────────────────────────────────────
  const fetchQueueMetrics = useCallback(async () => {
    try {
      const { data } = await api.get("/student/queues/metrics");
      setMetrics({ ...DEFAULT_METRICS, ...data });
    } catch (err) {
      console.error("fetchQueueMetrics error:", err);
      // Non-fatal — analytics tab will show defaults
    }
  }, []);

  // ── Reset and re-fetch whenever the logged-in user changes ───────────────
  // This prevents User 1's stale queues from leaking into User 2's session.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      // Clear previous user's data immediately before fetching
      setQueues([]);
      setAvailableSlots([]);
      setQueueHistory([]);
      setMetrics(DEFAULT_METRICS);
      setError(null);

      if (!user?.userId) {
        // No logged-in user — just stop loading, leave state empty
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([
        fetchActiveQueues(),
        fetchAvailableSlots(),
        fetchQueueHistory(),
        fetchQueueMetrics(),
      ]);
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]); // Re-run only when the actual user identity changes

  // ── Re-fetch when user returns to the tab ────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchActiveQueues();
        fetchAvailableSlots();
        fetchQueueHistory();
        fetchQueueMetrics();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    user?.userId,
    fetchActiveQueues,
    fetchAvailableSlots,
    fetchQueueHistory,
    fetchQueueMetrics,
  ]);

  // ── Join a queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(
    async (slotId) => {
      try {
        const { data } = await api.post("/student/queues/join", { slotId });
        // Add to active queues
        setQueues((prev) => [...prev, data.queue]);
        // Refresh slot counts and re-fetch active queues to get accurate position
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
        // Remove from active queues optimistically
        setQueues((prev) => prev.filter((q) => q.queueId !== queueId));
        // Refresh available slots so counts update, and pull in the new history entry
        await fetchAvailableSlots();
        await fetchQueueHistory();
        await fetchQueueMetrics();
      } catch (err) {
        const msg =
          err?.response?.data?.error ??
          "Failed to leave the queue. Please try again.";
        throw new Error(msg);
      }
    },
    [fetchAvailableSlots, fetchQueueHistory, fetchQueueMetrics],
  );

  // Alias — some pages refer to "cancelling" a queue rather than "leaving" it.
  // Behaviour is identical: only valid while the entry is still 'waiting'.
  const cancelQueue = leaveQueue;

  // ── Update the "concern" / notes text on an active queue entry ───────────
  const updateQueueNotes = useCallback(async (queueId, notes) => {
    try {
      await api.patch(`/student/queues/${queueId}/notes`, { notes });
      setQueues((prev) =>
        prev.map((q) => (q.queueId === queueId ? { ...q, notes } : q)),
      );
    } catch (err) {
      const msg =
        err?.response?.data?.error ??
        "Failed to update your concern. Please try again.";
      throw new Error(msg);
    }
  }, []);

  // ── Derived helper ────────────────────────────────────────────────────────
  // Returns true if the student already has a waiting/serving entry for a slot
  const isAlreadyInQueue = useCallback(
    (slotId) => queues.some((q) => q.slotId === slotId),
    [queues],
  );

  // Backwards-compatible alias — StudentDashboard calls getActiveQueues()
  const getActiveQueues = useCallback(() => queues, [queues]);

  // Backwards-compatible alias — queue-tracking.jsx calls getQueueMetrics()
  const getQueueMetrics = useCallback(() => metrics, [metrics]);

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
      fetchQueueMetrics,
      joinQueue,
      leaveQueue,
      cancelQueue,
      updateQueueNotes,
      isAlreadyInQueue,
      getActiveQueues,
      getQueueMetrics,
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
      fetchQueueMetrics,
      joinQueue,
      leaveQueue,
      cancelQueue,
      updateQueueNotes,
      isAlreadyInQueue,
      getActiveQueues,
      getQueueMetrics,
    ],
  );

  return (
    <QueueContext.Provider value={value}>{children}</QueueContext.Provider>
  );
}
