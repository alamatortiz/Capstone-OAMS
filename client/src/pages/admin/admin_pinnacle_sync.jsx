import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import "./admin_pinnacle_sync.css";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import api from "../../utils/api";

// ── Icons ──────────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg
    className="aps-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg
    className="aps-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36"></path>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const SunIcon = () => (
  <svg
    className="sun-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);
const MoonIcon = () => (
  <svg
    className="moon-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
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
    style={{ width: "1.5rem", height: "1.5rem" }}
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
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next ? "dark" : "light");
      return next;
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: "I can help with PinnaCle sync configuration, user management, and data synchronization. What do you need?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

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

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/admin/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/admin/transactions",
    },
  ];

  return (
    <div className="admin-dashboard-with-sidebar">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      {/* AI Chatbot */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`message message-${m.type}`}>
                  <div className="message-content">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button
                type="submit"
                className="chat-send-btn"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`chat-fab ${chatOpen ? "hidden" : ""}`}
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <ChatIcon />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="logo-img oams-logo-img"
              />
            </div>
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large">
                <UserIcon />
              </div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name}</p>
                <span className="user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="nav-item"
                  title={item.label}
                >
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="logo-img oams-logo-img"
            />
          </div>
          <div className="mobile-header-actions">
            <button
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-dashboard-main">
        <div className="aps-page">
          <button className="admin-back-btn" onClick={() => navigate("/admin/dashboard")}><ChevronLeftIcon /><span>Dashboard</span></button>
          {/* Hero Banner */}
          <div className="aps-hero-banner">
            <div className="aps-hero-content">
              <div className="aps-hero-left">
                <div className="aps-banner-icon">
                  <DatabaseIcon />
                </div>
                <div className="aps-banner-text">
                  <h1 className="aps-hero-title">Pinnacle Integration</h1>
                  <p className="aps-hero-subtitle">
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
                  className="aps-input"
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

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
