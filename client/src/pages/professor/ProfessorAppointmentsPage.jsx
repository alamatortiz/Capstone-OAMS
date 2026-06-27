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
import { Calendar, Clock, CheckCircle2, XCircle, LayoutList } from "lucide-react";

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
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "1.25rem", height: "1.25rem" }}>
    <polyline points="15 18 9 12 15 6" />
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

const TAB_ICON_MAP = {
  all:       LayoutList,
  pending:   Clock,
  approved:  CheckCircle2,
  completed: CheckCircle2,
  rejected:  XCircle,
};

// ── AppointmentCard ────────────────────────────────────────────────────────────
function AppointmentCard({ appointment, onApprove, onReject, onComplete, onCancel }) {
  const dateStr = (() => {
    try {
      return new Date(`${appointment.date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch { return appointment.date; }
  })();

  const statusLabel = appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);

  return (
    <div className="appt-card">
      {/* Header: icon + student name/purpose + badge */}
      <div className="appt-card-header-row">
        <div className="appt-card-icon-wrap">
          <Calendar style={{ width: "1.5rem", height: "1.5rem" }} />
        </div>
        <div className="appt-card-title-section">
          <h3 className="appt-card-name">{appointment.studentName}</h3>
          <p className="appt-card-sub">
            {appointment.studentId}{appointment.purpose ? ` · ${appointment.purpose}` : ""}
          </p>
        </div>
        <span className={`appt-status-badge appt-status-badge--${appointment.status}`}>
          {statusLabel}
        </span>
      </div>

      {/* Info grid */}
      <div className="appt-info-grid">
        <div className="appt-info-field">
          <label>Date</label>
          <p>{dateStr}</p>
        </div>
        <div className="appt-info-field">
          <label>Time</label>
          <p>{appointment.time}</p>
        </div>
        <div className="appt-info-field">
          <label>Type</label>
          <p>{appointment.type === "online" ? "Online" : "In-Person"}</p>
        </div>
        <div className="appt-info-field">
          <label>Duration</label>
          <p>{appointment.duration || "—"}</p>
        </div>
        {appointment.location && (
          <div className="appt-info-field appt-info-field--full">
            <label>Location</label>
            <p>{appointment.location}</p>
          </div>
        )}
        {appointment.meetingLink && (
          <div className="appt-info-field appt-info-field--full">
            <label>Meeting Link</label>
            <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="appt-meeting-link">
              Join Meeting
            </a>
          </div>
        )}
        {appointment.notes && (
          <div className="appt-info-field appt-info-field--full">
            <label>Notes</label>
            <p className="appt-notes-text">{appointment.notes}</p>
          </div>
        )}
      </div>

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
    const pending  = appointments.filter((a) => a.status === "pending").length;
    const approved = appointments.filter((a) => a.status === "approved").length;
    const today    = new Date().toISOString().slice(0, 10);
    const todayCount = appointments.filter((a) => a.date?.slice(0, 10) === today && ["pending", "approved"].includes(a.status)).length;
    if (i.includes("appointment")) return `You have ${pending} pending and ${approved} approved appointments.`;
    if (i.includes("pending")) return `There are ${pending} pending appointments awaiting your action.`;
    if (i.includes("approved")) return `You have ${approved} approved appointments.`;
    if (i.includes("today")) return `You have ${todayCount} appointments today.`;
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

          {/* Breadcrumb */}
          <div className="prof-breadcrumb">
            <Link to="/professor/dashboard" className="prof-breadcrumb-link">
              <ChevronLeftIcon />
              Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="appt-page-header">
            <div className="appt-title-section">
              <div className="appt-title-icon">
                <Calendar style={{ width: "1.75rem", height: "1.75rem" }} />
              </div>
              <div>
                <h1 className="appt-page-title">Appointment Management</h1>
                <p className="appt-page-subtitle">Review and manage student appointment requests</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="appt-tabs-nav">
            <div className="appt-tabs-list">
              {TABS.map((tab) => {
                const TabIcon = TAB_ICON_MAP[tab];
                const count = tab === "all"
                  ? appointments.length
                  : appointments.filter((a) => a.status === tab).length;
                return (
                  <button
                    key={tab}
                    className={`appt-tab-trigger${activeTab === tab ? " active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TabIcon && <TabIcon className="appt-tab-icon" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="appt-tab-count">{loading ? "—" : count}</span>
                  </button>
                );
              })}
            </div>
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