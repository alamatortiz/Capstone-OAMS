import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import collegeCCSLogo from "../../assets/CCS.png";
import collegeCBAALogo from "../../assets/CBAA.png";
import collegeCOElogo from "../../assets/COE.png";
import collegeCOEDlogo from "../../assets/COED.png";
import collegeCASlogo from "../../assets/CAS.png";
import collegeCHASlogo from "../../assets/CHAS.png";
import "./admin_transactions.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Icons (all unchanged from admin_dashboard) ──────────────────────────────
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
const SearchIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);
const ActivityIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 12h-4l-3 9L9 3l-5 9H0"></path>
  </svg>
);
const UserGroupIcon = () => (
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
const CalendarIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
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
const CollegeLogoIcon = ({ collegeShortName }) => {
  const logoSrcMap = {
    CCS: collegeCCSLogo,
    CBAA: collegeCBAALogo,
    COE: collegeCOElogo,
    COED: collegeCOEDlogo,
    CAS: collegeCASlogo,
    CHAS: collegeCHASlogo,
  };

  const src = logoSrcMap[collegeShortName] ?? collegeCASlogo;

  return (
    <img
      src={src}
      alt={collegeShortName}
      className="admin-transaction-college-logo"
      loading="lazy"
      style={{ width: "2rem", height: "2rem", objectFit: "contain" }}
    />
  );
};

const DownloadIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const ChevronDownIcon = () => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// Transactions now come live from GET /api/admin/transactions, scoped
// server-side to the logged-in admin's own department. No static data.

export default function AdminTransaction() {
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
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with transactions today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Transaction Page State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  // ── Live transaction data (scoped server-side to admin's department) ─────
  const [transactions, setTransactions] = useState([]);
  const [txnStats, setTxnStats] = useState({
    total: 0,
    queue: 0,
    appointments: 0,
    documents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/admin/transactions", {
        params: {
          type: filterType,
          status: filterStatus,
          range: dateRange,
        },
      });
      setTransactions(res.data.transactions ?? []);
      setTxnStats(
        res.data.stats ?? { total: 0, queue: 0, appointments: 0, documents: 0 },
      );
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Could not load transaction data.");
      toast.error("Could not load transaction data");
    }
  }, [filterType, filterStatus, dateRange]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchTransactions();
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchTransactions]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    if (i.includes("transaction") || i.includes("log"))
      return "The transaction log shows all activity in your department. You can filter by type, status, and date range.";
    if (i.includes("queue"))
      return "Queue transactions show completed, cancelled, and pending queue services in your department.";
    if (i.includes("appointment"))
      return "Appointment transactions track scheduled, approved, and rejected appointments in your department.";
    if (i.includes("document"))
      return "Document request transactions show approved, rejected, and pending document requests from students.";
    if (i.includes("export") || i.includes("download"))
      return "You can export transaction reports using the 'Export Report' button. Select your date range and filters first.";
    return "I can help you search, filter, and analyze transaction logs. What would you like to know?";
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

  // ── Statistics (computed server-side over the admin's full department) ───
  const stats = txnStats;

  // ── Filter Transactions ───────────────────────────────────────────────────
  // type/status filters are applied server-side (re-fetched via fetchTransactions
  // whenever they change); search is applied client-side over the current page.
  const filteredTransactions = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      t.studentName?.toLowerCase().includes(q) ||
      t.studentId?.toLowerCase().includes(q) ||
      t.processor?.toLowerCase().includes(q) ||
      t.details?.toLowerCase().includes(q)
    );
  });

  // ── Badge Helpers ─────────────────────────────────────────────────────────
  const getTypeBadge = (type) => {
    const typeConfig = {
      queue: { color: "admin-transaction-badge-queue", label: "Queue" },
      appointment: {
        color: "admin-transaction-badge-appointment",
        label: "Appointment",
      },
      document: {
        color: "admin-transaction-badge-document",
        label: "Document",
      },
    };
    const config = typeConfig[type];
    return (
      <span className={`admin-transaction-badge ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: "admin-transaction-badge-completed" },
      cancelled: { color: "admin-transaction-badge-cancelled" },
      approved: { color: "admin-transaction-badge-approved" },
      rejected: { color: "admin-transaction-badge-rejected" },
    };
    const config = statusConfig[status] || {
      color: "admin-transaction-badge-approved",
    };
    return (
      <span className={`admin-transaction-badge ${config.color}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
      </span>
    );
  };

  return (
    <div className="admin-transaction-with-sidebar">
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
      <aside
        className={`admin-transaction-sidebar ${sidebarOpen ? "open" : ""}`}
      >
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
                  className={`nav-item ${
                    item.path === "/admin/transactions" ? "active" : ""
                  }`}
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
      <main className="admin-transaction-main">
        <div className="admin-transaction-container">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Header */}
          <div className="admin-transaction-header">
            <div className="admin-transaction-title-section">
              <div className="admin-transaction-title-icon">
                <ActivityIcon />
              </div>
              <div>
                <h1 className="admin-transaction-title">Transaction Logs</h1>
                <p className="admin-transaction-subtitle">
                  View transaction logs for {user.college} ({user.departmentAbbrev})
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="dash-error-banner" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          {/* Department Statistics */}
          <div className="admin-transaction-stats-grid">
            <div className="admin-transaction-stat-card admin-transaction-stat-total">
              <div className="admin-transaction-stat-content">
                <p className="admin-transaction-stat-label">
                  Total Transactions
                </p>
                <p className="admin-transaction-stat-value">
                  {loading ? "—" : stats.total}
                </p>
              </div>
              <ActivityIcon />
            </div>

            <div className="admin-transaction-stat-card admin-transaction-stat-queue">
              <div className="admin-transaction-stat-content">
                <p className="admin-transaction-stat-label">Queue Services</p>
                <p className="admin-transaction-stat-value">
                  {loading ? "—" : stats.queue}
                </p>
              </div>
              <UserGroupIcon />
            </div>

            <div className="admin-transaction-stat-card admin-transaction-stat-appointment">
              <div className="admin-transaction-stat-content">
                <p className="admin-transaction-stat-label">Appointments</p>
                <p className="admin-transaction-stat-value">
                  {loading ? "—" : stats.appointments}
                </p>
              </div>
              <CalendarIcon />
            </div>

            <div className="admin-transaction-stat-card admin-transaction-stat-document">
              <div className="admin-transaction-stat-content">
                <p className="admin-transaction-stat-label">Documents</p>
                <p className="admin-transaction-stat-value">
                  {loading ? "—" : stats.documents}
                </p>
              </div>
              <FileTextIcon />
            </div>
          </div>

          {/* Transaction Log */}
          <div className="admin-transaction-log-section">
            <div className="admin-transaction-section-header">
              <h2>Transaction Log</h2>
              <p className="admin-transaction-section-subtitle">
                Complete history of activity in your department
              </p>
            </div>

            {/* Filters */}
            <div className="admin-transaction-filters-container">
              <div className="admin-transaction-search-row">
                <div className="admin-transaction-search-wrapper">
                  <SearchIcon />
                  <input
                    type="text"
                    className="admin-transaction-search-input"
                    placeholder="Search by student, processor, or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="admin-transaction-filter-selects">
                  <div className="admin-transaction-select-wrapper">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="admin-transaction-select"
                    >
                      <option value="all">All Types</option>
                      <option value="queue">Queue</option>
                      <option value="appointment">Appointment</option>
                      <option value="document">Document</option>
                    </select>
                    <ChevronDownIcon />
                  </div>

                  <div className="admin-transaction-select-wrapper">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="admin-transaction-select"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>

              <div className="admin-transaction-actions-row">
                <div className="admin-transaction-select-wrapper">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="admin-transaction-select"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                  <ChevronDownIcon />
                </div>
                <button className="admin-transaction-export-btn">
                  <DownloadIcon />
                  Export Report
                </button>
              </div>
            </div>

            {/* Transactions List */}
            <div className="admin-transaction-list">
              {loading ? (
                <div className="admin-transaction-empty-state">
                  <ActivityIcon />
                  <p>Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="admin-transaction-empty-state">
                  <ActivityIcon />
                  <p>No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => {
                  return (
                    <div
                      key={transaction.id}
                      className="admin-transaction-item"
                    >
                      <div className="admin-transaction-item-content">
                        <div className="admin-transaction-item-badges">
                          {getTypeBadge(transaction.type)}
                          {getStatusBadge(transaction.status)}
                          <span className="admin-transaction-item-action">
                            {transaction.action}
                          </span>
                        </div>

                        <div className="admin-transaction-item-grid">
                          <div className="admin-transaction-item-college">
                            <CollegeLogoIcon
                              collegeShortName={transaction.collegeAbbrev}
                            />
                            <span className="admin-transaction-item-college-name">
                              {transaction.collegeAbbrev}
                            </span>
                          </div>
                          <div className="admin-transaction-item-student">
                            <UserGroupIcon />
                            <span className="admin-transaction-item-student-name">
                              {transaction.studentName}
                            </span>
                            <span className="admin-transaction-item-student-id">
                              ({transaction.studentId})
                            </span>
                          </div>
                        </div>

                        <p className="admin-transaction-item-details">
                          {transaction.details}
                        </p>
                        <p className="admin-transaction-item-processor">
                          Processed by: {transaction.processor}
                        </p>
                      </div>

                      <div className="admin-transaction-item-timestamp">
                        <CalendarIcon />
                        <span>{transaction.timestamp}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
