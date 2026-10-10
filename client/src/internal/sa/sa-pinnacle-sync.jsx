import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
// Supplies the .admin-dashboard-with-sidebar / .admin-dashboard-main shell
// classes and their <=1024px mobile-header offset. Lazy-loaded route, so it
// needs its own import.
import "../../pages/admin/adm-dashboard.css";
import "./sa-pinnacle-sync.css";
import SuperadminPageShell from "./SuperadminPageShell";
import PageHeader from "../../components/PageHeader";
import { formatManilaDateTime } from "../../utils/dateTime";
import api from "../../utils/api";

// ── Icons ──────────────────────────────────────────────────────────────────────
const DatabaseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" fill="none" />
    <path d="M21 5v6c0 1.66-4.03 3-9 3S3 12.66 3 11V5" fill="none" />
    <path d="M21 11v6c0 1.66-4.03 3-9 3S3 18.66 3 17v-6" fill="none" />
  </svg>
);
const UsersIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1.2rem", height: "1.2rem" }}
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const GearIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);
const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);
const ZapIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);
const AlertTriangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
  </svg>
);
const ArrowUpIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);
const ArrowDownIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);
const CheckCircleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ClockIconSm = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ width: "1rem", height: "1rem" }}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const NOT_CONNECTED_TEXT =
  "No school records system is connected yet. You can save the connection settings now; Sync Now and Test Connection will report the connection status.";

const LOG_STATUS_LABEL = { success: "Success", failed: "Not connected", pending: "Pending" };

export default function SuperadminPinnacleSync() {
  const { user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState("configuration");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStats, setSyncStats] = useState({ total: 0, students: 0, professors: 0, admins: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadStats = useCallback(async () => {
    const { data: s } = await api.get("/admin/pinnacle-sync/stats");
    setSyncStats({ total: s.total, students: s.students, professors: s.professors, admins: s.admins });
    setRecentLogs(s.recentLogs ?? []);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      try {
        const [{ data: cfg }] = await Promise.all([
          api.get("/admin/pinnacle-sync/config"),
          loadStats(),
        ]);
        setApiUrl(cfg.apiUrl ?? "");
        setApiKeySet(!!cfg.apiKeySet);
        setSyncInterval(cfg.syncInterval ?? 60);
        setSyncEnabled(!!cfg.syncEnabled);
      } catch (err) {
        toast.error(err?.response?.data?.error || "Couldn't load the sync settings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authUser, loadStats]);

  const handleSaveConfiguration = async () => {
    const url = apiUrl.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) {
      toast.error("Enter a valid URL starting with http:// or https://");
      return;
    }
    const interval = Number(syncInterval);
    if (!Number.isInteger(interval) || interval < 15 || interval > 1440) {
      toast.error("Auto-sync interval must be between 15 and 1440 minutes");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/pinnacle-sync/config", { apiUrl: url, apiKey, syncInterval: interval, syncEnabled });
      if (apiKey.trim()) setApiKeySet(true);
      setApiKey("");
      toast.success("Sync settings saved");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save the sync settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/admin/pinnacle-sync/test");
      if (data.connected) toast.success(data.message || "Connection successful");
      else toast.warning(data.message || NOT_CONNECTED_TEXT);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Couldn't test the connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await api.post("/admin/pinnacle-sync/trigger");
      toast.success("Sync complete");
    } catch (err) {
      // 501 = no integration connected; the attempt is still logged server-side.
      if (err?.response?.status === 501) toast.warning(err.response.data?.error || NOT_CONNECTED_TEXT);
      else toast.error(err?.response?.data?.error || "Sync failed");
    } finally {
      try { await loadStats(); } catch { /* history refresh is best-effort */ }
      setSyncing(false);
    }
  };

  const tabs = [
    { key: "configuration", label: "Configuration", icon: <GearIcon /> },
    { key: "sync-control", label: "Sync Control", icon: <RefreshIcon /> },
    { key: "history", label: "Sync History", icon: <ClockIconSm /> },
  ];

  return (
    <SuperadminPageShell outerClassName="admin-dashboard-with-sidebar" mainClassName="admin-dashboard-main">
      <div className="aps-page">
        <div className="aps-page-header">
          <PageHeader
            breadcrumb={
              <Link to="/system/dashboard" className="page-breadcrumb-link">
                <ChevronLeft />Home
              </Link>
            }
            icon={<DatabaseIcon />}
            iconClassName="aps-title-icon"
            title="Manual Sync"
            subtitle="Sync user accounts from the school's records system"
            headerClassName="aps-header-block"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="aps-title-section"
            titleClassName="aps-page-title"
            subtitleClassName="aps-page-subtitle"
          />
          <div className="aps-sync-badge aps-sync-badge--disabled">
            <span className="aps-sync-dot"></span>
            Not connected
          </div>
        </div>

        <div className="aps-alert aps-alert--warning">
          <AlertTriangleIcon />
          <span>{NOT_CONNECTED_TEXT}</span>
        </div>

        <div className="aps-stats-grid">
          {[
            { label: "Total Accounts", value: syncStats.total, color: "aps-stat-blue" },
            { label: "Students", value: syncStats.students, color: "aps-stat-green" },
            { label: "Faculty", value: syncStats.professors, color: "aps-stat-purple" },
            { label: "Admins", value: syncStats.admins, color: "aps-stat-orange" },
          ].map((s) => (
            <div key={s.label} className="aps-stat-card">
              <div className={`aps-stat-icon ${s.color}`}><UsersIcon /></div>
              <p className="aps-stat-label">{s.label}</p>
              <p className="aps-stat-value">{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        <div className="aps-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`aps-tab-btn ${activeTab === tab.key ? "aps-tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "configuration" && (
          <div className="aps-panel">
            <div className="aps-panel-header">
              <h2 className="aps-panel-title">Connection Settings</h2>
              <p className="aps-panel-subtitle">Saved now, used once the school's records system is connected</p>
            </div>

            <div className="aps-form-group">
              <label className="aps-label">API URL</label>
              <input
                type="text"
                className="aps-input"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://records.example.edu.ph/api"
              />
              <p className="aps-hint">Base address of the school's records system</p>
            </div>

            <div className="aps-form-group">
              <label className="aps-label">API Key</label>
              <input
                type="password"
                className="aps-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKeySet ? "Key saved — leave blank to keep it" : "Enter the access key"}
                autoComplete="new-password"
              />
              <p className="aps-hint">
                Access key provided by the school
                {apiKeySet ? " (a key is stored; it is never shown again)" : ""}
              </p>
            </div>

            <div className="aps-form-group">
              <label className="aps-label">Auto-Sync Interval (minutes)</label>
              <input
                type="number"
                className="aps-input aps-input--sm"
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                min={15}
                max={1440}
              />
              <p className="aps-hint">How often to sync automatically once connected (15 min – 24 hours)</p>
            </div>

            <div className="aps-toggle-card">
              <div>
                <p className="aps-toggle-title">Enable Automatic Sync</p>
                <p className="aps-toggle-desc">
                  When connected, OAMS will keep accounts up to date from the school's records. Saved with the settings above.
                </p>
              </div>
              <button
                className={`aps-toggle-btn ${syncEnabled ? "aps-toggle-btn--on" : ""}`}
                onClick={() => setSyncEnabled((v) => !v)}
                aria-label="Toggle automatic sync"
                aria-pressed={syncEnabled}
              >
                <span className="aps-toggle-thumb"></span>
              </button>
            </div>

            <div className="aps-panel-actions">
              <button className="aps-btn-primary" onClick={handleSaveConfiguration} disabled={saving}>
                <GearIcon /> {saving ? "Saving…" : "Save Settings"}
              </button>
              <button className="aps-btn-secondary" onClick={handleTestConnection} disabled={testing}>
                <ZapIcon /> {testing ? "Testing…" : "Test Connection"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "sync-control" && (
          <div className="aps-panel">
            <div className="aps-panel-header">
              <h2 className="aps-panel-title">Run a Sync</h2>
              <p className="aps-panel-subtitle">Pull the latest user accounts from the school's records now</p>
            </div>

            <button
              className={`aps-sync-now-btn ${syncing ? "aps-sync-now-btn--loading" : ""}`}
              onClick={handleSyncNow}
              disabled={syncing}
            >
              <RefreshIcon />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>

            <div className="aps-how-it-works">
              <h3 className="aps-how-title">What a sync does</h3>
              <ul className="aps-how-list">
                <li><ArrowUpIcon /> Fetches the latest student, faculty and staff records</li>
                <li><ArrowDownIcon /> Adds new accounts and updates existing ones in OAMS</li>
                <li><RefreshIcon /> Runs automatically every {syncInterval} minutes when enabled</li>
                <li><CheckCircleIcon /> Every attempt is recorded in Sync History</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="aps-panel">
            <div className="aps-panel-header">
              <h2 className="aps-panel-title">Sync History</h2>
              <p className="aps-panel-subtitle">The 10 most recent sync attempts</p>
            </div>

            {recentLogs.length === 0 ? (
              <div className="aps-empty-state">
                <DatabaseIcon />
                <h3 className="aps-empty-title">No sync attempts yet</h3>
                <p className="aps-empty-desc">Run Sync Now from the Sync Control tab and the attempt will appear here.</p>
              </div>
            ) : (
              <ul className="aps-log-list">
                {recentLogs.map((log) => (
                  <li key={log.id} className="aps-log-item">
                    <span className={`aps-log-status aps-log-status--${log.status}`}>
                      {LOG_STATUS_LABEL[log.status] ?? log.status}
                    </span>
                    <span className="aps-log-type">{log.type === "profile" ? "User accounts" : log.type}</span>
                    <span className="aps-log-time">{log.syncedAt ? formatManilaDateTime(log.syncedAt) : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SuperadminPageShell>
  );
}
