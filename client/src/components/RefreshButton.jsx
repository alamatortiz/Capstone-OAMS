import { RefreshCw } from "lucide-react";
import "./RefreshButton.css";

// Manual fallback for pages that don't have live socket updates (Transaction
// History on all three roles, and the professor's Appointment Manager --
// see the per-page comments where this is used for why each one doesn't).
// Modeled on adm-queue.jsx's own .btn-refresh-queue icon button, generalized
// with a plain shared stylesheet instead of that page's blue-specific accent,
// since this needs to look right on green/purple/orange pages too.
export default function RefreshButton({ onClick, loading = false, label = "Refresh", className = "" }) {
  return (
    <button
      type="button"
      className={`refresh-btn ${className}`}
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
    >
      <RefreshCw className={`refresh-btn-icon${loading ? " refresh-btn-icon--spinning" : ""}`} />
    </button>
  );
}
