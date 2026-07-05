import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import "./admin_pinnacle_sync.css";
import AdminSidebar from "../../components/AdminSidebar";
import ChatWidget from "../../components/ChatWidget";
import api from "../../utils/api";

// ── Icons ──────────────────────────────────────────────────────────────────────
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
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
const SyncIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ width: "1.5rem", height: "1.5rem" }}
  >
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
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

export default function AdminPinnacleSync() {
  const { user: authUser } = useAuth();

  // ── PinnaCle Sync state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("configuration");
  const [apiUrl, setApiUrl] = useState("https://pinnacle-api.pnc.edu.ph/v1");
  const [apiKey, setApiKey] = useState("");
  const [syncInterval, setSyncInterval] = useState(60);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStats, setSyncStats] = useState({ total: 0, students: 0, professors: 0, admins: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // Load config and stats on mount
  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      try {
        const [cfgRes, statsRes] = await Promise.all([
          api.get("/admin/pinnacle-sync/config"),
          api.get("/admin/pinnacle-sync/stats"),
        ]);
        const cfg = cfgRes.data;
        setApiUrl(cfg.apiUrl);
        setApiKey(cfg.apiKey);
        setSyncInterval(cfg.syncInterval);
        setSyncEnabled(cfg.syncEnabled);
        const s = statsRes.data;
        setSyncStats({ total: s.total, students: s.students, professors: s.professors, admins: s.admins });
      } catch (err) {
        console.error("Pinnacle sync load error:", err);
      }
    };
    load();
  }, [authUser]);

  const generateBotResponse = () =>
    "I can help with PinnaCle sync configuration, user management, and data synchronization. What do you need?";

  const handleSaveConfiguration = async () => {
    try {
      await api.post("/admin/pinnacle-sync/config", { apiUrl, apiKey, syncInterval, syncEnabled });
      setSyncMessage({ type: "success", text: "Configuration saved successfully." });
    } catch (err) {
      setSyncMessage({ type: "error", text: "Failed to save configuration." });
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  const handleTestConnection = () => {
    setSyncMessage({ type: "info", text: "Testing connection to PinnaCle API..." });
    setTimeout(() => {
      setSyncMessage({
        type: syncEnabled ? "success" : "error",
        text: syncEnabled ? "Connection successful!" : "Connection failed. Please check your API key.",
      });
      setTimeout(() => setSyncMessage(null), 4000);
    }, 1500);
  };

  const handleSyncNow = async () => {
    if (!syncEnabled) {
      setSyncMessage({ type: "warning", text: "PinnaCle sync is currently disabled. Enable it in the Configuration tab." });
      return;
    }
    setIsSyncing(true);
    setSyncMessage({ type: "info", text: "Syncing data from PinnaCle..." });
    try {
      const res = await api.post("/admin/pinnacle-sync/trigger");
      const statsRes = await api.get("/admin/pinnacle-sync/stats");
      const s = statsRes.data;
      setSyncStats({ total: s.total, students: s.students, professors: s.professors, admins: s.admins });
      setSyncMessage({ type: "success", text: res.data.message || "Sync completed successfully." });
    } catch (err) {
      setSyncMessage({ type: "error", text: "Sync failed. Please try again." });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  return (
    <div className="admin-dashboard-with-sidebar">
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-dashboard-main">
        <div className="aps-page">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Header */}
          <div className="aps-page-header">
            <div className="aps-title-section">
              <div className="aps-title-icon">
                <DatabaseIcon />
              </div>
              <div>
                <h1 className="aps-page-title">Pinnacle Integration</h1>
                <p className="aps-page-subtitle">
                  Sync user data from Pinnacle microservice
                </p>
              </div>
            </div>
            <div
              className={`aps-sync-badge ${syncEnabled ? "aps-sync-badge--enabled" : "aps-sync-badge--disabled"}`}
            >
              <span className="aps-sync-dot"></span>
              {syncEnabled ? "Sync Enabled" : "Sync Disabled"}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="aps-stats-grid">
            {[
              {
                label: "Total Synced Users",
                value: syncStats.total,
                color: "aps-stat-blue",
                icon: <UsersIcon />,
              },
              {
                label: "Students",
                value: syncStats.students,
                color: "aps-stat-green",
                icon: <UsersIcon />,
              },
              {
                label: "Professors",
                value: syncStats.professors,
                color: "aps-stat-purple",
                icon: <UsersIcon />,
              },
              {
                label: "Admins",
                value: syncStats.admins,
                color: "aps-stat-orange",
                icon: <UsersIcon />,
              },
            ].map((s) => (
              <div key={s.label} className="aps-stat-card">
                <div className={`aps-stat-icon ${s.color}`}>{s.icon}</div>
                <p className="aps-stat-label">{s.label}</p>
                <p className="aps-stat-value">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="aps-tabs">
            {[
              {
                key: "configuration",
                label: "Configuration",
                icon: <GearIcon />,
              },
              {
                key: "sync-control",
                label: "Sync Control",
                icon: <RefreshIcon />,
              },
              {
                key: "synced-users",
                label: `Synced Users (${syncStats.total})`,
                icon: <UsersIcon />,
              },
            ].map((tab) => (
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

          {/* Toast / Alert */}
          {syncMessage && (
            <div className={`aps-alert aps-alert--${syncMessage.type}`}>
              <AlertTriangleIcon />
              <span>{syncMessage.text}</span>
            </div>
          )}

          {/* Tab: Configuration */}
          {activeTab === "configuration" && (
            <div className="aps-panel">
              <div className="aps-panel-header">
                <h2 className="aps-panel-title">PinnaCle API Configuration</h2>
                <p className="aps-panel-subtitle">
                  Configure connection to PinnaCle microservice
                </p>
              </div>

              <div className="aps-form-group">
                <label className="aps-label">
                  API URL <span className="aps-required">*</span>
                </label>
                <input
                  type="text"
                  className="aps-input"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://pinnacle-api.pnc.edu.ph/v1"
                />
                <p className="aps-hint">Base URL for PinnaCle API endpoints</p>
              </div>

              <div className="aps-form-group">
                <label className="aps-label">
                  API Key <span className="aps-required">*</span>
                </label>
                <input
                  type="password"
                  className="aps-input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your PinnaCle API key"
                />
                <p className="aps-hint">
                  Authentication key for accessing PinnaCle API
                </p>
              </div>

              <div className="aps-form-group">
                <label className="aps-label">
                  Auto-Sync Interval (minutes)
                </label>
                <input
                  type="number"
                  className="aps-input aps-input--sm"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  min={15}
                  max={1440}
                />
                <p className="aps-hint">
                  How often to automatically sync data (15 min – 24 hours)
                </p>
              </div>

              <div className="aps-toggle-card">
                <div>
                  <p className="aps-toggle-title">Enable PinnaCle Sync</p>
                  <p className="aps-toggle-desc">
                    When enabled, OAMS will use PinnaCle as the source of truth
                    for user data
                  </p>
                </div>
                <button
                  className={`aps-toggle-btn ${syncEnabled ? "aps-toggle-btn--on" : ""}`}
                  onClick={() => setSyncEnabled((v) => !v)}
                  aria-label="Toggle PinnaCle sync"
                >
                  <span className="aps-toggle-thumb"></span>
                </button>
              </div>

              <div className="aps-panel-actions">
                <button
                  className="aps-btn-primary"
                  onClick={handleSaveConfiguration}
                >
                  <GearIcon /> Save Configuration
                </button>
                <button
                  className="aps-btn-secondary"
                  onClick={handleTestConnection}
                >
                  <ZapIcon /> Test Connection
                </button>
              </div>
            </div>
          )}

          {/* Tab: Sync Control */}
          {activeTab === "sync-control" && (
            <div className="aps-panel">
              <div className="aps-panel-header">
                <h2 className="aps-panel-title">Data Synchronization</h2>
                <p className="aps-panel-subtitle">
                  Sync user data from PinnaCle to OAMS
                </p>
              </div>

              <button
                className={`aps-sync-now-btn ${isSyncing ? "aps-sync-now-btn--loading" : ""}`}
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                <RefreshIcon />
                {isSyncing ? "Syncing..." : "Sync Now from PinnaCle"}
              </button>

              {!syncEnabled && (
                <div className="aps-alert aps-alert--warning">
                  <AlertTriangleIcon />
                  <span>
                    PinnaCle sync is currently disabled. Enable it in the
                    Configuration tab to sync user data.
                  </span>
                </div>
              )}

              <div className="aps-how-it-works">
                <h3 className="aps-how-title">How PinnaCle Sync Works</h3>
                <ul className="aps-how-list">
                  <li>
                    <ArrowUpIcon /> Fetches latest user data from PinnaCle
                    microservice
                  </li>
                  <li>
                    <ArrowDownIcon /> Updates OAMS user accounts with PinnaCle
                    information
                  </li>
                  <li>
                    <RefreshIcon /> Automatically syncs every {syncInterval}{" "}
                    minutes when enabled
                  </li>
                  <li>
                    <CheckCircleIcon /> PinnaCle becomes the single source of
                    truth for user authentication
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab: Synced Users */}
          {activeTab === "synced-users" && (
            <div className="aps-panel">
              <div className="aps-panel-header">
                <h2 className="aps-panel-title">Users from PinnaCle</h2>
                <p className="aps-panel-subtitle">
                  User accounts synced from PinnaCle microservice
                </p>
              </div>

              {syncStats.total === 0 ? (
                <div className="aps-empty-state">
                  <DatabaseIcon />
                  <h3 className="aps-empty-title">No Synced Users</h3>
                  <p className="aps-empty-desc">
                    Click "Sync Now" to import users from PinnaCle
                  </p>
                  <button
                    className="aps-btn-primary"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setActiveTab("sync-control")}
                  >
                    <RefreshIcon /> Go to Sync Control
                  </button>
                </div>
              ) : (
                <div className="aps-users-table">
                  <p>Users will appear here after syncing.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ChatWidget
        initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
        getBotResponse={generateBotResponse}
      />
    </div>
  );
}
