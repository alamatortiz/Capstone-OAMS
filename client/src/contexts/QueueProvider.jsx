import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import QueueContext from "./QueueContextBase";

export function QueueProvider({ children }) {
  const { user } = useAuth();

  const [queues, setQueues] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [queueHistory, setQueueHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch active queues ───────────────────────────────────────────────────
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

      if (!user?.userId) {
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
    if (!user?.userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchActiveQueues();
        fetchAvailableSlots();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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
