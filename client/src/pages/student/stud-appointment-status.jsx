import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ChevronLeft,
  Calendar,
  XCircle,
  Loader2,
  AlertCircle,
  LayoutList,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import { getCollegeLogo } from "../../data/collegeLogo";
import "./stud-queue-status.css";
import "./stud-queue-tracking.css";
import "./stud-document-status.css";
import "./stud-appointment-status.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusMeta = (status) => {
  switch (status) {
    case "pending":   return { label: "Pending",   cls: "apst-badge-pending" };
    case "approved":  return { label: "Approved",  cls: "apst-badge-approved" };
    case "completed": return { label: "Completed", cls: "apst-badge-completed" };
    case "rejected":  return { label: "Rejected",  cls: "apst-badge-rejected" };
    case "cancelled": return { label: "Cancelled", cls: "apst-badge-cancelled" };
    default:          return { label: status,      cls: "apst-badge-pending" };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
};
const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function AppointmentDetail({ appt, onBack, onCancel, cancelling, backLabel = "My Appointments" }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { label: statusLabel, cls: statusCls } = getStatusMeta(appt.status);
  const canCancel = appt.status === "pending" || appt.status === "approved";

  return (
    <div className="queue-status-container">
      <div className="queue-header">
        <div className="queue-breadcrumb">
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        </div>
        <div className="queue-title-section">
          <div className="apst-title-icon">
            <Calendar style={{ width: "1.75rem", height: "1.75rem" }} />
          </div>
          <div>
            <h1 className="queue-title">Appointment Details</h1>
            <p className="queue-subtitle">View the status of your appointment</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="apst-hero-card">
        <div className="queue-hero-content">
          <div className="queue-hero-logo">
            <img src={getCollegeLogo(appt.college)} alt={appt.college} />
          </div>
          <div className="queue-hero-text">
            <div className="queue-hero-header">
              <div className="queue-hero-title">
                <p className="queue-hero-service-name">{appt.person}</p>
                <p>{appt.college}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="queue-detail-grid">
        <div className="queue-detail-main">
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Calendar style={{ width: "1.25rem", height: "1.25rem" }} />
                Appointment Information
              </h3>
            </div>
            <div className="qss-card-content">
              <div className="dss-detail-row">
                <p className="dss-detail-label">Professor</p>
                <p className="dss-detail-value">{appt.person}</p>
              </div>
              <div className="dss-detail-row">
                <p className="dss-detail-label">College / Department</p>
                <p className="dss-detail-value">{appt.college}</p>
              </div>
              <div className="dss-detail-row">
                <p className="dss-detail-label">Date</p>
                <p className="dss-detail-value">{formatDate(appt.date)}</p>
              </div>
              <div className="dss-detail-row">
                <p className="dss-detail-label">Time</p>
                <p className="dss-detail-value">{appt.time}</p>
              </div>
              <div className="dss-detail-row">
                <p className="dss-detail-label">Location</p>
                <p className="dss-detail-value">{appt.location}</p>
              </div>
              {appt.purpose && (
                <div className="dss-detail-row">
                  <p className="dss-detail-label">Purpose</p>
                  <p className="dss-detail-value">{appt.purpose}</p>
                </div>
              )}
              {appt.createdAt && (
                <div className="dss-detail-row" style={{ borderBottom: "none" }}>
                  <p className="dss-detail-label">Booked On</p>
                  <p className="dss-detail-value">{formatDateShort(appt.createdAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="queue-detail-sidebar">
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <AlertCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                Status
              </h3>
              <span className={`dss-badge ${statusCls}`}>{statusLabel}</span>
            </div>
          </div>

          {canCancel && (
            <div className="qss-card apst-cancel-card">
              <div className="qss-card-header">
                <h3 className="qss-card-title apst-cancel-title">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem", color: "#ef4444" }} />
                  Cancel Appointment
                </h3>
              </div>
              <div className="qss-card-content">
                <p className="apst-cancel-desc">
                  Cancelling will permanently remove this appointment. You will need to book a new one if you change your mind.
                </p>
                <button
                  className="apst-cancel-btn"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelling === appt.id}
                >
                  <XCircle style={{ width: "1rem", height: "1rem" }} />
                  {cancelling === appt.id ? "Cancelling…" : "Cancel Appointment"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionConfirmModal
        show={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => { setShowCancelDialog(false); onCancel(appt.id); }}
        title="Cancel Appointment?"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        icon={<Calendar style={{ width: "22px", height: "22px" }} />}
        cancelText="Keep Appointment"
        confirmText="Cancel Appointment"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppointmentStatusPage() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "",
      }
    : { name: "Student", role: "student", college: "", departmentAbbrev: "" };

  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state ?? {};

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(navState.appointmentId ?? null);
  const [cancelling, setCancelling] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! I can help you with your appointments.", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/student/appointments");
      setAppointments(data.appointments ?? []);
    } catch (err) {
      setError("Could not load your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => { applyTheme(!prev ? "dark" : "light"); return !prev; });
  };

  const confirmLogout = () => { logout(); navigate("/login"); };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.delete(`/student/appointments/${id}`);
      toast.success("Appointment cancelled successfully");
      setSelectedId(null);
      await fetchAppointments();
    } catch (err) {
      toast.error(err?.response?.data?.error ?? "Failed to cancel the appointment.");
    } finally {
      setCancelling(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: prev.length + 1, type: "bot", text: "I can help you track your appointments. Click on any appointment card for details.", timestamp: new Date() },
      ]);
    }, 600);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const byStatus = (status) => appointments.filter((a) => a.status === status);
  const tabLists = {
    all:       appointments,
    pending:   byStatus("pending"),
    approved:  byStatus("approved"),
    completed: byStatus("completed"),
    rejected:  byStatus("rejected"),
    cancelled: byStatus("cancelled"),
  };

  const TAB_ICON_MAP = {
    all:       LayoutList,
    pending:   Clock,
    approved:  CheckCircle2,
    completed: CheckCircle2,
    rejected:  XCircle,
    cancelled: XCircle,
  };

  const TABS = [
    { key: "all",       label: "All" },
    { key: "pending",   label: "Pending" },
    { key: "approved",  label: "Approved" },
    { key: "completed", label: "Completed" },
    { key: "rejected",  label: "Rejected" },
    { key: "cancelled", label: "Cancelled" },
  ];

  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? null;

  const navItems = [
    { icon: HomeIcon, label: "Home", path: "/student/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/student/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/student/transactions" },
  ];

  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-logo">
            <div className="logo-container">
              <img src={ucLogo} alt="UC Logo" className="logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
            </div>
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user?.name ?? "Student"}</p>
                <span className="user-role-badge">Student</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-items">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`nav-item ${location.pathname === item.path ? "active" : ""}`} title={item.label}>
                  <item.icon className="nav-icon-medium" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="sidebar-logout">
            <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
              <LogOutIcon /><span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="logo-img oams-logo-img" />
          </div>
          <div className="mobile-header-actions">
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="dashboard-main apst-page">
        {selectedAppt ? (
          <AppointmentDetail
            appt={selectedAppt}
            backLabel="My Appointments"
            onBack={() => setSelectedId(null)}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        ) : (
          <div className="queue-status-container">
            {/* Header */}
            <div className="queue-header">
              <div className="queue-breadcrumb">
                <Link
                  to="/student/dashboard"
                  className="breadcrumb-link"
                >
                  <ChevronLeft className="breadcrumb-icon" />
                  Home
                </Link>
              </div>
              <div className="queue-title-section">
                <div className="apst-title-icon">
                  <Calendar style={{ width: "1.75rem", height: "1.75rem" }} />
                </div>
                <div>
                  <h1 className="queue-title">My Appointments</h1>
                  <p className="queue-subtitle">Track and manage all your appointment bookings</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="queue-empty-state" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                <AlertCircle className="queue-empty-icon" style={{ color: "#ef4444" }} />
                <p className="queue-empty-text">{error}</p>
              </div>
            )}

            {loading && (
              <div className="queue-empty-state">
                <Loader2 className="queue-empty-icon" style={{ animation: "spin 1s linear infinite" }} />
                <p className="queue-empty-text">Loading your appointments…</p>
              </div>
            )}

            {!loading && !error && (
              <div className="qt-tabs-container">
                <div className="apst-tabs-scrollable">
                  <div className="qt-tabs-list">
                    {TABS.map(({ key, label }) => {
                      const TabIcon = TAB_ICON_MAP[key];
                      return (
                        <button
                          key={key}
                          className={`qt-tab ${activeTab === key ? "active" : ""}`}
                          onClick={() => setActiveTab(key)}
                        >
                          {TabIcon && <TabIcon className="qt-tab-icon" />}
                          {label}
                          <span className="apst-tab-count">{tabLists[key].length}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="dss-list-container">
                  {tabLists[activeTab].length > 0 ? (
                    tabLists[activeTab].map((appt) => {
                      const { label, cls } = getStatusMeta(appt.status);
                      const isDim = appt.status === "completed" || appt.status === "rejected" || appt.status === "cancelled";
                      return (
                        <div
                          key={appt.id}
                          className={`dss-list-item ${isDim ? "dss-list-item-completed" : ""}`}
                          onClick={() => setSelectedId(appt.id)}
                        >
                          <div className="dss-list-header">
                            <div className={`dss-list-icon-wrap ${isDim ? "" : "apst-list-icon-wrap"}`}>
                              <Calendar style={{ width: "1.5rem", height: "1.5rem", color: isDim ? "var(--text-tertiary)" : undefined }} />
                            </div>
                            <div className="dss-list-title-section">
                              <h3 className="apst-list-name" style={isDim ? { color: "var(--text-tertiary)" } : undefined}>{appt.person}</h3>
                              <p className="dss-list-college">{appt.college}</p>
                            </div>
                            <span className={`dss-badge ${cls}`}>{label}</span>
                          </div>
                          <div className="dss-list-card-grid">
                            <div className="dss-list-card-field">
                              <label>Date</label>
                              <p>{formatDateShort(appt.date)}</p>
                            </div>
                            <div className="dss-list-card-field">
                              <label>Time</label>
                              <p>{appt.time}</p>
                            </div>
                            <div className="dss-list-card-field">
                              <label>Location</label>
                              <p>{appt.location}</p>
                            </div>
                            {appt.purpose && (
                              <div className="dss-list-card-field-full">
                                <label>Purpose</label>
                                <p>{appt.purpose}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="queue-empty-state">
                      <Calendar className="queue-empty-icon" />
                      <h3 className="queue-empty-title">
                        {activeTab === "all" ? "No Appointments Yet" : `No ${TABS.find(t => t.key === activeTab)?.label} Appointments`}
                      </h3>
                      <p className="queue-empty-text">
                        {activeTab === "all" || activeTab === "pending"
                          ? "Book an appointment to get started."
                          : `You have no ${activeTab} appointments.`}
                      </p>
                      {(activeTab === "all" || activeTab === "pending") && (
                        <button
                          onClick={() => navigate("/student/appointments")}
                          style={{
                            marginTop: "1rem",
                            background: "linear-gradient(135deg, #a855f7, #9333ea)",
                            color: "white",
                            border: "none",
                            padding: "0.75rem 1.5rem",
                            borderRadius: "0.75rem",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                          }}
                        >
                          Book an Appointment
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* AI Chat */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {chatOpen && (
          <div className="chat-container">
            <div className="chat-header">
              <h3>OAMS Assistant</h3>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)} aria-label="Close chat">
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
              <input type="text" className="chat-input" placeholder="Ask me anything..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              <button type="submit" className="chat-send-btn" aria-label="Send"><SendIcon /></button>
            </form>
          </div>
        )}
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat">
          <ChatIcon />
        </button>
      </div>

      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}
