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
  // Keyed by departmentId -- each college has its own external survey link.
  const [urlsByDept, setUrlsByDept] = useState({});
  const [departments, setDepartments] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!authUser) return;
    api
      .get("/admin/settings/satisfaction-survey")
      .then((res) => {
        const depts = res.data?.departments ?? [];
        setDepartments(depts);
        setUrlsByDept(
          Object.fromEntries(depts.map((d) => [d.departmentId, d.surveyUrl || ""])),
        );
      })
      .catch((err) => console.error("Failed to load satisfaction survey config:", err))
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleSave = async (departmentId) => {
    setSavingId(departmentId);
    try {
      const surveyUrl = (urlsByDept[departmentId] ?? "").trim();
      const res = await api.put(
        `/admin/settings/satisfaction-survey/${departmentId}`,
        { surveyUrl },
      );
      setUrlsByDept((prev) => ({ ...prev, [departmentId]: res.data.surveyUrl || "" }));
      setMessage({ type: "success", text: "Saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.error ?? "Failed to save.",
      });
    } finally {
      setSavingId(null);
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
                  Link students to each department's own external
                  satisfaction survey after a completed service
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
            <h2 className="aps-panel-title">Survey Links by Department</h2>
            <p className="aps-panel-subtitle">
              Each college has its own link shown after a queue is completed
              or a document is claimed in that department. OAMS doesn't host
              or store responses — this only points students to the external
              survey. Leave a field blank to hide the prompt for that
              department.
            </p>
          </div>

          <div className="aps-dept-list">
            {loading && (
              <p className="aps-hint">Loading departments…</p>
            )}
            {!loading && departments.length === 0 && (
              <p className="aps-hint">No departments found.</p>
            )}
            {departments.map((dept) => (
              <div className="aps-dept-row" key={dept.departmentId}>
                <div className="aps-dept-row-label">
                  <span className="aps-dept-abbrev">{dept.departmentAbbreviation}</span>
                  <span className="aps-dept-name">{dept.departmentName}</span>
                </div>
                <input
                  type="text"
                  className="aps-input"
                  value={urlsByDept[dept.departmentId] ?? ""}
                  onChange={(e) =>
                    setUrlsByDept((prev) => ({
                      ...prev,
                      [dept.departmentId]: e.target.value,
                    }))
                  }
                  placeholder="https://forms.example.com/your-survey"
                />
                <button
                  className="aps-btn-primary aps-dept-save-btn"
                  onClick={() => handleSave(dept.departmentId)}
                  disabled={savingId === dept.departmentId}
                >
                  {savingId === dept.departmentId ? "Saving..." : "Save"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SuperadminPageShell>
  );
}
