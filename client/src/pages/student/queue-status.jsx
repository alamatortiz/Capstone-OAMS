import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Clock,
  Users,
  ChevronLeft,
  MessageSquare,
  Calendar,
  TrendingUp,
  XCircle,
  Loader2,
} from "lucide-react";
import { getCollegeLogo } from "../../data/collegeLogo";
import { useQueue } from "../../contexts/QueueContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./queue-status.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
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

export default function QueueStatusPage() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const { queues, isLoading, error, leaveQueue, updateQueueNotes } = useQueue();

  // ── User data ────────────────────────────────────────────────────────────
  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        studentNumber: authUser.studentNumber ?? "N/A Student Number",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A Abbreviation",
        course: authUser.course ?? "N/A Course",
      }
    : {
        name: "Student",
        role: "student",
        college: "",
        studentId: "",
        studentNumber: "N/A Student Number",
        departmentAbbrev: "",
        course: "",
      };

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [showConcernDialog, setShowConcernDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [concernText, setConcernText] = useState("");
  const [savingConcern, setSavingConcern] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you track your queue?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // The currently-selected queue, always derived fresh from `queues` so it
  // stays in sync after a refetch (e.g. position changes, notes update).
  const selectedQueue = selectedQueueId
    ? (queues.find((q) => q.queueId === selectedQueueId) ?? null)
    : null;

  // If the selected queue disappears (e.g. cancelled), drop back to the list.
  useEffect(() => {
    if (selectedQueueId && !selectedQueue) {
      setSelectedQueueId(null);
    }
  }, [selectedQueueId, selectedQueue]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const handleOpenConcernDialog = () => {
    setConcernText(selectedQueue?.notes ?? "");
    setShowConcernDialog(true);
  };

  const handleUpdateConcern = async () => {
    if (!selectedQueue) return;
    setSavingConcern(true);
    try {
      await updateQueueNotes(selectedQueue.queueId, concernText.trim());
      toast.success("Concern updated successfully");
      setShowConcernDialog(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingConcern(false);
    }
  };

  const handleCancelQueue = async () => {
    if (!selectedQueue) return;
    setCancelling(true);
    try {
      await leaveQueue(selectedQueue.queueId);
      toast.success("Queue cancelled successfully");
      setShowCancelDialog(false);
      setSelectedQueueId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === "") return;
    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages([...messages, userMessage]);
    setInputValue("");
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: "bot",
        text: generateBotResponse(inputValue, selectedQueue),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 600);
  };

  const generateBotResponse = (userInput, queue) => {
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes("position")) {
      return queue
        ? `You're currently at position ${queue.position} in the ${queue.serviceName} queue. There are ${Math.max(queue.totalWaiting - queue.position, 0)} people ahead of you.`
        : "You don't have any active queues right now.";
    } else if (lowerInput.includes("wait") || lowerInput.includes("time")) {
      return queue
        ? `Your estimated wait time is ${queue.estimatedWait}. You joined at ${queue.joinedAt}.`
        : "Join a queue to see your wait time.";
    } else if (lowerInput.includes("service") || lowerInput.includes("help")) {
      return "I can help you with your queue position, estimated wait time, and more. What would you like to know?";
    } else if (lowerInput.includes("cancel") || lowerInput.includes("leave")) {
      return "You can cancel your queue from the Queue Status page using the Cancel Queue button. Would you like help with anything else?";
    } else {
      return "That's a great question! For more detailed assistance, please check the queue details or contact your college office.";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "waiting":
        return "queue-status-waiting";
      case "serving":
        return "queue-status-active";
      case "completed":
        return "queue-status-completed";
      default:
        return "queue-status-waiting";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "waiting":
        return "Waiting";
      case "serving":
        return "Now Serving — It's Your Turn!";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const navItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/student/dashboard" },
    { icon: QueueIconNav, label: "Queue", path: "/student/queue" },
    {
      icon: CalendarIconNav,
      label: "Appointments",
      path: "/student/appointments",
    },
    { icon: DocumentIconNav, label: "Documents", path: "/student/documents" },
    {
      icon: HistoryIconNav,
      label: "Transactions",
      path: "/student/transactions",
    },
  ];

  // ── Detail View ──────────────────────────────────────────────────────────────
  const queueDetailView = (queue) => {
    const queueProgress =
      queue.totalWaiting > 0
        ? ((queue.totalWaiting - queue.position) / queue.totalWaiting) * 100
        : 0;
    const peopleAhead = Math.max(queue.position - 1, 0);

    return (
      <div className="queue-status-container">
        <div className="queue-status-header">
          <div className="queue-breadcrumb">
            <button
              type="button"
              className="breadcrumb-link"
              onClick={() => setSelectedQueueId(null)}
            >
              <ChevronLeft className="breadcrumb-icon" />
              All Queues
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="queue-hero-card">
          <div className="queue-hero-content">
            <div className="queue-hero-logo">
              <img
                src={getCollegeLogo(queue.departmentName)}
                alt={queue.departmentName}
              />
            </div>
            <div className="queue-hero-text">
              <div className="queue-hero-header">
                <div className="queue-hero-title">
                  <h2>Queue Status</h2>
                  <p>{queue.serviceName}</p>
                  <p style={{ fontSize: "0.875rem", opacity: 0.9 }}>
                    {queue.departmentName}
                  </p>
                </div>
                <div className="queue-hero-badge">{queue.queueNumberBadge}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="queue-detail-grid">
          <div className="queue-detail-main">
            {/* Queue Placement */}
            <div className="queue-card">
              <div className="queue-card-header">
                <h3 className="queue-card-title">
                  <Users className="w-5 h-5" />
                  Queue Placement
                </h3>
              </div>
              <div className="queue-card-content">
                <div className="queue-placement-center">
                  <div className="queue-position-display">
                    <div className="queue-position-label">Your Position</div>
                    <div>
                      <div className="queue-position-number">
                        {queue.position}
                      </div>
                      <div className="queue-position-total">
                        / {queue.totalWaiting}
                      </div>
                    </div>
                    <div
                      className="queue-position-message"
                      style={{ marginTop: "1rem" }}
                    >
                      {queue.status === "serving"
                        ? "You're being served now!"
                        : queue.position === 1
                          ? "You're next!"
                          : `${peopleAhead} ${peopleAhead === 1 ? "person" : "people"} ahead of you`}
                    </div>
                  </div>

                  <div className="queue-progress-section">
                    <div className="queue-progress-label">
                      <span>Queue Progress</span>
                      <span>{Math.round(queueProgress)}%</span>
                    </div>
                    <div className="queue-progress-bar">
                      <div
                        className="queue-progress-fill"
                        style={{ width: `${queueProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated Wait */}
            <div className="queue-card">
              <div className="queue-card-header">
                <h3 className="queue-card-title">
                  <Clock className="w-5 h-5" />
                  Estimated Wait Time
                </h3>
              </div>
              <div className="queue-card-content">
                <div className="queue-wait-time-display">
                  <div className="queue-wait-time-left">
                    <div className="queue-wait-time-value">
                      {queue.estimatedWait}
                    </div>
                    <div className="queue-wait-time-joined">
                      Joined at {queue.joinedAt}
                    </div>
                  </div>
                  <div className="queue-wait-time-icon">
                    <Clock />
                  </div>
                </div>
              </div>
            </div>

            {/* Your Concern */}
            <div className="queue-card">
              <div className="queue-card-header">
                <h3 className="queue-card-title">
                  <MessageSquare className="w-5 h-5" />
                  Your Concern
                </h3>
                <button
                  className="queue-card-action"
                  onClick={handleOpenConcernDialog}
                >
                  Edit
                </button>
              </div>
              <div className="queue-card-content">
                <p className="queue-concern-text">
                  {queue.notes && queue.notes.trim()
                    ? queue.notes
                    : "No concern noted yet. Tap Edit to add one."}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="queue-detail-sidebar">
            {/* Service Hours */}
            <div className="queue-card">
              <div className="queue-card-header">
                <h3 className="queue-card-title">
                  <Calendar className="w-5 h-5" />
                  Service Hours
                </h3>
              </div>
              <div className="queue-card-content">
                <div className="queue-service-hours-row">
                  <span className="queue-hours-label">Weekdays</span>
                  <span className="queue-hours-time">8:00 AM – 5:00 PM</span>
                </div>
                <div className="queue-service-hours-row">
                  <span className="queue-hours-label">Saturday</span>
                  <span className="queue-hours-time">8:00 AM – 12:00 PM</span>
                </div>
                <div className="queue-service-hours-row">
                  <span className="queue-hours-label">Break</span>
                  <span className="queue-hours-time">12:00 PM – 1:00 PM</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="queue-card">
              <div className="queue-card-header">
                <h3 className="queue-card-title">
                  <TrendingUp className="w-5 h-5" />
                  Status
                </h3>
              </div>
              <div className="queue-card-content">
                <div
                  className={`queue-status-badge ${getStatusColor(queue.status)}`}
                >
                  {getStatusLabel(queue.status)}
                </div>
              </div>
            </div>

            {/* Cancel Queue — only available while still waiting */}
            {queue.status === "waiting" && (
              <div className="queue-card queue-cancel-card">
                <div className="queue-card-header">
                  <h3 className="queue-card-title queue-cancel-title">
                    <XCircle className="w-5 h-5" />
                    Cancel Queue
                  </h3>
                </div>
                <div className="queue-card-content">
                  <button
                    className="queue-cancel-btn"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Concern Dialog */}
        {showConcernDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-900 dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-green-900/20">
              <div className="queue-dialog-header">
                <h2 className="queue-dialog-title">Edit Your Concern</h2>
                <p className="queue-dialog-description">
                  Update the details of your service request
                </p>
              </div>
              <div className="queue-dialog-form">
                <div className="queue-dialog-form-group">
                  <label className="queue-dialog-label">
                    Describe your concern
                  </label>
                  <textarea
                    className="queue-dialog-textarea"
                    value={concernText}
                    onChange={(e) => setConcernText(e.target.value)}
                    placeholder="Enter your concern here..."
                  />
                </div>
                <div className="queue-dialog-actions">
                  <button
                    className="queue-dialog-btn queue-dialog-btn-secondary"
                    onClick={() => setShowConcernDialog(false)}
                    disabled={savingConcern}
                  >
                    Cancel
                  </button>
                  <button
                    className="queue-dialog-btn queue-dialog-btn-primary"
                    onClick={handleUpdateConcern}
                    disabled={savingConcern}
                  >
                    {savingConcern ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Queue Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-gray-900 dark:bg-gray-900 rounded-lg p-6 max-w-md w-full border border-red-900/20">
              <div className="queue-dialog-header">
                <h2 className="queue-dialog-title">Cancel Queue</h2>
                <p className="queue-dialog-description">
                  Are you sure you want to cancel this queue?
                </p>
              </div>
              <div className="queue-dialog-actions">
                <button
                  className="queue-dialog-btn queue-dialog-btn-secondary"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelling}
                >
                  Cancel
                </button>
                <button
                  className="queue-dialog-btn queue-dialog-btn-danger"
                  onClick={handleCancelQueue}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling…" : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-with-sidebar">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
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
                <p className="user-name-large">{user?.name ?? "Student"}</p>
                <span className="user-role-badge">Student</span>
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
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
      <main className="dashboard-main">
        {selectedQueue ? (
          queueDetailView(selectedQueue)
        ) : (
          <div className="queue-status-container">
            {/* Header */}
            <div className="queue-status-header">
              <div className="queue-breadcrumb">
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Dashboard
                </Link>
              </div>
              <div className="queue-title-section">
                <div className="queue-title-icon">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="queue-title-content">
                  <h1>My Queue Status</h1>
                  <p>View detailed status of your queued services</p>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="queue-empty-state">
                <p className="queue-empty-text">{error}</p>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="queue-empty-state">
                <Loader2
                  className="queue-empty-icon"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <p className="queue-empty-text">Loading your queues…</p>
              </div>
            )}

            {/* Queue Cards */}
            {!isLoading && (
              <div className="queue-list-container">
                {queues && queues.length > 0 ? (
                  queues.map((queue) => {
                    const queueProgress =
                      queue.totalWaiting > 0
                        ? ((queue.totalWaiting - queue.position) /
                            queue.totalWaiting) *
                          100
                        : 0;
                    return (
                      <div
                        key={queue.queueId}
                        className="queue-list-item"
                        onClick={() => setSelectedQueueId(queue.queueId)}
                      >
                        <div className="queue-list-content">
                          <div className="queue-list-logo">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                            />
                          </div>
                          <div className="queue-list-info">
                            <div className="queue-list-header">
                              <div>
                                <h3 className="queue-list-title">
                                  {queue.serviceName}
                                </h3>
                                <p className="queue-list-college">
                                  {queue.departmentName}
                                </p>
                              </div>
                              <div className="queue-list-badge">
                                {queue.queueNumberBadge}
                              </div>
                            </div>

                            <div className="queue-list-stats">
                              <div className="queue-list-stat">
                                <div className="queue-list-stat-label">
                                  Position
                                </div>
                                <div className="queue-list-stat-value">
                                  {queue.position}/{queue.totalWaiting}
                                </div>
                              </div>
                              <div className="queue-list-stat">
                                <div className="queue-list-stat-label">
                                  Est. Wait
                                </div>
                                <div className="queue-list-stat-value">
                                  {queue.estimatedWait}
                                </div>
                              </div>
                              <div className="queue-list-stat">
                                <div className="queue-list-stat-label">
                                  Joined At
                                </div>
                                <div className="queue-list-stat-value">
                                  {queue.joinedAt}
                                </div>
                              </div>
                              <div className="queue-list-stat">
                                <div className="queue-list-stat-label">
                                  Status
                                </div>
                                <div
                                  className={`queue-status-badge ${getStatusColor(queue.status)}`}
                                >
                                  {queue.status === "serving"
                                    ? "Your Turn"
                                    : "Waiting"}
                                </div>
                              </div>
                            </div>

                            <div className="queue-list-progress">
                              <div className="queue-list-progress-label">
                                <span>Progress</span>
                                <span>{Math.round(queueProgress)}%</span>
                              </div>
                              <div className="queue-list-progress-bar">
                                <div
                                  className="queue-progress-fill"
                                  style={{ width: `${queueProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="queue-empty-state">
                    <Users className="queue-empty-icon" />
                    <h3 className="queue-empty-title">No Active Queues</h3>
                    <p className="queue-empty-text">
                      You haven't joined any queues yet
                    </p>
                    <button
                      onClick={() => navigate("/student/avail-service")}
                      style={{
                        background: "var(--primary-color)",
                        color: "white",
                        border: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.75rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--primary-dark)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "var(--primary-color)";
                      }}
                    >
                      Browse Services
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message message-${message.type}`}
                >
                  <div className="message-content">{message.text}</div>
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
    </div>
  );
}
