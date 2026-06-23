import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_appointment.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { COLLEGES } from "../../data/colleges";

// ── Icons (All SVG Components) ──────────────────────────────────────────────
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
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const AlertCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    {/* exclamation mark */}
    <path d="M12 7v6" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const PersonIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default function AdminAppointment() {
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

  const [selectedCollege, setSelectedCollege] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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
  const handleViewDetails = (appointment) =>
    setSelectedAppointment(appointment);
  const handleCloseDetails = () => setSelectedAppointment(null);
  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    today: appointments.filter((a) => a.isToday && a.status !== "cancelled")
      .length,
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/appointments");
        setAppointments(res.data.appointments ?? []);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
        setError("Could not load appointments.");
      } finally {
        setLoading(false);
      }
    };
    if (authUser) fetchAppointments();
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
        text: generateBotResponse(inputValue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("appointment"))
      return `There are ${stats.total} total appointments. ${stats.pending} are pending approval.`;
    if (i.includes("pending"))
      return `You have ${stats.pending} pending appointments waiting for your action.`;
    if (i.includes("student"))
      return "You can search appointments by student name or ID using the search bar at the top.";
    if (i.includes("filter") || i.includes("college"))
      return "Use the college dropdown to filter appointments by department.";
    return "I can help with appointment management, filtering, and scheduling. What would you like to do?";
  };

  const filterAppointments = (status) => {
    let filtered = appointments;
    if (status !== "all")
      filtered = filtered.filter((a) => a.status === status);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.studentName.toLowerCase().includes(q) ||
          a.studentId.toLowerCase().includes(q) ||
          a.professor.toLowerCase().includes(q),
      );
    }
    return filtered;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "admin-appointment-badge-pending",
        icon: AlertCircleIcon,
      },
      approved: {
        color: "admin-appointment-badge-approved",
        icon: CheckCircleIcon,
      },
      rejected: {
        color: "admin-appointment-badge-rejected",
        icon: AlertCircleIcon,
      },
      completed: {
        color: "admin-appointment-badge-completed",
        icon: CheckCircleIcon,
      },
      cancelled: {
        color: "admin-appointment-badge-cancelled",
        icon: AlertCircleIcon,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`admin-appointment-status-badge ${config.color}`}>
        <Icon />
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };

  const AppointmentCard = ({ appointment, onViewDetails }) => {
    const collegeData = COLLEGES.find((c) => c.name === appointment.college);
    const handleViewDetails = (appointment) => {
      console.log("Viewing details for:", appointment);
    };
    return (
      <div key={appointment.id} className="admin-appointment-card">
        <div className="admin-appointment-card-content">
          <div className="admin-appointment-card-header">
            <div className="admin-appointment-card-left">
              <div className="admin-appointment-college-badge">
                <BuildingIcon />
              </div>
              <div className="admin-appointment-student-info">
                <PersonIcon className="admin-appointment-student-person-icon" />
                <h4 className="admin-appointment-student-name">
                  {appointment.studentName}
                </h4>
                <span className="admin-appointment-student-id">
                  ({appointment.studentId})
                </span>
              </div>

              <p className="admin-appointment-purpose">{appointment.purpose}</p>
            </div>
            <div className="admin-appointment-card-right">
              {getStatusBadge(appointment.status)}
            </div>
          </div>

          <div className="admin-appointment-card-details">
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Professor</span>
              <span className="admin-appointment-detail-value">
                {appointment.professor}
              </span>
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Date</span>
              <span className="admin-appointment-detail-value">
                {new Date(appointment.date).toLocaleDateString()}
              </span>
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Time</span>
              <span className="admin-appointment-detail-value">
                {appointment.time}
              </span>
            </div>
            <div className="admin-appointment-detail-item">
              <span className="admin-appointment-detail-label">Type</span>
              <span className="admin-appointment-detail-value capitalize">
                {appointment.type}
              </span>
            </div>
          </div>

          <div className="admin-appointment-card-footer">
            <span className="admin-appointment-requested-text">
              Requested: {appointment.requestedAt}
            </span>
            <button
              className="admin-appointment-view-details-btn"
              onClick={() => onViewDetails(appointment)}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
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
    <div className="admin-appointment-with-sidebar">
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
        className={`admin-appointment-sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <div className="admin-appointment-sidebar-inner">
          <div className="admin-appointment-sidebar-logo">
            <div className="admin-appointment-logo-container">
              <img
                src={ucLogo}
                alt="UC Logo"
                className="admin-appointment-logo-img"
              />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="admin-appointment-logo-img admin-appointment-oams-logo-img"
              />
            </div>
            <button
              className="admin-appointment-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="admin-appointment-sidebar-user-section">
            <div className="admin-appointment-user-top-row">
              <div className="admin-appointment-user-avatar-large">
                <UserIcon />
              </div>
              <div className="admin-appointment-user-info-content">
                <p className="admin-appointment-user-name-large">
                  {user?.name}
                </p>
                <span className="admin-appointment-user-role-badge">
                  Administrator
                </span>
              </div>
            </div>
            <div className="admin-appointment-user-college-wrapper">
              <p className="admin-appointment-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="admin-appointment-sidebar-nav">
            <div className="admin-appointment-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="admin-appointment-nav-item"
                  title={item.label}
                >
                  <item.icon className="admin-appointment-nav-icon-medium" />
                  <span className="admin-appointment-nav-label">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="admin-appointment-sidebar-logout">
            <button
              className="admin-appointment-logout-btn"
              onClick={handleLogout}
            >
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="admin-appointment-mobile-header">
        <div className="admin-appointment-mobile-header-content">
          <div className="admin-appointment-mobile-logo">
            <img
              src={ucLogo}
              alt="UC Logo"
              className="admin-appointment-logo-img"
            />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="admin-appointment-logo-img admin-appointment-oams-logo-img"
            />
          </div>
          <div className="admin-appointment-mobile-header-actions">
            <button
              className="admin-appointment-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="admin-appointment-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-appointment-main">
        <div className="admin-appointment-container">
          <button onClick={() => navigate("/admin/dashboard")} style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.45rem 0.9rem",borderRadius:"8px",border:"1px solid var(--border,#e5e7eb)",background:"transparent",color:"var(--text-secondary,#6b7280)",fontSize:"0.82rem",fontWeight:500,cursor:"pointer",marginBottom:"1rem"}}>← Back to Dashboard</button>
          {/* Header */}
          <div className="admin-appointment-page-header">
            <h1 className="admin-appointment-page-title">
              Centralized Appointment Management
            </h1>
            <p className="admin-appointment-page-subtitle">
              Oversee appointment system across all colleges
            </p>
          </div>

          {/* Stats Grid */}
          <div className="admin-appointment-stats-grid">
            <div className="admin-appointment-stat-card">
              <div className="admin-appointment-stat-icon">
                <CalendarIconNav />
              </div>
              <p className="admin-appointment-stat-label">Total Appointments</p>
              <p className="admin-appointment-stat-value">{stats.total}</p>
            </div>
            <div className="admin-appointment-stat-card admin-appointment-stat-card-warning">
              <div className="admin-appointment-stat-icon">
                <AlertCircleIcon />
              </div>
              <p className="admin-appointment-stat-label">Pending</p>
              <p className="admin-appointment-stat-value">{stats.pending}</p>
            </div>
            <div className="admin-appointment-stat-card admin-appointment-stat-card-success">
              <div className="admin-appointment-stat-icon">
                <CheckCircleIcon />
              </div>
              <p className="admin-appointment-stat-label">Approved</p>
              <p className="admin-appointment-stat-value">{stats.approved}</p>
            </div>
            <div className="admin-appointment-stat-card admin-appointment-stat-card-info">
              <div className="admin-appointment-stat-icon">
                <CalendarIconNav />
              </div>
              <p className="admin-appointment-stat-label">Today</p>
              <p className="admin-appointment-stat-value">{stats.today}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="admin-appointment-filters-card">
            <div className="admin-appointment-filters-content">
              <div className="admin-appointment-search-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by student name, ID, or professor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-appointment-search-input"
                />
              </div>
            </div>
          </div>

          {/* Appointments List with Tabs */}
          <div className="admin-appointment-overview-card">
            <div className="admin-appointment-overview-header">
              <h2 className="admin-appointment-overview-title">
                Appointment Overview
              </h2>
              <p className="admin-appointment-overview-subtitle">
                System-wide appointment tracking and management
              </p>
            </div>
            <div className="admin-appointment-tabs-container">
              <div className="admin-appointment-tabs-list">
                {["all", "pending", "approved", "completed", "rejected"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`admin-appointment-tab-trigger ${
                        activeTab === tab ? "active" : ""
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ),
                )}
              </div>

              <div className="admin-appointment-tabs-content">
                {filterAppointments(activeTab).length === 0 ? (
                  <div className="admin-appointment-empty-state">
                    <CalendarIconNav />
                    <p className="admin-appointment-empty-text">
                      No appointments found
                    </p>
                  </div>
                ) : (
                  <div className="admin-appointment-cards-list">
                    {filterAppointments(activeTab).map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="admin-appointment-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {selectedAppointment && (
        <div
          className="admin-appointment-modal-overlay"
          onClick={handleCloseDetails}
        >
          <div
            className="admin-appointment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-appointment-modal-header">
              <div>
                <h2 className="admin-appointment-modal-title">
                  Appointment Details
                </h2>
                <p className="admin-appointment-modal-subtitle">
                  Read-only — monitoring view
                </p>
              </div>
              <button
                className="admin-appointment-modal-close-btn"
                onClick={handleCloseDetails}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="admin-appointment-modal-body">
              <div className="admin-appointment-modal-status-row">
                {getStatusBadge(selectedAppointment.status)}
                <span className="admin-appointment-modal-tracking">
                  #{selectedAppointment.id}
                </span>
              </div>

              <div className="admin-appointment-modal-grid">
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">Student</span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.studentName} (
                    {selectedAppointment.studentId})
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">Course</span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.studentCourse ?? "—"}
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">Faculty</span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.professor}
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">College</span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.college}
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">Date</span>
                  <span className="admin-appointment-modal-value">
                    {new Date(selectedAppointment.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">Time</span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.time}
                  </span>
                </div>
                <div className="admin-appointment-modal-field">
                  <span className="admin-appointment-modal-label">
                    Location
                  </span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.location}
                  </span>
                </div>
                {selectedAppointment.serviceName && (
                  <div className="admin-appointment-modal-field">
                    <span className="admin-appointment-modal-label">
                      Service
                    </span>
                    <span className="admin-appointment-modal-value">
                      {selectedAppointment.serviceName}
                    </span>
                  </div>
                )}
                <div className="admin-appointment-modal-field admin-appointment-modal-field--full">
                  <span className="admin-appointment-modal-label">
                    Purpose / Notes
                  </span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.purpose}
                  </span>
                </div>
                <div className="admin-appointment-modal-field admin-appointment-modal-field--full">
                  <span className="admin-appointment-modal-label">
                    Requested At
                  </span>
                  <span className="admin-appointment-modal-value">
                    {selectedAppointment.requestedAt}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-appointment-modal-footer">
              <button
                className="admin-appointment-modal-close-action"
                onClick={handleCloseDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
