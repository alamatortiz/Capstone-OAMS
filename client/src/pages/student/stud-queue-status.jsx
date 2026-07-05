import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { getCollegeLogo } from "../../data/collegeLogo";
import { useQueue } from "../../contexts/QueueContext";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import { toast } from "sonner";
import StudentPageShell from "../../components/StudentPageShell";
import QueueProgressBars from "../../components/QueueProgressBars";
import PageHeader from "../../components/PageHeader";
import ChatWidget from "../../components/ChatWidget";
import "./stud-queue-status.css";

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
    case "no_show":
      return { label: "Marked as No-Show", cls: "queue-status-no-show", color: "#f59e0b" };
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
      <PageHeader
        breadcrumb={
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            <ChevronLeft className="breadcrumb-icon" />
            {backLabel}
          </button>
        }
        icon={<Clock className="icon" />}
        title="Queue Details"
        subtitle="View your position and estimated wait time"
      />

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
                  <QueueProgressBars
                    occupancyCurrent={queue.totalInQueue ?? 0}
                    occupancyTotal={queue.maxCapacity ?? 0}
                    occupancyPercent={queue.queueOccupancyPercent ?? 0}
                    servicedCurrent={queue.servicedCount ?? 0}
                    servicedTotal={queue.totalInQueue ?? 0}
                    servicedPercent={queue.servicedPercent ?? 0}
                  />
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
  const { queues, isLoading, error, leaveQueue, updateQueueNotes } = useQueue();

  // ── UI state ──────────────────────────────────────────────────────────────
  const fromQueue = location.state?.fromQueue ?? false;
  const fromTracking = location.state?.fromTracking ?? false;
  const [selectedQueueId, setSelectedQueueId] = useState(
    () => location.state?.queueId ?? null
  );
  const [cancelling, setCancelling] = useState(false);

  // Auto-deselect if the queue disappears (cancelled/served)
  const selectedQueue = selectedQueueId
    ? (queues.find((q) => q.queueId === selectedQueueId) ?? null)
    : null;

  useEffect(() => {
    if (selectedQueueId && !selectedQueue) setSelectedQueueId(null);
  }, [selectedQueueId, selectedQueue]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="dashboard-with-sidebar"
      mainClassName="dashboard-main"
      overlay={
        <ChatWidget
          initialGreeting="Hello! 👋 I'm your OAMS Assistant. How can I help you track your queue?"
          getBotResponse={generateBotResponse}
          sendButtonAriaLabel="Send"
          shrinkIconOnMobile={false}
        />
      }
    >
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
            <PageHeader
              breadcrumb={
                fromTracking ? (
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
                )
              }
              icon={<Clock className="icon" />}
              title="My Queue Status"
              subtitle="View and manage your active queues"
            />

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
                              <QueueProgressBars
                                occupancyCurrent={queue.totalInQueue ?? 0}
                                occupancyTotal={queue.maxCapacity ?? 0}
                                occupancyPercent={queue.queueOccupancyPercent ?? 0}
                                servicedCurrent={queue.servicedCount ?? 0}
                                servicedTotal={queue.totalInQueue ?? 0}
                                servicedPercent={queue.servicedPercent ?? 0}
                              />
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
                      You're not currently in any queues. Browse available
                      queues to join one.
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
                      Join a Queue
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </StudentPageShell>
  );
}
