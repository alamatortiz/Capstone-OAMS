import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "../professor/professor_dashboard.css";
import "./professor_transactions.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";

// ── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const CalendarIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DocumentIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="13" x2="12" y2="17" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);
const HistoryIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36" />
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SunIcon = () => (
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const CalendarSmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const FileTextIconSm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// ── Transactions data ─────────────────────────────────────────────────────────
const TRANSACTIONS = [
  {
    id: "1",
    type: "queue",
    action: "Completed Queue Service",
    studentName: "Juan Dela Cruz",
    studentId: "2100123",
    details: "Academic Consultation - Thesis guidance",
    timestamp: "2026-03-27 11:30 AM",
    status: "completed",
  },
  {
    id: "2",
    type: "appointment",
    action: "Approved Appointment",
    studentName: "Maria Santos",
    studentId: "2100456",
    details: "Career Guidance - Online meeting scheduled",
    timestamp: "2026-03-27 10:15 AM",
    status: "approved",
  },
  {
    id: "3",
    type: "document",
    action: "Approved Document Request",
    studentName: "Pedro Garcia",
    studentId: "2000789",
    details: "Recommendation Letter for job application",
    timestamp: "2026-03-27 09:45 AM",
    status: "approved",
  },
  {
    id: "4",
    type: "queue",
    action: "Cancelled Queue Request",
    studentName: "Ana Rodriguez",
    studentId: "2100234",
    details: "Grade Inquiry - Student no-show",
    timestamp: "2026-03-27 09:00 AM",
    status: "cancelled",
  },
  {
    id: "5",
    type: "appointment",
    action: "Completed Appointment",
    studentName: "Carlos Reyes",
    studentId: "2100567",
    details: "Research Consultation - Methodology discussion",
    timestamp: "2026-03-26 03:00 PM",
    status: "completed",
  },
  {
    id: "6",
    type: "document",
    action: "Rejected Document Request",
    studentName: "Lisa Fernandez",
    studentId: "2200123",
    details: "Grade Certification - Incomplete requirements",
    timestamp: "2026-03-26 02:30 PM",
    status: "rejected",
  },
  {
    id: "7",
    type: "queue",
    action: "Completed Queue Service",
    studentName: "Marco Velasco",
    studentId: "2000456",
    details: "Document Signing - Clearance form",
    timestamp: "2026-03-26 01:15 PM",
    status: "completed",
  },
  {
    id: "8",
    type: "appointment",
    action: "Approved Appointment",
    studentName: "Sofia Mendoza",
    studentId: "2100789",
    details: "Academic Advising - Course selection",
    timestamp: "2026-03-26 11:00 AM",
    status: "approved",
  },
];

export default function ProfessorTransactionsPage() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : {
        name: "Faculty",
        role: "faculty",
        college: "",
        employeeId: "",
        departmentAbbrev: "CCS",
      };

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
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

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const transactions = TRANSACTIONS;

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
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: messages.length + 2,
        type: "bot",
        text: "I can help you with appointment management, student requests, and document reviews. What do you need?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  // ── Nav items — NO active highlight for Transactions ─────────────────────
  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
  ];

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = {
    total: transactions.length,
    queue: transactions.filter((t) => t.type === "queue").length,
    appointments: transactions.filter((t) => t.type === "appointment").length,
    documents: transactions.filter((t) => t.type === "document").length,
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.studentName.toLowerCase().includes(q) ||
      t.studentId.toLowerCase().includes(q) ||
      t.details.toLowerCase().includes(q);
    const matchType = filterType === "all" || t.type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const typeBadgeClass = (type) =>
    ({
      queue: "txn-badge txn-badge-queue",
      appointment: "txn-badge txn-badge-appointment",
      document: "txn-badge txn-badge-document",
    }[type] ?? "txn-badge");

  const typeLabel = (type) =>
    ({ queue: "Queue", appointment: "Appointment", document: "Document" }[type] ?? type);

  const statusBadgeClass = (status) =>
    ({
      completed: "txn-badge txn-badge-completed",
      approved: "txn-badge txn-badge-approved",
      rejected: "txn-badge txn-badge-rejected",
      cancelled: "txn-badge txn-badge-cancelled",
    }[status] ?? "txn-badge");

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="dashboard-with-sidebar">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
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
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
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
              {navItems.map((item) => {
                // Transactions nav item is NEVER highlighted (even on /professor/transactions)
                const isActive =
                  item.path !== "/professor/transactions" &&
                  location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-item${isActive ? " active" : ""}`}
                    title={item.label}
                  >
                    <item.icon className="nav-icon-medium" />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                );
              })}
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

      {/* ── Mobile header ────────────────────────────────────────────────── */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
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

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        <div className="transactions-page">

          {/* Page header */}
          <div className="transactions-page-header">
            <h1>Transaction History</h1>
            <p>View all your activities and transactions</p>
          </div>

          {/* Stats */}
          <div className="transactions-stats-grid">
            <div className="txn-stat-card primary">
              <div className="txn-stat-info">
                <p>Total Transactions</p>
                <p className="txn-stat-value primary">{stats.total}</p>
              </div>
              <div className="txn-stat-icon primary"><ActivityIcon /></div>
            </div>

            <div className="txn-stat-card blue">
              <div className="txn-stat-info">
                <p>Queue Services</p>
                <p className="txn-stat-value blue">{stats.queue}</p>
              </div>
              <div className="txn-stat-icon blue"><UserIcon /></div>
            </div>

            <div className="txn-stat-card green">
              <div className="txn-stat-info">
                <p>Appointments</p>
                <p className="txn-stat-value green">{stats.appointments}</p>
              </div>
              <div className="txn-stat-icon green"><CalendarSmIcon /></div>
            </div>

            <div className="txn-stat-card purple">
              <div className="txn-stat-info">
                <p>Documents</p>
                <p className="txn-stat-value purple">{stats.documents}</p>
              </div>
              <div className="txn-stat-icon purple"><FileTextIconSm /></div>
            </div>
          </div>

          {/* Transaction log */}
          <div className="transactions-log-card">
            <div className="transactions-log-card-header">
              <h2>Transaction Log</h2>
              <p>Complete history of your activities</p>
            </div>

            <div className="transactions-log-card-body">
              {/* Filters */}
              <div className="txn-filters-row">
                <div className="txn-search-wrapper">
                  <span className="txn-search-icon"><SearchIcon /></span>
                  <input
                    type="text"
                    className="txn-search-input"
                    placeholder="Search by student name, ID, or details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="txn-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="queue">Queue</option>
                  <option value="appointment">Appointment</option>
                  <option value="document">Document</option>
                </select>

                <select
                  className="txn-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button className="txn-export-btn">
                  <DownloadIcon />
                  Export
                </button>
              </div>

              {/* List */}
              <div className="txn-list">
                {filtered.length === 0 ? (
                  <div className="txn-empty">
                    <ActivityIcon />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  filtered.map((txn) => (
                    <div key={txn.id} className="txn-item">
                      <div className="txn-item-top">
                        <div className="txn-item-badges">
                          <span className={typeBadgeClass(txn.type)}>
                            {typeLabel(txn.type)}
                          </span>
                          <span className={statusBadgeClass(txn.status)}>
                            {capitalize(txn.status)}
                          </span>
                          <span className="txn-item-action">{txn.action}</span>
                        </div>
                        <div className="txn-item-timestamp">
                          <CalendarSmIcon />
                          {txn.timestamp}
                        </div>
                      </div>

                      <div className="txn-item-student">
                        <UserIcon />
                        <span className="txn-item-student-name">{txn.studentName}</span>
                        <span>({txn.studentId})</span>
                      </div>

                      <p className="txn-item-details">{txn.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── AI Chatbot ───────────────────────────────────────────────────── */}
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
              <button type="submit" className="chat-send-btn" aria-label="Send message">
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
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}