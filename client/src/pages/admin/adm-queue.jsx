import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Users } from "lucide-react";
import "./adm-queue.css";
import { toast } from "sonner";
import api from "../../utils/api";
import { useAdminQueueHosting } from "../../hooks/useAdminQueueHosting";
import AdminPageShell from "../../components/AdminPageShell";
import QueueReasonModal from "../../components/QueueReasonModal";
import QueueProgressBars from "../../components/QueueProgressBars";
import PageHeader from "../../components/PageHeader";
import FilterSelect from "../../components/FilterSelect";
import { getCollegeLogo } from "../../data/collegeLogo";
import { formatTimeString, getManilaDateString } from "../../utils/dateTime";


// ── Icons ──────────────────────────────────────────────────────────────────
const SlidersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
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

const PlusCircleIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const ChevronDownIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function AdminQueue() {
  const location = useLocation();
  const navigate = useNavigate();

  // Seed synchronously from the nav state on the very first render (lazy
  // initializer), not in the effect below -- otherwise render #1 has no
  // monitored id and briefly falls through to the queue-list view before the
  // effect runs (the "flash" bug when arriving from a Queue Hosting card).
  const [monitoringQueueId, setMonitoringQueueId] = useState(
    () => location.state?.monitorQueueId ?? null,
  );
  // Where the monitor view was opened from: "hosting" when reached via a Queue
  // Hosting card (nav state), null for an in-page Manage click. Drives the
  // monitor-view breadcrumb target/label.
  const [monitorCameFrom, setMonitorCameFrom] = useState(
    () => (location.state?.from === "hosting" ? "hosting" : null),
  );
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  // ── Queue entries (individual students waiting) for the monitored queue ──
  const [queueEntries, setQueueEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesPage, setEntriesPage] = useState(0);
  const ENTRIES_PER_PAGE = 5;

  // Lets other pages (e.g. Queue Hosting Management) jump straight into this
  // queue's monitor view instead of requiring the in-page Monitor button.
  // Clears the consumed nav state afterward -- unlike a route change, "Back
  // to Queue List" below stays on this same URL, so an uncleared state would
  // silently re-trigger the monitor view on a page refresh after backing out.
  useEffect(() => {
    const { monitorQueueId: id, from } = location.state || {};
    if (id) {
      setMonitoringQueueId(id);
      setEntriesPage(0);
      setMonitorCameFrom(from === "hosting" ? "hosting" : null);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const fetchQueueEntries = useCallback(async () => {
    if (!monitoringQueueId) {
      setQueueEntries([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const res = await api.get(`/admin/queue-hosting/${monitoringQueueId}/entries`);
      setQueueEntries(res.data.entries ?? []);
    } catch (error) {
      console.error("Failed to fetch queue entries:", error);
      toast.error("Could not load the list of students in this queue");
      setQueueEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [monitoringQueueId]);

  useEffect(() => {
    fetchQueueEntries();
  }, [fetchQueueEntries]);

  // Queue state (live data, scoped server-side to the admin's own
  // department) plus its socket-driven live-refetch, shared with
  // adm-queue-hosting.jsx via useAdminQueueHosting so the two pages can't
  // drift out of sync again. Entries for the currently-monitored queue also
  // need refreshing on every relevant socket event, not just the queue list.
  const {
    queues: queueDetails,
    loading,
    error: queueHostingError,
    fetchQueues: fetchQueueDetails,
    reasonModal,
    setReasonModal,
    reasonSubmitting,
    handlePauseQueue,
    handleCloseQueue: handleStopQueue,
    handleResumeQueue,
    handleReasonConfirm: handleReasonConfirmBase,
  } = useAdminQueueHosting({ onLiveUpdate: fetchQueueEntries });

  const totalEntryPages = Math.max(1, Math.ceil(queueEntries.length / ENTRIES_PER_PAGE));
  // Keeps the stored page in sync with the live entry count, not just its
  // displayed value -- if a live update shrinks the list while an admin is
  // on a later page, the stored index is corrected immediately rather than
  // only being clamped for display (which could otherwise let a stale
  // "Next" click land on a page number that no longer make sense).
  useEffect(() => {
    setEntriesPage((p) => Math.min(p, Math.max(0, totalEntryPages - 1)));
  }, [totalEntryPages]);
  const currentEntriesPage = Math.min(entriesPage, totalEntryPages - 1);
  const entriesStartIndex = currentEntriesPage * ENTRIES_PER_PAGE;
  const paginatedEntries = queueEntries.slice(entriesStartIndex, entriesStartIndex + ENTRIES_PER_PAGE);

  const getEntryStatusLabel = (entry) => {
    if (entry.status === "no_show") return "No-Show";
    if (entry.status === "serving") return entry.arrivedAt ? "Being Served" : "Called";
    return entry.status;
  };

  // Prefixes a leading =/+/-/@ with a single quote so spreadsheet apps
  // (Excel, Sheets) treat the cell as literal text instead of a formula --
  // user-entered fields like names have no format restriction at registration.
  const csvEscape = (value) => {
    let str = String(value ?? "");
    if (/^[=+\-@]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };
  const handleExportQueueData = () => {
    const header = ["Queue Number", "Student Name", "Student ID", "Status", "Concern", "Joined At"];
    const rows = queueEntries.map((entry) => [
      entry.queueNumber,
      entry.studentName,
      entry.studentId,
      getEntryStatusLabel(entry),
      entry.concern,
      entry.joinedAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `queue-${monitoringQueue.id}-${getManilaDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  // Re-derive the monitored queue from live data on every refresh, so the
  // monitor view always reflects the latest call-next/serve/pause actions
  const monitoringQueue =
    queueDetails.find((q) => q.id === monitoringQueueId) || null;

  // Today's open/paused queue lines, plus 'full'/'expired' lines — those are
  // closed to new joins but still have unserved students by construction
  // (they settle into 'completed' once the last one is served/left/voided).
  const activeQueueDetails = queueDetails.filter((q) =>
    ["open", "paused", "full", "expired"].includes(q.status),
  );

  const serviceTypes = [...new Set(activeQueueDetails.map((q) => q.queueType))].sort();
  const filteredQueueDetails =
    serviceTypeFilter === "all"
      ? activeQueueDetails
      : activeQueueDetails.filter((q) => q.queueType === serviceTypeFilter);

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
      case "full":
        return "Full";
      case "expired":
        return "Hours Ended";
      case "completed":
        return "Completed";
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

  const handleSkipStudent = async (slotId, reason) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/skip`, { reason });
      toast.message("Student skipped and marked as no-show");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ?? "Failed to skip student",
      );
    }
  };

  const handleMarkArrived = async (slotId) => {
    try {
      await api.patch(`/admin/queue-hosting/${slotId}/mark-arrived`);
      toast.success("Student marked as arrived");
      await fetchQueueDetails();
    } catch (error) {
      toast.error(
        error?.response?.data?.error ?? "Failed to mark student as arrived",
      );
    }
  };

  // Pause/close/resume + the reason-modal flow live in the shared hook
  // above; this page only needs to additionally exit the monitor view once
  // a close actually goes through (the queue it was showing no longer has
  // an active/paused state to monitor).
  const handleReasonConfirm = async (reason) => {
    const result = await handleReasonConfirmBase(reason);
    if (result?.mode === "close") setMonitoringQueueId(null);
  };

  // Skip requires a reason too (kept consistent with pause/close) — reuses
  // the same QueueReasonModal, keyed by a distinct 'skip' mode.
  const [skipReasonModal, setSkipReasonModal] = useState(false);
  const [skipSubmitting, setSkipSubmitting] = useState(false);
  const handleSkipConfirm = async (reason) => {
    if (!monitoringQueue) return;
    setSkipSubmitting(true);
    try {
      await handleSkipStudent(monitoringQueue.id, reason);
      setSkipReasonModal(false);
    } finally {
      setSkipSubmitting(false);
    }
  };

  // Render monitoring detail view
  if (monitoringQueue) {
    const estimatedWaitMinutes =
      monitoringQueue.avgServiceMinutes != null
        ? monitoringQueue.avgServiceMinutes * monitoringQueue.currentCount
        : null;

    return (
      <AdminPageShell
        outerClassName="admin-queue-with-sidebar"
        mainClassName="admin-queue-main"
        overlay={
          <>
            <QueueReasonModal
              show={!!reasonModal}
              title={reasonModal?.mode === "pause" ? "Pause Queue" : "Stop Queue"}
              message={
                reasonModal?.mode === "pause"
                  ? monitoringQueue?.currentlyServingStudentNumber
                    ? "Students in this queue will see this reason while it's paused. A student is currently being served — pausing will return them to waiting instead of leaving their call in progress."
                    : "Students in this queue will see this reason while it's paused."
                  : "All students still waiting or being served will be removed from this queue and will see this reason. This cannot be undone."
              }
              confirmText={reasonModal?.mode === "pause" ? "Pause" : "Stop Queue"}
              submitting={reasonSubmitting}
              onConfirm={handleReasonConfirm}
              onCancel={() => setReasonModal(null)}
            />

            <QueueReasonModal
              show={skipReasonModal}
              title="Skip Student"
              message="This voids the currently-served student's ticket as a no-show. They'll see this reason. This cannot be undone."
              confirmText="Skip Student"
              submitting={skipSubmitting}
              onConfirm={handleSkipConfirm}
              onCancel={() => setSkipReasonModal(false)}
            />
          </>
        }
      >
          <div className="queue-monitoring-container">
            <div className="queue-monitoring-topbar">
              <button
                className="btn-refresh-queue queue-monitoring-refresh"
                onClick={fetchQueueDetails}
                aria-label="Refresh queue data"
              >
                <RefreshIcon />
              </button>
              <PageHeader
                breadcrumb={
                  monitorCameFrom === "hosting" ? (
                    <Link
                      to="/admin/queue-hosting"
                      className="page-breadcrumb-link"
                    >
                      <ChevronLeft />
                      Queue Hosting
                    </Link>
                  ) : (
                    <button
                      className="page-breadcrumb-link"
                      onClick={() => setMonitoringQueueId(null)}
                    >
                      <ChevronLeft />
                      Queue Management
                    </button>
                  )
                }
                icon={<Users className="icon" />}
                iconClassName="aq-title-icon"
                title={monitoringQueue.queueType}
                subtitle={monitoringQueue.department}
                headerClassName="aq-page-header"
                breadcrumbClassName="page-breadcrumb"
                titleSectionClassName="aq-title-section"
                titleClassName="aq-title"
                subtitleClassName="aq-subtitle"
              />
            </div>

            {(monitoringQueue.status === "full" || monitoringQueue.status === "expired") && (
              <p className="queue-monitoring-status-note">
                {monitoringQueue.status === "full"
                  ? "This queue is full — closed to new joins, but you can still call and serve everyone already in line."
                  : "This queue's hours have ended — closed to new joins, but you can still call and serve everyone already in line."}
              </p>
            )}

            {/* Stats Cards */}
            <div className="queue-monitoring-stats">
              <div className="queue-stat-card">
                <div className="queue-stat-card-icon-box">
                  <ClockIcon />
                </div>
                <div className="queue-stat-label">
                  Currently Serving
                  {monitoringQueue.currentlyServingStudentNumber && (
                    <> ({monitoringQueue.currentlyServingArrivedAt ? "Being Served" : "Called"})</>
                  )}
                </div>
                <div className="queue-stat-value">
                  {monitoringQueue.currentlyServingStudentNumber || "—"}
                </div>
              </div>
              <div className="queue-stat-card">
                <div className="queue-stat-card-icon-box">
                  <UsersIcon />
                </div>
                <div className="queue-stat-label">Students Waiting</div>
                <div className="queue-stat-value">
                  {monitoringQueue.currentCount}
                </div>
              </div>
              <div className="queue-stat-card">
                <div className="queue-stat-card-icon-box">
                  <ClockIcon />
                </div>
                <div className="queue-stat-label">Avg Service Time</div>
                <div className="queue-stat-value">
                  {formatAvgService(monitoringQueue.avgServiceMinutes)}
                </div>
              </div>
            </div>

            {/* Queue Overview */}
            <div className="queue-detail-card queue-overview-card">
              <div className="queue-detail-header">
                <h3>
                  <ActivityIcon />
                  Queue Overview
                </h3>
                <div className={`status-badge status-badge--${monitoringQueue.status}`}>
                  {getQueueStatusLabel(monitoringQueue.status)}
                </div>
              </div>
              <div className="queue-detail-content">
                <div className="queue-overview-grid">
                  <div className="queue-overview-item">
                    <span className="queue-overview-label">Location</span>
                    <span className="queue-overview-value">
                      {monitoringQueue.location || "Not specified"}
                    </span>
                  </div>
                  <div className="queue-overview-item">
                    <span className="queue-overview-label">Service Hours</span>
                    <span className="queue-overview-value">
                      {monitoringQueue.serviceHours
                        ? `${formatTimeString(monitoringQueue.serviceHours.start)} – ${formatTimeString(monitoringQueue.serviceHours.end)}`
                        : "Not specified"}
                    </span>
                  </div>
                  <div className="queue-overview-item">
                    <span className="queue-overview-label">Total Served Today</span>
                    <span className="queue-overview-value">{monitoringQueue.servedCount}</span>
                  </div>
                  <div className="queue-overview-item">
                    <span className="queue-overview-label">Est. Wait Time</span>
                    <span className="queue-overview-value">
                      {estimatedWaitMinutes != null ? `${estimatedWaitMinutes} mins` : "N/A"}
                    </span>
                  </div>
                </div>
                <QueueProgressBars
                  occupancyCurrent={monitoringQueue.totalInQueue ?? 0}
                  occupancyTotal={monitoringQueue.maxCapacity ?? 0}
                  occupancyPercent={monitoringQueue.queueOccupancyPercent ?? 0}
                  servicedCurrent={monitoringQueue.servedCount ?? 0}
                  servicedTotal={monitoringQueue.totalInQueue ?? 0}
                  servicedPercent={monitoringQueue.servicedPercent ?? 0}
                />
              </div>
            </div>

            {/* Queue Actions */}
            <div className="queue-detail-card">
              <div className="queue-detail-header">
                <h3>
                  <SlidersIcon />
                  Queue Actions
                </h3>
              </div>
              <div className="queue-actions-grid">
                <button
                  className="queue-action-btn queue-action-btn--primary"
                  onClick={() => handleCallNext(monitoringQueue.id)}
                  disabled={
                    !!monitoringQueue.currentlyServingStudentNumber ||
                    monitoringQueue.currentCount === 0 ||
                    monitoringQueue.status === "paused"
                  }
                  title={
                    monitoringQueue.status === "paused"
                      ? "Queue is paused — resume it before calling students"
                      : undefined
                  }
                >
                  <UsersIcon />
                  Call Next
                </button>
                {monitoringQueue.status === "paused" ? (
                  <button
                    className="queue-action-btn queue-action-btn--success"
                    onClick={() => handleResumeQueue(monitoringQueue.id)}
                  >
                    <AlertCircleIcon />
                    Resume Queue
                  </button>
                ) : (
                  <button
                    className="queue-action-btn queue-action-btn--warning"
                    onClick={() => handlePauseQueue(monitoringQueue.id)}
                    disabled={monitoringQueue.status !== "open"}
                    title={
                      monitoringQueue.status !== "open"
                        ? "Only an open queue can be paused"
                        : undefined
                    }
                  >
                    <AlertCircleIcon />
                    Pause Queue
                  </button>
                )}
                <button
                  className="queue-action-btn queue-action-btn--danger"
                  onClick={() => handleStopQueue(monitoringQueue.id)}
                >
                  <CloseIcon />
                  Stop Queue
                </button>
                <button
                  className="queue-action-btn queue-action-btn--neutral"
                  onClick={handleExportQueueData}
                >
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
                <p className="queue-serving-name">
                  {monitoringQueue.currentlyServingStudentNumber ||
                    "No student is currently being served"}
                </p>
                <p className="queue-serving-label">
                  {monitoringQueue.queueType}
                  {monitoringQueue.currentlyServingStudentNumber && (
                    <>
                      {" • "}
                      {monitoringQueue.currentlyServingArrivedAt ? "Being Served" : "Called — awaiting arrival"}
                    </>
                  )}
                </p>
                {monitoringQueue.currentlyServingStudentNumber && !monitoringQueue.currentlyServingArrivedAt && (
                  <button
                    className="queue-action-btn queue-action-btn--primary"
                    style={{ width: "100%", marginTop: "0.75rem" }}
                    onClick={() => handleMarkArrived(monitoringQueue.id)}
                  >
                    <AlertCircleIcon />
                    Mark Arrived
                  </button>
                )}
                <button
                  className="queue-action-btn queue-action-btn--success"
                  style={{ width: "100%", marginTop: "0.75rem" }}
                  onClick={() => handleMarkAsServed(monitoringQueue.id)}
                  disabled={!monitoringQueue.currentlyServingStudentNumber}
                >
                  <AlertCircleIcon />
                  Mark as Served
                </button>
                <button
                  className="queue-action-btn queue-action-btn--danger"
                  style={{ width: "100%", marginTop: "0.5rem" }}
                  onClick={() => setSkipReasonModal(true)}
                  disabled={!monitoringQueue.currentlyServingStudentNumber}
                >
                  <CloseIcon />
                  Skip / No-Show
                </button>
              </div>
            </div>

            {/* Queue Entries */}
            <div className="queue-detail-card">
              <div className="queue-detail-header">
                <h3>
                  <UsersIcon />
                  Queue Entries
                  <span className="queue-entries-count-badge">{queueEntries.length}</span>
                </h3>
              </div>
              <div className="queue-entries-list">
                {loadingEntries ? (
                  <p className="queue-entries-empty">Loading entries…</p>
                ) : queueEntries.length === 0 ? (
                  <p className="queue-entries-empty">No students in queue.</p>
                ) : (
                  paginatedEntries.map((entry, index) => (
                    <div
                      key={entry.queueNumber}
                      className={`queue-entry-item ${entry.status === "serving" ? "is-serving" : ""}`}
                    >
                      <div className="queue-entry-top">
                        <div className="queue-entry-number">{entriesStartIndex + index + 1}</div>
                        <div className="queue-entry-info">
                          <h4 className="queue-entry-name">{entry.studentName}</h4>
                          <p className="queue-entry-id">ID: {entry.studentId}</p>
                        </div>
                        <div className="queue-entry-badges">
                          <span className={`queue-entry-status queue-entry-status--${entry.status}`}>
                            {getEntryStatusLabel(entry)}
                          </span>
                          <span className="queue-entry-queue-number">{entry.queueNumber}</span>
                        </div>
                      </div>
                      <div className="queue-entry-details">
                        <p className="queue-entry-concern">
                          <strong>Concern:</strong> {entry.concern}
                        </p>
                        <p className="queue-entry-time">
                          <ClockIcon />
                          Joined at {entry.joinedAt}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {!loadingEntries && queueEntries.length > ENTRIES_PER_PAGE && (
                <div className="queue-entries-pagination">
                  <button
                    className="queue-entries-page-btn"
                    onClick={() => setEntriesPage((p) => Math.max(0, p - 1))}
                    disabled={currentEntriesPage === 0}
                    aria-label="Previous batch"
                  >
                    <ChevronLeft />
                  </button>
                  <span className="queue-entries-page-label">
                    {entriesStartIndex + 1}–{Math.min(queueEntries.length, entriesStartIndex + ENTRIES_PER_PAGE)} of {queueEntries.length}
                  </span>
                  <button
                    className="queue-entries-page-btn"
                    onClick={() => setEntriesPage((p) => Math.min(totalEntryPages - 1, p + 1))}
                    disabled={currentEntriesPage >= totalEntryPages - 1}
                    aria-label="Next batch"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
      </AdminPageShell>
    );
  }

  // A monitor open is pending (arrived via a Queue Hosting card's nav state, or
  // an in-page Manage click) but the shared live queue list hasn't resolved
  // yet -- hold on a neutral loading screen instead of flashing the queue-list
  // view underneath. `loading` from useAdminQueueHosting() is raised only on the
  // first mount fetch, never on socket refetches, so this fires once on entry.
  if (monitoringQueueId && !monitoringQueue && loading) {
    return (
      <AdminPageShell
        outerClassName="admin-queue-with-sidebar"
        mainClassName="admin-queue-main"
      >
        <div className="queue-monitoring-container">
          <p className="queue-monitoring-status-note">Loading queue…</p>
        </div>
      </AdminPageShell>
    );
  }

  // Render main queue list view
  return (
    <AdminPageShell
      outerClassName="admin-queue-with-sidebar"
      mainClassName="admin-queue-main"
    >
        <div className="queue-page-container">
          <PageHeader
            breadcrumb={<Link to="/admin/dashboard" className="page-breadcrumb-link"><ChevronLeft />Home</Link>}
            icon={<Users className="icon" />}
            iconClassName="aq-title-icon"
            title="Queue Management"
            subtitle="Manage and monitor queues within your department."
            headerClassName="aq-page-header"
            breadcrumbClassName="page-breadcrumb"
            titleSectionClassName="aq-title-section"
            titleClassName="aq-title"
            subtitleClassName="aq-subtitle"
          />

          {queueHostingError && (
            <div className="dash-error-banner" role="alert">
              {queueHostingError}
            </div>
          )}

          <Link
            to="/admin/queue-hosting"
            state={{ from: "queue" }}
            className="aq-host-link-btn"
          >
            <div className="aq-host-link-btn-icon-box">
              <PlusCircleIcon />
            </div>
            <div className="aq-host-link-btn-text">
              <span className="aq-host-link-btn-title">Queue Hosting</span>
              <span className="aq-host-link-btn-subtitle">Host and manage queues within your department.</span>
            </div>
            <svg className="aq-host-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </Link>

          {/* System Stats */}
          <div className="queue-system-stats">
            <div className="queue-stat-box">
              <div className="queue-stat-box-icon-box">
                <ActivityIcon />
              </div>
              <p className="queue-stat-box-label">Active Queues</p>
              <p className="queue-stat-box-value">{systemStats.totalQueues}</p>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-icon-box">
                <UsersIcon />
              </div>
              <p className="queue-stat-box-label">Total Waiting</p>
              <p className="queue-stat-box-value">{systemStats.totalWaiting}</p>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-icon-box">
                <ClockIcon />
              </div>
              <p className="queue-stat-box-label">Avg Wait Time</p>
              <p className="queue-stat-box-value">{systemStats.avgWaitTime}</p>
            </div>
            <div className="queue-stat-box">
              <div className="queue-stat-box-icon-box">
                <TrendingUpIcon />
              </div>
              <p className="queue-stat-box-label">Operational</p>
              <p className="queue-stat-box-value">
                {systemStats.operational}/{systemStats.totalQueues}
              </p>
            </div>
          </div>

          {/* Filter */}
          {serviceTypes.length > 0 && (
            <div className="filters-card">
              <div className="filters-header">
                <h3 className="filters-title">Queue Filter</h3>
                <p className="filters-description">
                  Filter active queues by service type.
                </p>
              </div>
              <div className="filters-grid">
                <FilterSelect
                  id="queue-filter-service-type"
                  label="Service Type"
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Service Types" },
                    ...serviceTypes.map((type) => ({ value: type, label: type })),
                  ]}
                  chevronIcon={<ChevronDownIcon className="filter-chevron" />}
                />
              </div>
            </div>
          )}

          {/* Active queue rows */}
          <div className="queue-details-list">
            {loading ? (
              <div className="queue-empty-state">
                <ActivityIcon />
                <p>Loading queues…</p>
              </div>
            ) : activeQueueDetails.length === 0 ? (
              <div className="queue-empty-state">
                <ActivityIcon />
                <h3>No Active Queues</h3>
                <p>There are no open queues in your department yet.</p>
              </div>
            ) : filteredQueueDetails.length === 0 ? (
              <div className="queue-empty-state">
                <ActivityIcon />
                <h3>No Active Queues</h3>
                <p>Try adjusting the service-type filter.</p>
              </div>
            ) : (
              filteredQueueDetails.map((detail) => (
                <div key={detail.id} className="queue-detail-row">
                  <div className="queue-detail-topbar">
                    <div className="queue-detail-header-row">
                      <img
                        src={getCollegeLogo(detail.college)}
                        alt={`${detail.college} logo`}
                        className="queue-detail-college-logo"
                      />
                      <div className="queue-detail-heading">
                        <h3 className="queue-detail-service">{detail.queueType}</h3>
                        <span className="queue-detail-abbrev">{detail.college}</span>
                      </div>
                    </div>
                    <button
                      className="btn-monitor"
                      onClick={() => {
                        setMonitoringQueueId(detail.id);
                        setEntriesPage(0);
                        setMonitorCameFrom(null);
                      }}
                    >
                      <SlidersIcon />
                      Manage
                    </button>
                  </div>

                  <div className="queue-detail-grid">
                    <div className="queue-detail-item">
                      <span className="queue-detail-item-label">Currently Serving</span>
                      <span className="queue-detail-item-value">
                        {detail.currentlyServingStudentNumber || "—"}
                      </span>
                    </div>
                    <div className="queue-detail-item">
                      <span className="queue-detail-item-label">Waiting</span>
                      <span className="queue-detail-item-value">
                        {detail.currentCount} students
                      </span>
                    </div>
                    <div className="queue-detail-item">
                      <span className="queue-detail-item-label">Avg Service</span>
                      <span className="queue-detail-item-value">
                        {formatAvgService(detail.avgServiceMinutes)}
                      </span>
                    </div>
                    {detail.location && (
                      <div className="queue-detail-item">
                        <span className="queue-detail-item-label">Location</span>
                        <span className="queue-detail-item-value">
                          {detail.location}
                        </span>
                      </div>
                    )}
                    {detail.serviceHours && (
                      <div className="queue-detail-item">
                        <span className="queue-detail-item-label">Service Hours</span>
                        <span className="queue-detail-item-value">
                          {formatTimeString(detail.serviceHours.start)} -{" "}
                          {formatTimeString(detail.serviceHours.end)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
    </AdminPageShell>
  );
}