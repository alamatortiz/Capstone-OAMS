import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./admin_queue.css";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import { toast } from "sonner";
import api from "../../utils/api";

// ── Icons ──────────────────────────────────────────────────────────────────
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

const ActivityIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TrendingUpIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 9 8 15 8 15 18" />
    <polyline points="6 18 3 18 3 7 21 7 21 18 18 18" />
    <line x1="9" y1="13" x2="15" y2="13" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
  </svg>
);

const AlertCircleIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v6" />
    <path d="M12 16h.01" />
  </svg>
);

export default function AdminQueue() {
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
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you with queue management today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Queue state (live data, scoped server-side to the admin's own department)
  const [queueDetails, setQueueDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoringQueueId, setMonitoringQueueId] = useState(null);

  const fetchQueueDetails = useCallback(async () => {
    try {
      const res = await api.get("/admin/queue-hosting");
      setQueueDetails(res.data.queues ?? []);
    } catch (error) {
      console.error("Failed to fetch queues:", error);
      toast.error("Could not load queue data");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchQueueDetails();
      setLoading(false);
    };
    if (authUser) init();
  }, [authUser, fetchQueueDetails]);

  // Re-derive the monitored queue from live data on every refresh, so the
  // monitor view always reflects the latest call-next/serve/pause actions
  const monitoringQueue =
    queueDetails.find((q) => q.id === monitoringQueueId) || null;

  // Handlers
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
    if (i.includes("queue") || i.includes("waiting"))
      return `Currently managing ${systemStats.totalQueues} active queue line(s) with ${systemStats.totalWaiting} students waiting.`;
    if (i.includes("busy") || i.includes("status")) {
      const busiest = Math.max(
        0,
        ...queueDetails.map((q) => q.currentCount || 0),
      );
      return `Your busiest queue line right now has ${busiest} students waiting.`;
    }
    if (i.includes("average") || i.includes("wait"))
      return `The average service time across your queue lines is ${systemStats.avgWaitTime}.`;
    if (i.includes("monitor"))
      return "Click the Monitor button on any queue detail to track it in real-time and receive live updates.";
    return "I can help you with queue monitoring, wait time analysis, and department statistics. What would you like to know?";
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

  // Only today's currently open/paused queue lines count as "active"
  const activeQueueDetails = queueDetails.filter(
    (q) => q.status === "open" || q.status === "paused",
  );

  const systemStats = {
    totalQueues: activeQueueDetails.length,
    totalWaiting: activeQueueDetails.reduce(
      (sum, q) => sum + (q.currentCount || 0),
      0,
    ),
    avgWaitTime: (() => {
      const withAvg = activeQueueDetails.filter(
        (q) => q.avgServiceMinutes != null,
      );
      if (withAvg.length === 0) return "N/A";
      const avg =
        withAvg.reduce((sum, q) => sum + q.avgServiceMinutes, 0) /
        withAvg.length;
      return `${Math.round(avg)} mins`;
    })(),
    operational: activeQueueDetails.filter((q) => q.status === "open").length,
  };

  const formatAvgService = (minutes) =>
    minutes != null ? `${minutes} mins` : "No data yet";

  const getQueueStatusLabel = (status) => {
    switch (status) {
      case "open":
        return "Active";
      case "paused":
        return "Paused";
      case "closed":
        return "Closed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // ── Queue action handlers (server-authoritative) ─────────────────────────
  const handleCallNext = async (slotId) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/call-next`);
      toast.success("Next student called");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ?? "Failed to call next student",
      );
    }
  };

  const handleMarkAsServed = async (slotId) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/serve`);
      toast.success("Student marked as served");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ?? "Failed to mark student as served",
      );
    }
  };

  const handlePauseQueue = async (slotId) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/pause`);
      toast.message("Queue paused");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to pause queue");
    }
  };

  const handleResumeQueue = async (slotId) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/resume`);
      toast.success("Queue resumed");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to resume queue");
    }
  };

  const handleStopQueue = async (slotId) => {
    if (
      !window.confirm(
        "Are you sure you want to stop this queue? This action cannot be undone.",
      )
    )
      return;
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/close`);
      toast.success("Queue stopped");
      setMonitoringQueueId(null);
      await fetchQueueDetails();
    } catch (error) {
      toast.error(error?.response?.data?.error ?? "Failed to stop queue");
    }
  };

  // Render monitoring detail view
  if (monitoringQueue) {
    const queueProgress = monitoringQueue.maxCapacity
      ? Math.min(
          100,
          Math.max(
            0,
            ((monitoringQueue.maxCapacity - monitoringQueue.currentCount) /
              monitoringQueue.maxCapacity) *
              100,
          ),
        )
      : 0;
    const estimatedWaitMinutes =
      monitoringQueue.avgServiceMinutes != null
        ? monitoringQueue.avgServiceMinutes * monitoringQueue.currentCount
        : null;

    return (
      <div className="admin-queue-with-sidebar">
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
          className={`admin-dashboard-sidebar ${sidebarOpen ? "open" : ""}`}
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

        {/* Main Content - Queue Monitoring Detail */}
        <main className="admin-queue-main">
          <div className="queue-monitoring-container">
            <div className="queue-monitoring-topbar">
              <button
                className="btn-back-queue"
                onClick={() => setMonitoringQueueId(null)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Queue List
              </button>
              {/* refresh icon aligned to the right edge of the back button */}
              <button
                className="btn-refresh-queue queue-monitoring-refresh"
                onClick={fetchQueueDetails}
              >
                <RefreshIcon />
              </button>
            </div>

            {/* Queue Header Card */}
            <div className="queue-monitoring-header">
              <div className="queue-header-content">
                <div className="queue-header-text">
                  <h1 className="queue-monitoring-title">
                    {monitoringQueue.queueType}
                  </h1>
                  <p className="queue-monitoring-college">
                    {monitoringQueue.college}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="queue-monitoring-stats">
              <div className="queue-stat-card">
                <div className="queue-stat-label">Currently Serving</div>
                <div className="queue-stat-value">
                  {monitoringQueue.currentlyServingStudentNumber || "—"}
                </div>
                <ClockIcon className="queue-stat-icon" />
              </div>
              <div className="queue-stat-card">
                <div className="queue-stat-label">Students Waiting</div>
                <div className="queue-stat-value" style={{ color: "#3b82f6" }}>
                  {monitoringQueue.currentCount}
                </div>
                <UsersIcon className="queue-stat-icon" />
              </div>
              <div className="queue-stat-card">
                <div className="queue-stat-label">Avg Service Time</div>
                <div className="queue-stat-value" style={{ color: "#ef4444" }}>
                  {formatAvgService(monitoringQueue.avgServiceMinutes)}
                </div>
                <ClockIcon
                  className="queue-stat-icon"
                  style={{ color: "#ef4444" }}
                />
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="queue-monitoring-grid">
              {/* Left Column */}
              <div className="queue-monitoring-left">
                {/* Queue Progress */}
                <div className="queue-detail-card">
                  <div className="queue-detail-header">
                    <h3>Queue Progress</h3>
                  </div>
                  <div className="queue-detail-content">
                    <div className="progress-section">
                      <div className="progress-label">
                        <span>Processing Rate</span>
                        <span>{Math.round(queueProgress)}% Complete</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${queueProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="progress-stats">
                      <div className="progress-stat">
                        <span className="progress-stat-label">
                          Total Served Today
                        </span>
                        <span className="progress-stat-value">
                          {monitoringQueue.servedCount}
                        </span>
                      </div>
                      <div className="progress-stat">
                        <span className="progress-stat-label">
                          Est. Wait Time
                        </span>
                        <span className="progress-stat-value">
                          {estimatedWaitMinutes != null
                            ? `${estimatedWaitMinutes} mins`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queue Actions */}
                <div className="queue-detail-card">
                  <div className="queue-detail-header">
                    <h3>Queue Actions</h3>
                  </div>
                  <div className="queue-actions-grid">
                    <button
                      className="queue-action-btn"
                      onClick={() => handleCallNext(monitoringQueue.id)}
                      disabled={
                        !!monitoringQueue.currentlyServingStudentNumber ||
                        monitoringQueue.currentCount === 0
                      }
                    >
                      <UsersIcon />
                      Call Next
                    </button>
                    {monitoringQueue.status === "paused" ? (
                      <button
                        className="queue-action-btn"
                        onClick={() => handleResumeQueue(monitoringQueue.id)}
                      >
                        <AlertCircleIcon />
                        Resume Queue
                      </button>
                    ) : (
                      <button
                        className="queue-action-btn"
                        onClick={() => handlePauseQueue(monitoringQueue.id)}
                      >
                        <AlertCircleIcon />
                        Pause Queue
                      </button>
                    )}
                    <button
                      className="queue-action-btn"
                      onClick={() => handleStopQueue(monitoringQueue.id)}
                    >
                      <CloseIcon />
                      Stop Queue
                    </button>
                    <button className="queue-action-btn">
                      <TrendingUpIcon />
                      Export Data
                    </button>
                  </div>
                </div>

                {/* Currently Serving */}
                <div className="queue-detail-card">
                  <div className="queue-detail-header">
                    <h3>
                      <ClockIcon />
                      Currently Serving
                    </h3>
                  </div>
                  <div className="queue-detail-content">
                    <p className="professor-name">
                      {monitoringQueue.currentlyServingStudentNumber ||
                        "No student is currently being served"}
                    </p>
                    <p className="professor-label">
                      {monitoringQueue.queueType}
                    </p>
                    <button
                      className="queue-action-btn"
                      style={{ width: "100%", marginTop: "0.75rem" }}
                      onClick={() => handleMarkAsServed(monitoringQueue.id)}
                      disabled={!monitoringQueue.currentlyServingStudentNumber}
                    >
                      <AlertCircleIcon />
                      Mark as Served
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="queue-monitoring-right">
                {/* Location */}
                <div className="queue-detail-card">
                  <div className="queue-detail-header">
                    <h3>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      Location
                    </h3>
                  </div>
                  <div className="queue-detail-content">
                    <p className="queue-detail-text">
                      {monitoringQueue.location || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Service Hours */}
                {monitoringQueue.serviceHours && (
                  <div className="queue-detail-card">
                    <div className="queue-detail-header">
                      <h3>
                        <ClockIcon />
                        Service Hours
                      </h3>
                    </div>
                    <div className="queue-detail-content">
                      <div
                        className="service-hours-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span className="service-hours-label">Opens</span>
                        <span className="service-hours-value">
                          {monitoringQueue.serviceHours.start}
                        </span>
                      </div>
                      <div
                        className="service-hours-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span className="service-hours-label">Closes</span>
                        <span className="service-hours-value">
                          {monitoringQueue.serviceHours.end}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="queue-detail-card">
                  <div className="queue-detail-header">
                    <h3>
                      <ActivityIcon />
                      Status
                    </h3>
                  </div>
                  <div className="queue-detail-content">
                    <div className="status-badge">
                      {getQueueStatusLabel(monitoringQueue.status)}
                    </div>
                  </div>
                </div>
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

  // Render main queue list view
  return (
    <div className="admin-queue-with-sidebar">
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
      <main className="admin-queue-main">
        <div className="queue-page-container">
          {/* Header */}
          <div className="queue-page-header">
            <h1>Centralized Queue Management</h1>
            <p>Monitor and control queues for your department</p>
          </div>

          {/* System Stats */}
          <div className="queue-system-stats">
            <div className="queue-stat-box">
              <div className="queue-stat-box-content">
                <div className="queue-stat-box-text">
                  <p className="queue-stat-box-label">Active Queues</p>
                  <p className="queue-stat-box-value">
                    {systemStats.totalQueues}
                  </p>
                </div>
                <ActivityIcon className="queue-stat-box-icon" />
              </div>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-content">
                <div className="queue-stat-box-text">
                  <p className="queue-stat-box-label">Total Waiting</p>
                  <p
                    className="queue-stat-box-value"
                    style={{ color: "#3b82f6" }}
                  >
                    {systemStats.totalWaiting}
                  </p>
                </div>
                <UsersIcon
                  className="queue-stat-box-icon"
                  style={{ color: "#3b82f6" }}
                />
              </div>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-content">
                <div className="queue-stat-box-text">
                  <p className="queue-stat-box-label">Avg Wait Time</p>
                  <p
                    className="queue-stat-box-value"
                    style={{ color: "#ef4444" }}
                  >
                    {systemStats.avgWaitTime}
                  </p>
                </div>
                <ClockIcon
                  className="queue-stat-box-icon"
                  style={{ color: "#ef4444" }}
                />
              </div>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-content">
                <div className="queue-stat-box-text">
                  <p className="queue-stat-box-label">Operational</p>
                  <p className="queue-stat-box-value">
                    {systemStats.operational}/{systemStats.totalQueues}
                  </p>
                </div>
                <TrendingUpIcon className="queue-stat-box-icon" />
              </div>
            </div>
          </div>

          {/* Active Queue Details */}
          <div className="queue-details-section">
            <div className="queue-section-header">
              <div className="queue-section-title">
                <h2>Active Queue Details</h2>
                <p>Queue information for {user?.college}</p>
              </div>
            </div>
            <div className="queue-details-list">
              {loading ? (
                <div className="queue-empty-state">
                  <ActivityIcon />
                  <p>Loading queues…</p>
                </div>
              ) : activeQueueDetails.length === 0 ? (
                <div className="queue-empty-state">
                  <ActivityIcon />
                  <p>No active queues found</p>
                </div>
              ) : (
                activeQueueDetails.map((detail) => (
                  <div key={detail.id} className="queue-detail-row">
                    <div className="queue-detail-info">
                      <div className="queue-detail-header-row">
                        <BuildingIcon className="queue-detail-icon" />
                        <span className="queue-detail-abbrev">
                          {detail.college}
                        </span>
                        <span className="queue-detail-service">
                          {detail.queueType}
                        </span>
                      </div>
                      <div className="queue-detail-grid">
                        <div className="queue-detail-item">
                          <span className="queue-detail-item-label">
                            Currently Serving
                          </span>
                          <span className="queue-detail-item-value">
                            {detail.currentlyServingStudentNumber || "—"}
                          </span>
                        </div>
                        <div className="queue-detail-item">
                          <span className="queue-detail-item-label">
                            Waiting
                          </span>
                          <span className="queue-detail-item-value">
                            {detail.currentCount} students
                          </span>
                        </div>
                        <div className="queue-detail-item">
                          <span className="queue-detail-item-label">
                            Avg Service
                          </span>
                          <span className="queue-detail-item-value">
                            {formatAvgService(detail.avgServiceMinutes)}
                          </span>
                        </div>
                        {detail.location && (
                          <div className="queue-detail-item">
                            <span className="queue-detail-item-label">
                              Location
                            </span>
                            <span className="queue-detail-item-value">
                              {detail.location}
                            </span>
                          </div>
                        )}
                        {detail.serviceHours && (
                          <div className="queue-detail-item">
                            <span className="queue-detail-item-label">
                              Service Hours
                            </span>
                            <span className="queue-detail-item-value">
                              {detail.serviceHours.start} -{" "}
                              {detail.serviceHours.end}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn-monitor"
                      onClick={() => setMonitoringQueueId(detail.id)}
                    >
                      <AlertCircleIcon />
                      Monitor
                    </button>
                  </div>
                ))
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
