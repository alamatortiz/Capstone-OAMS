import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../utils/api";
import "./QueueJoinQrDisplay.css";

// The host-side half of on-site queueing: the code a secretary or faculty
// member puts on screen for students to scan.
//
// It re-fetches on an interval because the code is a short-lived credential,
// not a poster. That rotation is the whole point -- a static code could be
// photographed once and shared, letting people "join on-site" from home,
// which is exactly what the panel asked us to stop.
//
// `apiBase` lets the same component serve both hosts ("admin" today,
// "faculty" once delegation lands) without forking.
export default function QueueJoinQrDisplay({ slotId, apiBase = "admin", onError }) {
  const [token, setToken] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post(`/${apiBase}/queue-hosting/${slotId}/qr-token`);
      setToken(res.data.token);
      setExpired(false);
      setError("");
      clearTimeout(timerRef.current);
      // Re-fetch slightly before the server-side TTL so a student mid-scan
      // at the moment of rotation still lands on a valid code.
      timerRef.current = setTimeout(() => setExpired(true), res.data.rotateAfterMs ?? 45000);
    } catch (err) {
      const msg =
        err.response?.data?.error ?? "Couldn't load the join code. Try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [slotId, apiBase, onError]);

  useEffect(() => {
    fetchToken();
    return () => clearTimeout(timerRef.current);
  }, [fetchToken]);

  // When `expired` flips, pull the next code immediately. Split from the
  // timer itself so a manual refresh and the automatic one share one path.
  useEffect(() => {
    if (expired) fetchToken();
  }, [expired, fetchToken]);

  // A laptop lid closing or a phone sleeping suspends timers, so the screen
  // can come back showing a long-dead code with no indication it's stale.
  // Re-fetch whenever the tab becomes visible or regains focus.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") fetchToken();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
    };
  }, [fetchToken]);

  if (error) {
    return (
      <div className="qjq-wrap qjq-wrap--error">
        <p className="qjq-error">{error}</p>
        <button type="button" className="qjq-refresh" onClick={fetchToken}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="qjq-wrap">
      <div className="qjq-code" aria-live="polite">
        {token && !loading ? (
          <QRCodeSVG value={token} size={200} level="M" includeMargin />
        ) : (
          <div className="qjq-placeholder" role="status">
            Loading code…
          </div>
        )}
      </div>
      <p className="qjq-hint">
        Students scan this to join. The code refreshes automatically.
      </p>
      <button
        type="button"
        className="qjq-refresh"
        onClick={fetchToken}
        disabled={loading}
      >
        {loading ? "Refreshing…" : "Refresh code"}
      </button>
    </div>
  );
}
