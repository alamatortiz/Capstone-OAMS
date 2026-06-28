import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  Clock,
  Users,
  ChevronLeft,
  MessageSquare,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Hash,
  Activity,
  Megaphone as LucideMegaphone,
} from "lucide-react";
import { getCollegeLogo } from "../../data/collegeLogo";
import { useQueue } from "../../contexts/QueueContext";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../../components/LogoutConfirmModal";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import { applyTheme, getSavedTheme } from "../../utils/theme";
import ucLogo from "../../assets/Pnc-Logo.png";
import oamsLogo from "../../assets/oams_logo.png";
import "./stud-queue-status.css";

// ─── Sidebar Icons ────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
const QueueIconNav = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="8" y1="11" x2="16" y2="11"></line>
    <line x1="8" y1="15" x2="12" y2="15"></line>
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
const MegaphoneNavIcon = () => <LucideMegaphone />;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getProgress = (position, totalWaiting) => {
  if (!totalWaiting || totalWaiting === 0) return 100;
  return Math.round(((totalWaiting - position) / totalWaiting) * 100);
};

const getStatusMeta = (status) => {
  switch (status) {
    case "serving":
      return { label: "It's Your Turn!", cls: "queue-status-serving", color: "#22c55e" };
    case "completed":
      return { label: "Completed", cls: "queue-status-completed", color: "#6b7280" };
    case "cancelled":
      return { label: "Cancelled", cls: "queue-status-cancelled", color: "#ef4444" };
    default:
      return { label: "Waiting", cls: "queue-status-waiting", color: "#f59e0b" };
  }
};

// ─── Detail View ──────────────────────────────────────────────────────────────
function QueueDetail({ queue, onBack, onCancel, onSaveNotes, cancelling, backLabel = 'All Queues' }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesText, setNotesText] = useState(queue.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const progress = getProgress(queue.position, queue.totalWaiting);
  const statusMeta = getStatusMeta(queue.status);
  const peopleAhead = Math.max(queue.position - 1, 0);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(queue.queueId, notesText.trim());
      toast.success("Notes updated");
      setShowNotesDialog(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="queue-status-container">
      {/* Page Header */}
      <div className="queue-header">
        <div className="queue-breadcrumb">
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        </div>
        <div className="queue-title-section">
          <div className="queue-title-icon">
            <Clock className="icon" />
          </div>
          <div>
            <h1 className="queue-title">Queue Details</h1>
            <p className="queue-subtitle">View your position and estimated wait time</p>
          </div>
        </div>
      </div>

      {/* Hero */}
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
                <p className="queue-hero-service-name">{queue.serviceName}</p>
                <p>{queue.departmentName}</p>
              </div>
              <div className="queue-hero-badge">{queue.queueNumberBadge}</div>
            </div>
          </div>
        </div>
      </div>

      {/* "It's your turn" alert */}
      {queue.status === "serving" && (
        <div
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "1rem",
            boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
          }}
        >
          <CheckCircle2
            style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }}
          />
          Please proceed to the service window — it's your turn!
        </div>
      )}

      {/* Detail Grid */}
      <div className="queue-detail-grid">
        <div className="queue-detail-main">
          {/* Position card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Users style={{ width: "1.25rem", height: "1.25rem" }} />
                Your Position
              </h3>
              <span className={`detailed-queue-status-badge ${statusMeta.cls}`}>
                {statusMeta.label}
              </span>
            </div>
            <div className="qss-card-content">
              <div className="queue-placement-center">
                <div className="queue-position-display">
                  <div className="queue-position-label">Number in Line</div>
                  <div>
                    <div className="queue-position-number">
                      {queue.position}
                    </div>
                    <div className="queue-position-total">
                      of {queue.totalWaiting} waiting
                    </div>
                  </div>
                  <div
                    className="queue-position-message"
                    style={{ marginTop: "0.75rem" }}
                  >
                    {queue.status === "serving"
                      ? "You're being served now!"
                      : queue.position === 1
                        ? "You're next!"
                        : `${peopleAhead} ${peopleAhead === 1 ? "person" : "people"} ahead of you`}
                  </div>
                </div>

                <div className="queue-progress-section">
                  <div className="qs-progress-card">
                    <div className="queue-progress-group">
                      <div className="queue-progress-wrapper">
                        <div className="qs-progress-label-row">
                          <p className="qs-progress-label">People in Queue</p>
                          <p className="qs-progress-value">
                            {queue.totalInQueue ?? 0}/{queue.maxCapacity ?? 0}
                            <span className="qs-progress-percent">
                              &nbsp;({queue.queueOccupancyPercent ?? 0}%)
                            </span>
                          </p>
                        </div>
                        <div className="qs-progress-bar">
                          <div
                            className="qs-progress-fill"
                            style={{ width: `${queue.queueOccupancyPercent ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="queue-progress-wrapper">
                        <div className="qs-progress-label-row">
                          <p className="qs-progress-label">Serviced</p>
                          <p className="qs-progress-value">
                            {queue.servicedCount ?? 0}/{queue.totalInQueue ?? 0}
                            <span className="qs-progress-percent">
                              &nbsp;({queue.servicedPercent ?? 0}%)
                            </span>
                          </p>
                        </div>
                        <div className="qs-progress-bar">
                          <div
                            className="qs-progress-fill qs-progress-fill-serviced"
                            style={{ width: `${queue.servicedPercent ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wait time card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Clock style={{ width: "1.25rem", height: "1.25rem" }} />
                Estimated Wait
              </h3>
            </div>
            <div className="qss-card-content">
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

          {/* Notes / concern card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <MessageSquare
                  style={{ width: "1.25rem", height: "1.25rem" }}
                />
                Your Concern
              </h3>
              <button
                className="qss-card-action"
                onClick={() => {
                  setNotesText(queue.notes ?? "");
                  setShowNotesDialog(true);
                }}
              >
                Edit
              </button>
            </div>
            <div className="qss-card-content">
              <p className="queue-concern-text">
                {queue.notes && queue.notes.trim()
                  ? queue.notes
                  : "No concern noted yet. Tap Edit to describe your request."}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="queue-detail-sidebar">
          {/* Queue number */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Hash style={{ width: "1.25rem", height: "1.25rem" }} />
                Queue Number
              </h3>
            </div>
            <div className="qss-card-content" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "var(--primary-color)",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {queue.queueNumberBadge}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-tertiary)",
                  marginTop: "0.25rem",
                }}
              >
                {queue.departmentAbbrev} • {queue.serviceName}
              </div>
            </div>
          </div>

          {/* Service hours */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <Clock style={{ width: "1.25rem", height: "1.25rem" }} />
                Service Hours
              </h3>
            </div>
            <div className="qss-card-content">
              <div className="queue-service-hours-row">
                <span className="queue-hours-label">Queue Opened</span>
                <span className="queue-hours-time">{queue.startTime || "—"}</span>
              </div>
              <div className="queue-service-hours-row">
                <span className="queue-hours-label">Queue Closes</span>
                <span className="queue-hours-time">{queue.endTime || "—"}</span>
              </div>
            </div>
          </div>

          {/* Cancel (only while waiting) */}
          {queue.status === "waiting" && (
            <div className="qss-card queue-cancel-card">
              <div className="qss-card-header">
                <h3 className="qss-card-title queue-cancel-title">
                  <XCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                  Leave Queue
                </h3>
              </div>
              <div className="qss-card-content">
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-tertiary)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Leaving will remove you from the queue. You'll need to rejoin
                  if you change your mind.
                </p>
                <button
                  className="queue-cancel-btn"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Leave Queue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Notes Dialog ── */}
      {showNotesDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "28rem",
              width: "100%",
              border: "1px solid var(--card-border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="queue-dialog-header">
              <h2 className="queue-dialog-title">Edit Your Concern</h2>
              <p className="queue-dialog-description">
                Briefly describe what you need help with so the staff can
                prepare.
              </p>
            </div>
            <div className="queue-dialog-form">
              <div className="queue-dialog-form-group">
                <label className="queue-dialog-label">
                  Your concern or request
                </label>
                <textarea
                  className="queue-dialog-textarea"
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="e.g. Request for good moral certificate for job application"
                  rows={4}
                />
              </div>
              <div className="queue-dialog-actions">
                <button
                  className="queue-dialog-btn queue-dialog-btn-secondary"
                  onClick={() => setShowNotesDialog(false)}
                  disabled={savingNotes}
                >
                  Cancel
                </button>
                <button
                  className="queue-dialog-btn queue-dialog-btn-primary"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Confirm Dialog ── */}
      <ActionConfirmModal
        show={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => onCancel(queue.queueId)}
        title="Leave Queue?"
        message={
          <>
            You are currently at position <strong>{queue.position}</strong> in
            the <strong>{queue.serviceName}</strong> queue. Leaving will
            permanently remove your spot — you will need to rejoin and wait
            from the back of the line if you change your mind.
          </>
        }
        icon={<XCircle width={22} height={22} />}
        cancelText="Stay in Queue"
        confirmText={cancelling ? "Leaving…" : "Leave Queue"}
        confirmDisabled={cancelling}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QueueStatusPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const { queues, isLoading, error, leaveQueue, updateQueueNotes } = useQueue();

  const user = authUser
    ? {
        ...authUser,
        college: authUser.departmentName ?? "N/A College",
        departmentAbbrev: authUser.departmentAbbrev ?? "N/A",
      }
    : { name: "Student", role: "student", college: "", departmentAbbrev: "" };

  // ── UI state ──────────────────────────────────────────────────────────────
  const fromQueue = location.state?.fromQueue ?? false;
  const fromTracking = location.state?.fromTracking ?? false;
  const [selectedQueueId, setSelectedQueueId] = useState(
    () => location.state?.queueId ?? null
  );
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
  const messageIdRef = useRef(1);

  // Auto-deselect if the queue disappears (cancelled/served)
  const selectedQueue = selectedQueueId
    ? (queues.find((q) => q.queueId === selectedQueueId) ?? null)
    : null;

  useEffect(() => {
    if (selectedQueueId && !selectedQueue) setSelectedQueueId(null);
  }, [selectedQueueId, selectedQueue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { logout(); navigate("/login"); };
  const toggleDarkMode = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    applyTheme(newTheme);
  };

  const handleCancel = async (queueId) => {
    setCancelling(true);
    try {
      await leaveQueue(queueId);
      toast.success("You have left the queue.");
      setSelectedQueueId(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userMsg = {
      id: ++messageIdRef.current,
      type: "user",
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const captured = inputValue;
    setInputValue("");
    setTimeout(() => {
      const bot = {
        id: ++messageIdRef.current,
        type: "bot",
        text: generateBotResponse(captured),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 600);
  };

  const generateBotResponse = (input) => {
    const i = input.toLowerCase();
    const q = selectedQueue ?? queues[0];
    if (i.includes("position") || i.includes("queue")) {
      return q
        ? `You're at position ${q.position} of ${q.totalWaiting} in the ${q.serviceName} queue. Estimated wait: ${q.estimatedWait}.`
        : "You have no active queues right now.";
    }
    if (i.includes("wait") || i.includes("time")) {
      return q
        ? `Estimated wait: ${q.estimatedWait}. You joined at ${q.joinedAt}.`
        : "Join a queue to see your wait time.";
    }
    if (i.includes("cancel") || i.includes("leave")) {
      return "Use the 'Leave Queue' button on the queue detail view to exit a queue.";
    }
    return "I can help with your queue position, wait time, or concern notes. What would you like to know?";
  };

  const navItems = [
    { icon: HomeIcon, label: "Home", path: "/student/dashboard" },
    { icon: MegaphoneNavIcon, label: "Announcements", path: "/student/announcements" },
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
                  className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
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
      <main className="dashboard-main">
        {selectedQueue ? (
          <QueueDetail
            queue={selectedQueue}
            backLabel={fromTracking ? 'Queue Tracking' : fromQueue ? 'Queues' : 'My Queue Status'}
            onBack={() => fromTracking ? navigate('/student/queue-tracking') : fromQueue ? navigate('/student/queue') : setSelectedQueueId(null)}
            onCancel={handleCancel}
            onSaveNotes={updateQueueNotes}
            cancelling={cancelling}
          />
        ) : (
          <div className="queue-status-container">
            {/* Page Header */}
            <div className="queue-header">
              <div className="queue-breadcrumb">
                {fromTracking ? (
                  <button type="button" className="breadcrumb-link" onClick={() => navigate('/student/queue-tracking')}>
                    <ChevronLeft className="breadcrumb-icon" />
                    Queue Tracking
                  </button>
                ) : fromQueue ? (
                  <button type="button" className="breadcrumb-link" onClick={() => navigate('/student/queue')}>
                    <ChevronLeft className="breadcrumb-icon" />
                    Queue Management
                  </button>
                ) : (
                  <Link to="/student/dashboard" className="breadcrumb-link">
                    <ChevronLeft className="breadcrumb-icon" />
                    Home
                  </Link>
                )}
              </div>
              <div className="queue-title-section">
                <div className="queue-title-icon">
                  <Clock className="icon" />
                </div>
                <div>
                  <h1 className="queue-title">My Queue Status</h1>
                  <p className="queue-subtitle">View and manage your active queues</p>
                </div>
              </div>
            </div>

            {!fromTracking && (
              <Link
                to="/student/queue-tracking"
                state={{ from: 'queue-status' }}
                className="queue-tracking-link-btn"
              >
                <div className="queue-tracking-link-btn-icon-box">
                  <Activity />
                </div>
                <div className="queue-tracking-link-btn-text">
                  <span className="queue-tracking-link-btn-title">Queue Tracking</span>
                  <span className="queue-tracking-link-btn-subtitle">Monitor your active queue positions in real-time</span>
                </div>
                <svg className="queue-tracking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            )}

            {/* Error */}
            {error && (
              <div
                className="queue-empty-state"
                style={{ borderColor: "rgba(239,68,68,0.3)" }}
              >
                <AlertCircle
                  className="queue-empty-icon"
                  style={{ color: "#ef4444" }}
                />
                <p className="queue-empty-text">{error}</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="queue-empty-state">
                <Loader2
                  className="queue-empty-icon"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <p className="queue-empty-text">Loading your queues…</p>
              </div>
            )}

            {/* Queue List */}
            {!isLoading && !error && (
              <div className="queue-list-container">
                {queues.length > 0 ? (
                  queues.map((queue) => {
                    return (
                      <div
                        key={queue.queueId}
                        className="queue-list-item"
                        onClick={() => setSelectedQueueId(queue.queueId)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="queue-card-content">
                          <div className="queue-left">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                              className="queue-college-logo"
                            />
                            <div className="queue-info">
                              <div className="queue-header-row">
                                <div>
                                  <h3 className="queue-service-name">{queue.serviceName}</h3>
                                  <p className="queue-college-name">{queue.departmentName}</p>
                                </div>
                                <span className="queue-number-badge">{queue.queueNumberBadge}</span>
                              </div>
                              <div className="queue-stats-grid">
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Your Position</p>
                                  <p className="queue-stat-value">{queue.position}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Total Waiting</p>
                                  <p className="queue-stat-value">{queue.totalWaiting}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Est. Wait Time</p>
                                  <p className="queue-stat-value-sm">{queue.estimatedWait}</p>
                                </div>
                                <div className="queue-stat">
                                  <p className="queue-stat-label">Joined At</p>
                                  <p className="queue-stat-value-sm">{queue.joinedAt}</p>
                                </div>
                              </div>
                              <div className="qs-progress-card">
                                <div className="queue-progress-group">
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">People in Queue</p>
                                      <p className="qs-progress-value">
                                        {queue.totalInQueue ?? 0}/{queue.maxCapacity ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.queueOccupancyPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill"
                                        style={{ width: `${queue.queueOccupancyPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="queue-progress-wrapper">
                                    <div className="qs-progress-label-row">
                                      <p className="qs-progress-label">Serviced</p>
                                      <p className="qs-progress-value">
                                        {queue.servicedCount ?? 0}/{queue.totalInQueue ?? 0}
                                        <span className="qs-progress-percent">
                                          &nbsp;({queue.servicedPercent ?? 0}%)
                                        </span>
                                      </p>
                                    </div>
                                    <div className="qs-progress-bar">
                                      <div
                                        className="qs-progress-fill qs-progress-fill-serviced"
                                        style={{ width: `${queue.servicedPercent ?? 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
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
                      You haven't joined any queues yet today.
                    </p>
                    <button
                      onClick={() => navigate("/student/queue")}
                      style={{
                        marginTop: "1rem",
                        background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                        color: "white",
                        border: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.75rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 600,
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

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* AI Chat */}
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
              <button type="submit" className="chat-send-btn" aria-label="Send">
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
