import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import "./OfflineBanner.css";

// "offline" until the browser reports a connection again, then briefly
// "back" so the user can refresh instead of the page force-reloading and
// wiping whatever they were in the middle of.
export default function OfflineBanner() {
  const [status, setStatus] = useState(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online",
  );

  useEffect(() => {
    const goOffline = () => setStatus("offline");
    const goOnline = () => setStatus((s) => (s === "offline" ? "back" : s));
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (status !== "back") return;
    const t = setTimeout(() => setStatus("online"), 15000);
    return () => clearTimeout(t);
  }, [status]);

  if (status === "online") return null;

  return (
    <div className={`offline-banner offline-banner--${status}`} role="status" aria-live="polite">
      {status === "offline" ? (
        <>
          <WifiOff size={16} />
          <span>You're offline. You're still signed in — changes won't save until your connection returns.</span>
        </>
      ) : (
        <>
          <Wifi size={16} />
          <span>Back online.</span>
          <button type="button" onClick={() => window.location.reload()}>Refresh data</button>
          <button type="button" className="offline-banner-dismiss" onClick={() => setStatus("online")}>Dismiss</button>
        </>
      )}
    </div>
  );
}
