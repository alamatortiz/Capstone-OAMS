import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import QueueContext from './QueueContextBase';

export function QueueProvider({ children }) {
  const { user } = useAuth();

  const [queues, setQueues] = useState([]);           // active (waiting/serving)
  const [availableSlots, setAvailableSlots] = useState([]); // open slots today
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch active queues for the logged-in student ─────────────────────────
  const fetchActiveQueues = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/student/queues/active');
      setQueues(data.queues ?? []);
    } catch (err) {
      console.error('fetchActiveQueues error:', err);
      setError('Failed to load your active queues.');
    }
  }, []);

  // ── Fetch all open slots for today ────────────────────────────────────────
  const fetchAvailableSlots = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/student/queues/available');
      setAvailableSlots(data.slots ?? []);
    } catch (err) {
      console.error('fetchAvailableSlots error:', err);
      setError('Failed to load available queues.');
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
      setError(null);

      if (!user?.userId) {
        // No logged-in user — just stop loading, leave state empty
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([fetchActiveQueues(), fetchAvailableSlots()]);
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]); // Re-run only when the actual user identity changes

  // ── Re-fetch when user returns to the tab ────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchActiveQueues();
        fetchAvailableSlots();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.userId, fetchActiveQueues, fetchAvailableSlots]);

  // ── Join a queue ──────────────────────────────────────────────────────────
  const joinQueue = useCallback(async (slotId) => {
    try {
      const { data } = await api.post('/student/queues/join', { slotId });
      // Add to active queues
      setQueues((prev) => [...prev, data.queue]);
      // Refresh slot counts and re-fetch active queues to get accurate position
      await fetchAvailableSlots();
      await fetchActiveQueues();
      return data.queue;
    } catch (err) {
      const msg =
        err?.response?.data?.error ?? 'Failed to join the queue. Please try again.';
      throw new Error(msg);
    }
  }, [fetchAvailableSlots, fetchActiveQueues]);

  // ── Leave a queue ─────────────────────────────────────────────────────────
  const leaveQueue = useCallback(async (queueId) => {
    try {
      await api.post(`/student/queues/${queueId}/leave`);
      // Remove from active queues optimistically
      setQueues((prev) => prev.filter((q) => q.queueId !== queueId));
      // Refresh available slots so counts update
      await fetchAvailableSlots();
    } catch (err) {
      const msg =
        err?.response?.data?.error ?? 'Failed to leave the queue. Please try again.';
      throw new Error(msg);
    }
  }, [fetchAvailableSlots]);

  // ── Derived helper ────────────────────────────────────────────────────────
  // Returns true if the student already has a waiting/serving entry for a slot
  const isAlreadyInQueue = useCallback(
    (slotId) => queues.some((q) => q.slotId === slotId),
    [queues],
  );

  // Backwards-compatible alias — StudentDashboard calls getActiveQueues()
  const getActiveQueues = useCallback(() => queues, [queues]);

  const value = useMemo(
    () => ({
      queues,
      availableSlots,
      isLoading,
      error,
      fetchActiveQueues,
      fetchAvailableSlots,
      joinQueue,
      leaveQueue,
      isAlreadyInQueue,
      getActiveQueues,
    }),
    [
      queues,
      availableSlots,
      isLoading,
      error,
      fetchActiveQueues,
      fetchAvailableSlots,
      joinQueue,
      leaveQueue,
      isAlreadyInQueue,
      getActiveQueues,
    ],
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}
