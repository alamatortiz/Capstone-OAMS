import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_queue_analytics.css";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg
    className="aqa-icon"
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
    className="aqa-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
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
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
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
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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
const DownloadIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.8-3.72L23 10M1 14l4.69 4.72A9 9 0 0 0 20.49 15"></path>
  </svg>
);
const TrendUpIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);
const AlertTriangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const UsersIcon2 = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="20"
    height="20"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const ClockIcon2 = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="20"
    height="20"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const SmileIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="20"
    height="20"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);
const ActivityIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="20"
    height="20"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);
const CalendarIcon2 = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    width="16"
    height="16"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// ── Static Data ───────────────────────────────────────────────────────────────
const timePeriods = ["Today", "This Week", "This Month", "This Semester"];

export default function AdminQueueAnalytics() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Admin",
        role: "admin",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with queue analytics today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Filters
  const [timePeriod, setTimePeriod] = useState("Today");
  const [serviceType, setServiceType] = useState("All Services");
  const [timePeriodOpen, setTimePeriodOpen] = useState(false);
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");

  // Analytics data from API
  const [serviceTypes, setServiceTypes] = useState(["All Services"]);
  const [analyticsData, setAnalyticsData] = useState({ performance: [], positiveInsights: [], improvementAreas: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const res = await api.get("/admin/queue-analytics", {
          params: { period: timePeriod, service: serviceType },
        });
        setAnalyticsData({
          performance: res.data.performance ?? [],
          positiveInsights: res.data.positiveInsights ?? [],
          improvementAreas: res.data.improvementAreas ?? [],
        });
        if (res.data.serviceTypes) setServiceTypes(res.data.serviceTypes);
      } catch (err) {
        console.error("Queue analytics fetch error:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [authUser, timePeriod, serviceType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setTimePeriodOpen(false);
      setServiceTypeOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("wait"))
      return "Average wait time today is 16 minutes, which is 3 minutes below average. CBAA Subject Enrollment has the highest at 22 minutes.";
    if (i.includes("satisfaction"))
      return "Overall satisfaction is at 86%, a 5% improvement. CCS Subject Enrollment leads with 92%.";
    if (i.includes("peak"))
      return "Peak hours are 9:00 AM - 11:00 AM across all services. Best service time is 1:00 PM - 3:00 PM.";
    if (i.includes("queue") || i.includes("active"))
      return "There are 12 active queues across all departments right now.";
    if (i.includes("served") || i.includes("student"))
      return "684 students have been served today, up 12% from yesterday.";
    return "I can help with wait times, satisfaction rates, peak hours, and queue performance. What would you like to know?";
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

  const performance = analyticsData.performance;
  const positiveInsights = analyticsData.positiveInsights;
  const improvementAreas = analyticsData.improvementAreas;

  // Summary stats derived from live performance data
  const totalServed = performance.reduce((sum, p) => sum + (p.studentsServed || 0), 0);
  const avgWaitAll = performance.length > 0
    ? Math.round(performance.reduce((sum, p) => sum + (parseInt(p.avgWait) || 0), 0) / performance.length)
    : 0;
  const avgSatisfaction = performance.length > 0
    ? Math.round(performance.reduce((sum, p) => sum + (p.satisfaction || 0), 0) / performance.length)
    : 0;

  const getStatusColor = (status) => {
    if (status === "excellent") return "aqa-status-excellent";
    if (status === "good") return "aqa-status-good";
    return "aqa-status-needs";
  };

  const getSatisfactionColor = (val) => {
    if (val >= 90) return "#22c55e";
    if (val >= 80) return "#3b82f6";
    return "#f97316";
  };

  return (
    <div className="aqa-layout">
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      {/* AI Chatbot */}
      <div className={`aqa-chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="aqa-chat-container">
            <div className="aqa-chat-header">
              <h3>OAMS Assistant</h3>
              <button
                className="aqa-chat-close-btn"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="aqa-chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`aqa-message aqa-message-${m.type}`}>
                  <div className="aqa-message-content">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="aqa-chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="aqa-chat-input"
                placeholder="Ask me anything..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button
                type="submit"
                className="aqa-chat-send-btn"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
        <button
          className={`aqa-chat-fab ${chatOpen ? "hidden" : ""}`}
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
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
                <span className="user-role-badge">Admin</span>
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
      <main className="aqa-main">
        <div className="aqa-content">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Banner */}
          <div className="aqa-banner">
            <div className="aqa-banner-icon">
              <BarChartIcon />
            </div>
            <div className="aqa-banner-text">
              <h1 className="aqa-banner-title">Queue Analytics</h1>
              <p className="aqa-banner-subtitle">
                Real-time queue performance metrics and insights
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="aqa-filters-card">
            <div className="aqa-filters-header">
              <div>
                <p className="aqa-filters-title">Analytics Filters</p>
                <p className="aqa-filters-sub">Customize your analytics view</p>
              </div>
              <div className="aqa-filters-actions">
                <button className="aqa-btn-outline">
                  <DownloadIcon /> Export Report
                </button>
                <button className="aqa-btn-outline">
                  <RefreshIcon /> Refresh
                </button>
              </div>
            </div>
            <div className="aqa-filters-row">
              {/* Department (read-only) */}
              <div className="aqa-filter-group">
                <label className="aqa-filter-label">Department</label>
                <div className="aqa-filter-display">
                  {user?.college} ({user?.departmentAbbrev})
                </div>
              </div>

              {/* Time Period */}
              <div className="aqa-filter-group">
                <label className="aqa-filter-label">Time Period</label>
                <div
                  className="aqa-dropdown-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTimePeriodOpen((p) => !p);
                    setServiceTypeOpen(false);
                  }}
                >
                  <div className="aqa-dropdown-trigger">
                    <span>{timePeriod}</span>
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {timePeriodOpen && (
                    <div className="aqa-dropdown-menu">
                      {timePeriods.map((t) => (
                        <div
                          key={t}
                          className={`aqa-dropdown-item ${timePeriod === t ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimePeriod(t);
                            setTimePeriodOpen(false);
                          }}
                        >
                          {t}
                          {timePeriod === t && (
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Type */}
              <div className="aqa-filter-group">
                <label className="aqa-filter-label">Service Type</label>
                <div
                  className="aqa-dropdown-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    setServiceTypeOpen((p) => !p);
                    setTimePeriodOpen(false);
                  }}
                >
                  <div className="aqa-dropdown-trigger">
                    <span>{serviceType}</span>
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {serviceTypeOpen && (
                    <div className="aqa-dropdown-menu">
                      {serviceTypes.map((s) => (
                        <div
                          key={s}
                          className={`aqa-dropdown-item ${serviceType === s ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setServiceType(s);
                            setServiceTypeOpen(false);
                          }}
                        >
                          {s}
                          {serviceType === s && (
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="aqa-stats-row">
            <div className="aqa-stat-card">
              <div className="aqa-stat-header">
                <UsersIcon2 />
                <span className="aqa-stat-label">Total Served</span>
              </div>
              <div className="aqa-stat-value aqa-stat-green">
                {analyticsLoading ? "—" : totalServed}
              </div>
              <div className="aqa-stat-sub">{timePeriod}</div>
            </div>
            <div className="aqa-stat-card">
              <div className="aqa-stat-header">
                <ClockIcon2 />
                <span className="aqa-stat-label">Avg Wait Time</span>
              </div>
              <div className="aqa-stat-value aqa-stat-blue">
                {analyticsLoading ? "—" : avgWaitAll > 0 ? `${avgWaitAll} min` : "N/A"}
              </div>
              <div className="aqa-stat-sub">Across services</div>
            </div>
            <div className="aqa-stat-card">
              <div className="aqa-stat-header">
                <SmileIcon />
                <span className="aqa-stat-label">Satisfaction</span>
              </div>
              <div className="aqa-stat-value aqa-stat-green">
                {analyticsLoading ? "—" : avgSatisfaction > 0 ? `${avgSatisfaction}%` : "N/A"}
              </div>
              <div className="aqa-stat-sub">Average score</div>
            </div>
            <div className="aqa-stat-card">
              <div className="aqa-stat-header">
                <ActivityIcon />
                <span className="aqa-stat-label">Services Tracked</span>
              </div>
              <div className="aqa-stat-value aqa-stat-purple">
                {analyticsLoading ? "—" : performance.length}
              </div>
              <div className="aqa-stat-sub">{user.departmentAbbrev} department</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="aqa-tabs">
            <button
              className={`aqa-tab ${activeTab === "performance" ? "aqa-tab-active" : ""}`}
              onClick={() => setActiveTab("performance")}
            >
              <TrendUpIcon /> Performance
            </button>
            <button
              className={`aqa-tab ${activeTab === "trends" ? "aqa-tab-active" : ""}`}
              onClick={() => setActiveTab("trends")}
            >
              <CalendarIcon2 /> Trends
            </button>
            <button
              className={`aqa-tab ${activeTab === "insights" ? "aqa-tab-active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              <AlertTriangleIcon /> Insights
            </button>
          </div>

          {/* Tab: Insights */}
          {activeTab === "insights" && (
            <div className="aqa-insights-grid">
              <div className="aqa-insights-col">
                <div className="aqa-insights-card aqa-insights-positive">
                  <div className="aqa-insights-card-header">
                    <TrendUpIcon />
                    <div>
                      <p className="aqa-insights-card-title">
                        Positive Insights
                      </p>
                      <p className="aqa-insights-card-sub">
                        What's working well
                      </p>
                    </div>
                  </div>
                  <div className="aqa-insights-list">
                    {analyticsLoading ? (
                      <p style={{ color: "var(--text-secondary)", padding: "0.5rem" }}>Loading...</p>
                    ) : positiveInsights.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", padding: "0.5rem" }}>No data available for this period.</p>
                    ) : positiveInsights.map((item, idx) => (
                      <div
                        key={idx}
                        className="aqa-insight-item aqa-insight-green"
                      >
                        <p className="aqa-insight-title">{item.title}</p>
                        <p className="aqa-insight-desc">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="aqa-insights-col">
                <div className="aqa-insights-card aqa-insights-warning">
                  <div className="aqa-insights-card-header">
                    <AlertTriangleIcon />
                    <div>
                      <p className="aqa-insights-card-title">
                        Areas for Improvement
                      </p>
                      <p className="aqa-insights-card-sub">
                        Recommendations and action items
                      </p>
                    </div>
                  </div>
                  <div className="aqa-insights-list">
                    {analyticsLoading ? (
                      <p style={{ color: "var(--text-secondary)", padding: "0.5rem" }}>Loading...</p>
                    ) : improvementAreas.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", padding: "0.5rem" }}>No improvement areas detected.</p>
                    ) : improvementAreas.map((item, idx) => (
                      <div
                        key={idx}
                        className="aqa-insight-item aqa-insight-orange"
                      >
                        <p className="aqa-insight-title">{item.title}</p>
                        <p className="aqa-insight-desc">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Trends */}
          {activeTab === "trends" && (
            <div className="aqa-trends-grid">
              <div className="aqa-trend-card">
                <p className="aqa-trend-title">Daily Trends</p>
                <p className="aqa-trend-sub">Queue activity over time</p>
                <div className="aqa-trend-item aqa-trend-item-blue">
                  <p className="aqa-trend-item-label">Peak Activity Time</p>
                  <p
                    className="aqa-trend-item-value"
                    style={{ color: "#3b82f6" }}
                  >
                    9:00 AM - 11:00 AM
                  </p>
                  <p className="aqa-trend-item-note">
                    Highest queue volume period
                  </p>
                </div>
                <div className="aqa-trend-item aqa-trend-item-green">
                  <p className="aqa-trend-item-label">Best Service Time</p>
                  <p
                    className="aqa-trend-item-value"
                    style={{ color: "#22c55e" }}
                  >
                    1:00 PM - 3:00 PM
                  </p>
                  <p className="aqa-trend-item-note">
                    Shortest average wait times
                  </p>
                </div>
              </div>
              <div className="aqa-trend-card">
                <p className="aqa-trend-title">Weekly Comparison</p>
                <p className="aqa-trend-sub">Performance vs last week</p>
                {[
                  {
                    label: "Students Served",
                    value: "684",
                    change: "+12%",
                    color: "#22c55e",
                  },
                  {
                    label: "Avg Wait Time",
                    value: "16 min",
                    change: "-15%",
                    color: "#3b82f6",
                  },
                  {
                    label: "Satisfaction Rate",
                    value: "86%",
                    change: "+5%",
                    color: "#22c55e",
                  },
                ].map((row, idx) => (
                  <div key={idx} className="aqa-weekly-row">
                    <span className="aqa-weekly-label">{row.label}</span>
                    <div className="aqa-weekly-right">
                      <span
                        className="aqa-weekly-value"
                        style={{ color: row.color }}
                      >
                        {row.value}
                      </span>
                      <span className="aqa-weekly-change">{row.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Performance */}
          {activeTab === "performance" && (
            <div className="aqa-performance-section">
              <p className="aqa-perf-title">Queue Performance Metrics</p>
              <p className="aqa-perf-sub">
                Detailed breakdown by service and college
              </p>
              <div className="aqa-perf-list">
                {analyticsLoading ? (
                  <p style={{ color: "var(--text-secondary)", padding: "1rem" }}>Loading...</p>
                ) : performance.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", padding: "1rem" }}>No completed queue data for this period.</p>
                ) : null}
                {performance.map((item, idx) => (
                  <div key={idx} className="aqa-perf-card">
                    <div className="aqa-perf-card-header">
                      <span className="aqa-perf-service">{item.service}</span>
                      <span className="aqa-perf-college">{item.college}</span>
                      <span
                        className={`aqa-perf-status ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="aqa-perf-metrics">
                      <div className="aqa-perf-metric">
                        <span className="aqa-perf-metric-label">
                          Students Served
                        </span>
                        <span className="aqa-perf-metric-value aqa-stat-green">
                          {item.studentsServed}
                        </span>
                      </div>
                      <div className="aqa-perf-metric">
                        <span className="aqa-perf-metric-label">
                          Avg Wait Time
                        </span>
                        <span className="aqa-perf-metric-value aqa-stat-blue">
                          {item.avgWait}
                        </span>
                      </div>
                      <div className="aqa-perf-metric">
                        <span className="aqa-perf-metric-label">
                          Peak Hours
                        </span>
                        <span className="aqa-perf-metric-value">
                          {item.peakHours}
                        </span>
                      </div>
                      <div className="aqa-perf-metric">
                        <span className="aqa-perf-metric-label">
                          Satisfaction
                        </span>
                        <span
                          className="aqa-perf-metric-value"
                          style={{
                            color: getSatisfactionColor(item.satisfaction),
                          }}
                        >
                          {item.satisfaction}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
