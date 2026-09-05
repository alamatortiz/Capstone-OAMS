import { useNavigate } from "react-router-dom";
import {
  Home,
  RefreshCw,
  ServerCrash,
  MapPinOff,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import pncLogo from "../assets/Pnc-Logo.png";
import oamsLogo from "../assets/oams_logo.png";
import "./ErrorPage.css";

// Presets cover the common HTTP error codes so any future caller (a manual
// <ErrorPage code={503} /> during planned maintenance, say) gets sensible
// wording for free — the router itself only ever mounts the 404 case today.
const ERROR_PRESETS = {
  400: {
    title: "Bad Request",
    description:
      "That request didn't go through correctly. Please go back and try again.",
    icon: AlertTriangle,
  },
  401: {
    title: "Sign-In Required",
    description: "You need to sign in before you can view this page.",
    icon: ShieldOff,
  },
  403: {
    title: "Access Forbidden",
    description: "You don't have permission to access this resource.",
    icon: ShieldOff,
  },
  404: {
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist or has been moved.",
    icon: MapPinOff,
  },
  500: {
    title: "Internal Server Error",
    description:
      "Something went wrong on our end. Please try again or contact the system administrator.",
    icon: ServerCrash,
  },
  502: {
    title: "Bad Gateway",
    description:
      "The server didn't get a valid response while loading this page. Please try again in a moment.",
    icon: ServerCrash,
  },
  503: {
    title: "Service Unavailable",
    description:
      "The system is temporarily down for maintenance or is experiencing heavy load. Please try again shortly.",
    icon: ServerCrash,
  },
};

export default function ErrorPage({ code = 404, title, description }) {
  const navigate = useNavigate();
  const preset = ERROR_PRESETS[code] ?? ERROR_PRESETS[500];
  // 404 just means "you're in the wrong place" -- nothing actually broke --
  // so it gets the calmer, brand-green treatment. Everything else reads as
  // a real fault and gets the red treatment.
  const isSafe = code === 404;
  const Icon = preset.icon;

  return (
    <div className={`error-page ${isSafe ? "error-page--safe" : "error-page--fault"}`}>
      <div className="error-page-glow" aria-hidden="true" />

      <div className="error-page-logos">
        <img
          src={pncLogo}
          alt="University of Cabuyao"
          className="error-page-logo"
        />
        <img
          src={oamsLogo}
          alt="OAMS"
          className="error-page-logo error-page-logo--oams"
        />
      </div>

      <div className="error-page-card">
        <div className="error-page-icon-badge">
          <Icon className="error-page-icon" />
        </div>

        <p className="error-page-code">{code}</p>
        <h1 className="error-page-title">{title ?? preset.title}</h1>
        <p className="error-page-description">
          {description ?? preset.description}
        </p>

        <div className="error-page-actions">
          <button
            type="button"
            className="error-page-btn error-page-btn--primary"
            onClick={() => navigate("/")}
          >
            <Home size={16} />
            Go to Home
          </button>
          <button
            type="button"
            className="error-page-btn error-page-btn--outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
        </div>

        <p className="error-page-hint">
          If the problem persists, please contact the system administrator.
        </p>
      </div>

      <p className="error-page-footer">
        © 2026 University of Cabuyao (Pamantasan ng Cabuyao). All rights reserved.
      </p>
    </div>
  );
}
