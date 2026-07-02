import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { useQueue } from "../../contexts/QueueContext";
import { getCollegeLogo } from "../../data/collegeLogo";
import StudentSidebar from "../../components/StudentSidebar";
import "./stud-queue-tracking.css";

import {
  Users,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  History,
  Target,
  Loader2,
  ChevronLeft,
} from "lucide-react";

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusColor = (status) => {
  switch (status) {
    case "serving":
      return "status-active";
    case "waiting":
      return "status-waiting";
    case "completed":
      return "status-completed";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "serving":
      return "Your Turn!";
    case "waiting":
      return "Waiting";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QueueTrackingPage() {
  const {
    queues = [],
    queueHistory = [],
    metrics,
    isLoading,
    leaveQueue,
    fetchQueueHistory,
    fetchMetrics,
  } = useQueue();

  const navigate = useNavigate();
  const location = useLocation();

  // ── State ─────────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! 👋 I'm your OAMS Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [leavingId, setLeavingId] = useState(null);
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(1);

  // Load history + metrics when the tracking page mounts
  useEffect(() => {
    fetchQueueHistory();
    fetchMetrics();
  }, [fetchQueueHistory, fetchMetrics]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeQueues = queues.filter(
    (q) => q.status === "waiting" || q.status === "serving",
  );

  // Compute analytics from real metrics (API) + local data
  const totalJoined = metrics?.totalQueuesJoined ?? 0;
  const totalCompleted = metrics?.totalQueuesCompleted ?? 0;
  const totalCancelled = metrics?.totalQueuesCancelled ?? 0;
  const successRate =
    totalJoined > 0 ? Math.round((totalCompleted / totalJoined) * 100) : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const [leaveConfirmQueue, setLeaveConfirmQueue] = useState(null);

  const handleLeaveQueue = async (queueId) => {
    if (leavingId) return;
    setLeavingId(queueId);
    try {
      await leaveQueue(queueId);
      await fetchQueueHistory();
      await fetchMetrics();
    } catch (err) {
      // toast handled by caller context; just log
      console.error("Leave queue error:", err);
    } finally {
      setLeavingId(null);
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
    if (i.includes("queue") || i.includes("position"))
      return activeQueues.length > 0
        ? `You have ${activeQueues.length} active queue(s). Check the Active tab for details.`
        : "You don't have any active queues right now. Join one from the Queue page.";
    if (i.includes("history"))
      return `You have ${queueHistory.length} past queue record(s) in your history.`;
    if (i.includes("analytics") || i.includes("stats"))
      return `You've joined ${totalJoined} queue(s) total, completed ${totalCompleted}, with a ${successRate}% success rate.`;
    return "I can help with your active queues, history, and analytics. What would you like to know?";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-with-sidebar">
      <StudentSidebar />

      {/* Main */}
      <main className="dashboard-main">
        <div className="queue-tracking-page">
          {/* Page Header */}
          <div className="queue-header">
            <div className="queue-breadcrumb">
              {location.state?.from === 'queue' ? (
                <Link to="/student/queue" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Queues
                </Link>
              ) : location.state?.from === 'queue-status' ? (
                <Link to="/student/queue-status" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  My Queue Status
                </Link>
              ) : (
                <Link to="/student/dashboard" className="breadcrumb-link">
                  <ChevronLeft className="breadcrumb-icon" />
                  Home
                </Link>
              )}
            </div>
            <div className="queue-title-section">
              <div className="queue-title-icon">
                <Activity className="icon" />
              </div>
              <div>
                <h1 className="queue-title">Queue Tracking</h1>
                <p className="queue-subtitle">
                  Monitor your active queues, review history, and view your stats
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Strip */}
          <div className="qt-metrics-grid">
            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-joined">
                <Target className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Total Joined</p>
              <p className="qt-metric-value qt-metric-value-joined">
                {totalJoined}
              </p>
            </div>
            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-completed">
                <CheckCircle2 className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Completed</p>
              <p className="qt-metric-value qt-metric-value-completed">
                {totalCompleted}
              </p>
            </div>
            <div className="qt-metric-card">
              <div className="qt-metric-icon qt-metric-icon-cancelled">
                <XCircle className="qt-icon-sm" />
              </div>
              <p className="qt-metric-label">Cancelled</p>
              <p className="qt-metric-value qt-metric-value-cancelled">
                {totalCancelled}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="qt-tabs-container">
            <div className="qt-tabs-list">
              <button
                className={`qt-tab ${activeTab === "active" ? "active" : ""}`}
                onClick={() => setActiveTab("active")}
              >
                <Activity className="qt-icon-xs" />
                Active <span className="qt-tab-count">{activeQueues.length}</span>
              </button>
              <button
                className={`qt-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <History className="qt-icon-xs" />
                History <span className="qt-tab-count">{queueHistory.length}</span>
              </button>
              <button
                className={`qt-tab ${activeTab === "analytics" ? "active" : ""}`}
                onClick={() => setActiveTab("analytics")}
              >
                <BarChart3 className="qt-icon-xs" />
                Analytics
              </button>
            </div>

            {/* ── ACTIVE TAB ── */}
            {activeTab === "active" && (
              <div className="qt-tab-content">
                {isLoading ? (
                  <div className="qt-empty-state">
                    <Loader2
                      className="qt-empty-icon"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    <p className="qt-empty-description">
                      Loading active queues…
                    </p>
                  </div>
                ) : activeQueues.length === 0 ? (
                  <div className="qt-empty-state">
                    <Users className="qt-empty-icon" />
                    <h3 className="qt-empty-title">No Active Queues</h3>
                    <p className="qt-empty-description">
                      You're not currently in any queues. Browse available
                      queues to join one.
                    </p>
                    <Link
                      to="/student/queue"
                      className="qt-primary-btn"
                    >
                      Join a Queue
                    </Link>
                  </div>
                ) : (
                  <div className="qt-queues-list">
                    {activeQueues.map((queue) => {
                      const isLeaving = leavingId === queue.queueId;

                      return (
                        <div
                          key={queue.queueId}
                          className="qt-queue-card"
                          onClick={() => navigate('/student/queue-status', { state: { fromTracking: true, queueId: queue.queueId } })}
                        >
                          {/* Card Header */}
                          <div className="qt-queue-header">
                            <div className="qt-queue-info">
                              <img
                                src={getCollegeLogo(queue.departmentName)}
                                alt={queue.departmentName}
                                style={{
                                  width: "2.5rem",
                                  height: "2.5rem",
                                  objectFit: "contain",
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <h3 className="qt-queue-service">
                                  {queue.serviceName}
                                </h3>
                                <p
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-tertiary)",
                                    margin: 0,
                                  }}
                                >
                                  {queue.departmentName}
                                </p>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                                gap: "0.375rem",
                              }}
                            >
                              <span
                                className={`qt-status-badge ${getStatusColor(queue.status)}`}
                              >
                                {getStatusLabel(queue.status)}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  color: "var(--primary-color)",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {queue.queueNumberBadge}
                              </span>
                            </div>
                          </div>

                          {/* Position */}
                          <div className="qt-queue-position">
                            <div className="qt-position-header">
                              <div className="qt-position-label">
                                <Users className="qt-icon-xs" /> Your Position
                              </div>
                              <div className="qt-position-display">
                                <p className="qt-position-number">
                                  {queue.position}
                                </p>
                                <p className="qt-position-total">
                                  of {queue.totalWaiting}
                                </p>
                              </div>
                            </div>
                            <div className="qt-progress-card">
                              <div className="qt-progress-group">
                                <div className="qt-progress-wrapper">
                                  <div className="qt-progress-label-row">
                                    <p className="qt-progress-name">
                                      People in Queue
                                    </p>
                                    <p className="qt-progress-value">
                                      {queue.totalInQueue ?? 0}/
                                      {queue.maxCapacity ?? 0}
                                      <span className="qt-progress-value-percent">
                                        ({queue.queueOccupancyPercent ?? 0}%)
                                      </span>
                                    </p>
                                  </div>
                                  <div className="qt-progress-bar">
                                    <div
                                      className="qt-progress-fill"
                                      style={{
                                        width: `${queue.queueOccupancyPercent ?? 0}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="qt-progress-wrapper">
                                  <div className="qt-progress-label-row">
                                    <p className="qt-progress-name">Serviced</p>
                                    <p className="qt-progress-value">
                                      {queue.servicedCount ?? 0}/
                                      {queue.totalInQueue ?? 0}
                                      <span className="qt-progress-value-percent">
                                        ({queue.servicedPercent ?? 0}%)
                                      </span>
                                    </p>
                                  </div>
                                  <div className="qt-progress-bar">
                                    <div
                                      className="qt-progress-fill qt-progress-fill-serviced"
                                      style={{
                                        width: `${queue.servicedPercent ?? 0}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="qt-queue-stats-grid">
                            <div className="qt-stat-box">
                              <p className="qt-stat-label">Estimated Wait</p>
                              <p className="qt-stat-value">
                                {queue.estimatedWait}
                              </p>
                            </div>
                            <div className="qt-stat-box">
                              <p className="qt-stat-label">Total Waiting</p>
                              <p className="qt-stat-value">
                                {queue.totalWaiting}
                              </p>
                            </div>
                            <div className="qt-stat-box">
                              <p className="qt-stat-label">Joined At</p>
                              <p className="qt-stat-value">{queue.joinedAt}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          {queue.status === "waiting" && (
                            <div className="qt-queue-actions">
                              <button
                                onClick={(e) => { e.stopPropagation(); setLeaveConfirmQueue({ queueId: queue.queueId, serviceName: queue.serviceName }); }}
                                className="qt-btn-cancel"
                                disabled={isLeaving}
                              >
                                {isLeaving ? (
                                  <>
                                    <Loader2
                                      className="qt-icon-xs"
                                      style={{
                                        animation: "spin 1s linear infinite",
                                      }}
                                    />{" "}
                                    Leaving…
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="qt-icon-xs" /> Leave
                                    Queue
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === "history" && (
              <div className="qt-tab-content">
                {queueHistory.length === 0 ? (
                  <div className="qt-empty-state">
                    <History className="qt-empty-icon" />
                    <h3 className="qt-empty-title">No Queue History Yet</h3>
                    <p className="qt-empty-description">
                      Your completed and cancelled queues will appear here once
                      you start using the service.
                    </p>
                  </div>
                ) : (
                  <div className="qt-history-list">
                    {queueHistory.map((item) => (
                      <div key={item.id} className="qt-history-item">
                        <div className="qt-history-content">
                          <div className="qt-history-header">
                            <h4 className="qt-history-service">
                              {item.service}
                            </h4>
                            <span
                              className={`qt-status-badge ${getStatusColor(item.status)}`}
                            >
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          <p className="qt-history-college">
                            {item.college} • {item.queueNumber}
                          </p>
                          <div className="qt-history-meta">
                            <span>Joined: {item.joinedAt}</span>
                            <span>•</span>
                            <span>
                              {item.status === "completed"
                                ? `Completed: ${item.completedAt}`
                                : `Ended: ${item.completedAt}`}
                            </span>
                            {item.actualWaitTime !== "—" && (
                              <>
                                <span>•</span>
                                <span className="qt-wait-time">
                                  Wait: {item.actualWaitTime}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {item.status === "completed" ? (
                          <CheckCircle2 className="qt-history-icon completed" />
                        ) : (
                          <XCircle className="qt-history-icon cancelled" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {activeTab === "analytics" && (
              <div className="qt-tab-content">
                <div className="qt-analytics-grid">
                  {/* Queue Statistics */}
                  <div className="qt-analytics-card">
                    <h3 className="qt-analytics-title">
                      <BarChart3 className="qt-icon-xs" /> Queue Statistics
                    </h3>
                    <p className="qt-analytics-subtitle">
                      Overview of your total queue activity
                    </p>

                    <div className="qt-analytics-grid-2">
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Total Joined</p>
                        <p className="qt-stat-value">{totalJoined}</p>
                      </div>
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Completed</p>
                        <p className="qt-stat-value">{totalCompleted}</p>
                      </div>
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Cancelled</p>
                        <p className="qt-stat-value">{totalCancelled}</p>
                      </div>
                      <div className="qt-stat-box">
                        <p className="qt-stat-label">Active Now</p>
                        <p className="qt-stat-value">{activeQueues.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

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
                placeholder="Ask me anything…"
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
      <ActionConfirmModal
        show={leaveConfirmQueue !== null}
        onCancel={() => setLeaveConfirmQueue(null)}
        onConfirm={async () => { await handleLeaveQueue(leaveConfirmQueue.queueId); setLeaveConfirmQueue(null); }}
        title="Leave Queue?"
        message={
          <>
            You are about to leave the <strong>{leaveConfirmQueue?.serviceName}</strong> queue.
            Leaving will permanently remove your spot — you will need to rejoin
            and wait from the back of the line if you change your mind.
          </>
        }
        icon={<XCircle width={22} height={22} />}
        cancelText="Stay in Queue"
        confirmText={leavingId === leaveConfirmQueue?.queueId ? "Leaving…" : "Leave Queue"}
        confirmDisabled={leavingId === leaveConfirmQueue?.queueId}
      />
    </div>
  );
}
