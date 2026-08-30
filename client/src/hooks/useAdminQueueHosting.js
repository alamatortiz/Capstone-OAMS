import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { useLiveRefetch } from "./useLiveRefetch";

// Shared by adm-queue.jsx (queue monitoring) and adm-queue-hosting.jsx
// (queue lifecycle management) -- both fetch the same GET /admin/queue-hosting
// data and drive the same pause/resume/close actions against it. Centralizing
// the fetch, live-update socket wiring, and pause/resume/close flow here
// keeps them from drifting the way they previously did (e.g. queue:notes-
// updated was only wired up in one of the two pages).
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

export function useAdminQueueHosting({ onLiveUpdate } = {}) {
  const { user: authUser } = useAuth();

  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting");
      setQueues(res.data.queues ?? []);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Could not load queue data");
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

  // ── Live updates: refetch when a socket event affects this dept's queues,
  // and also on socket reconnect (server restart / dropped connection). ──
  useLiveRefetch(QUEUE_HOSTING_EVENTS, () => {
    fetchQueues();
    onLiveUpdate?.();
  });

  // ── Pause/Resume/Close (shared reason-modal flow) ─────────────────────────
  const [reasonModal, setReasonModal] = useState(null); // { mode: 'pause'|'close', id }
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  const handlePauseQueue = useCallback((id) => setReasonModal({ mode: "pause", id }), []);
  const handleCloseQueue = useCallback((id) => setReasonModal({ mode: "close", id }), []);

  const handleResumeQueue = useCallback(
    async (id) => {
      try {
        await api.patch(`/admin/queue-hosting/${id}/resume`);
        toast.success("Queue resumed");
        await fetchQueues();
      } catch (error) {
        toast.error(error?.response?.data?.error ?? "Failed to resume queue");
      }
    },
    [fetchQueues],
  );

  // Returns { mode, id } on success so callers can react to a completed
  // close (e.g. exit a detail view that no longer has anything to show), or
  // null on failure.
  const handleReasonConfirm = useCallback(
    async (reason) => {
      if (!reasonModal) return null;
      const { mode, id } = reasonModal;
      setReasonSubmitting(true);
      try {
        await api.patch(`/admin/queue-hosting/${id}/${mode}`, { reason });
        toast[mode === "pause" ? "message" : "success"](
          mode === "pause" ? "Queue paused" : "Queue stopped",
        );
        setReasonModal(null);
        await fetchQueues();
        return { mode, id };
      } catch (error) {
        toast.error(error?.response?.data?.error ?? `Failed to ${mode} queue`);
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
