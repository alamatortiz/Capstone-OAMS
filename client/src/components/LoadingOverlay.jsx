import pncLogo from "../assets/Pnc-Logo.png";
import "./LoadingOverlay.css";

// Full-viewport branded loader -- used both as the app-wide Suspense
// fallback (lazy-loaded routes) and for the post-login redirect delay in
// Login.jsx, so "the system is loading" always shows the same thing instead
// of a bare "Loading..." string.
export default function LoadingOverlay({ label = "Loading..." }) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-overlay-ring">
          <img src={pncLogo} alt="" className="loading-overlay-logo" />
        </div>
        <p className="loading-overlay-label">{label}</p>
      </div>
    </div>
  );
}
