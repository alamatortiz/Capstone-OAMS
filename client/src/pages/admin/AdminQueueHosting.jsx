import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin-queue-hosting.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";

// ── Icons ──────────────────────────────────────────────────────
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
const HomeIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const QueueIconNav = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const CalendarIconNav = ({ className }) => (
  <svg
    className={className}
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
const DocumentIconNav = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="13" x2="12" y2="17"></line>
    <line x1="9" y1="15" x2="15" y2="15"></line>
  </svg>
);
const HistoryIconNav = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
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
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="6 3 20 12 6 21 6 3"></polygon>
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const formatDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// ── College logo resolver ────────────────────────────────────────────────
// Resolves a college's logo image from /src/assets/{CODE}.png, falling
// back to the CCS logo if the specific college image is missing/404s.
const ccsLogoFallback = new URL("../../assets/CCS.png", import.meta.url).href;
const getCollegeLogo = (code) =>
  new URL(
    `../../assets/${(code || "CCS").toString().toUpperCase()}.png`,
    import.meta.url,
  ).href;

export default function AdminQueueHosting() {
  const { user: authUser, logout } = useAuth();
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "CCS",
      }
    : { name: "Admin", role: "admin", college: "", departmentAbbrev: "CCS" };

  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: `Hello! 👋 I'm your OAMS Assistant. How can I help you host queues for ${user.departmentAbbrev} today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // ── Real queue + service data (scoped server-side to admin's dept) ───────
  const [queues, setQueues] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting");
      setQueues(res.data.queues ?? []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Could not load queue data");
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting/services");
      setServices(res.data.services ?? []);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchQueues(), fetchServices()]);
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchQueues, fetchServices]);

  // ── "Open New Queue Line" modal state ─────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("100");
  const [serviceStart, setServiceStart] = useState("08:00");
  const [serviceEnd, setServiceEnd] = useState("17:00");
  const [noShowTimeout, setNoShowTimeout] = useState("15");

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

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    if (i.includes("open") || i.includes("new queue") || i.includes("host"))
      return 'Click "Open Queue Line" at the top of the page to launch a new queue for a service in your department.';
    if (i.includes("pause"))
      return "Use the Pause button on an active queue's card to stop new students from joining.";
    if (i.includes("resume"))
      return "Resume a paused queue from the Paused Queue Lines section to start accepting students again.";
    if (i.includes("close"))
      return "Closing a queue permanently ends it for today. You'll be asked to confirm before it closes.";
    if (i.includes("capacity"))
      return "Capacity shows how many students are currently waiting relative to the queue's maximum.";
    return `I can help with opening, pausing, resuming, and closing queue lines for ${user.departmentAbbrev}. What do you need?`;
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

  // ── Modal handlers ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setServiceId("");
    setMaxCapacity("100");
    setServiceStart("08:00");
    setServiceEnd("17:00");
    setNoShowTimeout("15");
  };
  const openModal = () => {
    resetForm();
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleOpenQueueSubmit = async () => {
    if (!serviceId) {
      toast.error("Please select a service to queue");
      return;
    }
    const capacityNum = parseInt(maxCapacity, 10);
    if (!capacityNum || capacityNum <= 0) {
      toast.error("Please enter a valid maximum queue capacity");
      return;
    }
    if (serviceStart >= serviceEnd) {
      toast.error("Start time must be before end time");
      return;
    }
    const noShowTimeoutNum = parseInt(noShowTimeout, 10);
    if (!noShowTimeoutNum || noShowTimeoutNum <= 0) {
      toast.error("Please enter a valid no-show timeout in minutes");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/admin/queue-hosting", {
        serviceId,
        maxCapacity: capacityNum,
        startTime: `${serviceStart}:00`,
        endTime: `${serviceEnd}:00`,
        noShowTimeoutMinutes: noShowTimeoutNum,
      });
      toast.success("Queue line opened successfully!");
      closeModal();
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to open queue line");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Queue lifecycle handlers (server-authoritative) ───────────────────────
  const handlePauseQueue = async (id) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/pause`);
      toast.message("Queue paused");
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to pause queue");
    }
  };

  const handleResumeQueue = async (id) => {
    try {
      await api.patch(`/admin/queue-hosting/${id}/resume`);
      toast.success("Queue resumed");
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to resume queue");
    }
  };

  const handleCloseQueue = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to close this queue? This action cannot be undone.",
      )
    )
      return;
    try {
      await api.patch(`/admin/queue-hosting/${id}/close`);
      toast.success("Queue closed");
      await fetchQueues();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to close queue");
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const activeQueues = queues.filter((q) => q.status === "open");
  const pausedQueues = queues.filter((q) => q.status === "paused");
  const closedQueues = queues.filter((q) => q.status === "closed");

  return (
    <div className="aqh-dashboard-with-sidebar">
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
      <aside className={`aqh-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="aqh-sidebar-inner">
          <div className="aqh-sidebar-logo">
            <div className="aqh-logo-container">
              <img src={ucLogo} alt="UC Logo" className="aqh-logo-img" />
              <img
                src={oamsLogo}
                alt="OAMS Logo"
                className="aqh-logo-img aqh-oams-logo-img"
              />
            </div>
            <button
              className="aqh-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          <div className="aqh-sidebar-user-section">
            <div className="aqh-user-top-row">
              <div className="aqh-user-avatar-large">
                <UserIcon />
              </div>
              <div className="aqh-user-info-content">
                <p className="aqh-user-name-large">{user?.name}</p>
                <span className="aqh-user-role-badge">Administrator</span>
              </div>
            </div>
            <div className="aqh-user-college-wrapper">
              <p className="aqh-user-college-text">
                {user?.college} ({user?.departmentAbbrev})
              </p>
            </div>
          </div>
          <nav className="aqh-sidebar-nav">
            <div className="aqh-nav-items">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`aqh-nav-item${location.pathname === item.path ? " active" : ""}`}
                  title={item.label}
                >
                  <item.icon className="aqh-nav-icon-medium" />
                  <span className="aqh-nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="aqh-sidebar-logout">
            <button className="aqh-logout-btn" onClick={handleLogout}>
              <LogOutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="aqh-mobile-header">
        <div className="aqh-mobile-header-content">
          <div className="aqh-mobile-logo">
            <img src={ucLogo} alt="UC Logo" className="aqh-logo-img" />
            <img
              src={oamsLogo}
              alt="OAMS Logo"
              className="aqh-logo-img aqh-oams-logo-img"
            />
          </div>
          <div className="aqh-mobile-header-actions">
            <button
              className="aqh-theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="aqh-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="aqh-dashboard-main">
        <div className="aqh-page-container">
          <div className="prof-breadcrumb"><Link to="/admin/dashboard" className="prof-breadcrumb-link"><ChevronLeftIcon />Home</Link></div>
          {/* Page Header */}
          <div className="aqh-page-header">
            <div className="aqh-title-section">
              <div className="aqh-title-icon">
                <QueueIconNav />
              </div>
              <div>
                <h1 className="aqh-page-title">Queue Hosting Management</h1>
                <p className="aqh-page-subtitle">
                  {user.college} ({user.departmentAbbrev}) — open, manage, and
                  close your department's queue lines
                </p>
              </div>
            </div>
            <button
              className="aqh-open-queue-btn"
              onClick={openModal}
              disabled={loading}
            >
              <PlusIcon />
              Open Queue Line
            </button>
          </div>

          {/* Summary Stats */}
          <div className="aqh-summary-grid">
            <div className="aqh-summary-card aqh-summary-active">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Active Queues</p>
                <p className="aqh-summary-value aqh-value-active">
                  {loading ? "—" : activeQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-active">
                <PlayIcon />
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-paused">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Paused Queues</p>
                <p className="aqh-summary-value aqh-value-paused">
                  {loading ? "—" : pausedQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-paused">
                <PauseIcon />
              </div>
            </div>
            <div className="aqh-summary-card aqh-summary-closed">
              <div className="aqh-summary-content">
                <p className="aqh-summary-label">Closed Queues</p>
                <p className="aqh-summary-value aqh-value-closed">
                  {loading ? "—" : closedQueues.length}
                </p>
              </div>
              <div className="aqh-summary-icon aqh-icon-closed">
                <CloseIcon />
              </div>
            </div>
          </div>

          {loading && (
            <p className="aqh-empty-state">
              Loading your department's queues...
            </p>
          )}

          {/* Active Queue Lines */}
          {!loading && activeQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Active Queue Lines</h2>
              <div className="aqh-queue-list">
                {activeQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-active"
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-active">
                          active
                        </span>
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-pause"
                            onClick={() => handlePauseQueue(queue.id)}
                          >
                            <PauseIcon />
                            <span>Pause</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={() => handleCloseQueue(queue.id)}
                          >
                            <CloseIcon />
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="aqh-queue-stats-row aqh-stats-row-4">
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Waiting / Max</p>
                        <p className="aqh-queue-stat-value">
                          {queue.currentCount} / {queue.maxCapacity}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Service Hours</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {queue.serviceHours.start} - {queue.serviceHours.end}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Opened At</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {new Date(queue.createdAt).toLocaleString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "numeric",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Capacity</p>
                        <div className="aqh-capacity-bar-track">
                          <div
                            className="aqh-capacity-bar-fill"
                            style={{
                              width: `${Math.min(100, (queue.currentCount / queue.maxCapacity) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Paused Queue Lines */}
          {!loading && pausedQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Paused Queue Lines</h2>
              <div className="aqh-queue-list">
                {pausedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-paused"
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <div className="aqh-queue-card-top-right">
                        <span className="aqh-status-badge aqh-status-paused">
                          paused
                        </span>
                        <div className="aqh-queue-card-actions">
                          <button
                            className="aqh-action-btn aqh-action-resume"
                            onClick={() => handleResumeQueue(queue.id)}
                          >
                            <PlayIcon />
                            <span>Resume</span>
                          </button>
                          <button
                            className="aqh-action-btn aqh-action-close"
                            onClick={() => handleCloseQueue(queue.id)}
                          >
                            <CloseIcon />
                            <span>Close</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="aqh-queue-stats-row aqh-stats-row-3">
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Waiting / Max</p>
                        <p className="aqh-queue-stat-value">
                          {queue.currentCount} / {queue.maxCapacity}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Service Hours</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {queue.serviceHours.start} - {queue.serviceHours.end}
                        </p>
                      </div>
                      <div className="aqh-queue-stat">
                        <p className="aqh-queue-stat-label">Served Today</p>
                        <p className="aqh-queue-stat-value aqh-stat-value-sm">
                          {queue.servedCount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Closed Queue Lines */}
          {!loading && closedQueues.length > 0 && (
            <section className="aqh-section">
              <h2 className="aqh-section-title">Closed Queue Lines (Today)</h2>
              <div className="aqh-queue-list">
                {closedQueues.map((queue) => (
                  <div
                    key={queue.id}
                    className="aqh-queue-card aqh-card-closed"
                  >
                    <div className="aqh-queue-card-top">
                      <div className="aqh-queue-card-title-row">
                        <img
                          src={getCollegeLogo(
                            queue.department || user.departmentAbbrev,
                          )}
                          alt={`${queue.department || user.departmentAbbrev} logo`}
                          className="aqh-queue-card-logo"
                          onError={(e) => {
                            if (e.currentTarget.src !== ccsLogoFallback) {
                              e.currentTarget.src = ccsLogoFallback;
                            }
                          }}
                        />
                        <div className="aqh-queue-card-title-block">
                          <h3 className="aqh-queue-card-title">
                            {queue.queueType}
                          </h3>
                          <p className="aqh-queue-card-dept">
                            {queue.department}
                          </p>
                        </div>
                      </div>
                      <span className="aqh-status-badge aqh-status-closed">
                        closed
                      </span>
                    </div>
                    <p className="aqh-closed-meta">
                      Served {queue.servedCount} student(s), capacity{" "}
                      {queue.maxCapacity}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && queues.length === 0 && (
            <div className="aqh-empty-state">
              <p>
                No queue lines yet today for {user.departmentAbbrev}. Open one
                to start serving students.
              </p>
            </div>
          )}
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="aqh-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Open New Queue Line Modal */}
      {showModal && (
        <div className="aqh-modal-overlay" onClick={closeModal}>
          <div className="aqh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aqh-modal-header">
              <div>
                <h2 className="aqh-modal-title">Open New Queue Line</h2>
                <p className="aqh-modal-subtitle">
                  For {user.college} ({user.departmentAbbrev}) only
                </p>
              </div>
              <button
                className="aqh-modal-close-btn"
                onClick={closeModal}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="aqh-modal-body">
              <div className="aqh-form-group">
                <label className="aqh-form-label">Service *</label>
                <div className="aqh-form-select-wrap">
                  <select
                    className="aqh-form-select"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    <option value="">Select a service</option>
                    {services.map((s) => (
                      <option key={s.service_id} value={s.service_id}>
                        {s.service_name}
                      </option>
                    ))}
                  </select>
                  <span className="aqh-select-chevron">
                    <ChevronDownIcon />
                  </span>
                </div>
                {services.length === 0 && (
                  <p className="aqh-modal-subtitle">
                    No services configured for your department yet.
                  </p>
                )}
              </div>

              <div className="aqh-form-group">
                <label className="aqh-form-label">
                  Maximum Queue Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  className="aqh-form-input"
                  placeholder="e.g., 100"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                />
              </div>

              <div className="aqh-form-group">
                <label className="aqh-form-label">
                  No-Show Timeout (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  className="aqh-form-input"
                  placeholder="e.g., 15"
                  value={noShowTimeout}
                  onChange={(e) => setNoShowTimeout(e.target.value)}
                />
                <p className="aqh-modal-subtitle">
                  A called student who doesn't show up within this many
                  minutes is automatically voided so you can call the next one.
                </p>
              </div>

              <div className="aqh-form-row">
                <div className="aqh-form-group">
                  <label className="aqh-form-label">Service Start Time *</label>
                  <div className="aqh-time-input-wrap">
                    <input
                      type="time"
                      className="aqh-form-input"
                      value={serviceStart}
                      onChange={(e) => setServiceStart(e.target.value)}
                    />
                    <ClockIcon />
                  </div>
                </div>
                <div className="aqh-form-group">
                  <label className="aqh-form-label">Service End Time *</label>
                  <div className="aqh-time-input-wrap">
                    <input
                      type="time"
                      className="aqh-form-input"
                      value={serviceEnd}
                      onChange={(e) => setServiceEnd(e.target.value)}
                    />
                    <ClockIcon />
                  </div>
                </div>
              </div>
            </div>

            <div className="aqh-modal-footer">
              <button className="aqh-btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="aqh-btn-submit"
                onClick={handleOpenQueueSubmit}
                disabled={submitting}
              >
                {submitting ? "Opening..." : "Open Queue Line"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}