import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_dashboard.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import editIcon from "../../assets/edit_icon.png";
import deleteIcon from "../../assets/delete_icon.png";
import api from "../../utils/api";

// ── Icons (all unchanged from original) ──────────────────────────────────────
const ChatIcon = () => (
  <svg
    className="icon"
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
    className="icon"
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
const ClockIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const FileTextIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const UsersIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const BellIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);
const ChevronRightIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);
const CheckIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const AlertIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
  </svg>
);
const PlusIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const UserManagementIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <circle cx="19" cy="6" r="2"></circle>
    <circle
      cx="19"
      cy="6"
      r="2.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    ></circle>
    <path d="M19 4l1 1"></path>
    <path d="M20 7l-1-1"></path>
    <path d="M18 7l1-1"></path>
    <path d="M18 5l1 1"></path>
  </svg>
);
const DataManagementIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </svg>
);
const QueueAnalyticsIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
  </svg>
);
const SyncIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);
const QRCodeIcon = () => (
  <svg className="tool-icon-svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2zM19 13h2v2h-2z" />
  </svg>
);
const HostQueueIcon = () => (
  <svg
    className="tool-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

// ── Static tool/action arrays (UI only, no data dependency) ──────────────────
const adminTools = [
  {
    icon: UserManagementIcon,
    iconColor: "bg-orange-500",
    title: "User Management",
    description: "Manage user accounts",
  },
  {
    icon: DataManagementIcon,
    iconColor: "bg-purple-500",
    title: "Data Management",
    description: "Configure settings",
  },
  {
    icon: QueueAnalyticsIcon,
    iconColor: "bg-blue-600",
    title: "Queue Analytics",
    description: "Performance metrics",
  },
  {
    icon: SyncIcon,
    iconColor: "bg-cyan-500",
    title: "Pinnacle Sync",
    description: "Data synchronization",
  },
];
const quickActions = [
  {
    icon: QRCodeIcon,
    iconColor: "bg-green-500",
    title: "Scan Document",
    description: "Verify QR codes and view document details",
  },
  {
    icon: HostQueueIcon,
    iconColor: "bg-blue-500",
    title: "Host Queue",
    description: "Manage and host student queues",
    path: "/admin/queue-hosting",
  },
];

export default function AdminDashboard() {
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
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Dashboard data state ──────────────────────────────────────────────────
  const [dashStats, setDashStats] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setDashLoading(true);
        const res = await api.get("/admin/dashboard-stats");
        setDashStats(res.data);
      } catch (err) {
        console.error("Failed to fetch admin dashboard stats:", err);
        setDashError("Could not load dashboard data.");
      } finally {
        setDashLoading(false);
      }
    };
    if (authUser) fetchStats();
  }, [authUser]);

  // ── Derived values ────────────────────────────────────────────────────────
  const s = dashStats?.stats;
  const loading = dashLoading;

  const stats = [
    {
      title: "Active Queues",
      value: loading ? "—" : String(s?.activeQueues ?? 0),
      description: "Across all colleges",
      icon: ClockIcon,
      bgColor: "bg-blue-50",
      isClickable: true,
      ctaAriaLabel: "View queue management for active queues",
    },
    {
      title: "Pending Documents",
      value: loading ? "—" : String(s?.pendingDocuments ?? 0),
      description: "Awaiting processing",
      icon: FileTextIcon,
      bgColor: "bg-orange-50",
      isClickable: true,
      ctaAriaLabel: "View document processing for pending documents",
    },
    {
      title: "Faculty Available",
      value: loading ? "—" : String(s?.facultyAvailable ?? 0),
      description: "Today",
      icon: UsersIcon,
      bgColor: "bg-emerald-50",
      isClickable: true,
      ctaAriaLabel: "View faculty availability",
    },
    {
      title: "Announcements",
      value: loading ? "—" : String(s?.announcements ?? 0),
      description: "Published",
      icon: BellIcon,
      bgColor: "bg-purple-50",
      isClickable: false,
    },
  ];

  const pendingDocuments = dashStats?.pendingDocuments ?? [];
  const hostedQueues = dashStats?.hostedQueues ?? [];
  const facultyAvailability = dashStats?.facultyAvailability ?? [];
  const announcements = dashStats?.announcements ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
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
    if (i.includes("user") || i.includes("account"))
      return "You can manage user accounts from the Admin Management section (User Management).";
    if (i.includes("document") || i.includes("approval"))
      return `There are ${s?.pendingDocuments ?? 0} documents pending processing. Check the Pending Documents section.`;
    if (i.includes("queue") || i.includes("waiting"))
      return `There are ${s?.activeQueues ?? 0} active queues right now. Use the Queue section to manage them.`;
    if (i.includes("announcement"))
      return "Use Announcement Management to create and manage announcements.";
    return "I can help with user management, document approvals, queue hosting, and announcements. What are you working on?";
  };

  // ── Handler for clicking stat cards ────────────────────────────────────────
  const handleStatCardClick = (statTitle) => {
    if (statTitle === "Active Queues") {
      navigate("/admin/queue-management");
      return;
    }

    if (statTitle === "Pending Documents") {
      navigate("/admin/document-processing");
      return;
    }

    if (statTitle === "Faculty Available") {
      navigate("/admin/professor-availability");
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
        <div className="admin-dashboard">
          {dashError && <div className="dash-error-banner">{dashError}</div>}

          {/* Welcome Banner */}
          <div className="welcome-banner admin-banner">
            <div className="banner-backdrop banner-backdrop-1"></div>
            <div className="banner-backdrop banner-backdrop-2"></div>
            <div className="banner-content">
              <h1 className="banner-title">Admin Dashboard</h1>
              <p className="banner-subtitle">{user?.college}</p>
              <div className="banner-badges">
                <div className="welcome-admin-badge">
                  <img
                    src={
                      new URL(
                        `../../assets/${user?.departmentAbbrev || "CCS"}.png`,
                        import.meta.url,
                      ).href
                    }
                    alt="College Logo"
                    className="welcome-admin-logo"
                  />
                  <span className="badge">Administrator</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className={`stat-card ${stat.isClickable ? "stat-card-clickable" : ""}`}
                onClick={() =>
                  stat.isClickable && handleStatCardClick(stat.title)
                }
                role={stat.isClickable ? "button" : undefined}
                tabIndex={stat.isClickable ? 0 : undefined}
                aria-label={stat.isClickable ? stat.ctaAriaLabel : undefined}
                onKeyPress={(e) => {
                  if (
                    stat.isClickable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    handleStatCardClick(stat.title);
                  }
                }}
              >
                <div className="stat-header">
                  <div className={`stat-icon ${stat.bgColor}`}>
                    <stat.icon />
                  </div>
                </div>
                <p className="stat-title">{stat.title}</p>
                <p className={`stat-value ${loading ? "stat-loading" : ""}`}>
                  {stat.value}
                </p>
                <p className="stat-description">{stat.description}</p>
              </div>
            ))}
          </div>

          {/* Admin Management */}
          <section className="admin-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <AlertIcon />
                <div className="section-title-admin-text">
                  <h2>Admin Management</h2>
                  <p className="section-subtitle">
                    System administration and configuration tools
                  </p>
                </div>
              </div>
            </div>
            <div className="admin-tools-grid">
              {adminTools.map((tool) => (
                <div key={tool.title} className="admin-tool-card">
                  <div className={`admin-tool-icon ${tool.iconColor}`}>
                    <tool.icon />
                  </div>
                  <div className="admin-tool-text">
                    <h3 className="tool-title">{tool.title}</h3>
                    <p className="tool-description">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="quick-actions-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <CheckIcon />
                <div className="section-title-admin-text">
                  <h2>Quick Actions</h2>
                  <p className="section-subtitle">
                    Access frequently used admin tools
                  </p>
                </div>
              </div>
            </div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="quick-action-card"
                  onClick={() => action.path && navigate(action.path)}
                  role={action.path ? "button" : undefined}
                  tabIndex={action.path ? 0 : undefined}
                  style={action.path ? { cursor: "pointer" } : undefined}
                  onKeyPress={(e) => {
                    if (action.path && (e.key === "Enter" || e.key === " ")) {
                      navigate(action.path);
                    }
                  }}
                >
                  <div className={`action-icon ${action.iconColor}`}>
                    <action.icon />
                  </div>
                  <div className="quick-action-text">
                    <h3 className="action-title">{action.title}</h3>
                    <p className="action-description">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Announcement Management (live from faqs table) */}
          <section className="announcement-management-section">
            <div className="section-header-admin">
              <div className="section-title-admin">
                <BellIcon />
                <h2>Announcement Management</h2>
              </div>
              <button className="btn-new-announcement">
                <PlusIcon />
                New Announcement
              </button>
            </div>
            <div className="announcements-list">
              {loading ? (
                <p className="activity-loading">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                <p className="activity-empty">No announcements yet.</p>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="announcement-item">
                    <div className="announcement-content">
                      <h4 className="announcement-title">{ann.title}</h4>
                      <p className="announcement-description">
                        {ann.description}
                      </p>
                      <div className="announcement-important-date">
                        <span className={`announcement-tag tag-${ann.tag}`}>
                          {ann.tag}
                        </span>
                        <span className="announcement-date">{ann.date}</span>
                      </div>
                    </div>
                    <div className="announcement-actions">
                      <button
                        type="button"
                        className="btn-announcement-icon btn-announcement-edit"
                        aria-label={`Edit: ${ann.title}`}
                        onClick={() => console.log("edit", ann)}
                      >
                        <img
                          className="btn-announcement-icon-img"
                          src={editIcon}
                          alt=""
                        />
                      </button>
                      <button
                        type="button"
                        className="btn-announcement-icon btn-announcement-delete"
                        aria-label={`Delete: ${ann.title}`}
                        onClick={() => console.log("delete", ann)}
                      >
                        <img
                          className="btn-announcement-icon-img"
                          src={deleteIcon}
                          alt=""
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Two Column: Pending Docs + Hosted Queues */}
          <div className="admin-grid-2col">
            <section className="pending-documents-section">
              <div className="card-header-admin">
                <h3>Pending Requested Documents</h3>
                <a href="#" className="view-all-link">
                  View All <ChevronRightIcon />
                </a>
              </div>
              <div className="documents-list">
                {loading ? (
                  <p className="activity-loading">Loading...</p>
                ) : pendingDocuments.length === 0 ? (
                  <p className="activity-empty">No pending documents.</p>
                ) : (
                  pendingDocuments.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <div className="document-info">
                        <p className="document-name">{doc.name}</p>
                        <p className="document-type">{doc.document}</p>
                        <div className="document-meta-row">
                          <span
                            className={`document-college college-${doc.college}`}
                          >
                            {doc.college}
                          </span>
                          <span className="document-date">{doc.date}</span>
                        </div>
                      </div>
                      <span className={`document-badge badge-${doc.status}`}>
                        {doc.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="hosted-queues-section">
              <div className="card-header-admin">
                <h3>Current Hosted Queues</h3>
                <a
                  href="/admin/queue-management"
                  className="view-all-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/queue-management");
                  }}
                >
                  Manage <ChevronRightIcon />
                </a>
              </div>
              <p className="section-desc">
                Active queues across all departments
              </p>
              <div className="queues-list">
                {loading ? (
                  <p className="activity-loading">Loading...</p>
                ) : hostedQueues.length === 0 ? (
                  <p className="activity-empty">No active queues today.</p>
                ) : (
                  hostedQueues.map((queue) => (
                    <div key={queue.id} className="queue-item">
                      <div className="queue-info">
                        <p className="queue-name">{queue.name}</p>
                        <p className="queue-code">{queue.college}</p>
                      </div>
                      <div className="queue-status-info">
                        <span
                          className={`queue-badge badge-${queue.status.toLowerCase()}`}
                        >
                          {queue.status}
                        </span>
                        <span className="queue-count">{queue.count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Faculty Availability */}
          <section className="faculty-availability-section">
            <div className="card-header-admin">
              <h3>Faculty Availability Today</h3>
              <a
                href="/admin/professor-availability"
                className="view-all-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/admin/professor-availability");
                }}
              >
                View All Faculty <ChevronRightIcon />
              </a>
            </div>
            <div className="faculty-grid">
              {loading ? (
                <p className="activity-loading">Loading...</p>
              ) : facultyAvailability.length === 0 ? (
                <p className="activity-empty">No faculty data available.</p>
              ) : (
                facultyAvailability.map((f) => (
                  <div key={f.id} className="faculty-card">
                    <div
                      className={`faculty-indicator ${f.status.toLowerCase()}`}
                    ></div>
                    <p className="faculty-name">{f.name}</p>
                    <p className="faculty-college">{f.college}</p>
                    <p className="faculty-time">{f.time}</p>
                  </div>
                ))
              )}
            </div>
          </section>
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