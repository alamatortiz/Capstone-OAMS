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
  Activity,
  MapPin,
  FileText,
  HelpCircle,
} from "lucide-react";
import { getCollegeLogo } from "../../data/collegeLogo";
import { useQueue } from "../../contexts/QueueContext";
import ActionConfirmModal from "../../components/ActionConfirmModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";
import { toast } from "sonner";
import StudentPageShell from "../../components/StudentPageShell";
import QueueProgressBars from "../../components/QueueProgressBars";
import PageHeader from "../../components/PageHeader";
import api from "../../utils/api";
import "./stud-queue-status.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Takes the full queue (not just status) — 'serving' covers both "called,
// awaiting arrival" and "arrival confirmed", distinguished by arrivedAt.
const getStatusMeta = (queue) => {
  switch (queue.status) {
    case "serving":
      return queue.arrivedAt
        ? { label: "Servicing", cls: "queue-status-serving", color: "#22c55e" }
        : { label: "Called", cls: "queue-status-serving", color: "#22c55e" };
    case "completed":
      return { label: "Completed", cls: "queue-status-completed", color: "#6b7280" };
    case "cancelled":
      return { label: "Cancelled", cls: "queue-status-cancelled", color: "#ef4444" };
    case "no_show":
      return { label: "Marked as No-Show", cls: "queue-status-no-show", color: "#ef4444" };
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
  useLockBodyScroll(showNotesDialog);

  const statusMeta = getStatusMeta(queue);
  const peopleAhead = Math.max(queue.position - 1, 0);

  // ── Requirements / Procedure lookup (same fetch-and-match-by-name pattern
  // as stud-queue.jsx's join-flow detail view) ────────────────────────────
  const [servicesData, setServicesData] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      setServicesLoading(true);
      try {
        const { data } = await api.get('/student/services/by-department');
        setServicesData(data.departments ?? []);
      } catch (err) {
        console.error('Fetch services error:', err);
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, []);

  const isServiceKnown = (serviceName) =>
    servicesData.some((dept) =>
      dept.services?.some(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      ),
    );

  const getServiceRequirements = (serviceName) => {
    for (const dept of servicesData) {
      const svc = dept.services?.find(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      );
      if (svc?.requirements?.length) return svc.requirements;
    }
    return [];
  };

  const getProcedureSteps = (serviceName) => {
    for (const dept of servicesData) {
      const svc = dept.services?.find(
        (s) => s.serviceName?.toLowerCase() === serviceName?.toLowerCase(),
      );
      if (svc?.procedureSteps?.length) return svc.procedureSteps;
    }
    return [];
  };

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
        subtitle="Your queue details and status"
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
            {queue.location && (
              <div className="queue-hero-meta-row">
                <div className="queue-hero-meta">
                  <MapPin className="queue-hero-meta-icon" />
                  <span>{queue.location}</span>
                </div>
              </div>
            )}
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
          {queue.arrivedAt
            ? "Service being processed"
            : "It's your turn — please proceed to the designated location"}
        </div>
      )}

      {/* Persistent "queue paused" banner — stays visible the whole time the
          queue is paused, not just as a one-off toast on the transition. */}
      {queue.slotStatus === "paused" && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            color: "#f59e0b",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontWeight: 700,
            fontSize: "1rem",
            boxShadow: "0 8px 24px rgba(245,158,11,0.15)",
          }}
        >
          <AlertCircle
            style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }}
          />
          <div style={{ textAlign: "left" }}>
            <div>This queue is currently paused by the admin.</div>
            {queue.slotPauseReason && (
              <div style={{ fontWeight: 400, fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Reason: {queue.slotPauseReason}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informational banner for a queue that's closed to new joins (full
          capacity or hours ended) but still working through existing
          students — reassures the student they haven't been dropped. */}
      {(queue.slotStatus === "full" || queue.slotStatus === "expired") && (
        <div
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "1rem",
            padding: "1rem 1.5rem",
            color: "#3b82f6",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            fontWeight: 600,
            fontSize: "0.9375rem",
          }}
        >
          <AlertCircle
            style={{ width: "1.5rem", height: "1.5rem", flexShrink: 0 }}
          />
          <div>
            This queue is no longer accepting new students, but you're still
            in line and will be served.
          </div>
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
                  <div className="queue-position-label">
                    {queue.status === "serving" ? "Status" : "Number in Line"}
                  </div>
                  <div>
                    <div className="queue-position-number">
                      {queue.status === "serving"
                        ? (queue.arrivedAt ? "Being Served" : "Called")
                        : queue.position}
                    </div>
                    {queue.status !== "serving" && (
                      <div className="queue-position-total">
                        of {queue.totalWaiting} waiting
                      </div>
                    )}
                  </div>
                  <div
                    className="queue-position-message"
                    style={{ marginTop: "0.75rem" }}
                  >
                    {queue.status === "serving"
                      ? (queue.arrivedAt ? "You're being served now!" : "You've been called — please proceed!")
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
                {queue.status === "serving" ? "Next Steps" : "Estimated Wait"}
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

          {/* About this service card */}
          {queue.description && (
            <div className="qss-card">
              <div className="qss-card-header">
                <h3 className="qss-card-title">
                  <FileText style={{ width: "1.25rem", height: "1.25rem" }} />
                  About this Service
                </h3>
              </div>
              <div className="qss-card-content">
                <p className="queue-concern-text">{queue.description}</p>
              </div>
            </div>
          )}

          {/* Requirements card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem" }} />
                Requirements
              </h3>
            </div>
            <div className="qss-card-content">
              {(() => {
                const reqs = getServiceRequirements(queue.serviceName);
                if (reqs.length === 0 && servicesLoading && !isServiceKnown(queue.serviceName)) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      <Loader2 style={{ width: '1.125rem', height: '1.125rem', animation: 'spin 1s linear infinite' }} />
                      Loading requirements…
                    </div>
                  );
                }
                return reqs.length > 0 ? (
                  <ul className="qss-requirements-list">
                    {reqs.map((req) => (
                      <li key={req.id} className="qss-requirement-item">
                        <CheckCircle2 className="qss-requirement-icon" />
                        <div>
                          <div className="qss-requirement-name-row">
                            <span>{req.name}</span>
                            <span className={`qss-requirement-badge ${req.isMandatory ? 'is-mandatory' : 'is-optional'}`}>
                              {req.isMandatory ? 'Required' : 'Optional'}
                            </span>
                          </div>
                          {req.description && (
                            <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>
                              {req.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    No specific requirements have been defined for this service yet. Contact the office for details.
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Procedure card */}
          <div className="qss-card">
            <div className="qss-card-header">
              <h3 className="qss-card-title">
                <HelpCircle style={{ width: "1.25rem", height: "1.25rem" }} />
                Procedure
              </h3>
            </div>
            <div className="qss-card-content">
              {(() => {
                const steps = getProcedureSteps(queue.serviceName);
                if (steps.length === 0 && servicesLoading && !isServiceKnown(queue.serviceName)) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      <Loader2 style={{ width: '1.125rem', height: '1.125rem', animation: 'spin 1s linear infinite' }} />
                      Loading procedure…
                    </div>
                  );
                }
                return steps.length > 0 ? (
                  <ol className="qss-procedure-list">
                    {steps.map((step) => (
                      <li key={step.id} className="qss-procedure-item">
                        <span className="qss-procedure-number">{step.stepNumber}</span>
                        <div>
                          <span className="qss-procedure-title">{step.title}</span>
                          {step.description && (
                            <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '2px' }}>
                              {step.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    No procedure steps have been defined for this service yet. Contact the office for details.
                  </p>
                );
              })()}
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

          {/* Cancel (while waiting or being served) */}
          {(queue.status === "waiting" || queue.status === "serving") && (
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
          onClick={() => setShowNotesDialog(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
          queue.status === "serving" ? (
            <>
              You are currently being served for <strong>{queue.serviceName}</strong>.
              Leaving now ends your turn immediately — the staff will move on to the next student.
            </>
          ) : (
            <>
              You are currently at position <strong>{queue.position}</strong> in
              the <strong>{queue.serviceName}</strong> queue. Leaving will
              permanently remove your spot — you will need to rejoin and wait
              from the back of the line if you change your mind.
            </>
          )
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
  const { queues, isLoading, activeQueuesError, leaveQueue, updateQueueNotes } = useQueue();

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <StudentPageShell
      outerClassName="qstatus-with-sidebar"
      mainClassName="qstatus-main"
    >
        {selectedQueue ? (
          <QueueDetail
            queue={selectedQueue}
            backLabel={fromTracking ? 'Queue Tracking' : fromQueue ? 'Queues' : 'My Queues'}
            onBack={() => fromTracking ? navigate('/student/queue-tracking') : fromQueue ? navigate('/student/queue', { state: { activeTab: 'active' } }) : setSelectedQueueId(null)}
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
                  <button type="button" className="breadcrumb-link" onClick={() => navigate('/student/queue', { state: { activeTab: 'active' } })}>
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
              subtitle="Track all the queues you are in"
            />

            {!fromTracking && (
              <Link
                to="/student/queue-tracking"
                state={{ from: 'queue-status' }}
                className="qsl-tracking-link-btn"
              >
                <div className="qsl-tracking-link-btn-icon-box">
                  <Activity />
                </div>
                <div className="qsl-tracking-link-btn-text">
                  <span className="qsl-tracking-link-btn-title">Queue Tracking</span>
                  <span className="qsl-tracking-link-btn-subtitle">View detailed analytics and history of all your queue activities</span>
                </div>
                <svg className="qsl-tracking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Link>
            )}

            {/* Error */}
            {activeQueuesError && (
              <div
                className="queue-empty-state"
                style={{ borderColor: "rgba(239,68,68,0.3)" }}
              >
                <AlertCircle
                  className="queue-empty-icon"
                  style={{ color: "#ef4444" }}
                />
                <p className="queue-empty-text">{activeQueuesError}</p>
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
            {!isLoading && !activeQueuesError && (
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
                        <div className="qsl-card-content">
                          <div className="qsl-left">
                            <img
                              src={getCollegeLogo(queue.departmentName)}
                              alt={queue.departmentName}
                              className="qsl-college-logo"
                            />
                            <div className="qsl-info">
                              <div className="qsl-header-row">
                                <div>
                                  <h3 className="qsl-service-name">{queue.serviceName}</h3>
                                  <p className="qsl-college-name">{queue.departmentName}</p>
                                </div>
                                <span className="qsl-number-badge">{queue.queueNumberBadge}</span>
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
                              {(queue.slotStatus === "full" || queue.slotStatus === "expired") && (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    background: "rgba(59, 130, 246, 0.1)",
                                    border: "1px solid rgba(59, 130, 246, 0.35)",
                                    color: "#3b82f6",
                                    borderRadius: "999px",
                                    padding: "0.2rem 0.65rem",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    margin: "0.5rem 0",
                                  }}
                                >
                                  <AlertCircle style={{ width: "0.9rem", height: "0.9rem" }} />
                                  {queue.slotStatus === "full" ? "Queue Full: No longer accepting students but students within the queue will still be served" : "Hours ended — still serving"}
                                </div>
                              )}
                              <div className="qsl-stats-grid">
                                <div className="qsl-stat">
                                  <p className="qsl-stat-label">Your Position</p>
                                  <p className="qsl-stat-value">
                                    {queue.status === "serving"
                                      ? (queue.arrivedAt ? "Being Served" : "Called")
                                      : queue.position}
                                  </p>
                                </div>
                                <div className="qsl-stat">
                                  <p className="qsl-stat-label">Total Waiting</p>
                                  <p className="qsl-stat-value">{queue.totalWaiting}</p>
                                </div>
                                <div
                                  className={`qsl-stat${
                                    queue.status === "serving" ? " qsl-stat--serving" : ""
                                  }`}
                                >
                                  <p className="qsl-stat-label">Est. Wait Time</p>
                                  <p className="qsl-stat-value-sm">{queue.estimatedWait}</p>
                                </div>
                                <div className="qsl-stat">
                                  <p className="qsl-stat-label">Joined At</p>
                                  <p className="qsl-stat-value-sm">{queue.joinedAt}</p>
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
                    <h3 className="queue-empty-title">Not Participating in Any Queues</h3>
                    <p className="queue-empty-text">
                      You are not participating in any active queues.
                    </p>
                    <button
                      onClick={() => navigate("/student/queue")}
                      style={{
                        marginTop: "0.5rem",
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
