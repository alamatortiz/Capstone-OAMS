import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";
import api from "../utils/api";
import { useAuth } from "./AuthContext";
import { connectSocket, disconnectSocket } from "../utils/socket";

// Live updates are pushed over WebSocket; this is only a safety-net poll
// in case a socket event is missed or the connection drops silently.
const FALLBACK_POLL_INTERVAL_MS = 45000;

// Available slots get their own, shorter poll: a student merely *browsing*
// a cross-college service (not yet joined) isn't in that service's owning
// department's socket room, so they'd otherwise only see capacity/pause
// changes via the slower 45s fallback above.
const AVAILABLE_SLOTS_POLL_INTERVAL_MS = 15000;

const QueueContext = createContext<any>(undefined);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();

  const [queues, setQueues] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [queueHistory, setQueueHistory] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQueuesError, setActiveQueuesError] = useState<string | null>(null);
  const [availableSlotsError, setAvailableSlotsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const prevQueuesRef = useRef(new Map<any, any>());
  const hasLoadedOnceRef = useRef(false);
  const queuesRef = useRef<any[]>([]);
  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);

  const activeQueuesRequestIdRef = useRef(0);
  const availableSlotsRequestIdRef = useRef(0);

  const fetchQueueHistory = useCallback(async (): Promise<any[]> => {
    try {
      const { data } = await api.get("/student/queues/history");
      const history: any[] = data.history ?? [];
      setQueueHistory(history);
      setHistoryError(null);
      return history;
    } catch (err) {
      console.error("fetchQueueHistory error:", err);
      setHistoryError("Failed to load your queue history.");
      return [];
    }
  }, []);

  const notifyQueueTransitions = useCallback(async (nextQueues: any[]) => {
    const prevMap = prevQueuesRef.current;

    for (const q of nextQueues) {
      const prev = prevMap.get(q.queueId);
      if (!prev) continue;

      if (prev.status === "waiting" && q.status === "serving") {
        Toast.show({ type: "success", text1: `It's your turn for ${q.serviceName}!`, text2: "Please proceed to the designated location." });
      }
      if (!prev.arrivedAt && q.arrivedAt) {
        Toast.show({ type: "success", text1: `You are now being served for ${q.serviceName}.` });
      }
      if (prev.status === "serving" && q.status === "waiting") {
        Toast.show({ type: "info", text1: `Your call for ${q.serviceName} was reverted`, text2: "The queue was paused. You're still in line." });
      }
      if (prev.slotStatus !== "paused" && q.slotStatus === "paused") {
        Toast.show({
          type: "info",
          text1: `The queue for ${q.serviceName} has been paused`,
          text2: q.slotPauseReason ?? "Please wait.",
        });
      }
      if (prev.slotStatus === "paused" && q.slotStatus === "open") {
        Toast.show({ type: "success", text1: `The queue for ${q.serviceName} has resumed.` });
      }
      if (prev.slotStatus !== "full" && q.slotStatus === "full") {
        Toast.show({ type: "info", text1: `The queue for ${q.serviceName} is now full.`, text2: "New students can no longer join, but you'll still be served." });
      }
      if (prev.slotStatus !== "expired" && q.slotStatus === "expired") {
        Toast.show({ type: "info", text1: `The queue for ${q.serviceName} is closed for new joins.`, text2: "Hours ended, but you'll still be served." });
      }
    }

    const nextIds = new Set(nextQueues.map((q) => q.queueId));
    const vanishedServing = [...prevMap.entries()].filter(
      ([queueId, prev]) => prev.status === "serving" && !nextIds.has(queueId),
    );

    prevMap.clear();
    for (const q of nextQueues) prevMap.set(q.queueId, q);

    if (vanishedServing.length > 0) {
      const history = await fetchQueueHistory();
      for (const [queueId, prev] of vanishedServing) {
        const resolved = history.find((h) => h.id === queueId);
        if (resolved?.status === "no_show") {
          Toast.show({ type: "error", text1: `You were marked as a no-show for ${prev.serviceName}`, text2: "Your line was voided." });
        } else if (resolved?.status === "cancelled") {
          // leaveQueue() already shows its own toast; stay silent here.
        } else {
          Toast.show({ type: "success", text1: `You've been served for ${prev.serviceName}. Thank you!` });
        }
      }
    }
  }, [fetchQueueHistory]);

  const fetchActiveQueues = useCallback(async () => {
    const requestId = ++activeQueuesRequestIdRef.current;
    setActiveQueuesError(null);
    try {
      const { data } = await api.get("/student/queues/active");
      if (requestId !== activeQueuesRequestIdRef.current) return;
      const next: any[] = data.queues ?? [];
      if (hasLoadedOnceRef.current) {
        notifyQueueTransitions(next);
      } else {
        prevQueuesRef.current = new Map(next.map((q: any) => [q.queueId, q]));
        hasLoadedOnceRef.current = true;
      }
      setQueues(next);
    } catch (err) {
      if (requestId !== activeQueuesRequestIdRef.current) return;
      console.error("fetchActiveQueues error:", err);
      setActiveQueuesError("Failed to load your active queues.");
    }
  }, [notifyQueueTransitions]);

  const fetchAvailableSlots = useCallback(async () => {
    const requestId = ++availableSlotsRequestIdRef.current;
    setAvailableSlotsError(null);
    try {
      const { data } = await api.get("/student/queues/available");
      if (requestId !== availableSlotsRequestIdRef.current) return;
      setAvailableSlots(data.slots ?? []);
    } catch (err) {
      if (requestId !== availableSlotsRequestIdRef.current) return;
      console.error("fetchAvailableSlots error:", err);
      setAvailableSlotsError("Failed to load available queues.");
    }
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setQueues([]);
      setAvailableSlots([]);
      setQueueHistory([]);
      setMetrics(null);
      setActiveQueuesError(null);
      setAvailableSlotsError(null);
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

  // ── Re-fetch when app returns to foreground (RN equivalent of tab focus) ──
  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchActiveQueues();
        fetchAvailableSlots();
      }
    });
    return () => sub.remove();
  }, [user?.userId, fetchActiveQueues, fetchAvailableSlots]);

  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        fetchActiveQueues();
      }
    }, FALLBACK_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.userId, fetchActiveQueues]);

  useEffect(() => {
    if (!user?.userId || user.role !== "student") return;
    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        fetchAvailableSlots();
      }
    }, AVAILABLE_SLOTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.userId, fetchAvailableSlots]);

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
      "queue:arrived",
      "queue:served",
      "queue:no-show",
      "queue:slot-status",
      "queue:student-joined",
      "queue:student-left",
    ];
    events.forEach((event) => socket.on(event, refetch));

    const onQueueStopped = (payload: any) => {
      if (payload.studentId !== user.userId) return;
      const stoppedQueue = queuesRef.current.find((q) => q.queueId === payload.queueId);
      Toast.show({
        type: "error",
        text1: `Your queue${stoppedQueue ? ` for ${stoppedQueue.serviceName}` : ""} was stopped by the admin.`,
        text2: `Reason: ${payload.reason}`,
      });
      refetch();
    };
    socket.on("queue:queue-stopped", onQueueStopped);

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

  useEffect(() => {
    if (!token) disconnectSocket();
  }, [token]);

  const joinQueue = useCallback(
    async (slotId: any, notes: any) => {
      try {
        const { data } = await api.post("/student/queues/join", { slotId, notes });
        setQueues((prev) => [...prev, data.queue]);
        await fetchAvailableSlots();
        await fetchActiveQueues();
        return data.queue;
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? "Failed to join the queue. Please try again.";
        throw new Error(msg);
      }
    },
    [fetchAvailableSlots, fetchActiveQueues],
  );

  const leaveQueue = useCallback(
    async (queueId: any) => {
      try {
        await api.post(`/student/queues/${queueId}/leave`);
        setQueues((prev) => prev.filter((q) => q.queueId !== queueId));
        await fetchAvailableSlots();
        await fetchQueueHistory();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? "Failed to leave the queue. Please try again.";
        throw new Error(msg);
      }
    },
    [fetchAvailableSlots, fetchQueueHistory],
  );

  const updateQueueNotes = useCallback(async (queueId: any, notes: any) => {
    try {
      await api.patch(`/student/queues/${queueId}/notes`, { notes });
      setQueues((prev) => prev.map((q) => (q.queueId === queueId ? { ...q, notes } : q)));
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Failed to update notes.";
      throw new Error(msg);
    }
  }, []);

  const isAlreadyInQueue = useCallback(
    (slotId: any) => queues.some((q) => q.slotId === slotId),
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
      activeQueuesError,
      availableSlotsError,
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
      activeQueuesError,
      availableSlotsError,
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

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return ctx;
}
