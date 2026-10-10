import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../utils/socket";

// Subscribes `refetch` to the given socket events for as long as the caller is
// mounted, and ALSO re-runs it whenever the socket (re)connects -- so a screen
// left open across a dropped connection or a dev server restart reconciles
// immediately instead of sitting stale until its 45s fallback poll. Mirrors the
// reconnect handling QueueProvider.jsx already does for students.
//
// `events` must be a stable reference (declare it at module scope, not inline)
// so this doesn't resubscribe on every render. `refetch` may change freely --
// it's read through a ref, so the latest one always runs without re-binding the
// listeners.
export function useLiveRefetch(events, refetch, { enabled = true } = {}) {
  const { user, token } = useAuth();
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  useEffect(() => {
    if (!enabled || !user?.userId || !token) return;
    const socket = connectSocket(token);
    if (!socket) return;

    const run = () => refetchRef.current?.();
    events.forEach((event) => socket.on(event, run));
    socket.on("connect", run);

    return () => {
      events.forEach((event) => socket.off(event, run));
      socket.off("connect", run);
    };
    // `events` is a stable module-level array at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.userId, token]);
}
