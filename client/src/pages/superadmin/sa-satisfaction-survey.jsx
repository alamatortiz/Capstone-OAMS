import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft, Star, AlertTriangle } from "lucide-react";
// Reuses the admin dashboard shell + Pinnacle Sync's own panel/form/button
// classes (aps-*) rather than forking a parallel stylesheet for what is
// visually the exact same "one settings panel" shape.
import "../admin/adm-dashboard.css";
import "./sa-pinnacle-sync.css";
import SuperadminPageShell from "../../components/SuperadminPageShell";
import api from "../../utils/api";

export default function SuperadminSatisfactionSurvey() {
  const { user: authUser } = useAuth();
  const [surveyUrl, setSurveyUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!authUser) return;
    api
      .get("/admin/settings/satisfaction-survey")
      .then((res) => setSurveyUrl(res.data?.surveyUrl || ""))
      .catch((err) => console.error("Failed to load satisfaction survey config:", err))
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put("/admin/settings/satisfaction-survey", {
        surveyUrl: surveyUrl.trim(),
      });
      setSurveyUrl(res.data.surveyUrl || "");
      setMessage({ type: "success", text: "Saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error ?? "Failed to save.",
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <SuperadminPageShell
      outerClassName="admin-dashboard-with-sidebar"
      mainClassName="admin-dashboard-main"
    >
      <div className="aps-page">
        <div className="aps-header-block">
          <div className="page-breadcrumb">
            <Link to="/superadmin/dashboard" className="page-breadcrumb-link">
              <ChevronLeft />
              Home
            </Link>
          </div>
          <div className="aps-page-header">
            <div className="aps-title-section">
              <div className="aps-title-icon">
                <Star />
              </div>
              <div>
                <h1 className="aps-page-title">Satisfaction Survey</h1>
                <p className="aps-page-subtitle">
                  Link students to an external satisfaction survey after a
                  completed service
                </p>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`aps-alert aps-alert--${message.type}`}>
            <AlertTriangle />
            <span>{message.text}</span>
          </div>
        )}

        <div className="aps-panel">
          <div className="aps-panel-header">
            <h2 className="aps-panel-title">Survey Link</h2>
            <p className="aps-panel-subtitle">
              One shared link shown to every student after a queue is
              completed or a document is claimed. OAMS doesn't host or store
              responses — this only points them to your external survey.
            </p>
          </div>

          <div className="aps-form-group">
            <label className="aps-label">Survey URL</label>
            <input
              type="text"
              className="aps-input"
              value={surveyUrl}
              onChange={(e) => setSurveyUrl(e.target.value)}
              placeholder="https://forms.example.com/your-survey"
              disabled={loading}
            />
            <p className="aps-hint">
              Shown as a "Take the Survey" button plus a QR code students can
              scan with another device. Leave blank to hide the prompt
              everywhere.
            </p>
          </div>

          <div className="aps-panel-actions">
            <button
              className="aps-btn-primary"
              onClick={handleSave}
              disabled={saving || loading}
            >
              <Star size={16} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </SuperadminPageShell>
  );
}
