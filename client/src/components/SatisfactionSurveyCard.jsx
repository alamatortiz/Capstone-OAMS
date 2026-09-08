import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api from "../utils/api";
import "./SatisfactionSurveyCard.css";

// Small, dismissible, non-blocking prompt pointing students to an external
// (not OAMS-hosted) satisfaction survey -- shown at the natural "service
// just completed" moments (a queue turning "completed", a document turning
// "claimed"), which otherwise pass silently with no takeover UI. OAMS never
// builds or stores the survey itself; this only ever hands out one
// admin-configured URL (see server_settings key "satisfaction_survey_url",
// managed from Superadmin > Satisfaction Survey).
//
// `endpointBase` picks which role's own read-only settings endpoint to call
// (each role router exposes its own copy, same pattern as e.g.
// NotificationBell's `endpointBase` prop) -- "student" | "professor".
export default function SatisfactionSurveyCard({ endpointBase }) {
  const [surveyUrl, setSurveyUrl] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/${endpointBase}/settings/satisfaction-survey`)
      .then((res) => {
        if (!cancelled) setSurveyUrl(res.data?.surveyUrl || "");
      })
      .catch(() => {
        // Silent -- an admin simply hasn't configured a survey link yet is
        // the overwhelmingly common case, not worth a toast/error state.
      });
    return () => {
      cancelled = true;
    };
  }, [endpointBase]);

  if (!surveyUrl || dismissed) return null;

  return (
    <div className="survey-card">
      <button
        type="button"
        className="survey-card-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="survey-card-body">
        <div className="survey-card-icon">
          <Star size={20} />
        </div>
        <div className="survey-card-text">
          <p className="survey-card-title">How was your experience?</p>
          <p className="survey-card-desc">
            Your feedback helps us improve — it only takes a minute.
          </p>
        </div>
      </div>

      <div className="survey-card-actions">
        <a
          className="survey-card-btn"
          href={surveyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Take the Survey
        </a>
        <div className="survey-card-qr">
          <QRCodeSVG value={surveyUrl} size={64} />
          <span className="survey-card-qr-label">or scan</span>
        </div>
      </div>
    </div>
  );
}
