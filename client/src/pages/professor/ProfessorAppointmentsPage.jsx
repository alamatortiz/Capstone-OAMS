import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./professor_dashboard.css";
import "./professor_appointments.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
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

// ── Appointment-specific icons ─────────────────────────────────────────────────
const AlertCircleIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const CheckCircle2Icon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const XCircleIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const CalendarSmIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockSmIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const MapPinIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const VideoIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const UserSmIcon = () => (
  <svg className="appt-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ── Stat icon (larger) ────────────────────────────────────────────────────────
const PendingStatIcon = () => (
  <svg className="appt-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="7" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const ApprovedStatIcon = () => (
  <svg className="appt-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const TodayStatIcon = () => (
  <svg className="appt-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const WeekStatIcon = () => (
  <svg className="appt-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const STATUS_CONFIG = {
  pending:   { className: "badge-pending",   icon: AlertCircleIcon },
  approved:  { className: "badge-approved",  icon: CheckCircle2Icon },
  rejected:  { className: "badge-rejected",  icon: XCircleIcon },
  completed: { className: "badge-completed", icon: CheckCircle2Icon },
  cancelled: { className: "badge-cancelled", icon: XCircleIcon },
};

// ── AppointmentCard ────────────────────────────────────────────────────────────
function AppointmentCard({ appointment, onApprove, onReject, onComplete, onCancel }) {
  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const dateStr = (() => {
    try { return new Date(appointment.date).toLocaleDateString(); }
    catch { return appointment.date; }
  })();

  return (
    <div className="appt-card">
      {/* Top row */}
      <div className="appt-top-row">
        <div className="appt-name-block">
          <div className="appt-name-row">
            <span className="appt-meta-icon"><UserSmIcon /></span>
            <span className="appt-name">{appointment.studentName}</span>
            <span className="appt-student-id">({appointment.studentId})</span>
          </div>
          <p className="appt-purpose">{appointment.purpose}</p>
        </div>
        <span className={`appt-badge ${cfg.className}`}>
          <Icon />{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </span>
      </div>

      {/* Meta grid */}
      <div className="appt-meta-grid">
        <div className="appt-meta-item">
          <span className="appt-meta-icon"><CalendarSmIcon /></span>
          <div>
            <p className="appt-meta-label">Date</p>
            <p className="appt-meta-value">{dateStr}</p>
          </div>
        </div>
        <div className="appt-meta-item">
          <span className="appt-meta-icon"><ClockSmIcon /></span>
          <div>
            <p className="appt-meta-label">Time</p>
            <p className="appt-meta-value">{appointment.time}</p>
          </div>
        </div>
        <div className="appt-meta-item">
          <span className="appt-meta-icon">
            {appointment.type === "online" ? <VideoIcon /> : <MapPinIcon />}
          </span>
          <div>
            <p className="appt-meta-label">Type</p>
            <p className="appt-meta-value">{appointment.type === "online" ? "Online" : "In-Person"}</p>
          </div>
        </div>
        <div className="appt-meta-item">
          <div>
            <p className="appt-meta-label">Duration</p>
            <p className="appt-meta-value">{appointment.duration}</p>
          </div>
        </div>
      </div>

      {/* Location */}
      {appointment.location && (
        <div className="appt-meta-item appt-extra-row">
          <span className="appt-meta-icon"><MapPinIcon /></span>
          <div>
            <p className="appt-meta-label">Location</p>
            <p className="appt-meta-value">{appointment.location}</p>
          </div>
        </div>
      )}

      {/* Meeting link */}
      {appointment.meetingLink && (
        <div className="appt-meta-item appt-extra-row">
          <span className="appt-meta-icon"><VideoIcon /></span>
          <div>
            <p className="appt-meta-label">Meeting Link</p>
            <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="appt-meeting-link">
              Join Meeting
            </a>
          </div>
        </div>
      )}

      {/* Notes */}
      {appointment.notes && (
        <div className="appt-notes">
          <p className="appt-meta-label">Notes</p>
          <p className="appt-notes-text">{appointment.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="appt-footer">
        {appointment.status === "pending" && (
          <>
            <button className="appt-btn appt-btn-approve" onClick={() => onApprove(appointment.id)}>
              <CheckCircle2Icon /> Approve
            </button>
            <button className="appt-btn appt-btn-reject" onClick={() => onReject(appointment.id)}>
              <XCircleIcon /> Reject
            </button>
          </>
        )}
        {appointment.status === "approved" && (
          <>
            <button className="appt-btn appt-btn-complete" onClick={() => onComplete(appointment.id)}>
              <CheckCircle2Icon /> Mark Complete
            </button>
            <button className="appt-btn appt-btn-cancel" onClick={() => onCancel(appointment.id)}>
              Cancel
            </button>
          </>
        )}
        <span className="appt-requested-at">Requested: {appointment.requestedAt}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessorAppointmentsPage() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        employeeId: authUser.employeeId ?? "",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Faculty", role: "faculty", college: "", employeeId: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [activeTab, setActiveTab] = useState("all");
  const [messages, setMessages] = useState([
    { id: 1, type: "bot", text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/faculty/appointments");
      setAppointments(res.data);
    } catch (err) {
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    pending:  appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    today:    appointments.filter((a) => a.date?.slice(0, 10) === today && ["pending","approved"].includes(a.status)).length,
    thisWeek: appointments.filter((a) => a.status === "approved").length,
  };

  const TABS = ["all", "pending", "approved", "completed", "rejected"];

  const filteredAppointments =
    activeTab === "all" ? appointments : appointments.filter((a) => a.status === activeTab);

  const updateStatus = async (id, status, successMsg, errorMsg) => {
    const apt = appointments.find((a) => a.id === id);
    try {
      await api.patch(`/faculty/appointments/${id}/status`, { status });
      await fetchAppointments();
      if (successMsg) toast.success(successMsg.replace("{name}", apt?.studentName ?? ""));
    } catch {
      toast.error(errorMsg ?? "Failed to update appointment");
    }
  };

  const handleApprove  = (id) => updateStatus(id, "approved",   "Approved appointment with {name}");
  const handleReject   = (id) => updateStatus(id, "rejected",   null, "Rejected appointment");
  const handleComplete = (id) => updateStatus(id, "completed",  "Appointment marked as completed");
  const handleCancel   = (id) => updateStatus(id, "cancelled",  "Appointment cancelled");

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { applyTheme(isDark ? "dark" : "light"); }, [isDark]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    setIsDark((prev) => { const next = !prev; applyTheme(next ? "dark" : "light"); return next; });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = { id: messages.length + 1, type: "user", text: inputValue, timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputValue("");
    setTimeout(() => {
      const bot = { id: messages.length + 2, type: "bot", text: generateBotResponse(inputValue), timestamp: new Date() };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("appointment")) return `You have ${stats.pending} pending and ${stats.approved} approved appointments.`;
    if (i.includes("pending")) return `There are ${stats.pending} pending appointments awaiting your action.`;
    if (i.includes("approved")) return `You have ${stats.approved} approved appointments.`;
    if (i.includes("today")) return `You have ${stats.today} appointments today.`;
    return "I can help you manage appointments, check statuses, and more. What do you need?";
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/professor/dashboard" },
    { icon: CalendarIconNav, label: "Appointments", path: "/professor/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/professor/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/professor/transactions" },
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
            <button className="theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode" title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="sidebar-user-section">
            <div className="user-top-row">
              <div className="user-avatar-large"><UserIcon /></div>
              <div className="user-info-content">
                <p className="user-name-large">{user.name ?? "Professor"}</p>
                <span className="user-role-badge">Professor</span>
              </div>
            </div>
            <div className="user-college-wrapper">
              <p className="user-college-text">{user?.college} ({user?.departmentAbbrev})</p>
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

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="appt-page-content">

          {/* Page Header */}
          <div className="appt-page-header">
            <h1 className="appt-page-title">Appointment Management</h1>
            <p className="appt-page-subtitle">Review and manage student appointment requests</p>
          </div>

          {/* Stats Grid */}
          <div className="appt-stats-grid">
            <div className="appt-stat-card appt-stat-pending">
              <div>
                <p className="appt-stat-label">Pending</p>
                <p className="appt-stat-value appt-stat-value--yellow">{stats.pending}</p>
              </div>
              <span className="appt-stat-icon-wrap appt-stat-icon--yellow"><PendingStatIcon /></span>
            </div>
            <div className="appt-stat-card appt-stat-approved">
              <div>
                <p className="appt-stat-label">Approved</p>
                <p className="appt-stat-value appt-stat-value--green">{stats.approved}</p>
              </div>
              <span className="appt-stat-icon-wrap appt-stat-icon--green"><ApprovedStatIcon /></span>
            </div>
            <div className="appt-stat-card appt-stat-today">
              <div>
                <p className="appt-stat-label">Today</p>
                <p className="appt-stat-value appt-stat-value--blue">{stats.today}</p>
              </div>
              <span className="appt-stat-icon-wrap appt-stat-icon--blue"><TodayStatIcon /></span>
            </div>
            <div className="appt-stat-card appt-stat-week">
              <div>
                <p className="appt-stat-label">This Week</p>
                <p className="appt-stat-value appt-stat-value--purple">{stats.thisWeek}</p>
              </div>
              <span className="appt-stat-icon-wrap appt-stat-icon--purple"><WeekStatIcon /></span>
            </div>
          </div>

          {/* Appointments Card */}
          <div className="appt-main-card">
            <div className="appt-card-header">
              <p className="appt-card-title">Appointment Requests</p>
              <p className="appt-card-desc">Manage student appointments and consultations</p>
            </div>

            {/* Tabs */}
            <div className="appt-tabs-list">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`appt-tab-trigger${activeTab === tab ? " active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="appt-list">
              {loading ? (
                <div className="appt-empty">Loading appointments...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="appt-empty">No appointments found.</div>
              ) : (
                filteredAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* AI Chatbot */}
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
        <button className={`chat-fab ${chatOpen ? "hidden" : ""}`} onClick={() => setChatOpen(true)} aria-label="Open chat">
          <ChatIcon />
        </button>
      </div>
      <LogoutConfirmModal show={showLogoutConfirm} onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
    </div>
  );
}