import { useState, useEffect, useCallback } from "react";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { connectSocket } from "../utils/socket";

// Shared by admin_queue.tsx (queue monitoring) and admin_queue_hosting.tsx
// (queue lifecycle management) — both fetch the same GET /admin/queue-hosting
// data and drive the same pause/resume/close actions against it. Mirrors
// client/src/hooks/useAdminQueueHosting.js so the two platforms' event lists
// and business logic don't drift.
const QUEUE_HOSTING_EVENTS = [
  "queue:slot-opened",
  "queue:slot-status",
  "queue:called",
  "queue:arrived",
  "queue:served",
  "queue:no-show",
  "queue:student-joined",
  "queue:student-left",
  "queue:notes-updated",
];

type ReasonModal = { mode: "pause" | "close"; id: any } | null;

export function useAdminQueueHosting({ onLiveUpdate }: { onLiveUpdate?: () => void } = {}) {
  const { user: authUser, token } = useAuth();

  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting");
      setQueues(res.data.queues ?? []);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      Toast.show({ type: "error", text1: "Could not load queue data" });
      setError("Could not load queue data. Retrying automatically.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchQueues();
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchQueues]);

  useEffect(() => {
    if (!authUser || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const refetch = () => {
      fetchQueues();
      onLiveUpdate?.();
    };

    QUEUE_HOSTING_EVENTS.forEach((event) => socket.on(event, refetch));
    return () => {
      QUEUE_HOSTING_EVENTS.forEach((event) => socket.off(event, refetch));
    };
  }, [authUser, token, fetchQueues, onLiveUpdate]);

  const [reasonModal, setReasonModal] = useState<ReasonModal>(null);
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const handlePauseQueue = useCallback((id: any) => setReasonModal({ mode: "pause", id }), []);
  const handleCloseQueue = useCallback((id: any) => setReasonModal({ mode: "close", id }), []);

  const handleResumeQueue = useCallback(
    async (id: any) => {
      try {
        await api.patch(`/admin/queue-hosting/${id}/resume`);
        Toast.show({ type: "success", text1: "Queue resumed" });
        await fetchQueues();
      } catch (error: any) {
        Toast.show({ type: "error", text1: error?.response?.data?.error ?? "Failed to resume queue" });
      }
    },
    [fetchQueues],
  );

  const handleReasonConfirm = useCallback(
    async (reason: string) => {
      if (!reasonModal) return null;
      const { mode, id } = reasonModal;
      setReasonSubmitting(true);
      try {
        await api.patch(`/admin/queue-hosting/${id}/${mode}`, { reason });
        Toast.show({ type: mode === "pause" ? "info" : "success", text1: mode === "pause" ? "Queue paused" : "Queue stopped" });
        setReasonModal(null);
        await fetchQueues();
        return { mode, id };
      } catch (error: any) {
        Toast.show({ type: "error", text1: error?.response?.data?.error ?? `Failed to ${mode} queue` });
        return null;
      } finally {
        setReasonSubmitting(false);
      }
    },
    [reasonModal, fetchQueues],
  );

  return {
    queues,
    loading,
    error,
    fetchQueues,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue,
    handleResumeQueue,
    handleReasonConfirm,
  };
}
