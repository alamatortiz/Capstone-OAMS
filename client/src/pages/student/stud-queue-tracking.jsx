import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { useQueue } from "../../contexts/QueueContext";
import { getCollegeLogo } from "../../data/collegeLogo";
import StudentPageShell from "../../components/StudentPageShell";
import QueueProgressBars from "../../components/QueueProgressBars";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
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
  AlertCircle,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("active");
  const [leavingId, setLeavingId] = useState(null);

  // Load history + metrics when the tracking page mounts
  useEffect(() => {
    fetchQueueHistory();
    fetchMetrics();
  }, [fetchQueueHistory, fetchMetrics]);

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
    <StudentPageShell
      outerClassName="qtrack-with-sidebar"
      mainClassName="qtrack-main"
      overlay={
        <>
          <ChatWidget
            initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you today?"
            getBotResponse={generateBotResponse}
            sendButtonAriaLabel="Send"
          />
          <ActionConfirmModal
            show={leaveConfirmQueue !== null}
            onCancel={() => setLeaveConfirmQueue(null)}
            onConfirm={async () => { await handleLeaveQueue(leaveConfirmQueue.queueId); setLeaveConfirmQueue(null); }}
            title="Leave Queue?"
            message={
              leaveConfirmQueue?.status === "serving" ? (
                <>
                  You are currently being served for <strong>{leaveConfirmQueue?.serviceName}</strong>.
                  Leaving now ends your turn immediately — the staff will move on to the next student.
                </>
              ) : (
                <>
                  You are about to leave the <strong>{leaveConfirmQueue?.serviceName}</strong> queue.
                  Leaving will permanently remove your spot — you will need to rejoin
                  and wait from the back of the line if you change your mind.
                </>
              )
            }
            icon={<XCircle width={22} height={22} />}
            cancelText="Stay in Queue"
            confirmText={leavingId === leaveConfirmQueue?.queueId ? "Leaving…" : "Leave Queue"}
            confirmDisabled={leavingId === leaveConfirmQueue?.queueId}
          />
        </>
      }
    >
        <div className="queue-tracking-page">
          {/* Page Header */}
          <PageHeader
            breadcrumb={
              location.state?.from === 'queue' ? (
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
              )
            }
            icon={<Activity className="icon" />}
            title="Queue Tracking"
            subtitle="Monitor your active queues, review history, and view your stats"
          />

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

                          {queue.slotStatus === "paused" && (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                background: "rgba(245, 158, 11, 0.12)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                                color: "#f59e0b",
                                borderRadius: "999px",
                                padding: "0.2rem 0.65rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                margin: "0.5rem 0",
                              }}
                            >
                              <AlertCircle style={{ width: "0.9rem", height: "0.9rem" }} />
                              Paused{queue.slotPauseReason ? `: ${queue.slotPauseReason}` : ""}
                            </div>
                          )}

                          {/* Position */}
                          <div className="qt-queue-position">
                            <div className="qt-position-header">
                              <div className="qt-position-label">
                                <Users className="qt-icon-xs" /> Your Position
                              </div>
                              <div className="qt-position-display">
                                <p className="qt-position-number">
                                  {queue.status === "serving" ? "Serving" : queue.position}
                                </p>
                                {queue.status !== "serving" && (
                                  <p className="qt-position-total">
                                    of {queue.totalWaiting}
                                  </p>
                                )}
                              </div>
                            </div>
                            <QueueProgressBars
                              occupancyCurrent={queue.totalInQueue ?? 0}
                              occupancyTotal={queue.maxCapacity ?? 0}
                              occupancyPercent={queue.queueOccupancyPercent ?? 0}
                              servicedCurrent={queue.servicedCount ?? 0}
                              servicedTotal={queue.totalInQueue ?? 0}
                              servicedPercent={queue.servicedPercent ?? 0}
                            />
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
                          {(queue.status === "waiting" || queue.status === "serving") && (
                            <div className="qt-queue-actions">
                              <button
                                onClick={(e) => { e.stopPropagation(); setLeaveConfirmQueue({ queueId: queue.queueId, serviceName: queue.serviceName, status: queue.status }); }}
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
    </StudentPageShell>
  );
}
