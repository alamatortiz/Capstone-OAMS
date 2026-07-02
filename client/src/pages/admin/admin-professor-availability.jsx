import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin-professor-availability.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Icons ──────────────────────────────────────────────────────────────────
const ChatIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const SendIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg className="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  <svg className="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const XCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const CalendarSmallIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16v16H4z" opacity="0"></path>
    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
    <polyline points="22 6 12 13 2 6"></polyline>
  </svg>
);
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const STATUS_TABS = ["all", "available", "busy", "unavailable"];

export default function AdminProfessorAvailability() {
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
      text: "Hello! I'm your OAMS Assistant. How can I help you check faculty availability today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/admin/faculty-availability");
        setFaculty(res.data.faculty || []);
      } catch (err) {
        console.error("Failed to fetch faculty availability:", err);
        setError("Failed to load faculty data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFaculty();
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
    if (i.includes("available"))
      return `There are currently ${faculty.filter((f) => f.status === "available").length} faculty members available.`;
    if (i.includes("busy"))
      return `${faculty.filter((f) => f.status === "busy").length} faculty members are busy right now.`;
    if (i.includes("leave") || i.includes("unavailable"))
      return `${faculty.filter((f) => f.status === "unavailable").length} faculty members are unavailable today.`;
    if (i.includes("total"))
      return `There are ${faculty.length} faculty members in your department.`;
    return "I can help you check who's available, busy, or on leave. What do you need?";
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/admin/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/admin/queue" },
    { icon: CalendarIconNav, label: "Appointments", path: "/admin/appointments" },
    { icon: DocumentIconNav, label: "Documents", path: "/admin/documents" },
    { icon: HistoryIconNav, label: "Transactions", path: "/admin/transactions" },
  ];

  const filteredFaculty = faculty.filter((f) =>
    statusFilter === "all" || f.status === statusFilter
  );

  const getStatusBadgeClass = (status) => `apa-status-badge apa-status-${status}`;
  const getSlotClass = (status) => `apa-slot apa-slot-${status}`;

  const getInitials = (name) =>
    name
      .split(" ")
      .filter((n) => /^[A-Za-z]/.test(n))
      .map((n) => n[0])
      .join("")
      .slice(0, 3);

  return (
    <div className="apa-dashboard-with-sidebar">
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
      <aside className={`apa-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="apa-sidebar-inner">
          <div className="apa-sidebar-logo">
            <div className="apa-logo-container">
              <img src={ucLogo} alt="UC Logo" className="apa-logo-img" />
              <img src={oamsLogo} alt="OAMS Logo" className="apa-logo-img apa-oams-logo-img" />
            </div>
            <button
              className="apa-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="apa-sidebar-user-section">
            <div className="apa-user-top-row">
              <div className="apa-user-avatar-large">
                <UserIcon />
              </div>
              <div className="apa-user-info-content">
                <p className="apa-user-name-large">{user?.name}</p>
                <span className="apa-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="apa-user-college-wrapper">
              <p className="apa-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="apa-sidebar-nav">
            <div className="apa-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="apa-nav-item"
                  title={item.label}
                >
                  <item.icon className="apa-nav-icon-medium" />
                  <span className="apa-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="apa-sidebar-logout">
            <button className="apa-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="apa-mobile-header">
        <div className="apa-mobile-header-content">
          <div className="apa-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="apa-logo-img" />
            <img src={oamsLogo} alt="OAMS Logo" className="apa-logo-img apa-oams-logo-img" />
          </div>
          <div className="apa-mobile-header-actions">
            <button className="apa-theme-toggle-btn" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="apa-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="apa-dashboard-main">
        <div className="apa-page-container">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="apa-page-header">
            <div className="apa-title-section">
              <div className="apa-title-icon">
                <UsersIcon className="apa-icon-lg" />
              </div>
              <div>
                <h1 className="apa-page-title">Faculty Availability</h1>
                <p className="apa-page-subtitle">
                  Monitor faculty consultation schedules and availability for your department
                </p>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="apa-tabs">
            {STATUS_TABS.map((tab) => {
              const count = tab === "all" ? faculty.length : faculty.filter((f) => f.status === tab).length;
              return (
                <button
                  key={tab}
                  className={`apa-tab ${statusFilter === tab ? "apa-tab-active" : ""}`}
                  onClick={() => setStatusFilter(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="apa-tab-count">{loading ? "—" : count}</span>
                </button>
              );
            })}
          </div>

          {/* Faculty List */}
          <div className="apa-faculty-list">
            {loading && (
              <div className="apa-empty-state">
                <p className="apa-empty-text">Loading faculty data...</p>
              </div>
            )}

            {!loading && error && (
              <div className="apa-empty-state">
                <XCircleIcon className="apa-empty-icon" />
                <h3 className="apa-empty-title">Error loading faculty</h3>
                <p className="apa-empty-text">{error}</p>
              </div>
            )}

            {!loading && !error && filteredFaculty.map((f) => (
              <div key={f.id} className="apa-faculty-card">
                <div className="apa-faculty-top">
                  <div className="apa-faculty-identity">
                    <div className="apa-faculty-avatar">{getInitials(f.name)}</div>
                    <div className="apa-faculty-identity-text">
                      <h3 className="apa-faculty-name">{f.name}</h3>
                      <p className="apa-faculty-position">{f.position}</p>
                      <p className="apa-faculty-college">{f.college}</p>
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(f.status)}>
                    <span className="apa-status-dot"></span>
                    {f.status}
                  </span>
                </div>

                {f.currentActivity && (
                  <div className="apa-current-activity">
                    <strong>Current:</strong>&nbsp;{f.currentActivity}
                  </div>
                )}

                <div className="apa-faculty-meta">
                  <div className="apa-meta-row">
                    <CalendarSmallIcon className="apa-meta-icon" />
                    <span className="apa-meta-label">Next Available:</span>
                    <span className="apa-meta-value">{f.nextAvailableSlot}</span>
                  </div>
                  <div className="apa-meta-row apa-meta-row-contact">
                    <span className="apa-meta-contact">
                      <MailIcon className="apa-meta-icon" />
                      {f.email}
                    </span>
                  </div>
                </div>

                {f.todaySchedule.length > 0 && (
                  <div className="apa-schedule-section">
                    <p className="apa-schedule-label">Today's Schedule</p>
                    <div className="apa-schedule-grid">
                      {f.todaySchedule.map((slot, idx) => (
                        <div key={idx} className={getSlotClass(slot.status)}>
                          <div className="apa-slot-time-row">
                            <ClockIcon className="apa-slot-icon" />
                            <span className="apa-slot-time">{slot.time}</span>
                          </div>
                          <p className="apa-slot-activity">{slot.activity}</p>
                          {slot.location && slot.location !== "N/A" && (
                            <div className="apa-slot-location-row">
                              <MapPinIcon className="apa-slot-icon" />
                              <span className="apa-slot-location">{slot.location}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!loading && !error && filteredFaculty.length === 0 && (
              <div className="apa-empty-state">
                <UsersIcon className="apa-empty-icon" />
                <h3 className="apa-empty-title">No faculty found</h3>
                <p className="apa-empty-text">
                  {faculty.length === 0
                    ? "No faculty members are assigned to your department."
                    : "Try adjusting your filters."}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {sidebarOpen && <div className="apa-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}
